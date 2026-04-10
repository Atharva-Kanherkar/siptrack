import { getTodayTotals, getGoals, getCurrentCaffeineLevel, getDailyTotals, getTodayHourly, getProfile, calculateRecommendations } from '@/lib/db';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  const totals = getTodayTotals();
  const goals = getGoals();
  const activeCaffeine = getCurrentCaffeineLevel();
  const hourly = getTodayHourly();
  const profile = getProfile();

  // Get last 7 days of data
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const dailyTotals = getDailyTotals(
    weekAgo.toISOString().split('T')[0],
    now.toISOString().split('T')[0]
  );

  const protein = totals['protein'] || 0;
  const carbs = totals['carbs'] || 0;
  const fat = totals['fat'] || 0;
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

  const goalsMap = Object.fromEntries(goals.map(g => [g.type, g]));

  const profileContext = profile
    ? `\nUser profile: ${profile.weight_kg}kg, ${profile.height_cm}cm, ${profile.age}yo ${profile.sex}, ${profile.activity_level} activity, goal: ${profile.goal}\nRecommendations: ${JSON.stringify(calculateRecommendations(profile))}`
    : '';

  const dataContext = `
Current time: ${now.toLocaleTimeString()}
Today's intake:
- Water: ${totals['water'] || 0}ml / ${goalsMap['water']?.target || 2500}ml goal
- Caffeine consumed: ${totals['caffeine'] || 0}mg / ${goalsMap['caffeine']?.target || 400}mg limit
- Active caffeine in system: ${activeCaffeine}mg
- Protein: ${protein}g / ${goalsMap['protein']?.target || 50}g goal
- Carbs: ${carbs}g / ${goalsMap['carbs']?.target || 250}g goal
- Fat: ${fat}g / ${goalsMap['fat']?.target || 65}g goal
- Estimated calories: ${calories}kcal
${profileContext}
Today's hourly breakdown: ${JSON.stringify(hourly)}
Weekly daily totals: ${JSON.stringify(dailyTotals)}
  `.trim();

  // If no API key, generate rule-based insights
  if (!apiKey) {
    const insights = generateRuleBasedInsights(totals, goalsMap, activeCaffeine, now, hourly, dailyTotals);
    return Response.json({ insights, source: 'rules' });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly health & hydration coach analyzing a user's intake data.
Give 3-5 short, actionable, encouraging insights. Use emojis sparingly.
Focus on: hydration patterns, caffeine timing, macro balance, and practical tips.
Keep each insight to 1-2 sentences. Be specific to their data.`
        },
        {
          role: 'user',
          content: dataContext
        }
      ],
      max_tokens: 500,
    });

    const insights = completion.choices[0]?.message?.content || 'No insights available.';
    return Response.json({ insights, source: 'ai' });
  } catch {
    const insights = generateRuleBasedInsights(totals, goalsMap, activeCaffeine, now, hourly, dailyTotals);
    return Response.json({ insights, source: 'rules', note: 'AI unavailable, showing rule-based insights' });
  }
}

function generateRuleBasedInsights(
  totals: Record<string, number>,
  goalsMap: Record<string, { target: number; unit: string }>,
  activeCaffeine: number,
  now: Date,
  hourly: { hour: string; type: string; total: number }[],
  dailyTotals: { date: string; type: string; total: number }[]
): string {
  const insights: string[] = [];
  const hour = now.getHours();

  // Water insights
  const water = totals['water'] || 0;
  const waterGoal = goalsMap['water']?.target || 2500;
  const waterPct = Math.round((water / waterGoal) * 100);
  if (waterPct < 30 && hour > 12) {
    insights.push(`You're only at ${waterPct}% of your water goal and it's past noon. Time to catch up! Try drinking a full glass right now.`);
  } else if (waterPct >= 100) {
    insights.push(`Amazing! You've hit your water goal of ${waterGoal}ml. Keep sipping to stay ahead!`);
  } else if (waterPct >= 70) {
    insights.push(`Great progress on hydration — ${waterPct}% of your daily goal. You're almost there!`);
  } else {
    const remaining = waterGoal - water;
    const hoursLeft = Math.max(1, 22 - hour);
    const perHour = Math.round(remaining / hoursLeft);
    insights.push(`You need about ${perHour}ml per hour to hit your water goal. That's roughly a sip every 15 minutes.`);
  }

  // Caffeine insights
  const caffeine = totals['caffeine'] || 0;
  if (caffeine > 0) {
    if (hour >= 14 && activeCaffeine > 100) {
      insights.push(`Your active caffeine level is ${activeCaffeine}mg. Since it's past 2 PM, this might affect your sleep. Caffeine has a ~5 hour half-life.`);
    } else if (activeCaffeine > 300) {
      insights.push(`Active caffeine is at ${activeCaffeine}mg — that's getting high. Consider switching to water for the next few hours.`);
    }
  }

  // Macro insights
  const protein = totals['protein'] || 0;
  const carbs = totals['carbs'] || 0;
  const fat = totals['fat'] || 0;
  const calories = protein * 4 + carbs * 4 + fat * 9;

  if (protein > 0 || carbs > 0 || fat > 0) {
    const proteinPct = calories > 0 ? Math.round((protein * 4 / calories) * 100) : 0;
    if (proteinPct < 20 && hour > 14) {
      insights.push(`Your protein intake is only ${proteinPct}% of calories. Consider a protein-rich snack to balance your macros.`);
    }
    if (calories > 0) {
      insights.push(`Macro split today: ${Math.round(protein * 4 / calories * 100)}% protein, ${Math.round(carbs * 4 / calories * 100)}% carbs, ${Math.round(fat * 9 / calories * 100)}% fat.`);
    }
  }

  // Pattern insights from weekly data
  if (dailyTotals.length > 3) {
    const waterDays = dailyTotals.filter(d => d.type === 'water');
    if (waterDays.length > 0) {
      const avgWater = Math.round(waterDays.reduce((s, d) => s + d.total, 0) / waterDays.length);
      insights.push(`Your average daily water intake this week is ${avgWater}ml. ${avgWater >= waterGoal ? 'Consistently hitting your goal!' : 'Try to be more consistent with hydration.'}`);
    }
  }

  if (insights.length === 0) {
    insights.push("Start logging your intake to get personalized insights! Even small sips count.");
  }

  return insights.join('\n\n');
}
