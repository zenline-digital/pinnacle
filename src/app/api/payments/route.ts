import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await sql`
    SELECT p.*, a.name as account_name, a.color as account_color
    FROM payment_dues p
    LEFT JOIN bank_accounts a ON a.id = p.linked_account_id
    ORDER BY p.due_date ASC
  `;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, type, amount, due_date, frequency, linked_account_id, reminder_days_before, notes } = await req.json();
  const result = await sql`
    INSERT INTO payment_dues (name, type, amount, due_date, frequency, linked_account_id, reminder_days_before, notes)
    VALUES (${name}, ${type}, ${amount}, ${due_date}, ${frequency || 'monthly'}, ${linked_account_id || null}, ${reminder_days_before || 3}, ${notes || null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, status, name, amount, due_date } = await req.json();
  const result = await sql`
    UPDATE payment_dues SET status=${status}, name=${name}, amount=${amount}, due_date=${due_date}
    WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await sql`DELETE FROM payment_dues WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
