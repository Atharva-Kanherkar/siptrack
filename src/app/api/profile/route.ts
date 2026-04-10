import { getProfile, saveProfile, calculateRecommendations } from '@/lib/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await getProfile();
  if (!profile) {
    return Response.json({ profile: null, recommendations: null });
  }
  const recommendations = calculateRecommendations(profile);
  return Response.json({ profile, recommendations });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { weight_kg, height_cm, age, sex, activity_level, goal } = body;

  if (!weight_kg || !height_cm || !age || !sex || !activity_level || !goal) {
    return Response.json({ error: 'All fields are required' }, { status: 400 });
  }

  const profile = await saveProfile({ weight_kg, height_cm, age, sex, activity_level, goal });
  const recommendations = calculateRecommendations({ weight_kg, height_cm, age, sex, activity_level, goal });

  return Response.json({ profile, recommendations });
}
