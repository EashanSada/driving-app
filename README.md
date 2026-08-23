# 🚗 DriveSafe Youth Initiative

> **Real-Time Telematics, GDL Hours Compliance, and Privacy-First Mentorship for Young Drivers**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Overview

**DriveSafe Youth Initiative** is a modern telematics web and mobile companion application designed to empower learner permit holders, teen drivers, parents, and driving instructors. 

By analyzing real-time motion sensor dynamics (longitudinal acceleration, lateral cornering force, and braking jerk), DriveSafe provides in-vehicle voice feedback, scores defensive driving habits, logs state-mandated Graduated Driver Licensing (GDL) hours, and generates certified safety reports for auto-insurance discounts and DMV submissions—all with zero invasive real-time surveillance.

---

## ✨ Core Features

### 🎛️ Real-Time Telematics Drive HUD
- **Live G-Force & Jerk Visualizer**: Real-time vector radar indicating vehicle acceleration, braking smoothness, and lateral stability.
- **Audio & Spoken Voice Safety Coaching**: Sub-second Web Audio tone synthesis and speech alerts for sudden deceleration or abrupt cornering.
- **Posted Speed Limit Advisory**: Dynamic speed limit display with live comparison badges (*Within Limit*, *Near Limit*, *Exceeding Limit*).
- **Environmental Context**: Day, dusk, and night condition detection paired with road surface sensitivity toggles (Clear, Rain, Fog).
- **Auto Trip Detection**: Automatically begins logging trips when sustained vehicle velocity exceeds 8 mph and stops when parked.

### 📜 Trip History Log & Interactive Route Replay
- **Interactive Waypoint Scrubber**: Replay completed routes with breadcrumbs, vehicle speeds, and posted limit indicators.
- **Event Highlights**: Identifies points where harsh braking or excessive cornering occurred to help drivers review mistakes.

### 🎓 Graduated Driver Licensing (GDL) Tracker
- **50-Hour State Requirement Progress**: Dedicated day (40 hrs) and night (10 hrs) supervised driving time breakdown.
- **Trip Auto-Logging**: Driving HUD trips automatically increment day/night log balances.
- **Manual Hour Entry**: Ability to log supervised sessions with mentor signatures and notes.

### 👨‍👩‍👧 Parent-Teen Circle & Instructor Cohort Portal
- **6-Digit Supervisor Pairing Key**: Link teen accounts with parents or driving instructors without invasive continuous tracking.
- **Peace-of-Mind Summaries**: Parents receive trip completion recaps, defensive driving scores, and compliance updates.
- **Driving School Roster**: Instructor portal for monitoring student cohorts and reviewing class safety averages.
- **Certified PDF Export**: One-click printable DMV and insurance discount certificate complete with endorsement signature lines.

### 👥 Verified Driver Community & Peer Safety Groups
- **User-Created Safety Circles**: Start custom safety clubs for your high school, neighborhood, or driving class.
- **Setup Questionnaire**: Configure group goals (e.g. 95+ score target, 50 GDL hours), category, and privacy levels.
- **Role Verification**: Special group categories (Driving School Class Cohort & Parent Advisory) restricted to verified instructors and parents.
- **Real Member Rosters**: Zero fake bots or mock counts—tracks real joined members and live peer discussions.

### 📴 Offline-First Architecture & Cloud Sync
- **Local Storage Queue**: Trips are captured reliably even when driving in low-connectivity or remote areas.
- **Background Cloud Synchronization**: Automatically batches and syncs local trip records to Supabase / PostgreSQL when reconnected.
- **Multi-Device Sign-In**: Synchronize driver profiles and achievements across phones, tablets, and desktops.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, HTML5 Canvas API
- **Audio / Voice**: Web Audio API (Tone Oscillators) & Web Speech Synthesis API
- **Motion Sensors**: DeviceMotionEvent & DeviceOrientationEvent with native Android bridge support
- **State & Storage**: Offline-first LocalStorage queue with Supabase cloud synchronization
- **Tooling & Build**: Vite, ESLint, TypeScript Compiler (`tsc`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- npm / yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/drivesafe-youth.git

# Navigate to the project folder
cd drivesafe-youth

# Install dependencies
npm install

# Start the local development server
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 📁 Project Structure

```
├── src/
│   ├── components/
│   │   ├── NavigationHeader.tsx        # Responsive 3-zone header & mobile thumb bar
│   │   ├── TelematicsHudView.tsx       # Live Drive HUD, radar canvas & speed limits
│   │   ├── RiskAnalysisView.tsx        # Post-trip safety score & telematics breakdown
│   │   ├── TripHistoryReplayModal.tsx  # Route breadcrumb replay & timeline scrubber
│   │   ├── GdlTrackerView.tsx          # 50-hour GDL supervised driving log
│   │   ├── SupervisorCircleView.tsx    # Parent-teen circle, instructor roster & PDF export
│   │   ├── CommunityGroupsView.tsx     # Custom driver groups & setup questionnaire
│   │   ├── HazardMapView.tsx           # Community road hazard reporting & radar
│   │   ├── LeaderboardView.tsx         # Real registered driver leaderboard
│   │   ├── GamificationView.tsx        # Badges, XP levels & driving milestones
│   │   ├── UserLoginModal.tsx          # Multi-step driver onboarding questionnaire
│   │   └── UserProfileModal.tsx        # Driver profile & contact info modal
│   ├── lib/
│   │   ├── accountManager.ts           # Account state, roles & licensing stages
│   │   ├── communityStore.ts           # Community groups, goals & post management
│   │   ├── offlineTripStore.ts         # Local trip queue & background cloud sync
│   │   ├── soundAlerts.ts              # Web Audio chimes & speech synthesis engine
│   │   └── supabaseClient.ts           # Supabase client initialization & proxy
│   ├── types.ts                        # TypeScript interfaces & domain types
│   ├── translations.ts                 # Multilingual localization (EN, ES, FR, ZH)
│   ├── App.tsx                         # Root application controller & tab routing
│   └── main.tsx                        # Application entry point
├── public/
├── package.json
└── README.md
```

---

## 🛡️ Privacy & Safety Principles

1. **No Live Continuous GPS Tracking**: Parents and instructors receive summary reports upon trip completion rather than invasive real-time location streaming.
2. **Defensive Focus**: Encourages smooth braking and cornering rather than punitive surveillance.
3. **GDL Alignment**: Structured around official Department of Motor Vehicles (DMV) supervised driving requirements.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
