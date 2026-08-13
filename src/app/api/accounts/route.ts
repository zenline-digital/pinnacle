import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await sql`
    SELECT a.*,
      COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) as computed_balance,
      COUNT(t.id) as transaction_count
    FROM bank_accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id
    ORDER BY a.created_at ASC
  `;
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, bank_name, account_number, account_type, currency, color, icon, credit_limit, payment_due_date, minimum_payment } = body;

  const result = await sql`
    INSERT INTO bank_accounts (name, bank_name, account_number, account_type, currency, color, icon, credit_limit, payment_due_date, minimum_payment)
    VALUES (${name}, ${bank_name}, ${account_number}, ${account_type || 'current'}, ${currency || 'AED'}, ${color || '#6366f1'}, ${icon || 'bank'}, ${credit_limit || null}, ${payment_due_date || null}, ${minimum_payment || null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}
