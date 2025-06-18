import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmailFromMongoDB } from '@/lib/mongoUserService';
import dbConnect from '@/lib/mongodb'; // Ensure db connection

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email query parameter is required' }, { status: 400 });
  }

  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email query parameter is required' }, { status: 400 });
  }

  try {
    await dbConnect(); // Ensure database connection is established
    const user = await getUserByEmailFromMongoDB(email);
    return NextResponse.json({ exists: !!user });
  } catch (error) {
    console.error('Error checking email existence:', error);
    return NextResponse.json({ error: 'Internal server error while checking email' }, { status: 500 });
  }
}
