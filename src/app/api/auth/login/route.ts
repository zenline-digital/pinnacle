import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createSession, getPasswordHash, hashPassword } from '@/lib/auth';
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });
    const hash = getPasswordHash();
    if (!hash) { const newHash = await hashPassword(password); console.log('FIRST LOGIN hash:', newHash); await createSession(); return NextResponse.json({ ok: true }); }
    const valid = await verifyPassword(password, hash);
    if (!valid) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    await createSession(); return NextResponse.json({ ok: true });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
