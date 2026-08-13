import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession, getPasswordHash } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const hash = getPasswordHash();

  if (!hash) {
    // First-time setup: any password works, create hash
    const { hashPassword } = await import('@/lib/auth');
    const newHash = await hashPassword(password);
    // Store in env — in production, set PINNACLE_PASSWORD_HASH env var
    console.log('First login - password hash:', newHash);
    await createSession();
    return NextResponse.json({ ok: true });
  }

  const valid = await verifyPassword(password, hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
