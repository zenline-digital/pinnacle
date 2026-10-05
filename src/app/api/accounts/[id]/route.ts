import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params; const b = await req.json();
  const r = await sql`UPDATE bank_accounts SET name=${b.name},bank_name=${b.bank_name},account_number=${b.account_number||null},account_type=${b.account_type},color=${b.color},credit_limit=${b.credit_limit||null},payment_due_date=${b.payment_due_date||null},minimum_payment=${b.minimum_payment||null},iban=${b.iban||null},account_holder_name=${b.account_holder_name||null},branch=${b.branch||null},swift_bic=${b.swift_bic||null} WHERE id=${id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params; await sql`UPDATE bank_accounts SET is_active=false WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
