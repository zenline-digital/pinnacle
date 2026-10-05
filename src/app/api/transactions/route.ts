import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function GET(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id'), month = searchParams.get('month'), type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1'), limit = parseInt(searchParams.get('limit') || '50'), offset = (page-1)*limit;
  if (accountId) {
    const r = await sql`SELECT t.*,a.name as account_name,a.bank_name,a.color as account_color FROM transactions t JOIN bank_accounts a ON a.id=t.account_id WHERE t.account_id=${accountId} ORDER BY t.date DESC,t.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const c = await sql`SELECT COUNT(*) FROM transactions WHERE account_id=${accountId}`;
    return NextResponse.json({ transactions: r.rows, total: parseInt(c.rows[0].count) });
  }
  if (month && type) {
    const r = await sql`SELECT t.*,a.name as account_name,a.bank_name,a.color as account_color FROM transactions t JOIN bank_accounts a ON a.id=t.account_id WHERE to_char(t.date,'YYYY-MM')=${month} AND t.type=${type} ORDER BY t.date DESC LIMIT ${limit} OFFSET ${offset}`;
    const c = await sql`SELECT COUNT(*) FROM transactions WHERE to_char(date,'YYYY-MM')=${month} AND type=${type}`;
    return NextResponse.json({ transactions: r.rows, total: parseInt(c.rows[0].count) });
  }
  if (month) {
    const r = await sql`SELECT t.*,a.name as account_name,a.bank_name,a.color as account_color FROM transactions t JOIN bank_accounts a ON a.id=t.account_id WHERE to_char(t.date,'YYYY-MM')=${month} ORDER BY t.date DESC LIMIT ${limit} OFFSET ${offset}`;
    const c = await sql`SELECT COUNT(*) FROM transactions WHERE to_char(date,'YYYY-MM')=${month}`;
    return NextResponse.json({ transactions: r.rows, total: parseInt(c.rows[0].count) });
  }
  const r = await sql`SELECT t.*,a.name as account_name,a.bank_name,a.color as account_color FROM transactions t JOIN bank_accounts a ON a.id=t.account_id ORDER BY t.date DESC,t.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const c = await sql`SELECT COUNT(*) FROM transactions`;
  return NextResponse.json({ transactions: r.rows, total: parseInt(c.rows[0].count) });
}
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO transactions (account_id,date,description,amount,type,category,is_fixed,custom_label,reference) VALUES (${b.account_id},${b.date},${b.description},${b.amount},${b.type},${b.category||'Uncategorized'},${b.is_fixed||false},${b.custom_label||null},${b.reference||null}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
