import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { goal_id, title, description, due_date, order_index } = await req.json();
  const result = await sql`
    INSERT INTO milestones (goal_id, title, description, due_date, order_index)
    VALUES (${goal_id}, ${title}, ${description || null}, ${due_date || null}, ${order_index || 0})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, title, description, due_date, status } = await req.json();
  const result = await sql`
    UPDATE milestones SET title=${title}, description=${description}, due_date=${due_date || null}, status=${status}
    WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await sql`DELETE FROM milestones WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
