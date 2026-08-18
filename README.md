# DriveSafe Youth Initiative

An open-source driving safety & telematics platform designed to promote safe driving habits among young drivers through real-time motion telematics, ML risk analysis, gamification, and community hazard tracking.

## Features

- **Real-Time Telematics HUD**: Live GPS speed tracking, G-force vector radar, acceleration, braking jerk analysis, and turn dynamics.
- **ML Driver Risk Analysis**: Multidimensional risk scoring algorithm classifying driving sessions as Safe, Moderate, or High Risk based on speed variance and acceleration spikes.
- **Smart Safety Coach**: AI-powered feedback providing personalized, actionable driving tips based on actual telemetry.
- **Community Hazard Mapping**: Interactive map for reporting and viewing real-time road hazards (potholes, ice, roadwork, traffic incidents).
- **Gamification & Leaderboard**: Safety badges, XP leveling system, daily streaks, and community leaderboard.
- **Parental & Youth Portal**: Dual-view dashboard for drivers and parents/guardians with multi-device persistence via Supabase.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion
- **Backend API**: Node.js / Express Serverless Functions (`/api/*`)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **AI Engine**: Google GenAI SDK (`@google/genai`)
- **Mapping**: Google Maps Platform (`@vis.gl/react-google-maps`)

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/drivesafe-youth.git
   cd drivesafe-youth
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` and provide your credentials:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   GOOGLE_MAPS_PLATFORM_KEY="your-google-maps-key"
   ```

4. Database Setup:
   Run the SQL statements in `schema.sql` inside your Supabase SQL Editor to create the `driver_accounts` and `road_hazards` tables and RLS policies.

5. Run the development server:
   ```bash
   npm run dev
   ```

## License

MIT License. Developed for the DriveSafe Youth Initiative.
