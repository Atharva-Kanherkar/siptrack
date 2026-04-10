import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;
let initialized = false;

function getClient(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:siptrack.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

async function ensureInitialized() {
  if (initialized) return;
  const db = getClient();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS intake_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('water', 'caffeine', 'protein', 'carbs', 'fat')),
      amount REAL NOT NULL,
      unit TEXT NOT NULL,
      source TEXT,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS daily_goals (
      type TEXT PRIMARY KEY,
      target REAL NOT NULL,
      unit TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_intake_type_date ON intake_logs(type, created_at);

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight_kg REAL NOT NULL,
      height_cm REAL NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL CHECK(sex IN ('male', 'female')),
      activity_level TEXT NOT NULL CHECK(activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
      goal TEXT NOT NULL CHECK(goal IN ('cut', 'maintain', 'bulk')),
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Seed default goals if empty
  const count = await db.execute('SELECT COUNT(*) as c FROM daily_goals');
  if ((count.rows[0]?.c as number) === 0) {
    const defaults: [string, number, string][] = [
      ['water', 2500, 'ml'],
      ['caffeine', 400, 'mg'],
      ['protein', 50, 'g'],
      ['carbs', 250, 'g'],
      ['fat', 65, 'g'],
    ];
    for (const [type, target, unit] of defaults) {
      await db.execute({ sql: 'INSERT INTO daily_goals (type, target, unit) VALUES (?, ?, ?)', args: [type, target, unit] });
    }
  }

  initialized = true;
}

// ===== Types =====

export interface IntakeLog {
  id: number;
  type: string;
  amount: number;
  unit: string;
  source: string | null;
  note: string | null;
  created_at: string;
}

export interface DailyGoal {
  type: string;
  target: number;
  unit: string;
}

export interface UserProfile {
  id: number;
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: 'male' | 'female';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'cut' | 'maintain' | 'bulk';
  created_at: string;
  updated_at: string;
}

// ===== Intake Queries =====

export async function getTodayTotals(): Promise<Record<string, number>> {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute(`
    SELECT type, SUM(amount) as total
    FROM intake_logs
    WHERE date(created_at) = date('now', 'localtime')
    GROUP BY type
  `);
  const totals: Record<string, number> = {};
  for (const row of result.rows) {
    totals[row.type as string] = row.total as number;
  }
  return totals;
}

export async function getGoals(): Promise<DailyGoal[]> {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute('SELECT * FROM daily_goals');
  return result.rows as unknown as DailyGoal[];
}

export async function getTodayLogs(): Promise<IntakeLog[]> {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute(`
    SELECT * FROM intake_logs
    WHERE date(created_at) = date('now', 'localtime')
    ORDER BY created_at DESC
  `);
  return result.rows as unknown as IntakeLog[];
}

export async function getDailyTotals(startDate: string, endDate: string) {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute({
    sql: `
      SELECT date(created_at) as date, type, SUM(amount) as total
      FROM intake_logs
      WHERE date(created_at) BETWEEN date(?) AND date(?)
      GROUP BY date(created_at), type
      ORDER BY date(created_at) ASC
    `,
    args: [startDate, endDate],
  });
  return result.rows as unknown as { date: string; type: string; total: number }[];
}

export async function getTodayHourly() {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute(`
    SELECT
      strftime('%H', created_at) as hour,
      type,
      SUM(amount) as total,
      COUNT(*) as count
    FROM intake_logs
    WHERE date(created_at) = date('now', 'localtime')
    GROUP BY strftime('%H', created_at), type
    ORDER BY hour ASC
  `);
  return result.rows as unknown as { hour: string; type: string; total: number; count: number }[];
}

export async function getCurrentCaffeineLevel(): Promise<number> {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute(`
    SELECT amount, created_at
    FROM intake_logs
    WHERE type = 'caffeine'
    AND created_at >= datetime('now', 'localtime', '-24 hours')
  `);
  const now = new Date();
  let totalActive = 0;
  for (const row of result.rows) {
    const logTime = new Date(row.created_at as string);
    const hoursElapsed = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
    totalActive += (row.amount as number) * Math.pow(0.5, hoursElapsed / 5);
  }
  return Math.round(totalActive);
}

export async function addIntake(type: string, amount: number, unit: string, source?: string, note?: string): Promise<IntakeLog> {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute({
    sql: 'INSERT INTO intake_logs (type, amount, unit, source, note) VALUES (?, ?, ?, ?, ?)',
    args: [type, amount, unit, source || null, note || null],
  });
  const row = await db.execute({ sql: 'SELECT * FROM intake_logs WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  return row.rows[0] as unknown as IntakeLog;
}

export async function deleteIntake(id: number): Promise<boolean> {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM intake_logs WHERE id = ?', args: [id] });
  return result.rowsAffected > 0;
}

export async function updateGoal(type: string, target: number): Promise<DailyGoal> {
  await ensureInitialized();
  const db = getClient();
  await db.execute({ sql: 'UPDATE daily_goals SET target = ? WHERE type = ?', args: [target, type] });
  const row = await db.execute({ sql: 'SELECT * FROM daily_goals WHERE type = ?', args: [type] });
  return row.rows[0] as unknown as DailyGoal;
}

// ===== User Profile =====

export async function getProfile(): Promise<UserProfile | null> {
  await ensureInitialized();
  const db = getClient();
  const result = await db.execute('SELECT * FROM user_profile WHERE id = 1');
  return (result.rows[0] as unknown as UserProfile) || null;
}

export async function saveProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
  await ensureInitialized();
  const db = getClient();
  await db.execute({
    sql: `
      INSERT INTO user_profile (id, weight_kg, height_cm, age, sex, activity_level, goal)
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        weight_kg = excluded.weight_kg,
        height_cm = excluded.height_cm,
        age = excluded.age,
        sex = excluded.sex,
        activity_level = excluded.activity_level,
        goal = excluded.goal,
        updated_at = datetime('now', 'localtime')
    `,
    args: [profile.weight_kg, profile.height_cm, profile.age, profile.sex, profile.activity_level, profile.goal],
  });

  // Recalculate and update goals based on profile
  const recs = calculateRecommendations(profile);
  await db.execute({ sql: 'UPDATE daily_goals SET target = ? WHERE type = ?', args: [recs.water, 'water'] });
  await db.execute({ sql: 'UPDATE daily_goals SET target = ? WHERE type = ?', args: [recs.protein, 'protein'] });
  await db.execute({ sql: 'UPDATE daily_goals SET target = ? WHERE type = ?', args: [recs.carbs, 'carbs'] });
  await db.execute({ sql: 'UPDATE daily_goals SET target = ? WHERE type = ?', args: [recs.fat, 'fat'] });

  const result = await db.execute('SELECT * FROM user_profile WHERE id = 1');
  return result.rows[0] as unknown as UserProfile;
}

// Calculate personalized recommendations based on profile (pure function, no DB)
export function calculateRecommendations(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
  // BMR using Mifflin-St Jeor
  let bmr: number;
  if (profile.sex === 'male') {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = Math.round(bmr * activityMultipliers[profile.activity_level]);

  let targetCalories: number;
  let proteinPerKg: number;
  let fatPct: number;

  switch (profile.goal) {
    case 'cut':
      targetCalories = Math.round(tdee * 0.8);
      proteinPerKg = 2.2;
      fatPct = 0.25;
      break;
    case 'bulk':
      targetCalories = Math.round(tdee * 1.15);
      proteinPerKg = 1.8;
      fatPct = 0.25;
      break;
    default:
      targetCalories = tdee;
      proteinPerKg = 1.6;
      fatPct = 0.3;
  }

  const protein = Math.round(profile.weight_kg * proteinPerKg);
  const fat = Math.round((targetCalories * fatPct) / 9);
  const carbCalories = targetCalories - (protein * 4) - (fat * 9);
  const carbs = Math.round(carbCalories / 4);

  const activityWaterBonus = { sedentary: 0, light: 200, moderate: 400, active: 600, very_active: 800 };
  const water = Math.round(profile.weight_kg * 35 + activityWaterBonus[profile.activity_level]);

  return {
    calories: targetCalories,
    protein,
    carbs,
    fat,
    water,
    tdee,
    bmr: Math.round(bmr),
  };
}
