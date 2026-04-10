import { getTodayTotals, getGoals, getCurrentCaffeineLevel, getDailyTotals, getTodayHourly } from '@/lib/db';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'today';

  const totals = getTodayTotals();
  const goals = getGoals();
  const activeCaffeine = getCurrentCaffeineLevel();
  const hourly = getTodayHourly();

  // Calculate date range for historical data
  const now = new Date();
  let startDate: string;
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString().split('T')[0];
  } else if (range === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString().split('T')[0];
  } else {
    startDate = now.toISOString().split('T')[0];
  }
  const endDate = now.toISOString().split('T')[0];

  const dailyTotals = range !== 'today' ? getDailyTotals(startDate, endDate) : [];

  // Calculate calories from macros
  const protein = totals['protein'] || 0;
  const carbs = totals['carbs'] || 0;
  const fat = totals['fat'] || 0;
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

  // Determine caffeine safety
  const hour = now.getHours();
  const caffeineWarning =
    activeCaffeine > 400
      ? 'You have exceeded the daily recommended caffeine limit!'
      : activeCaffeine > 300
        ? 'Approaching daily caffeine limit. Consider slowing down.'
        : hour >= 14 && (totals['caffeine'] || 0) > 0
          ? 'Consider avoiding caffeine after 2 PM for better sleep.'
          : null;

  return Response.json({
    totals: { ...totals, calories },
    goals: Object.fromEntries(goals.map(g => [g.type, g])),
    activeCaffeine,
    caffeineWarning,
    hourly,
    dailyTotals,
    currentHour: hour,
  });
}
