import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await sql`SELECT a.*, COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE -t.amount END),0) as computed_balance, COUNT(t.id) as transaction_count FROM bank_accounts a LEFT JOIN transactions t ON t.account_id=a.id WHERE a.is_active=true GROUP BY a.id ORDER BY a.created_at ASC`;
  return NextResponse.json(r.rows);
}
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO bank_accounts (name,bank_name,account_number,account_type,currency,color,icon,credit_limit,payment_due_date,minimum_payment,iban,account_holder_name,branch,swift_bic) VALUES (${b.name},${b.bank_name},${b.account_number||null},${b.account_type||'current'},${b.currency||'AED'},${b.color||'#6366f1'},${b.icon||'bank'},${b.credit_limit||null},${b.payment_due_date||null},${b.minimum_payment||null},${b.iban||null},${b.account_holder_name||null},${b.branch||null},${b.swift_bic||null}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
