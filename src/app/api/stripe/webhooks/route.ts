
import { NextRequest, NextResponse } from 'next/headers';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { updateUserInMongoDB } from '@/lib/mongoUserService';
import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User'; // Import UserModel for querying

// Ensure Stripe SDK is installed: npm install stripe
// Set these environment variables in your .env.local or hosting environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20', // Use your desired API version or the latest
  typescript: true,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text(); // Read the raw body for signature verification
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  if (!webhookSecret) {
    console.error('🔴 Stripe webhook secret is not set. Cannot verify webhook signature.');
    return NextResponse.json({ error: 'Webhook secret not configured on server.' }, { status: 500 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log('Stripe Webhook Received:', event.type, event.id);

  await dbConnect();

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const clientReferenceId = session.client_reference_id; 
      const userIdFromMetadata = session.metadata?.userId;
      const userEmailFromDetails = session.customer_details?.email;
      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;
      
      let userToUpdate;

      if (clientReferenceId) {
        userToUpdate = await UserModel.findById(clientReferenceId).exec();
      }
      if (!userToUpdate && userIdFromMetadata) {
        userToUpdate = await UserModel.findById(userIdFromMetadata).exec();
      }
      if (!userToUpdate && userEmailFromDetails) {
        userToUpdate = await UserModel.findOne({ email: userEmailFromDetails }).exec();
      }

      if (!userToUpdate) {
        console.error(`🔴 User not found for client_reference_id: ${clientReferenceId}, metadata ID: ${userIdFromMetadata}, or email: ${userEmailFromDetails}. Checkout session ID: ${session.id}`);
        break; 
      }
      
      if (!stripeSubscriptionId) {
        console.error(`🔴 Stripe Subscription ID missing in checkout.session.completed for session ID: ${session.id}. Cannot process.`);
        break;
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const planId = session.metadata?.planId || subscription.items.data[0]?.price?.lookup_key || 'unknown_plan';
        const currentPeriodStart = new Date(subscription.current_period_start * 1000);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

        await updateUserInMongoDB(userToUpdate.id, { 
          isPremium: true, 
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionPlan: planId as any, 
          subscriptionStartDate: currentPeriodStart,
          subscriptionEndDate: currentPeriodEnd,
        });
        console.log(`✅ User ${userToUpdate.id} upgraded. Plan: ${planId}, Subscription: ${stripeSubscriptionId}`);
      } catch (subError: any) {
        console.error(`🔴 Error processing checkout.session.completed for user ${userToUpdate.id}: ${subError.message}`);
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      const subIdForInvoice = invoice.subscription as string;

      if ((invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_create') && subIdForInvoice) {
        try {
            const subscriptionDetails = await stripe.subscriptions.retrieve(subIdForInvoice);
            const userWithPaidInvoice = await UserModel.findOne({ stripeSubscriptionId: subIdForInvoice }).exec();
            if (!userWithPaidInvoice) {
               console.error(`🔴 User not found for subscription ID: ${subIdForInvoice} during invoice.payment_succeeded`);
               break;
            }
            const newEndDate = new Date(subscriptionDetails.current_period_end * 1000);
            await updateUserInMongoDB(userWithPaidInvoice.id, { 
              subscriptionEndDate: newEndDate,
              isPremium: true, 
              subscriptionStartDate: new Date(subscriptionDetails.current_period_start * 1000),
            });
            console.log(`✅ Invoice payment succeeded for subscription: ${subIdForInvoice}. User ${userWithPaidInvoice.id} subscription end date updated to ${newEndDate.toLocaleDateString()}.`);
        } catch (invError: any) {
            console.error(`🔴 Error processing invoice.payment_succeeded for subscription ${subIdForInvoice}: ${invError.message}`);
        }
      }
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      const subIdForFailed = failedInvoice.subscription as string;
      console.log(`⚠️ Invoice payment failed for subscription: ${subIdForFailed}`);
      
      if (subIdForFailed) {
        const userWithFailedPayment = await UserModel.findOne({ stripeSubscriptionId: subIdForFailed }).exec();
        if (userWithFailedPayment) {
          await updateUserInMongoDB(userWithFailedPayment.id, { 
          });
          console.log(`⚠️ User ${userWithFailedPayment.id} payment failed. Consider notifying user. Current premium status might be maintained during dunning.`);
        } else {
           console.error(`🔴 User not found for subscription ID: ${subIdForFailed} during invoice.payment_failed`);
        }
      }
      break;
      
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      console.log(`🔄 Subscription updated: ${updatedSubscription.id}, Status: ${updatedSubscription.status}, Cancel at period end: ${updatedSubscription.cancel_at_period_end}`);
      const customerIdForUpdate = updatedSubscription.customer as string;
      
      const userToUpdateSubscription = await UserModel.findOne({ stripeCustomerId: customerIdForUpdate }).exec();
      if (!userToUpdateSubscription) {
        console.error(`🔴 User not found for Stripe Customer ID: ${customerIdForUpdate} during customer.subscription.updated`);
        break;
      }

      const isActiveStatus = updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing';
      const newIsPremiumStatus = isActiveStatus && !updatedSubscription.cancel_at_period_end;
      
      const newPlanUpdated = updatedSubscription.items.data[0]?.price?.lookup_key || userToUpdateSubscription.subscriptionPlan || 'unknown_plan';
      const newEndDateUpdated = updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000) : null;
      const newStartDateUpdated = updatedSubscription.current_period_start ? new Date(updatedSubscription.current_period_start * 1000) : null;

      await updateUserInMongoDB(userToUpdateSubscription.id, { 
        isPremium: newIsPremiumStatus,
        subscriptionPlan: newPlanUpdated as any,
        subscriptionStartDate: newStartDateUpdated,
        subscriptionEndDate: newEndDateUpdated,
        stripeSubscriptionId: updatedSubscription.id, 
      });
      console.log(`🔄 User ${userToUpdateSubscription.id} subscription updated. Status: ${updatedSubscription.status}, Plan: ${newPlanUpdated}, isPremium: ${newIsPremiumStatus}`);
      
      if (updatedSubscription.cancel_at_period_end && isActiveStatus) {
        console.log(`User ${userToUpdateSubscription.id} subscription is set to cancel at period end (${newEndDateUpdated?.toLocaleDateString()}). Premium access remains until then.`);
      }
      break;

    case 'customer.subscription.deleted': 
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log(`🚫 Subscription deleted/canceled: ${deletedSubscription.id}`);
      const customerIdForDelete = deletedSubscription.customer as string;
      
      const userWithDeletedSubscription = await UserModel.findOne({ stripeCustomerId: customerIdForDelete, stripeSubscriptionId: deletedSubscription.id }).exec();
      if (!userWithDeletedSubscription) {
        console.warn(`User not found for Stripe Customer ID: ${customerIdForDelete} and Subscription ID: ${deletedSubscription.id} during customer.subscription.deleted. Might have already been processed or customer deleted.`);
        break;
      }

      await updateUserInMongoDB(userWithDeletedSubscription.id, { 
        isPremium: false, 
        subscriptionPlan: null,
        stripeSubscriptionId: null, 
        subscriptionStartDate: null,
        subscriptionEndDate: deletedSubscription.ended_at ? new Date(deletedSubscription.ended_at * 1000) : new Date(), 
      });
      console.log(`🚫 User ${userWithDeletedSubscription.id} premium access revoked due to subscription cancellation/deletion.`);
      break;
      
    default:
      console.warn(`🤷‍♀️ Unhandled Stripe event type: ${event.type}`);
  }

  return NextResponse.json({ received: true, event_type: event.type });
}
