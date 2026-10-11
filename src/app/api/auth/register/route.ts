import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signToken, COOKIE_NAME } from '@/lib/auth';
import { findUserByEmail, createUser } from '@/lib/db-repository';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`register_${ip}`, 10, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many account creation attempts. Please wait a moment and try again.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, password, timezone } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      timezone: timezone || 'Asia/Kolkata',
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    });

    const response = NextResponse.json({
      message: 'Account registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
      },
      token,
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('[Register API Error]', sanitizeErrorMessage(err));
    return NextResponse.json({ error: sanitizeErrorMessage(err) || 'Internal server error' }, { status: 500 });
  }
}
