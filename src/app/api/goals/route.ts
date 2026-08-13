import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getSession } from '@/lib/auth';

// GET full goal tree: life goal → areas → goals → milestones → tasks
export async function GET() {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lifeGoals = await sql`SELECT * FROM life_goals ORDER BY created_at ASC LIMIT 1`;
  if (lifeGoals.rows.length === 0) return NextResponse.json(null);

  const lifeGoal = lifeGoals.rows[0];

  const areas = await sql`SELECT * FROM goal_areas WHERE life_goal_id = ${lifeGoal.id} ORDER BY priority_order ASC`;
  const goals = await sql`
    SELECT g.* FROM goals g
    JOIN goal_areas ga ON ga.id = g.area_id
    WHERE ga.life_goal_id = ${lifeGoal.id}
    ORDER BY g.created_at ASC
  `;
  const milestones = await sql`
    SELECT m.* FROM milestones m
    JOIN goals g ON g.id = m.goal_id
    JOIN goal_areas ga ON ga.id = g.area_id
    WHERE ga.life_goal_id = ${lifeGoal.id}
    ORDER BY m.order_index ASC
  `;
  const tasks = await sql`
    SELECT t.* FROM tasks t
    JOIN milestones m ON m.id = t.milestone_id
    JOIN goals g ON g.id = m.goal_id
    JOIN goal_areas ga ON ga.id = g.area_id
    WHERE ga.life_goal_id = ${lifeGoal.id}
    ORDER BY t.priority DESC
  `;

  // Assemble tree
  const tasksByMilestone = tasks.rows.reduce((acc: any, t: any) => {
    if (!acc[t.milestone_id]) acc[t.milestone_id] = [];
    acc[t.milestone_id].push(t);
    return acc;
  }, {});

  const milestonesByGoal = milestones.rows.reduce((acc: any, m: any) => {
    if (!acc[m.goal_id]) acc[m.goal_id] = [];
    acc[m.goal_id].push({ ...m, tasks: tasksByMilestone[m.id] || [] });
    return acc;
  }, {});

  const goalsByArea = goals.rows.reduce((acc: any, g: any) => {
    if (!acc[g.area_id]) acc[g.area_id] = [];
    acc[g.area_id].push({ ...g, milestones: milestonesByGoal[g.id] || [] });
    return acc;
  }, {});

  const areasWithGoals = areas.rows.map((a: any) => ({
    ...a,
    goals: goalsByArea[a.id] || [],
  }));

  return NextResponse.json({ ...lifeGoal, areas: areasWithGoals });
}

export async function POST(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { title, description, vision_statement, target_year } = body;

  // Only one life goal allowed
  await sql`DELETE FROM life_goals`;
  const result = await sql`
    INSERT INTO life_goals (title, description, vision_statement, target_year)
    VALUES (${title}, ${description}, ${vision_statement}, ${target_year})
    RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}

export async function PUT(req: NextRequest) {
  if (!await getSession()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, title, description, vision_statement, target_year, status } = body;
  const result = await sql`
    UPDATE life_goals SET title=${title}, description=${description},
    vision_statement=${vision_statement}, target_year=${target_year}, status=${status}
    WHERE id=${id} RETURNING *
  `;
  return NextResponse.json(result.rows[0]);
}
