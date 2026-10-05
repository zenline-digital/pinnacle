import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get('months') || '6');
  const totals = await sql`
    SELECT
      to_char(date, 'YYYY-MM') as month,
      to_char(date, 'Mon YYYY') as month_label,
      SUM(amount) as total_fixed,
      SUM(CASE WHEN category = 'Loan Repayment' THEN amount ELSE 0 END) as loans,
      SUM(CASE WHEN category = 'Rent' THEN amount ELSE 0 END) as rent,
      SUM(CASE WHEN category = 'Credit Card Payment' THEN amount ELSE 0 END) as credit_cards,
      SUM(CASE WHEN category = 'Insurance' THEN amount ELSE 0 END) as insurance,
      SUM(CASE WHEN category = 'Utilities' THEN amount ELSE 0 END) as utilities,
      SUM(CASE WHEN category = 'Subscription' THEN amount ELSE 0 END) as subscriptions
    FROM transactions
    WHERE type = 'debit' AND is_fixed = true
      AND date >= CURRENT_DATE - INTERVAL '1 month' * ${months}
    GROUP BY to_char(date, 'YYYY-MM'), to_char(date, 'Mon YYYY')
    ORDER BY month DESC
  `;
  return NextResponse.json({ totals: totals.rows });
}
