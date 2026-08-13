import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { milestone_id, title, note, due_date, priority } = await req.json();
  const result = await sql`
    INSERT INTO tasks (milestone_id, title, note, due_date, priority)
    VALUES (${milestone_id}, ${title}, ${note || null}, ${due_date || null}, ${priority || 'medium'})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, title, note, due_date, status, priority } = await req.json();
  const result = await sql`
    UPDATE tasks SET title=${title}, note=${note}, due_date=${due_date || null}, status=${status}, priority=${priority}
    WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await sql`DELETE FROM tasks WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
