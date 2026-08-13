import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { area_id, title, description, target_date, status, priority, linked_amount } = await req.json();
  const result = await sql`
    INSERT INTO goals (area_id, title, description, target_date, status, priority, linked_amount)
    VALUES (${area_id}, ${title}, ${description || null}, ${target_date || null}, ${status || 'not_started'}, ${priority || 'medium'}, ${linked_amount || null})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, title, description, target_date, status, priority, linked_amount } = await req.json();
  const result = await sql`
    UPDATE goals SET title=${title}, description=${description}, target_date=${target_date || null},
    status=${status}, priority=${priority}, linked_amount=${linked_amount || null}
    WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await sql`DELETE FROM goals WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
