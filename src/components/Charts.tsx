'use client';

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { motion } from 'framer-motion';

interface Stats {
  totals: Record<string, number>;
  goals: Record<string, { target: number; unit: string }>;
  activeCaffeine: number;
  hourly: { hour: string; type: string; total: number; count: number }[];
  dailyTotals: { date: string; type: string; total: number }[];
}

const COLORS = {
  water: '#38bdf8',
  caffeine: '#f59e0b',
  protein: '#10b981',
  carbs: '#eab308',
  fat: '#ef4444',
};

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  borderRadius: '0.75rem',
  color: '#e2e8f0',
  fontSize: '12px',
};

export default function Charts({ stats, range }: { stats: Stats; range: 'week' | 'month' }) {
  // Process daily totals into chart-friendly format
  const dailyData = processDailyData(stats.dailyTotals);
  const hourlyData = processHourlyData(stats.hourly);
  const macroData = processMacroData(stats.totals);
  const caffeineTimeline = buildCaffeineDecayCurve(stats.hourly);

  return (
    <div className="space-y-6">
      {/* Hydration Over Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h3 className="text-md font-semibold text-blue-300 mb-4">💧 Hydration Trend ({range === 'week' ? '7 Days' : '30 Days'})</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={d => d.slice(5)} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="water"
                stroke="#38bdf8"
                fill="url(#waterGradient)"
                strokeWidth={2}
                name="Water (ml)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Track water for a few days to see trends" />
        )}
      </motion.div>

      {/* Today's Hourly Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h3 className="text-md font-semibold text-slate-300 mb-4">⏰ Today&apos;s Hourly Intake</h3>
        {hourlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="water" fill="#38bdf8" name="Water (ml)" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Bar dataKey="caffeine" fill="#f59e0b" name="Caffeine (mg)" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Log some intake to see your hourly pattern" />
        )}
      </motion.div>

      {/* Caffeine Decay Curve */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="text-md font-semibold text-amber-300 mb-4">☕ Caffeine Level (Half-life Curve)</h3>
        {caffeineTimeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={caffeineTimeline}>
              <defs>
                <linearGradient id="caffeineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="level"
                stroke="#f59e0b"
                fill="url(#caffeineGrad)"
                strokeWidth={2}
                name="Active Caffeine (mg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Log caffeine to see your decay curve" />
        )}
      </motion.div>

      {/* Macro Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-md font-semibold text-green-300 mb-4">🥧 Today&apos;s Macro Split</h3>
          {macroData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="calories"
                >
                  {macroData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.8} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Log macros to see your split" />
          )}
        </motion.div>

        {/* Multi-nutrient daily trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h3 className="text-md font-semibold text-indigo-300 mb-4">📈 Macro Trends ({range === 'week' ? '7 Days' : '30 Days'})</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickFormatter={d => d.slice(5)} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="protein" stroke="#10b981" fill="#10b98120" strokeWidth={2} name="Protein (g)" />
                <Area type="monotone" dataKey="carbs" stroke="#eab308" fill="#eab30820" strokeWidth={2} name="Carbs (g)" />
                <Area type="monotone" dataKey="fat" stroke="#ef4444" fill="#ef444420" strokeWidth={2} name="Fat (g)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Track macros for a few days to see trends" />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
      {message}
    </div>
  );
}

// ===== Data processing functions =====

function processDailyData(dailyTotals: { date: string; type: string; total: number }[]) {
  const byDate: Record<string, Record<string, number>> = {};
  for (const entry of dailyTotals) {
    if (!byDate[entry.date]) byDate[entry.date] = {};
    byDate[entry.date][entry.type] = entry.total;
  }
  return Object.entries(byDate)
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function processHourlyData(hourly: { hour: string; type: string; total: number }[]) {
  const byHour: Record<string, Record<string, number>> = {};
  for (const entry of hourly) {
    const h = `${entry.hour}:00`;
    if (!byHour[h]) byHour[h] = {};
    byHour[h][entry.type] = entry.total;
  }
  return Object.entries(byHour)
    .map(([hour, values]) => ({ hour, ...values }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

function processMacroData(totals: Record<string, number>) {
  const protein = totals['protein'] || 0;
  const carbs = totals['carbs'] || 0;
  const fat = totals['fat'] || 0;

  if (protein === 0 && carbs === 0 && fat === 0) return [];

  return [
    { name: 'Protein', calories: Math.round(protein * 4), color: COLORS.protein },
    { name: 'Carbs', calories: Math.round(carbs * 4), color: COLORS.carbs },
    { name: 'Fat', calories: Math.round(fat * 9), color: COLORS.fat },
  ];
}

function buildCaffeineDecayCurve(hourly: { hour: string; type: string; total: number }[]) {
  const caffeineByHour = hourly.filter(h => h.type === 'caffeine');
  if (caffeineByHour.length === 0) return [];

  const intakes: { hour: number; amount: number }[] = caffeineByHour.map(h => ({
    hour: parseInt(h.hour),
    amount: h.total,
  }));

  const startHour = Math.max(0, intakes[0].hour - 1);
  const endHour = 23;
  const points: { time: string; level: number }[] = [];

  for (let h = startHour; h <= endHour; h++) {
    let level = 0;
    for (const intake of intakes) {
      if (h >= intake.hour) {
        const elapsed = h - intake.hour;
        level += intake.amount * Math.pow(0.5, elapsed / 5);
      }
    }
    points.push({ time: `${h.toString().padStart(2, '0')}:00`, level: Math.round(level) });
  }

  return points;
}
