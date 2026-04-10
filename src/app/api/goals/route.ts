import { getGoals, updateGoal } from '@/lib/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const goals = await getGoals();
  return Response.json(goals);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { type, target } = body;

  if (!type || !target) {
    return Response.json({ error: 'type and target are required' }, { status: 400 });
  }

  if (typeof target !== 'number' || target <= 0) {
    return Response.json({ error: 'target must be a positive number' }, { status: 400 });
  }

  const goal = await updateGoal(type, target);
  return Response.json(goal);
}
