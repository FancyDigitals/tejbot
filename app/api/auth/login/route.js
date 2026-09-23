import { NextResponse } from 'next/server';
import {
  createSessionToken,
  getSessionCookieName,
} from '@/lib/auth.js';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (
      !email ||
      !password ||
      email.trim().toLowerCase() !==
        process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: getSessionCookieName(),
      value: createSessionToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('[LOGIN ERROR]', error);

    return NextResponse.json(
      { success: false, message: 'Unable to sign in.' },
      { status: 500 }
    );
  }
}