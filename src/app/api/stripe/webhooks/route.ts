
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
// import Stripe from 'stripe'; // Uncomment when Stripe SDK is fully integrated
// import { updateUserInMongoDB } from '@/lib/mongoUserService'; // Uncomment when implementing DB updates
// import dbConnect from '@/lib/mongodb'; // Uncomment when implementing DB updates

// TODO: STEP 0 - Ensure Stripe SDK is installed: npm install stripe
// TODO: STEP 0 - Set these environment variables in your .env.local or hosting environment
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-06-20', // Use your desired API version or the latest
//   typescript: true,
// });
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text(); // Read the raw body for signature verification
  // const signature = headers().get('stripe-signature') as string;

  // let event: Stripe.Event;

  // TODO: STEP 1 - Verify Stripe Webhook Signature (CRITICAL FOR SECURITY)
  // if (!webhookSecret) {
  //   console.error('🔴 Stripe webhook secret is not set. Cannot verify webhook signature.');
  //   return NextResponse.json({ error: 'Webhook secret not configured on server.' }, { status: 500 });
  // }
  // try {
  //   event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  // } catch (err: any) {
  //   console.error(`Webhook signature verification failed: ${err.message}`);
  //   return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  // }

  // For development without live webhooks & signature verification (REMOVE FOR PRODUCTION)
  let event;
  try {
    event = JSON.parse(body); // In dev, you might send JSON directly from Stripe CLI or mock
  } catch (err:any) {
    console.error('Error parsing webhook body (DEV MODE):', err.message);
    return NextResponse.json({ error: 'Invalid JSON body (DEV MODE)' }, { status: 400 });
  }
  // END DEV MODE SECTION

  console.log('Stripe Webhook Received (SIGNATURE VERIFICATION SKIPPED IN CURRENT CODE - TODO):', event.type, event.id);

  // TODO: STEP 2 - Connect to Database
  // await dbConnect();

  // TODO: STEP 3 - Handle specific event types
  switch (event.type) {
    case 'checkout.session.completed':
      // const session = event.data.object as Stripe.Checkout.Session;
      // const userIdFromMetadata = session.metadata?.userId; // If you pass userId from client
      // const userEmail = session.customer_details?.email; // Or use email
      // const stripeCustomerId = session.customer as string;
      // const stripeSubscriptionId = session.subscription as string;
      
      // // Retrieve plan details (e.g., from session line items or subscription object)
      // const planId = session.metadata?.planId || 'unknown_plan'; // Example
      // const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      // const currentPeriodStart = new Date(subscription.current_period_start * 1000);
      // const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      // console.log(`✅ Checkout session completed for user: ${userEmail || userIdFromMetadata}, Subscription: ${stripeSubscriptionId}`);
      
      // TODO: STEP 4 - Find user in your DB (e.g., by email or userIdFromMetadata)
      // let user = await UserModel.findOne({ email: userEmail }); // or findById(userIdFromMetadata)
      // if (!user) {
      //   console.error(`🔴 User not found for email: ${userEmail} or ID: ${userIdFromMetadata}`);
      //   break; // Or handle user creation if applicable
      // }
      // const mongoUserId = user.id; // Assuming user.id is the MongoDB _id or Firebase UID

      // TODO: STEP 4 - Update user record in MongoDB:
      // await updateUserInMongoDB(mongoUserId, { 
      //   isPremium: true, 
      //   stripeCustomerId,
      //   stripeSubscriptionId,
      //   subscriptionPlan: planId as any, // Cast if planId is 'premium_monthly' etc.
      //   subscriptionStartDate: currentPeriodStart,
      //   subscriptionEndDate: currentPeriodEnd,
      // });
      // console.log(`✅ User ${mongoUserId} upgraded to premium. Plan: ${planId}`);
      // TODO: Send subscription activated email (optional)
      break;

    case 'invoice.payment_succeeded':
      // const invoice = event.data.object as Stripe.Invoice;
      // const stripeSubscriptionIdForInvoice = invoice.subscription as string;
      // const stripeCustomerIdForInvoice = invoice.customer as string;

      // if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_create') {
      //   // const subscriptionDetails = await stripe.subscriptions.retrieve(stripeSubscriptionIdForInvoice);
      //   // const userToUpdate = await UserModel.findOne({ stripeSubscriptionId: stripeSubscriptionIdForInvoice });
      //   // if (!userToUpdate) {
      //   //    console.error(`🔴 User not found for subscription ID: ${stripeSubscriptionIdForInvoice} during invoice.payment_succeeded`);
      //   //    break;
      //   // }
      //   // const mongoUserIdForInvoice = userToUpdate.id;
        
      //   // const newEndDate = new Date(subscriptionDetails.current_period_end * 1000);
      //   // await updateUserInMongoDB(mongoUserIdForInvoice, { 
      //   //   subscriptionEndDate: newEndDate,
      //   //   isPremium: true, // Ensure still premium
      //   //   // Optionally update plan if it can change mid-cycle (rare)
      //   //   // subscriptionPlan: subscriptionDetails.items.data[0]?.price.metadata?.planId || subscriptionDetails.items.data[0]?.price.lookup_key,
      //   // });
      //   console.log(`✅ Invoice payment succeeded for subscription: ${stripeSubscriptionIdForInvoice}. User ${mongoUserIdForInvoice} subscription end date updated to ${newEndDate}.`);
      // }
      // TODO: Send payment receipt email (optional, Stripe can also do this)
      break;

    case 'invoice.payment_failed':
      // const failedInvoice = event.data.object as Stripe.Invoice;
      // const stripeSubscriptionIdForFailed = failedInvoice.subscription as string;
      // console.log(`⚠️ Invoice payment failed for subscription: ${stripeSubscriptionIdForFailed}`);
      // // const userWithFailedPayment = await UserModel.findOne({ stripeSubscriptionId: stripeSubscriptionIdForFailed });
      // // if (userWithFailedPayment) {
      // //   const mongoUserIdFailed = userWithFailedPayment.id;
      // //   // Handle failed payment:
      // //   // - Notify user
      // //   // - Optionally, update DB to reflect payment issue (e.g., a grace period status)
      // //   // Stripe will typically retry payments. If all retries fail, a customer.subscription.updated or .deleted event will follow.
      // //   await updateUserInMongoDB(mongoUserIdFailed, { /* some_status_indicating_payment_issue */ });
      // //   console.log(`⚠️ User ${mongoUserIdFailed} payment failed. Notified and status updated.`);
      // //   TODO: Send payment failed email
      // // } else {
      // //    console.error(`🔴 User not found for subscription ID: ${stripeSubscriptionIdForFailed} during invoice.payment_failed`);
      // // }
      break;
      
    case 'customer.subscription.updated':
      // const updatedSubscription = event.data.object as Stripe.Subscription;
      // console.log(`🔄 Subscription updated: ${updatedSubscription.id}, Status: ${updatedSubscription.status}`);
      // const customerIdForUpdate = updatedSubscription.customer as string;
      // // const userToUpdateSubscription = await UserModel.findOne({ stripeCustomerId: customerIdForUpdate });
      // // if (!userToUpdateSubscription) {
      // //   console.error(`🔴 User not found for Stripe Customer ID: ${customerIdForUpdate} during customer.subscription.updated`);
      // //   break;
      // // }
      // // const mongoUserIdUpdated = userToUpdateSubscription.id;

      // // const newEndDateUpdated = updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000) : null;
      // // const newPlanUpdated = updatedSubscription.items.data[0]?.price.metadata?.planId || updatedSubscription.items.data[0]?.price.lookup_key;
      // // const newIsPremiumStatus = updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing';

      // // await updateUserInMongoDB(mongoUserIdUpdated, { 
      // //   isPremium: newIsPremiumStatus,
      // //   subscriptionPlan: newPlanUpdated as any,
      // //   subscriptionEndDate: newEndDateUpdated,
      // //   stripeSubscriptionId: updatedSubscription.id, // Ensure it's up-to-date
      // // });
      // // console.log(`🔄 User ${mongoUserIdUpdated} subscription updated. Status: ${updatedSubscription.status}, Plan: ${newPlanUpdated}, isPremium: ${newIsPremiumStatus}`);
      break;

    case 'customer.subscription.deleted': // Or 'customer.subscription.updated' with status 'canceled'
      // const deletedSubscription = event.data.object as Stripe.Subscription;
      // console.log(`🚫 Subscription deleted/canceled: ${deletedSubscription.id}`);
      // const customerIdForDelete = deletedSubscription.customer as string;
      // // const userWithDeletedSubscription = await UserModel.findOne({ stripeCustomerId: customerIdForDelete });
      // // if (!userWithDeletedSubscription) {
      // //   console.error(`🔴 User not found for Stripe Customer ID: ${customerIdForDelete} during customer.subscription.deleted`);
      // //   break;
      // // }
      // // const mongoUserIdDeleted = userWithDeletedSubscription.id;

      // // await updateUserInMongoDB(mongoUserIdDeleted, { 
      // //   isPremium: false, 
      // //   subscriptionPlan: null,
      // //   stripeSubscriptionId: null, // Or keep it for history but mark inactive
      // //   subscriptionEndDate: deletedSubscription.ended_at ? new Date(deletedSubscription.ended_at * 1000) : null, // When it actually ended
      // // });
      // // console.log(`🚫 User ${mongoUserIdDeleted} premium access revoked due to subscription cancellation/deletion.`);
      // // TODO: Send subscription canceled email (optional)
      break;
      
    default:
      console.warn(`🤷‍♀️ Unhandled Stripe event type: ${event.type}`);
  }

  return NextResponse.json({ received: true, event_type: event.type });
}

// Helper function to get Stripe instance (ensure singleton)
// let stripeInstance: Stripe | null = null;
// const getStripeInstance = (): Stripe => {
//   if (!stripeInstance) {
//     if (!process.env.STRIPE_SECRET_KEY) {
//       throw new Error("Stripe secret key is not configured.");
//     }
//     stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
//       apiVersion: '2024-06-20',
//       typescript: true,
//     });
//   }
//   return stripeInstance;
// };
