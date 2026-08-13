import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get('months') || '6');

  // Monthly summary
  const monthly = await sql`
    SELECT
      to_char(date, 'YYYY-MM') as month,
      SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_expense,
      SUM(CASE WHEN type = 'debit' AND is_fixed = true THEN amount ELSE 0 END) as fixed_expenses,
      SUM(CASE WHEN type = 'debit' AND is_fixed = false THEN amount ELSE 0 END) as variable_expenses,
      COUNT(CASE WHEN type = 'debit' THEN 1 END) as expense_count,
      COUNT(CASE WHEN type = 'credit' THEN 1 END) as income_count
    FROM transactions
    WHERE date >= CURRENT_DATE - INTERVAL '1 month' * ${months}
    GROUP BY to_char(date, 'YYYY-MM')
    ORDER BY month DESC
  `;

  // Category breakdown (last 3 months)
  const categories = await sql`
    SELECT
      category,
      type,
      is_fixed,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions
    WHERE date >= CURRENT_DATE - INTERVAL '3 months'
      AND type = 'debit'
    GROUP BY category, type, is_fixed
    ORDER BY total DESC
  `;

  // Top expense descriptions
  const topExpenses = await sql`
    SELECT description, category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'debit'
      AND date >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY description, category
    ORDER BY total DESC
    LIMIT 10
  `;

  // Account balances
  const balances = await sql`
    SELECT a.id, a.name, a.bank_name, a.color, a.account_type,
      COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE -t.amount END), 0) as balance
    FROM bank_accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    WHERE a.is_active = true
    GROUP BY a.id, a.name, a.bank_name, a.color, a.account_type
  `;

  return NextResponse.json({
    monthly: monthly.rows,
    categories: categories.rows,
    topExpenses: topExpenses.rows,
    balances: balances.rows,
  });
}
