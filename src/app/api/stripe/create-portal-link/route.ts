
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/firebaseConfig';
import { getUserFromMongoDB } from '@/lib/mongoUserService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export async function POST(request: NextRequest) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  }

  try {
    const appUser = await getUserFromMongoDB(firebaseUser.uid);
    if (!appUser || !appUser.stripeCustomerId) {
      return NextResponse.json({ success: false, message: 'Stripe customer ID not found for this user. No active subscription to manage or user profile error.' }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: appUser.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/dashboard/profile`,
    });

    return NextResponse.json({ success: true, url: portalSession.url });

  } catch (error: any) {
    console.error('Error creating Stripe Billing Portal session:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to create Stripe Billing Portal session.' }, { status: 500 });
  }
}
