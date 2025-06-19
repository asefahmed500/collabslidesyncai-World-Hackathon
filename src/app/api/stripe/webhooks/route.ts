
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
// import Stripe from 'stripe';
// import { updateUserInMongoDB } from '@/lib/mongoUserService'; // You'll need this
// import dbConnect from '@/lib/mongodb'; // And this

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-04-10', // Use your desired API version
// });

// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // const body = await request.text();
  // const signature = headers().get('stripe-signature') as string;

  // let event: Stripe.Event;

  try {
    // TODO: STEP 1 - Verify Stripe Webhook Signature
    // if (!webhookSecret) {
    //   console.error('Stripe webhook secret is not set.');
    //   return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
    // }
    // try {
    //   event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    // } catch (err: any) {
    //   console.error(`Webhook signature verification failed: ${err.message}`);
    //   return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    // }
    
    // For now, parsing JSON directly without verification (NOT FOR PRODUCTION)
    const event = await request.json(); 
    console.log('Stripe Webhook Received (DEV MODE - NO SIGNATURE VERIFICATION):', event.type, event.id);

    // TODO: STEP 2 - Connect to Database
    // await dbConnect();

    // TODO: STEP 3 - Handle specific event types
    // switch (event.type) {
    //   case 'checkout.session.completed':
    //     const session = event.data.object as Stripe.Checkout.Session;
    //     // const userId = session.client_reference_id; // If you pass userId from client
    //     // const stripeCustomerId = session.customer as string;
    //     // const stripeSubscriptionId = session.subscription as string;
    //     // const plan = session.metadata?.planId || 'unknown_plan'; // Example: get plan from metadata
    //     // const userEmail = session.customer_details?.email;

    //     // console.log(`Checkout session completed for user: ${userEmail || userId}, Subscription: ${stripeSubscriptionId}`);
    //     // Find user in your DB (e.g., by email or client_reference_id if passed)
    //     // Update user record in MongoDB:
    //     // await updateUserInMongoDB(userId, { 
    //     //   isPremium: true, 
    //     //   stripeCustomerId,
    //     //   stripeSubscriptionId,
    //     //   subscriptionPlan: plan, // e.g., 'premium_monthly'
    //     //   subscriptionStartDate: new Date(session.created * 1000), // Or subscription.current_period_start
    //     //   subscriptionEndDate: new Date(session.expires_at * 1000), // Or subscription.current_period_end
    //     // });
    //     // TODO: Send subscription activated email (optional)
    //     break;

    //   case 'invoice.payment_succeeded':
    //     const invoice = event.data.object as Stripe.Invoice;
    //     // const stripeSubscriptionIdForInvoice = invoice.subscription as string;
    //     // const stripeCustomerIdForInvoice = invoice.customer as string;
    //     // if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_create') {
    //     //   // Find user by stripeSubscriptionId or stripeCustomerId
    //     //   // Update subscriptionEndDate based on invoice.lines.data[0].period.end
    //     //   console.log(`Invoice payment succeeded for subscription: ${stripeSubscriptionIdForInvoice}`);
    //     //   // await updateUserInMongoDB(userId, { 
    //     //   //   subscriptionEndDate: new Date(invoice.lines.data[0].period.end * 1000),
    //     //   //   isPremium: true, // Ensure still premium
    //     //   // });
    //     // }
    //     // TODO: Send payment receipt email (optional, Stripe can also do this)
    //     break;

    //   case 'invoice.payment_failed':
    //     const failedInvoice = event.data.object as Stripe.Invoice;
    //     // const stripeSubscriptionIdForFailed = failedInvoice.subscription as string;
    //     // console.log(`Invoice payment failed for subscription: ${stripeSubscriptionIdForFailed}`);
    //     // Find user by stripeSubscriptionId
    //     // Handle failed payment:
    //     // - Notify user
    //     // - Optionally, update DB to reflect payment issue (e.g., a grace period status)
    //     // - Stripe will typically retry payments. If all retries fail, a customer.subscription.updated or .deleted event will follow.
    //     // await updateUserInMongoDB(userId, { /* some_status_indicating_payment_issue */ });
    //     // TODO: Send payment failed email
    //     break;
        
    //   case 'customer.subscription.updated':
    //     const updatedSubscription = event.data.object as Stripe.Subscription;
    //     // console.log(`Subscription updated: ${updatedSubscription.id}, Status: ${updatedSubscription.status}`);
    //     // Find user by updatedSubscription.customer as string (Stripe Customer ID) or updatedSubscription.id
    //     // Handle changes in plan, status (e.g., 'active', 'past_due', 'canceled')
    //     // const newEndDate = updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000) : null;
    //     // const newPlan = updatedSubscription.items.data[0]?.price.metadata?.planId || updatedSubscription.items.data[0]?.price.lookup_key;
    //     // await updateUserInMongoDB(userId, { 
    //     //   isPremium: updatedSubscription.status === 'active' || updatedSubscription.status === 'trialing',
    //     //   subscriptionPlan: newPlan,
    //     //   subscriptionEndDate: newEndDate,
    //     //   stripeSubscriptionId: updatedSubscription.id, // Ensure it's up-to-date
    //     // });
    //     break;

    //   case 'customer.subscription.deleted': // Or 'customer.subscription.updated' with status 'canceled'
    //     const deletedSubscription = event.data.object as Stripe.Subscription;
    //     // console.log(`Subscription deleted/canceled: ${deletedSubscription.id}`);
    //     // Find user by deletedSubscription.customer as string (Stripe Customer ID) or deletedSubscription.id
    //     // Update user record in MongoDB:
    //     // await updateUserInMongoDB(userId, { 
    //     //   isPremium: false, 
    //     //   subscriptionPlan: null,
    //     //   stripeSubscriptionId: null, // Or keep it for history but mark inactive
    //     //   subscriptionEndDate: new Date(deletedSubscription.ended_at! * 1000), // When it actually ended
    //     // });
    //     // TODO: Send subscription canceled email (optional)
    //     break;
        
    //   default:
    //     console.warn(`Unhandled Stripe event type: ${event.type}`);
    // }

    return NextResponse.json({ received: true, event_type: event.type });
  } catch (err: any) {
    console.error('Error processing Stripe webhook:', err);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
}
