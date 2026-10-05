import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';
export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const lg = await sql`SELECT * FROM life_goals ORDER BY created_at ASC LIMIT 1`;
  if (!lg.rows.length) return NextResponse.json(null);
  const lifeGoal = lg.rows[0];
  const areas = await sql`SELECT * FROM goal_areas WHERE life_goal_id=${lifeGoal.id} ORDER BY priority_order ASC`;
  const goals = await sql`SELECT g.* FROM goals g JOIN goal_areas ga ON ga.id=g.area_id WHERE ga.life_goal_id=${lifeGoal.id} ORDER BY g.created_at ASC`;
  const milestones = await sql`SELECT m.* FROM milestones m JOIN goals g ON g.id=m.goal_id JOIN goal_areas ga ON ga.id=g.area_id WHERE ga.life_goal_id=${lifeGoal.id} ORDER BY m.order_index ASC`;
  const tasks = await sql`SELECT t.* FROM tasks t JOIN milestones m ON m.id=t.milestone_id JOIN goals g ON g.id=m.goal_id JOIN goal_areas ga ON ga.id=g.area_id WHERE ga.life_goal_id=${lifeGoal.id}`;
  const tasksByM: any = {}; tasks.rows.forEach((t: any) => { if (!tasksByM[t.milestone_id]) tasksByM[t.milestone_id]=[]; tasksByM[t.milestone_id].push(t); });
  const msByG: any = {}; milestones.rows.forEach((m: any) => { if (!msByG[m.goal_id]) msByG[m.goal_id]=[]; msByG[m.goal_id].push({...m,tasks:tasksByM[m.id]||[]}); });
  const gsByA: any = {}; goals.rows.forEach((g: any) => { if (!gsByA[g.area_id]) gsByA[g.area_id]=[]; gsByA[g.area_id].push({...g,milestones:msByG[g.id]||[]}); });
  return NextResponse.json({...lifeGoal,areas:areas.rows.map((a:any)=>({...a,goals:gsByA[a.id]||[]}))});
}
export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json(); await sql`DELETE FROM life_goals`;
  const r = await sql`INSERT INTO life_goals (title,description,vision_statement,target_year) VALUES (${b.title},${b.description||null},${b.vision_statement||null},${b.target_year||null}) RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await req.json();
  const r = await sql`UPDATE life_goals SET title=${b.title},description=${b.description||null},vision_statement=${b.vision_statement||null},target_year=${b.target_year||null},status=${b.status||'active'} WHERE id=${b.id} RETURNING *`;
  return NextResponse.json(r.rows[0]);
}
