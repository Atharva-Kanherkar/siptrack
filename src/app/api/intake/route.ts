import { addIntake, deleteIntake, getTodayLogs } from '@/lib/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs = await getTodayLogs();
  return Response.json(logs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, amount, unit, source, note } = body;

  if (!type || !amount || !unit) {
    return Response.json({ error: 'type, amount, and unit are required' }, { status: 400 });
  }

  const validTypes = ['water', 'caffeine', 'protein', 'carbs', 'fat'];
  if (!validTypes.includes(type)) {
    return Response.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return Response.json({ error: 'amount must be a positive number' }, { status: 400 });
  }

  const log = await addIntake(type, amount, unit, source, note);
  return Response.json(log, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const success = await deleteIntake(parseInt(id));
  if (!success) {
    return Response.json({ error: 'Log not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}
