import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { life_goal_id, name, icon, color, priority_order } = await req.json();
  const result = await sql`
    INSERT INTO goal_areas (life_goal_id, name, icon, color, priority_order)
    VALUES (${life_goal_id}, ${name}, ${icon || 'target'}, ${color || '#6366f1'}, ${priority_order || 0})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, name, icon, color } = await req.json();
  const result = await sql`
    UPDATE goal_areas SET name=${name}, icon=${icon}, color=${color} WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await sql`DELETE FROM goal_areas WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
