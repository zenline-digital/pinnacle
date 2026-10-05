import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
import { categorizeTransaction } from '@/lib/categorize';
export async function POST() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const txs = await sql`SELECT id,description,type FROM transactions`;
  let updated = 0;
  for (const tx of txs.rows) {
    const { category, isFixed } = categorizeTransaction(tx.description, tx.type);
    const r = await sql`UPDATE transactions SET category=${category},is_fixed=${isFixed} WHERE id=${tx.id} AND (category!=${category} OR is_fixed!=${isFixed})`;
    if ((r.rowCount||0) > 0) updated++;
  }
  return NextResponse.json({ ok: true, processed: txs.rows.length, updated });
}
