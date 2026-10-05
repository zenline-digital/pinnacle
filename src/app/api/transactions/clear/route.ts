import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function POST() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tx = await sql`DELETE FROM transactions`;
  const st = await sql`DELETE FROM bank_statements`;
  const ac = await sql`UPDATE bank_accounts SET is_active=false WHERE is_active=true`;
  return NextResponse.json({ ok: true, transactions_deleted: tx.rowCount, statements_deleted: st.rowCount, accounts_hidden: ac.rowCount });
}
