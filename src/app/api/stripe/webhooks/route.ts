
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
// import Stripe from 'stripe';
// import { updateUserInMongoDB } from '@/lib/mongoUserService';
// import dbConnect from '@/lib/mongodb';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2024-04-10', // Use the latest API version
// });

// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // const body = await request.text();
  // const signature = headers().get('stripe-signature') as string;

  // let event: Stripe.Event;

  try {
    // TODO: Enable signature verification in a real implementation
    // if (!webhookSecret) {
    //   console.error('Stripe webhook secret is not set.');
    //   return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 });
    // }
    // event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    const event = await request.json(); // For now, just parse the JSON directly without verification
    console.log('Stripe Webhook Received:', event.type, event.id);


    // TODO: Handle specific event types (checkout.session.completed, invoice.payment_succeeded, customer.subscription.deleted, etc.)
    // switch (event.type) {
    //   case 'checkout.session.completed':
    //     const session = event.data.object as Stripe.Checkout.Session;
    //     // Logic to retrieve user (e.g., from session.client_reference_id or session.customer_details.email)
    //     // and update their subscription status in MongoDB
    //     // await dbConnect();
    //     // await updateUserInMongoDB(userId, { 
    //     //   isPremium: true, 
    //     //   stripeCustomerId: session.customer as string,
    //     //   stripeSubscriptionId: session.subscription as string,
    //     //   // ... update plan details, start/end dates
    //     // });
    //     console.log('Checkout session completed:', session.id);
    //     break;
    //   case 'invoice.payment_succeeded':
    //     const invoice = event.data.object as Stripe.Invoice;
    //     // Logic to handle successful recurring payments, update subscriptionEndDate
    //     console.log('Invoice payment succeeded:', invoice.id);
    //     break;
    //   case 'customer.subscription.deleted':
    //   case 'customer.subscription.updated': // Handle cancellations or plan changes
    //     const subscription = event.data.object as Stripe.Subscription;
    //     // Logic to update user's premium status, plan, and end date in MongoDB
    //     // If subscription.status is 'canceled' or 'unpaid', set isPremium: false
    //     console.log('Subscription updated/deleted:', subscription.id, subscription.status);
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
