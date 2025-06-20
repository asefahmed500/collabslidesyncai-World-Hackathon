
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/firebaseConfig'; // For getting current user
import { getUserFromMongoDB } from '@/lib/mongoUserService'; // To get full user details if needed

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// IMPORTANT: Replace these with your actual Stripe Price IDs from your Stripe Dashboard
// You need to create products (e.g., "Premium Plan Monthly", "Premium Plan Yearly")
// and then create prices for them in Stripe.
const STRIPE_PRICE_IDS = {
  premium_monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_replace_with_your_monthly_id',
  premium_yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_replace_with_your_yearly_id',
  // Add more plans if needed
};

export async function POST(request: NextRequest) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid JSON body.' }, { status: 400 });
  }

  const { planId } = body as { planId: keyof typeof STRIPE_PRICE_IDS };

  if (!planId || !STRIPE_PRICE_IDS[planId]) {
    return NextResponse.json({ success: false, message: 'Invalid or missing plan ID.' }, { status: 400 });
  }
  if (STRIPE_PRICE_IDS[planId].startsWith('price_replace_')) {
    console.error(`ERROR: Stripe Price ID for plan '${planId}' is still a placeholder. Please update it in your environment or directly in the API route.`);
    return NextResponse.json({ success: false, message: `Stripe configuration error for plan '${planId}'. Please contact support.` }, { status: 500 });
  }

  const appUser = await getUserFromMongoDB(firebaseUser.uid);
  if (!appUser) {
    return NextResponse.json({ success: false, message: 'User profile not found.' }, { status: 404 });
  }

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard/profile?subscription_success=true`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard/profile?subscription_canceled=true`;

  try {
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'], // Add 'apple_pay', 'google_pay' etc. as needed and configured in Stripe
      line_items: [
        {
          price: STRIPE_PRICE_IDS[planId],
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: appUser.email || undefined, // Pre-fill email if available
      client_reference_id: appUser.id, // Your internal user ID
      metadata: {
        userId: appUser.id, // Pass your internal user ID
        planId: planId,     // Pass the selected plan ID
      },
    };
    
    // If user already has a stripeCustomerId, use it to link the new subscription
    if (appUser.stripeCustomerId) {
        checkoutSessionParams.customer = appUser.stripeCustomerId;
    }


    const session = await stripe.checkout.sessions.create(checkoutSessionParams);

    if (!session.url) {
        console.error("Stripe Checkout Session created without a URL:", session);
        return NextResponse.json({ success: false, message: "Could not create Stripe Checkout session URL." }, { status: 500 });
    }

    return NextResponse.json({ success: true, sessionId: session.id, url: session.url });

  } catch (error: any) {
    console.error('Error creating Stripe Checkout session:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to create Stripe Checkout session.' }, { status: 500 });
  }
}
