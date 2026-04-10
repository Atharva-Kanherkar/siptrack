'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function AIInsights() {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>('');

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', { method: 'POST' });
      const data = await res.json();
      setInsights(data.insights);
      setSource(data.source);
    } catch {
      setInsights('Failed to analyze. Please try again.');
      setSource('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 text-center">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          AI-Powered Insights
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Get personalized analysis of your intake patterns and smart recommendations.
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={analyze}
          disabled={loading}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
              />
              Analyzing...
            </span>
          ) : (
            '🧠 Analyze My Patterns'
          )}
        </motion.button>

        {source && (
          <p className="text-xs text-slate-500 mt-2">
            {source === 'ai' ? 'Powered by OpenAI' : source === 'rules' ? 'Rule-based analysis (add OPENAI_API_KEY for AI)' : ''}
          </p>
        )}
      </div>

      {insights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h3 className="text-md font-semibold text-purple-300 mb-4">📋 Your Insights</h3>
          <div className="space-y-4">
            {insights.split('\n\n').filter(Boolean).map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30"
              >
                <p className="text-slate-200 text-sm leading-relaxed">{insight}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tips section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="text-md font-semibold text-cyan-300 mb-4">💡 Quick Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: '💧', title: 'Hydration', tip: 'Drink water first thing in the morning to kickstart your metabolism.' },
            { icon: '☕', title: 'Caffeine', tip: 'Avoid caffeine after 2 PM — its 5-hour half-life can disrupt sleep.' },
            { icon: '🍗', title: 'Protein', tip: 'Spread protein intake across meals for better absorption (20-30g per meal).' },
            { icon: '⏰', title: 'Timing', tip: 'Wait 90 min after waking before your first coffee for max cortisol benefit.' },
          ].map((tip, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-800/20 border border-slate-700/20">
              <div className="flex items-center gap-2 mb-1">
                <span>{tip.icon}</span>
                <span className="text-sm font-medium text-slate-300">{tip.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{tip.tip}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
