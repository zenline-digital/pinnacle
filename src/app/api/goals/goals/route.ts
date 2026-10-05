import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO goals (area_id,title,description,target_date,status,priority,linked_amount) VALUES (${b.area_id},${b.title},${b.description||null},${b.target_date||null},${b.status||'not_started'},${b.priority||'medium'},${b.linked_amount||null}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`UPDATE goals SET title=${b.title},description=${b.description||null},target_date=${b.target_date||null},status=${b.status},priority=${b.priority},linked_amount=${b.linked_amount||null} WHERE id=${b.id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json(); await sql`DELETE FROM goals WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
