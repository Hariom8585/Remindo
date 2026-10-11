# REMINDO — Personal AI Reminder Assistant
> **Tagline:** *"Remember Less. Get More Done."*

A production-minded, full-stack personal productivity application featuring natural-language and voice task capture, deadline intelligence, timezone-aware scheduling, dual reminder alert modes (Sound Alarm & Notification Only), and cross-platform notification synchronization across Web and Android.

---

## 🌟 Key Features

### 1. Dual Alert Modes
- **🔊 Sound Alarm Mode:** Scheduled time par continuous, audible alarm audio bajta hai with heads-up display. Screen par interactive active alarm modal pop-up hota hai with **Stop Alarm**, **Snooze**, aur **Mark Complete** controls.
- **🔔 Notification Only Mode:** Gentle notification banner with a single bell chime (no repeated audio loop).
- **Default Preference:** Set your default alert mode in Notification Preferences and override it per-task.
- **Audio Previews:** Test alarm and chime sounds before saving reminders.

### 2. Dual-Engine Natural Language Task Capture
- Handles natural phrases like:
  - *"Submit my NPTEL assignment on 23 October 2026."*
  - *"Remind me tomorrow at 6 PM to call Dad."*
  - *"Buy a charger from the shop this evening."*
  - *"Send Rahul ₹500 tomorrow."*
  - *"Book my train ticket before the booking deadline."*
- Categorization: *College & Education, Family & Personal, Payments, Shopping, Travel & Booking, Work, Other*.
- Priority assignment: *High, Medium, Low*.
- **Ambiguity Guard:** When no deadline is given (e.g. *"Remind me to buy milk"*), Remindo never invents dates. It opens a clarification prompt with one-click suggestions.

### 3. Voice Input (Speech-to-Text)
- Built with the Web Speech API.
- Live animated audio visualizer.
- **Editable transcript** before parsing so users can correct transcribed names or numbers.

### 4. 7 Dedicated Application Screens
1. **Home Dashboard:** Daily focus, circular progress ring, category filters, task cards.
2. **Quick Add Task:** Natural language input, voice capture button, alert mode selector, reminder schedules.
3. **Calendar View:** Month/Week views, chronological schedule stream, date navigation.
4. **AI Assistant:** Chat interface, task proposal cards with 1-click confirmation.
5. **Live Reminders:** Real-time ticking countdown clock, imminent hero card, upcoming queue.
6. **Notification Settings:** Permission card, sound previews, default alert mode, snooze duration, quiet hours.
7. **Statistics:** Productivity analytics, 7-day completion chart, category breakdown.

### 5. Multi-Platform Notification Architecture
- **Web:** HTML5 Notifications with Web Audio API synthesizer bell chime and looping alarm sound.
- **Android:** Native Capacitor Integration (`@capacitor/local-notifications`) with distinct channels (`remindo_sound_alarm` with embedded `alarm.wav` and `remindo_notification_only`), exact alarms (`SCHEDULE_EXACT_ALARM`), and action buttons (`stop_alarm`, `snooze_15`, `done`).
- **Background Cron Scheduler:** `/api/cron/reminders` endpoint with idempotent database execution.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ (tested on Node 20 & 24)
- MySQL 8.0+ (or use the built-in persistent local fallback store)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your values:
```env
DATABASE_URL="mysql://root:password@localhost:3306/remindo"
JWT_SECRET="your_secure_jwt_secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="remindo_cron_scheduler_auth_secret_2026"
```

### 3. Initialize Prisma Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Remindo comes with extensive automated test suites:
```bash
# Run all unit, NLP, auth, and CRUD tests (18 tests)
npx tsx scripts/run-all-tests.ts

# Run Sound Alarm vs Notification Only test suite (13 tests)
npx tsx scripts/test-alert-modes.ts

# Run Live HTTP Server End-to-End tests (11 tests)
node scripts/test-live-alert-modes.mjs
```

---

## 🌐 Vercel Deployment Guide

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your **Remindo** GitHub repository.
4. Set the Framework Preset to **Next.js**.
5. Configure Environment Variables in Vercel:
   - `DATABASE_URL`: Hosted MySQL connection string (e.g. TiDB Cloud Serverless, PlanetScale, Aiven, or Railway MySQL).
   - `JWT_SECRET`: Random 32+ character secret string.
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production URL (e.g. `https://remindo.vercel.app`).
   - `CRON_SECRET`: Secret token matching `vercel.json` cron authorization.
   - `GEMINI_API_KEY` or `OPENAI_API_KEY`: *(Optional)* For AI chat assistance.
6. Click **Deploy**.
7. Run database migration on your hosted database:
   ```bash
   npx prisma db push
   ```

---

## 📱 Android App (Capacitor)

The Android native project is located in `./android`.

### Build Debug APK:
```bash
# Sync web build to Android assets
npm run build
npx cap sync android

# Build APK via Gradle
cd android
./gradlew assembleDebug
```
The compiled APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Build Production Release AAB (for Google Play Console):
```bash
cd android
./gradlew bundleRelease
```
The App Bundle will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`
