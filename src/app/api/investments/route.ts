import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await sql`SELECT * FROM investments ORDER BY created_at DESC`;
  return NextResponse.json(r.rows);
}
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO investments (name,type,institution,amount,currency,quantity,buy_price,current_price,maturity_date,interest_rate,notes,country) VALUES (${b.name},${b.type},${b.institution||null},${b.amount},${b.currency||'INR'},${b.quantity||null},${b.buy_price||null},${b.current_price||null},${b.maturity_date||null},${b.interest_rate||null},${b.notes||null},${b.country||'India'}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`UPDATE investments SET name=${b.name},type=${b.type},institution=${b.institution||null},amount=${b.amount},currency=${b.currency||'INR'},quantity=${b.quantity||null},buy_price=${b.buy_price||null},current_price=${b.current_price||null},maturity_date=${b.maturity_date||null},interest_rate=${b.interest_rate||null},notes=${b.notes||null},country=${b.country||'India'} WHERE id=${b.id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json(); await sql`DELETE FROM investments WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
