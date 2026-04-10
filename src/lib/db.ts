import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'siptrack.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
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
  const count = db.prepare('SELECT COUNT(*) as c FROM daily_goals').get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare('INSERT INTO daily_goals (type, target, unit) VALUES (?, ?, ?)');
    const defaults: [string, number, string][] = [
      ['water', 2500, 'ml'],
      ['caffeine', 400, 'mg'],
      ['protein', 50, 'g'],
      ['carbs', 250, 'g'],
      ['fat', 65, 'g'],
    ];
    for (const [type, target, unit] of defaults) {
      insert.run(type, target, unit);
    }
  }
}

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

// Get today's totals for all types
export function getTodayTotals(): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT type, SUM(amount) as total
    FROM intake_logs
    WHERE date(created_at) = date('now', 'localtime')
    GROUP BY type
  `).all() as { type: string; total: number }[];

  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[row.type] = row.total;
  }
  return totals;
}

// Get all goals
export function getGoals(): DailyGoal[] {
  const db = getDb();
  return db.prepare('SELECT * FROM daily_goals').all() as DailyGoal[];
}

// Get today's intake logs
export function getTodayLogs(): IntakeLog[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM intake_logs
    WHERE date(created_at) = date('now', 'localtime')
    ORDER BY created_at DESC
  `).all() as IntakeLog[];
}

// Get intake logs for a date range
export function getLogsByDateRange(startDate: string, endDate: string): IntakeLog[] {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM intake_logs
    WHERE date(created_at) BETWEEN date(?) AND date(?)
    ORDER BY created_at ASC
  `).all(startDate, endDate) as IntakeLog[];
}

// Get daily totals for a date range (for charts)
export function getDailyTotals(startDate: string, endDate: string) {
  const db = getDb();
  return db.prepare(`
    SELECT date(created_at) as date, type, SUM(amount) as total
    FROM intake_logs
    WHERE date(created_at) BETWEEN date(?) AND date(?)
    GROUP BY date(created_at), type
    ORDER BY date(created_at) ASC
  `).all(startDate, endDate) as { date: string; type: string; total: number }[];
}

// Get hourly breakdown for today (for pattern analysis)
export function getTodayHourly() {
  const db = getDb();
  return db.prepare(`
    SELECT
      strftime('%H', created_at) as hour,
      type,
      SUM(amount) as total,
      COUNT(*) as count
    FROM intake_logs
    WHERE date(created_at) = date('now', 'localtime')
    GROUP BY strftime('%H', created_at), type
    ORDER BY hour ASC
  `).all() as { hour: string; type: string; total: number; count: number }[];
}

// Calculate current active caffeine level (using half-life of 5 hours)
export function getCurrentCaffeineLevel(): number {
  const db = getDb();
  const logs = db.prepare(`
    SELECT amount, created_at
    FROM intake_logs
    WHERE type = 'caffeine'
    AND created_at >= datetime('now', 'localtime', '-24 hours')
  `).all() as { amount: number; created_at: string }[];

  const now = new Date();
  let totalActive = 0;
  for (const log of logs) {
    const logTime = new Date(log.created_at);
    const hoursElapsed = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
    totalActive += log.amount * Math.pow(0.5, hoursElapsed / 5);
  }
  return Math.round(totalActive);
}

// Add an intake log
export function addIntake(type: string, amount: number, unit: string, source?: string, note?: string): IntakeLog {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO intake_logs (type, amount, unit, source, note)
    VALUES (?, ?, ?, ?, ?)
  `).run(type, amount, unit, source || null, note || null);

  return db.prepare('SELECT * FROM intake_logs WHERE id = ?').get(result.lastInsertRowid) as IntakeLog;
}

// Delete an intake log
export function deleteIntake(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM intake_logs WHERE id = ?').run(id);
  return result.changes > 0;
}

// Update a goal
export function updateGoal(type: string, target: number): DailyGoal {
  const db = getDb();
  db.prepare('UPDATE daily_goals SET target = ? WHERE type = ?').run(target, type);
  return db.prepare('SELECT * FROM daily_goals WHERE type = ?').get(type) as DailyGoal;
}

// ===== User Profile =====

export function getProfile(): UserProfile | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as UserProfile) || null;
}

export function saveProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): UserProfile {
  const db = getDb();
  db.prepare(`
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
  `).run(profile.weight_kg, profile.height_cm, profile.age, profile.sex, profile.activity_level, profile.goal);

  // Recalculate and update goals based on profile
  const recs = calculateRecommendations(profile);
  const updateGoalStmt = db.prepare('UPDATE daily_goals SET target = ? WHERE type = ?');
  updateGoalStmt.run(recs.water, 'water');
  updateGoalStmt.run(recs.protein, 'protein');
  updateGoalStmt.run(recs.carbs, 'carbs');
  updateGoalStmt.run(recs.fat, 'fat');

  return db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as UserProfile;
}

// Calculate personalized recommendations based on profile
export function calculateRecommendations(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
  // BMR using Mifflin-St Jeor
  let bmr: number;
  if (profile.sex === 'male') {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161;
  }

  // TDEE with activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = Math.round(bmr * activityMultipliers[profile.activity_level]);

  // Adjust calories based on goal
  let targetCalories: number;
  let proteinPerKg: number;
  let fatPct: number;

  switch (profile.goal) {
    case 'cut':
      targetCalories = Math.round(tdee * 0.8); // 20% deficit
      proteinPerKg = 2.2; // Higher protein to preserve muscle
      fatPct = 0.25;
      break;
    case 'bulk':
      targetCalories = Math.round(tdee * 1.15); // 15% surplus
      proteinPerKg = 1.8;
      fatPct = 0.25;
      break;
    default: // maintain
      targetCalories = tdee;
      proteinPerKg = 1.6;
      fatPct = 0.3;
  }

  const protein = Math.round(profile.weight_kg * proteinPerKg);
  const fat = Math.round((targetCalories * fatPct) / 9);
  const carbCalories = targetCalories - (protein * 4) - (fat * 9);
  const carbs = Math.round(carbCalories / 4);

  // Water: ~35ml per kg bodyweight, more if active
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
