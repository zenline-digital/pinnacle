import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO milestones (goal_id,title,description,due_date,order_index) VALUES (${b.goal_id},${b.title},${b.description||null},${b.due_date||null},${b.order_index||0}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`UPDATE milestones SET title=${b.title},description=${b.description||null},due_date=${b.due_date||null},status=${b.status} WHERE id=${b.id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json(); await sql`DELETE FROM milestones WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
