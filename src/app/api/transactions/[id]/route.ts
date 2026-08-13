import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { category, custom_label, is_fixed } = body;
  const result = await sql`
    UPDATE transactions SET category=${category}, custom_label=${custom_label || null}, is_fixed=${is_fixed || false}
    WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await sql`DELETE FROM transactions WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}
