'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileData {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: 'male' | 'female';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'cut' | 'maintain' | 'bulk';
}

interface Recommendations {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  tdee: number;
  bmr: number;
}

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [data, setData] = useState<ProfileData>({
    weight_kg: 70,
    height_cm: 170,
    age: 25,
    sex: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
  });

  const totalSteps = 4;

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    setRecommendations(result.recommendations);
    setSaving(false);
    setStep(totalSteps); // Show recommendations
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent"
          >
            Welcome to SipTrack
          </motion.h1>
          <p className="text-slate-400 text-sm mt-2">
            Let&apos;s personalize your experience
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: i <= step
                  ? 'linear-gradient(to right, #38bdf8, #818cf8)'
                  : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepWrapper key="step0">
              <h2 className="text-lg font-semibold text-slate-200 mb-6">Body Measurements</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Weight (kg)</label>
                  <input
                    type="number"
                    value={data.weight_kg}
                    onChange={e => setData({ ...data, weight_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Height (cm)</label>
                  <input
                    type="number"
                    value={data.height_cm}
                    onChange={e => setData({ ...data, height_cm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Age</label>
                    <input
                      type="number"
                      value={data.age}
                      onChange={e => setData({ ...data, age: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">Sex</label>
                    <div className="flex gap-2">
                      {(['male', 'female'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setData({ ...data, sex: s })}
                          className={`flex-1 py-3 rounded-xl text-sm transition-all ${
                            data.sex === s
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:border-slate-600/50'
                          }`}
                        >
                          {s === 'male' ? '♂ Male' : '♀ Female'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </StepWrapper>
          )}

          {step === 1 && (
            <StepWrapper key="step1">
              <h2 className="text-lg font-semibold text-slate-200 mb-6">Activity Level</h2>
              <div className="space-y-2">
                {([
                  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise, desk job' },
                  { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
                  { value: 'moderate', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
                  { value: 'active', label: 'Active', desc: 'Hard exercise 6-7 days/week' },
                  { value: 'very_active', label: 'Very Active', desc: 'Intense exercise + physical job' },
                ] as const).map(level => (
                  <button
                    key={level.value}
                    onClick={() => setData({ ...data, activity_level: level.value })}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      data.activity_level === level.value
                        ? 'bg-blue-500/20 border border-blue-500/40'
                        : 'bg-slate-800/30 border border-slate-700/20 hover:border-slate-600/40'
                    }`}
                  >
                    <span className={`text-sm font-medium ${data.activity_level === level.value ? 'text-blue-300' : 'text-slate-200'}`}>
                      {level.label}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{level.desc}</p>
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper key="step2">
              <h2 className="text-lg font-semibold text-slate-200 mb-2">What&apos;s your goal?</h2>
              <p className="text-slate-500 text-sm mb-6">This adjusts your calorie and macro targets</p>
              <div className="space-y-3">
                {([
                  { value: 'cut', label: 'Cut', desc: 'Lose fat while preserving muscle', emoji: '🔥', detail: '~20% calorie deficit, high protein' },
                  { value: 'maintain', label: 'Maintain', desc: 'Keep current weight & composition', emoji: '⚖️', detail: 'Balanced macros at maintenance calories' },
                  { value: 'bulk', label: 'Bulk', desc: 'Build muscle with caloric surplus', emoji: '💪', detail: '~15% calorie surplus, high protein' },
                ] as const).map(g => (
                  <button
                    key={g.value}
                    onClick={() => setData({ ...data, goal: g.value })}
                    className={`w-full text-left p-5 rounded-xl transition-all ${
                      data.goal === g.value
                        ? 'bg-blue-500/20 border-2 border-blue-500/40 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-800/30 border-2 border-slate-700/20 hover:border-slate-600/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <div>
                        <span className={`text-base font-semibold ${data.goal === g.value ? 'text-blue-300' : 'text-slate-200'}`}>
                          {g.label}
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">{g.desc}</p>
                        <p className="text-[11px] text-slate-500 mt-1">{g.detail}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 3 && (
            <StepWrapper key="step3">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Review</h2>
              <div className="space-y-3 mb-6">
                <ReviewRow label="Weight" value={`${data.weight_kg} kg`} />
                <ReviewRow label="Height" value={`${data.height_cm} cm`} />
                <ReviewRow label="Age" value={`${data.age} years`} />
                <ReviewRow label="Sex" value={data.sex === 'male' ? '♂ Male' : '♀ Female'} />
                <ReviewRow label="Activity" value={data.activity_level.replace('_', ' ')} />
                <ReviewRow label="Goal" value={`${data.goal === 'cut' ? '🔥' : data.goal === 'bulk' ? '💪' : '⚖️'} ${data.goal.charAt(0).toUpperCase() + data.goal.slice(1)}`} />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={save}
                disabled={saving}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border border-blue-500/40 text-blue-300 font-semibold text-base transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50"
              >
                {saving ? 'Calculating...' : 'Calculate My Plan'}
              </motion.button>
            </StepWrapper>
          )}

          {step === totalSteps && recommendations && (
            <StepWrapper key="results">
              <h2 className="text-lg font-semibold text-green-300 mb-2">Your Personalized Plan</h2>
              <p className="text-slate-500 text-xs mb-6">Based on Mifflin-St Jeor equation</p>
              <div className="space-y-3 mb-6">
                <RecommendationRow label="BMR" value={`${recommendations.bmr} kcal`} color="#818cf8" />
                <RecommendationRow label="TDEE" value={`${recommendations.tdee} kcal`} color="#818cf8" />
                <RecommendationRow label="Target Calories" value={`${recommendations.calories} kcal`} color="#f59e0b" />
                <div className="h-px bg-slate-700/50 my-2" />
                <RecommendationRow label="Water" value={`${recommendations.water} ml`} color="#38bdf8" />
                <RecommendationRow label="Protein" value={`${recommendations.protein} g`} color="#10b981" />
                <RecommendationRow label="Carbs" value={`${recommendations.carbs} g`} color="#eab308" />
                <RecommendationRow label="Fat" value={`${recommendations.fat} g`} color="#ef4444" />
              </div>
              <p className="text-slate-500 text-[11px] text-center mb-4">
                Goals have been automatically updated. You can adjust them anytime.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onComplete}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-500/40 text-green-300 font-semibold transition-all hover:shadow-lg hover:shadow-green-500/20"
              >
                Let&apos;s Go! 🚀
              </motion.button>
            </StepWrapper>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {step < 3 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                step === 0 ? 'invisible' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Back
            </button>
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-6 py-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm font-medium hover:bg-blue-500/30 transition-all"
            >
              Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex justify-start mt-4">
            <button
              onClick={() => setStep(2)}
              className="text-slate-400 hover:text-slate-200 text-sm transition-all"
            >
              Back
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-slate-200 font-medium capitalize">{value}</span>
    </div>
  );
}

function RecommendationRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800/30">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
