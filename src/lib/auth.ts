import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'remindo_fallback_dev_secret_key_38472910';
const COOKIE_NAME = 'remindo_session';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  timezone: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function getSessionUser(request: NextRequest): TokenPayload | null {
  // 1. Try reading HTTP-only cookie
  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value) {
    const verified = verifyToken(cookie.value);
    if (verified) return verified;
  }

  // 2. Try Authorization Bearer header (for Android / API calls)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verified = verifyToken(token);
    if (verified) return verified;
  }

  return null;
}

export { COOKIE_NAME };
