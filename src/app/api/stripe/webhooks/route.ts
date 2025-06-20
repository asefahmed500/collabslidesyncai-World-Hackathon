
import { NextRequest, NextResponse } from 'next/server';
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
      const userIdFromMetadata = session.metadata?.userId;
      const userEmail = session.customer_details?.email;
      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;
      
      let userToUpdate;
      if (userIdFromMetadata) {
        userToUpdate = await UserModel.findById(userIdFromMetadata).exec();
      } else if (userEmail) {
        userToUpdate = await UserModel.findOne({ email: userEmail }).exec();
      }

      if (!userToUpdate) {
        console.error(`🔴 User not found for metadata ID: ${userIdFromMetadata} or email: ${userEmail}`);
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
        // TODO: Send subscription activated email (optional)
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
            });
            console.log(`✅ Invoice payment succeeded for subscription: ${subIdForInvoice}. User ${userWithPaidInvoice.id} subscription end date updated to ${newEndDate.toLocaleDateString()}.`);
            // TODO: Send payment receipt email (optional, Stripe can also do this)
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
          // Potentially update user status, e.g., to 'past_due' or trigger dunning.
          // For now, just log and suggest email.
          console.log(`⚠️ User ${userWithFailedPayment.id} payment failed. Consider notifying user.`);
          // await updateUserInMongoDB(userWithFailedPayment.id, { subscriptionStatus: 'past_due' }); // Example: if you add such a field
          // TODO: Send payment failed email
        } else {
           console.error(`🔴 User not found for subscription ID: ${subIdForFailed} during invoice.payment_failed`);
        }
      }
      break;
      
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription;
      console.log(`🔄 Subscription updated: ${updatedSubscription.id}, Status: ${updatedSubscription.status}`);
      const customerIdForUpdate = updatedSubscription.customer as string;
      
      const userToUpdateSubscription = await UserModel.findOne({ stripeCustomerId: customerIdForUpdate }).exec();
      if (!userToUpdateSubscription) {
        console.error(`🔴 User not found for Stripe Customer ID: ${customerIdForUpdate} during customer.subscription.updated`);
        break;
      }

      const newIsPremiumStatus = updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing';
      const newPlanUpdated = updatedSubscription.items.data[0]?.price?.lookup_key || 'unknown_plan'; // Using lookup_key if set
      const newEndDateUpdated = updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000) : null;

      await updateUserInMongoDB(userToUpdateSubscription.id, { 
        isPremium: newIsPremiumStatus,
        subscriptionPlan: newPlanUpdated as any,
        subscriptionEndDate: newEndDateUpdated,
        stripeSubscriptionId: updatedSubscription.id, // Ensure it's up-to-date
        // Optionally update subscriptionStartDate if it's a new subscription from an update (e.g. trial end)
        subscriptionStartDate: updatedSubscription.start_date ? new Date(updatedSubscription.start_date * 1000) : userToUpdateSubscription.subscriptionStartDate,
      });
      console.log(`🔄 User ${userToUpdateSubscription.id} subscription updated. Status: ${updatedSubscription.status}, Plan: ${newPlanUpdated}, isPremium: ${newIsPremiumStatus}`);
      break;

    case 'customer.subscription.deleted': 
      const deletedSubscription = event.data.object as Stripe.Subscription;
      console.log(`🚫 Subscription deleted/canceled: ${deletedSubscription.id}`);
      const customerIdForDelete = deletedSubscription.customer as string;
      
      const userWithDeletedSubscription = await UserModel.findOne({ stripeCustomerId: customerIdForDelete }).exec();
      if (!userWithDeletedSubscription) {
        console.error(`🔴 User not found for Stripe Customer ID: ${customerIdForDelete} during customer.subscription.deleted`);
        break;
      }

      await updateUserInMongoDB(userWithDeletedSubscription.id, { 
        isPremium: false, 
        subscriptionPlan: null,
        stripeSubscriptionId: null, 
        subscriptionEndDate: deletedSubscription.ended_at ? new Date(deletedSubscription.ended_at * 1000) : new Date(), 
      });
      console.log(`🚫 User ${userWithDeletedSubscription.id} premium access revoked due to subscription cancellation/deletion.`);
      // TODO: Send subscription canceled email (optional)
      break;
      
    default:
      console.warn(`🤷‍♀️ Unhandled Stripe event type: ${event.type}`);
  }

  return NextResponse.json({ received: true, event_type: event.type });
}

