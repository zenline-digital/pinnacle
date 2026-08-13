import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { name, bank_name, account_number, account_type, color, credit_limit, payment_due_date, minimum_payment } = body;
  const result = await sql`
    UPDATE bank_accounts SET name=${name}, bank_name=${bank_name}, account_number=${account_number},
    account_type=${account_type}, color=${color}, credit_limit=${credit_limit || null},
    payment_due_date=${payment_due_date || null}, minimum_payment=${minimum_payment || null}
    WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await sql`UPDATE bank_accounts SET is_active=false WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
