import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`INSERT INTO goal_areas (life_goal_id,name,icon,color,priority_order) VALUES (${b.life_goal_id},${b.name},${b.icon||'target'},${b.color||'#6366f1'},${b.priority_order||0}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`UPDATE goal_areas SET name=${b.name},icon=${b.icon},color=${b.color} WHERE id=${b.id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function DELETE(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json(); await sql`DELETE FROM goal_areas WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
