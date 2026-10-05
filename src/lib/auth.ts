import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'pinnacle_session';

export async function hashPassword(password: string): Promise<string> { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string): Promise<boolean> { return bcrypt.compare(password, hash); }
export async function createSession() { const c = await cookies(); c.set(SESSION_COOKIE, 'authenticated', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' }); }
export async function destroySession() { const c = await cookies(); c.delete(SESSION_COOKIE); }
export async function getSession(): Promise<boolean> { const c = await cookies(); return c.get(SESSION_COOKIE)?.value === 'authenticated'; }
export async function requireAuth() { if (!await getSession()) redirect('/login'); }
export function getPasswordHash(): string { return process.env.PINNACLE_PASSWORD_HASH || ''; }
