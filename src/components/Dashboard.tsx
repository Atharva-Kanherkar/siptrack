'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Charts from './Charts';
import AIInsights from './AIInsights';
import Onboarding from './Onboarding';

// ===== Types =====
interface IntakeLog {
  id: number;
  type: string;
  amount: number;
  unit: string;
  source: string | null;
  note: string | null;
  created_at: string;
}

interface Stats {
  totals: Record<string, number>;
  goals: Record<string, { target: number; unit: string }>;
  activeCaffeine: number;
  caffeineWarning: string | null;
  hourly: { hour: string; type: string; total: number; count: number }[];
  dailyTotals: { date: string; type: string; total: number }[];
  currentHour: number;
}

type Tab = 'dashboard' | 'analytics' | 'insights';

// ===== Notification Sound =====
function playDripSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

// ===== Main Dashboard =====
export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: string }[]>([]);
  const [showSleepySuggestion, setShowSleepySuggestion] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [chartRange, setChartRange] = useState<'week' | 'month'>('week');
  const [hasProfile, setHasProfile] = useState<boolean | null>(null); // null = loading
  const toastId = useRef(0);
  const lastReminderRef = useRef(Date.now());
  const prevGoalsMet = useRef<Set<string>>(new Set());

  const addToast = useCallback((message: string, type: string = 'info') => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const fetchStats = useCallback(async (range?: string) => {
    const r = range || (activeTab === 'analytics' ? chartRange : 'today');
    const res = await fetch(`/api/stats?range=${r}`);
    const data = await res.json();
    setStats(data);

    // Check for newly completed goals
    if (data.totals && data.goals) {
      const newlyMet = new Set<string>();
      for (const [type, goal] of Object.entries(data.goals) as [string, { target: number }][]) {
        const current = data.totals[type] || 0;
        if (current >= goal.target) newlyMet.add(type);
      }
      for (const type of newlyMet) {
        if (!prevGoalsMet.current.has(type)) {
          setShowConfetti(true);
          addToast(`Goal reached for ${type}! You're crushing it!`, 'success');
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
      prevGoalsMet.current = newlyMet;
    }
  }, [activeTab, chartRange, addToast]);

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/intake');
    const data = await res.json();
    setLogs(data);
  }, []);

  // Check profile on mount
  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => {
      setHasProfile(!!data.profile);
    });
  }, []);

  // Initial fetch (only when profile exists)
  useEffect(() => {
    if (hasProfile) {
      fetchStats();
      fetchLogs();
    }
  }, [fetchStats, fetchLogs, hasProfile]);

  // Refetch analytics when range changes
  useEffect(() => {
    if (activeTab === 'analytics') fetchStats(chartRange);
  }, [chartRange, activeTab, fetchStats]);

  // Water reminder every 15 minutes
  useEffect(() => {
    if (!reminderEnabled) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastReminderRef.current >= 15 * 60 * 1000) {
        lastReminderRef.current = now;
        playDripSound();
        addToast('💧 sippppp!! Time for some water!', 'reminder');

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('SipTrack 💧', {
            body: 'sippppp!! Time to hydrate! Take a sip of water.',
            icon: '/favicon.ico',
          });
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [reminderEnabled, addToast]);

  const addIntake = async (type: string, amount: number, unit: string, source?: string) => {
    await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, unit, source }),
    });
    playDripSound();
    fetchStats();
    fetchLogs();
    lastReminderRef.current = Date.now(); // Reset reminder timer on water intake
  };

  const deleteLog = async (id: number) => {
    await fetch(`/api/intake?id=${id}`, { method: 'DELETE' });
    fetchStats();
    fetchLogs();
  };

  const handleSleepy = () => {
    if (!stats) return;
    const hour = new Date().getHours();
    const activeCaffeine = stats.activeCaffeine;
    const dailyCaffeine = stats.totals['caffeine'] || 0;
    const caffeineGoal = stats.goals['caffeine']?.target || 400;

    if (hour >= 16) {
      setShowSleepySuggestion(false);
      addToast('It\'s late — try a brisk 5-min walk or splash cold water on your face instead of coffee!', 'info');
    } else if (dailyCaffeine + 95 > caffeineGoal) {
      setShowSleepySuggestion(false);
      addToast('You\'re near your caffeine limit. Try a glass of cold water or a short walk!', 'warning');
    } else if (activeCaffeine > 200) {
      setShowSleepySuggestion(false);
      addToast('You still have plenty of caffeine active. Give it 30 min to kick in!', 'info');
    } else {
      setShowSleepySuggestion(true);
    }
  };

  // Loading state
  if (hasProfile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full"
        />
      </div>
    );
  }

  // Show onboarding if no profile
  if (!hasProfile) {
    return (
      <Onboarding onComplete={() => {
        setHasProfile(true);
        fetchStats();
        fetchLogs();
      }} />
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-water/30 border-t-water rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && <Confetti />}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className={`px-4 py-3 rounded-xl backdrop-blur-xl border shadow-lg max-w-sm ${
                toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' :
                toast.type === 'warning' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
                toast.type === 'reminder' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300 notif-pulse' :
                'bg-slate-700/80 border-slate-600/30 text-slate-200'
              }`}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header with wave */}
      <header className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-900/50 via-slate-900 to-indigo-900/50">
        <div className="wave" style={{ bottom: '-10px' }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-24">
            <path d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120Z" fill="rgba(56, 189, 248, 0.08)" />
          </svg>
        </div>
        <div className="wave" style={{ bottom: '-5px', animationDelay: '1s' }}>
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20">
            <path d="M0,80 C300,20 500,100 700,40 C900,-20 1100,80 1200,40 L1200,120 L0,120Z" fill="rgba(56, 189, 248, 0.05)" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent"
          >
            SipTrack
          </motion.h1>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 mt-1 text-sm"
          >
            Stay hydrated. Stay sharp. Stay balanced.
          </motion.p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex gap-1 p-2">
          {([['dashboard', '💧 Dashboard'], ['analytics', '📊 Analytics'], ['insights', '🧠 Insights']] as [Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-500/20 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress Overview */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <ProgressCard label="Water" value={stats.totals['water'] || 0} goal={stats.goals['water']?.target || 2500} unit="ml" color="#38bdf8" />
                <ProgressCard label="Caffeine" value={stats.totals['caffeine'] || 0} goal={stats.goals['caffeine']?.target || 400} unit="mg" color="#f59e0b" />
                <ProgressCard label="Protein" value={stats.totals['protein'] || 0} goal={stats.goals['protein']?.target || 50} unit="g" color="#10b981" />
                <ProgressCard label="Carbs" value={stats.totals['carbs'] || 0} goal={stats.goals['carbs']?.target || 250} unit="g" color="#eab308" />
                <ProgressCard label="Fat" value={stats.totals['fat'] || 0} goal={stats.goals['fat']?.target || 65} unit="g" color="#ef4444" />
              </div>

              {/* Calorie Summary */}
              <motion.div layout className="glass-card p-4 text-center">
                <span className="text-slate-400 text-sm">Estimated Calories Today</span>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats.totals['calories'] || 0} <span className="text-sm text-slate-400 font-normal">kcal</span>
                </p>
              </motion.div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Water Tracker */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-blue-300">💧 Water</h2>
                    <button
                      onClick={() => setReminderEnabled(!reminderEnabled)}
                      className={`text-xs px-3 py-1 rounded-full transition-all ${
                        reminderEnabled
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                      }`}
                    >
                      {reminderEnabled ? '🔔 Reminders ON' : '🔕 Reminders OFF'}
                    </button>
                  </div>

                  <WaterBottle percentage={Math.min(100, ((stats.totals['water'] || 0) / (stats.goals['water']?.target || 2500)) * 100)} />

                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[100, 250, 500, 750].map(amount => (
                      <SipButton key={amount} amount={amount} onClick={() => addIntake('water', amount, 'ml')} />
                    ))}
                  </div>
                </div>

                {/* Caffeine Tracker */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-amber-300">☕ Caffeine</h2>
                    <span className="text-xs text-slate-400">
                      Active: <span className="text-amber-300 font-mono">{stats.activeCaffeine}mg</span>
                    </span>
                  </div>

                  <CaffeineGauge active={stats.activeCaffeine} max={400} />

                  {stats.caffeineWarning && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-amber-400/80 text-xs mt-2 text-center bg-amber-500/10 rounded-lg p-2"
                    >
                      ⚠️ {stats.caffeineWarning}
                    </motion.p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[
                      { label: 'Coffee', amount: 95, icon: '☕' },
                      { label: 'Espresso', amount: 63, icon: '🫘' },
                      { label: 'Tea', amount: 47, icon: '🍵' },
                      { label: 'Cola', amount: 34, icon: '🥤' },
                      { label: 'Energy', amount: 80, icon: '⚡' },
                      { label: 'Decaf', amount: 5, icon: '🌿' },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => addIntake('caffeine', item.amount, 'mg', item.label.toLowerCase())}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/10 hover:border-amber-500/30 transition-all text-sm"
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-amber-200 text-xs">{item.label}</span>
                        <span className="text-amber-400/60 text-[10px]">{item.amount}mg</span>
                      </button>
                    ))}
                  </div>

                  {/* Sleepy Button */}
                  <button
                    onClick={handleSleepy}
                    className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-sm font-medium transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                  >
                    😴 I&apos;m feeling sleepy...
                  </button>

                  <AnimatePresence>
                    {showSleepySuggestion && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                          <p className="text-amber-200 text-sm">
                            ☕ A small coffee (~95mg caffeine) might help! You&apos;re within safe limits.
                          </p>
                          <button
                            onClick={() => {
                              addIntake('caffeine', 95, 'mg', 'coffee');
                              setShowSleepySuggestion(false);
                              addToast('Coffee logged! Energy incoming ⚡', 'success');
                            }}
                            className="mt-2 px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-300 text-xs transition-all"
                          >
                            Log a coffee ☕
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Macro Tracker */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-green-300 mb-4">🍗 Macros</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MacroInput
                    label="Protein"
                    unit="g"
                    color="#10b981"
                    current={stats.totals['protein'] || 0}
                    goal={stats.goals['protein']?.target || 50}
                    presets={[{ label: 'Egg', value: 6 }, { label: 'Chicken', value: 31 }, { label: 'Scoop', value: 25 }, { label: 'Greek Yogurt', value: 15 }]}
                    onAdd={(amount) => addIntake('protein', amount, 'g')}
                  />
                  <MacroInput
                    label="Carbs"
                    unit="g"
                    color="#eab308"
                    current={stats.totals['carbs'] || 0}
                    goal={stats.goals['carbs']?.target || 250}
                    presets={[{ label: 'Rice Cup', value: 45 }, { label: 'Bread', value: 15 }, { label: 'Banana', value: 27 }, { label: 'Oats', value: 27 }]}
                    onAdd={(amount) => addIntake('carbs', amount, 'g')}
                  />
                  <MacroInput
                    label="Fat"
                    unit="g"
                    color="#ef4444"
                    current={stats.totals['fat'] || 0}
                    goal={stats.goals['fat']?.target || 65}
                    presets={[{ label: 'Tbsp Oil', value: 14 }, { label: 'Avocado', value: 21 }, { label: 'Nuts', value: 14 }, { label: 'Cheese', value: 9 }]}
                    onAdd={(amount) => addIntake('fat', amount, 'g')}
                  />
                </div>
              </div>

              {/* Recent Log */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-slate-300 mb-4">📋 Today&apos;s Log</h2>
                {logs.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No entries yet. Start tracking!</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <AnimatePresence>
                      {logs.map(log => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {log.type === 'water' ? '💧' : log.type === 'caffeine' ? '☕' : log.type === 'protein' ? '🍗' : log.type === 'carbs' ? '🍞' : '🥑'}
                            </span>
                            <div>
                              <span className="text-sm text-slate-200 capitalize">{log.source || log.type}</span>
                              <span className="text-sm text-slate-400 ml-2">{log.amount}{log.unit}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              onClick={() => deleteLog(log.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex gap-2 mb-6">
                {(['week', 'month'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      chartRange === r
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:text-slate-200'
                    }`}
                  >
                    {r === 'week' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
              <Charts stats={stats} range={chartRange} />
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AIInsights />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ===== Sub-components =====

function ProgressCard({ label, value, goal, unit, color }: {
  label: string; value: number; goal: number; unit: string; color: string;
}) {
  const pct = Math.min(100, (value / goal) * 100);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      layout
      className="glass-card p-4 flex flex-col items-center"
      whileHover={{ scale: 1.02 }}
    >
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="progress-ring-circle"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{Math.round(pct)}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-2">{label}</span>
      <span className="text-xs font-mono" style={{ color }}>
        {Math.round(value)}/{goal}{unit}
      </span>
    </motion.div>
  );
}

function WaterBottle({ percentage }: { percentage: number }) {
  const [bubbles, setBubbles] = useState<{ id: number; x: number; size: number }[]>([]);
  const bubbleId = useRef(0);

  useEffect(() => {
    if (percentage > 0) {
      const newBubbles = Array.from({ length: 3 }, () => ({
        id: ++bubbleId.current,
        x: 20 + Math.random() * 60,
        size: 4 + Math.random() * 8,
      }));
      setBubbles(prev => [...prev, ...newBubbles]);
      setTimeout(() => {
        setBubbles(prev => prev.filter(b => !newBubbles.find(nb => nb.id === b.id)));
      }, 2000);
    }
  }, [percentage]);

  return (
    <div className="relative mx-auto w-32 h-48">
      {/* Bottle outline */}
      <svg viewBox="0 0 100 150" className="w-full h-full">
        {/* Bottle body */}
        <path
          d="M25,40 L20,55 L20,135 Q20,145 30,145 L70,145 Q80,145 80,135 L80,55 L75,40 Z"
          fill="none"
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth="2"
        />
        {/* Bottle neck */}
        <rect x="35" y="10" width="30" height="30" rx="3" fill="none" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="2" />
        {/* Cap */}
        <rect x="32" y="5" width="36" height="10" rx="3" fill="rgba(56, 189, 248, 0.2)" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />

        {/* Water fill */}
        <defs>
          <clipPath id="bottleClip">
            <path d="M22,55 L22,135 Q22,143 30,143 L70,143 Q78,143 78,135 L78,55 Z" />
          </clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.6)" />
            <stop offset="100%" stopColor="rgba(2, 132, 199, 0.8)" />
          </linearGradient>
        </defs>

        <g clipPath="url(#bottleClip)">
          <rect
            x="20"
            y={143 - (percentage / 100) * 88}
            width="60"
            height={(percentage / 100) * 88}
            fill="url(#waterGrad)"
            className="water-fill"
          />
          {/* Wave on top of water */}
          <path
            d={`M20,${143 - (percentage / 100) * 88} Q35,${143 - (percentage / 100) * 88 - 3} 50,${143 - (percentage / 100) * 88} Q65,${143 - (percentage / 100) * 88 + 3} 80,${143 - (percentage / 100) * 88}`}
            fill="rgba(56, 189, 248, 0.3)"
          >
            <animate attributeName="d"
              values={`M20,${143 - (percentage / 100) * 88} Q35,${143 - (percentage / 100) * 88 - 4} 50,${143 - (percentage / 100) * 88} Q65,${143 - (percentage / 100) * 88 + 4} 80,${143 - (percentage / 100) * 88};M20,${143 - (percentage / 100) * 88} Q35,${143 - (percentage / 100) * 88 + 4} 50,${143 - (percentage / 100) * 88} Q65,${143 - (percentage / 100) * 88 - 4} 80,${143 - (percentage / 100) * 88};M20,${143 - (percentage / 100) * 88} Q35,${143 - (percentage / 100) * 88 - 4} 50,${143 - (percentage / 100) * 88} Q65,${143 - (percentage / 100) * 88 + 4} 80,${143 - (percentage / 100) * 88}`}
              dur="3s" repeatCount="indefinite" />
          </path>
        </g>
      </svg>

      {/* Bubbles */}
      {bubbles.map(b => (
        <div
          key={b.id}
          className="bubble"
          style={{
            left: `${b.x}%`,
            bottom: `${10 + (percentage / 100) * 50}%`,
            width: b.size,
            height: b.size,
          }}
        />
      ))}

      {/* Percentage label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white drop-shadow-lg">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

function SipButton({ amount, onClick }: { amount: number; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="relative overflow-hidden py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-300 text-sm font-medium transition-all"
    >
      +{amount}ml
    </motion.button>
  );
}

function CaffeineGauge({ active, max }: { active: number; max: number }) {
  const pct = Math.min(100, (active / max) * 100);
  const color = pct > 75 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative mx-auto w-48 h-28">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Active arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${pct * 2.51} 251`}
          style={{
            transition: 'stroke-dasharray 0.8s ease, stroke 0.3s ease',
            filter: `drop-shadow(0 0 8px ${color}60)`,
          }}
        />
        {/* Label */}
        <text x="100" y="80" textAnchor="middle" className="fill-white text-2xl font-bold" style={{ fontSize: '28px' }}>
          {active}
        </text>
        <text x="100" y="100" textAnchor="middle" className="fill-slate-400" style={{ fontSize: '12px' }}>
          mg active
        </text>
      </svg>
      {/* Steam lines */}
      {active > 0 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="steam-line w-0.5 h-4 bg-amber-400/20 rounded-full" />
          ))}
        </div>
      )}
    </div>
  );
}

function MacroInput({ label, unit, color, current, goal, presets, onAdd }: {
  label: string; unit: string; color: string; current: number; goal: number;
  presets: { label: string; value: number }[];
  onAdd: (amount: number) => void;
}) {
  const [custom, setCustom] = useState('');
  const pct = Math.min(100, (current / goal) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color }}>{label}</span>
        <span className="text-xs text-slate-400 font-mono">{Math.round(current)}/{goal}{unit}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, width: `${pct}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Presets */}
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => onAdd(p.value)}
            className="text-xs py-1.5 px-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/30 hover:border-slate-600/50 text-slate-300 transition-all truncate"
          >
            {p.label} ({p.value}{unit})
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="number"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder={`Custom ${unit}`}
          className="flex-1 bg-slate-800/50 border border-slate-700/30 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          onKeyDown={e => {
            if (e.key === 'Enter' && custom) {
              onAdd(parseFloat(custom));
              setCustom('');
            }
          }}
        />
        <button
          onClick={() => { if (custom) { onAdd(parseFloat(custom)); setCustom(''); }}}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 2,
    color: ['#38bdf8', '#f59e0b', '#10b981', '#ef4444', '#818cf8', '#ec4899'][Math.floor(Math.random() * 6)],
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: p.rotation + 720, opacity: 0 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size * 1.5,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
