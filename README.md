# SipTrack

**Stay hydrated. Stay sharp. Stay balanced.**

A beautiful Next.js app that tracks your water, caffeine, protein, and macros with smart reminders, stunning animations, and AI-powered insights.

## Features

### Hydration Tracking
- Animated water bottle with wave effects and bubbles
- Quick-add buttons (100ml, 250ml, 500ml, 750ml)
- Browser notification reminders every 15 minutes — *sippppp!!*
- Daily goal tracking with progress rings

### Caffeine Intelligence
- Real-time caffeine level based on 5-hour half-life model
- Pre-configured sources: Coffee (95mg), Espresso (63mg), Tea (47mg), Cola (34mg), Energy (80mg)
- Smart "I'm feeling sleepy" button with context-aware suggestions
- Warns about daily limits and late-day consumption (after 2 PM)
- Caffeine decay curve visualization

### Macro Tracking
- Track protein, carbs, and fat with quick presets
- Auto-calculated calories (4cal/g protein, 4cal/g carbs, 9cal/g fat)
- Progress bars with daily goal tracking

### Personalized Profiles
- Onboarding wizard: weight, height, age, sex, activity level
- Body goal selection: **Cut** (20% deficit), **Maintain**, or **Bulk** (15% surplus)
- Auto-calculated targets using Mifflin-St Jeor equation
- Personalized water, protein, carbs, and fat goals

### Analytics
- Hydration trends (7-day and 30-day)
- Hourly intake breakdown
- Caffeine half-life decay curve
- Macro split pie chart
- Multi-nutrient trend lines

### AI-Powered Insights
- Pattern analysis via OpenAI GPT-4o-mini (optional)
- Rule-based fallback when no API key is configured
- Personalized recommendations based on your profile and patterns

### Animations
- Glassmorphism dark theme
- Water bottle with SVG wave animation
- Caffeine gauge with steam effects
- Progress ring animations
- Confetti celebration on goal completion
- Toast notifications with slide animations
- Smooth page transitions via Framer Motion

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **SQLite** via better-sqlite3 (zero-config local DB)
- **Recharts** for data visualization
- **Framer Motion** for animations
- **Tailwind CSS v4** for styling
- **OpenAI** for AI insights (optional)

Only 4 runtime dependencies beyond Next.js.

## Getting Started

```bash
git clone https://github.com/Atharva-Kanherkar/siptrack.git
cd siptrack
npm install
```

Optionally add your OpenAI API key for AI-powered insights:

```bash
cp .env.example .env.local
# Edit .env.local and add your OPENAI_API_KEY
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the onboarding wizard on first visit.

## How It Works

1. **First visit**: Complete the onboarding with your body stats and goal
2. **Dashboard**: Log water sips, caffeine, and macros throughout the day
3. **Reminders**: Get browser notifications every 15 minutes to hydrate
4. **Analytics**: View trends and patterns in the Analytics tab
5. **Insights**: Get AI-powered (or rule-based) personalized advice

## License

MIT
