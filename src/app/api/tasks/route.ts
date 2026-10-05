import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO tasks (milestone_id,title,note,due_date,priority) VALUES (${b.milestone_id},${b.title},${b.note||null},${b.due_date||null},${b.priority||'medium'}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`UPDATE tasks SET title=${b.title},note=${b.note||null},due_date=${b.due_date||null},status=${b.status},priority=${b.priority} WHERE id=${b.id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json(); await sql`DELETE FROM tasks WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
