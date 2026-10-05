import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await sql`UPDATE payment_dues SET status='overdue' WHERE status='pending' AND due_date<CURRENT_DATE`;
  const r = await sql`SELECT p.*,a.name as account_name,a.color as account_color FROM payment_dues p LEFT JOIN bank_accounts a ON a.id=p.linked_account_id ORDER BY p.due_date ASC`;
  return NextResponse.json(r.rows);
}
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO payment_dues (name,type,amount,due_date,frequency,linked_account_id,reminder_days_before,notes) VALUES (${b.name},${b.type},${b.amount},${b.due_date},${b.frequency||'monthly'},${b.linked_account_id||null},${b.reminder_days_before||3},${b.notes||null}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`UPDATE payment_dues SET status=${b.status},name=${b.name},amount=${b.amount},due_date=${b.due_date},frequency=${b.frequency||'monthly'},notes=${b.notes||null} WHERE id=${b.id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json(); await sql`DELETE FROM payment_dues WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
