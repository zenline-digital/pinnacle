import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const months = parseInt(searchParams.get('months') || '6'), month = searchParams.get('month');
  const monthly = await sql`SELECT to_char(date,'YYYY-MM') as month, SUM(CASE WHEN type='credit' THEN amount ELSE 0 END) as total_income, SUM(CASE WHEN type='debit' THEN amount ELSE 0 END) as total_expense, SUM(CASE WHEN type='debit' AND is_fixed=true THEN amount ELSE 0 END) as fixed_expenses, SUM(CASE WHEN type='debit' AND is_fixed=false THEN amount ELSE 0 END) as variable_expenses FROM transactions WHERE date>=CURRENT_DATE-INTERVAL '1 month'*${months} GROUP BY to_char(date,'YYYY-MM') ORDER BY month DESC`;
  const categories = month ? await sql`SELECT category,is_fixed,SUM(amount) as total,COUNT(*) as count FROM transactions WHERE type='debit' AND to_char(date,'YYYY-MM')=${month} GROUP BY category,is_fixed ORDER BY total DESC` : await sql`SELECT category,is_fixed,SUM(amount) as total,COUNT(*) as count FROM transactions WHERE type='debit' AND date>=CURRENT_DATE-INTERVAL '3 months' GROUP BY category,is_fixed ORDER BY total DESC`;
  const topExpenses = await sql`SELECT description,category,SUM(amount) as total,COUNT(*) as count FROM transactions WHERE type='debit' AND date>=CURRENT_DATE-INTERVAL '3 months' GROUP BY description,category ORDER BY total DESC LIMIT 10`;
  const balances = await sql`SELECT a.id,a.name,a.bank_name,a.color,a.account_type,COALESCE(SUM(CASE WHEN t.type='credit' THEN t.amount ELSE -t.amount END),0) as balance FROM bank_accounts a LEFT JOIN transactions t ON t.account_id=a.id WHERE a.is_active=true GROUP BY a.id,a.name,a.bank_name,a.color,a.account_type`;
  return NextResponse.json({ monthly: monthly.rows, categories: categories.rows, topExpenses: topExpenses.rows, balances: balances.rows });
}
