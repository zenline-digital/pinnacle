import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  const month = searchParams.get('month'); // YYYY-MM
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  let query = sql`
    SELECT t.*, a.name as account_name, a.bank_name, a.color as account_color
    FROM transactions t
    JOIN bank_accounts a ON a.id = t.account_id
    WHERE 1=1
  `;

  // Build conditions
  const conditions: string[] = [];
  const values: any[] = [];

  if (accountId) {
    const result = await sql`
      SELECT t.*, a.name as account_name, a.bank_name, a.color as account_color
      FROM transactions t
      JOIN bank_accounts a ON a.id = t.account_id
      WHERE t.account_id = ${accountId}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countResult = await sql`SELECT COUNT(*) FROM transactions WHERE account_id = ${accountId}`;
    return NextResponse.json({ transactions: result.rows, total: parseInt(countResult.rows[0].count) });
  }

  if (month) {
    const result = await sql`
      SELECT t.*, a.name as account_name, a.bank_name, a.color as account_color
      FROM transactions t
      JOIN bank_accounts a ON a.id = t.account_id
      WHERE to_char(t.date, 'YYYY-MM') = ${month}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countResult = await sql`SELECT COUNT(*) FROM transactions WHERE to_char(date, 'YYYY-MM') = ${month}`;
    return NextResponse.json({ transactions: result.rows, total: parseInt(countResult.rows[0].count) });
  }

  const result = await sql`
    SELECT t.*, a.name as account_name, a.bank_name, a.color as account_color
    FROM transactions t
    JOIN bank_accounts a ON a.id = t.account_id
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const countResult = await sql`SELECT COUNT(*) FROM transactions`;
  return NextResponse.json({ transactions: result.rows, total: parseInt(countResult.rows[0].count) });
}

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { account_id, date, description, amount, type, category, is_fixed, custom_label, reference } = body;

  const result = await sql`
    INSERT INTO transactions (account_id, date, description, amount, type, category, is_fixed, custom_label, reference)
    VALUES (${account_id}, ${date}, ${description}, ${amount}, ${type}, ${category || 'Uncategorized'}, ${is_fixed || false}, ${custom_label || null}, ${reference || null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}
