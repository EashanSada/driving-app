-- ====================================================================
-- DriveSafe Youth Initiative - Supabase / PostgreSQL Database Schema
-- Schema Version: 2.4.0
-- Tables: profiles, driver_scores, trip_telematics, hazard_reports
-- Includes: RLS Policies, Score Update Triggers, Indexes & Seed Data
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
CREATE TYPE risk_level_enum AS ENUM ('SAFE', 'MODERATE', 'HIGH_RISK');
CREATE TYPE hazard_type_enum AS ENUM ('POTHOLE', 'BLACK_ICE', 'HIGH_ACCIDENT_ZONE', 'POOR_LIGHTING', 'CONSTRUCTION');

-- 2B. DRIVER ACCOUNTS TABLE (Seamless Username-Based Authentication & Cloud Storage)
CREATE TABLE IF NOT EXISTS public.driver_accounts (
    username TEXT PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    safety_score NUMERIC DEFAULT 100.0,
    clean_trips INT DEFAULT 0,
    total_trips INT DEFAULT 0,
    total_distance_miles NUMERIC DEFAULT 0.0,
    points INT DEFAULT 0,
    level INT DEFAULT 1,
    current_xp INT DEFAULT 0,
    next_level_xp INT DEFAULT 1000,
    badges_unlocked TEXT[] DEFAULT ARRAY[]::TEXT[],
    trip_history JSONB DEFAULT '[]'::jsonb,
    account_data JSONB DEFAULT '{}'::jsonb,
    created_time BIGINT DEFAULT (EXTRACT(epoch FROM NOW()) * 1000),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & Public Access Policies for driver_accounts
ALTER TABLE public.driver_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select driver_accounts" ON public.driver_accounts;
CREATE POLICY "Allow public select driver_accounts" ON public.driver_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert driver_accounts" ON public.driver_accounts;
CREATE POLICY "Allow public insert driver_accounts" ON public.driver_accounts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update driver_accounts" ON public.driver_accounts;
CREATE POLICY "Allow public update driver_accounts" ON public.driver_accounts FOR UPDATE USING (true);

-- 3. PROFILES TABLE (Syncs with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    youth_cohort TEXT DEFAULT 'Gen-Z Safe Drivers',
    preferred_language VARCHAR(5) DEFAULT 'en', -- en, es, fr, zh
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DRIVER SCORES TABLE (With Gamification Level & XP)
CREATE TABLE IF NOT EXISTS public.driver_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_safety_score NUMERIC(5, 2) DEFAULT 100.00 CHECK (current_safety_score BETWEEN 0 AND 100),
    total_trips_logged INT DEFAULT 0,
    clean_trips_count INT DEFAULT 0,
    total_distance_km NUMERIC(10, 2) DEFAULT 0.00,
    overall_risk_category risk_level_enum DEFAULT 'SAFE',
    badge_level VARCHAR(30) DEFAULT 'BRONZE_GUARDIAN', -- BRONZE, SILVER, GOLD, PLATINUM
    points_earned INT DEFAULT 0,
    driver_level INT DEFAULT 1,
    driver_xp INT DEFAULT 0,
    badges_unlocked TEXT[] DEFAULT ARRAY['100_MILES_SAFE'],
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRIP TELEMATICS TABLE
CREATE TABLE IF NOT EXISTS public.trip_telematics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    trip_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trip_end_time TIMESTAMPTZ DEFAULT NOW(),
    distance_km NUMERIC(6, 2) NOT NULL,
    avg_speed_kmh NUMERIC(5, 2) NOT NULL,
    max_speed_kmh NUMERIC(5, 2) NOT NULL,
    max_g_force NUMERIC(4, 2) NOT NULL,
    harsh_braking_events INT DEFAULT 0,
    harsh_cornering_events INT DEFAULT 0,
    speeding_instances INT DEFAULT 0,
    trip_safety_score NUMERIC(5, 2) NOT NULL,
    risk_vector JSONB, -- Stores [speed_risk, g_force_risk, jerk_risk]
    raw_telemetry_stream JSONB, -- Time-series array of {velocity, gx, gy, gz}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. HAZARD REPORTS TABLE (Crowdsourced Road Hazards)
CREATE TABLE IF NOT EXISTS public.hazard_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    hazard_type hazard_type_enum NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    upvotes INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    source_app VARCHAR(30) DEFAULT 'WEB_APP', -- WEB_APP, ANDROID_NATIVE
    reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias Table / View for Real-time Hazards
CREATE OR REPLACE VIEW public.hazards AS 
SELECT id, hazard_type, description, latitude as lat, longitude as lng, upvotes, reported_at as time, reported_by, source_app
FROM public.hazard_reports WHERE is_active = TRUE;

-- 6B. COMMUNITY YOUTH GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.youth_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) DEFAULT 'SAFETY_CLUB', -- REGIONAL, SCHOOL, SAFETY_CLUB, ECO_DRIVERS
    avatar_color VARCHAR(20) DEFAULT '#2dd4bf',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6C. GROUP MEMBERSHIP TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
    group_id UUID REFERENCES public.youth_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- 6D. GROUP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.youth_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    reactions_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUTOMATIC DRIVER SCORE RECALCULATION TRIGGER
CREATE OR REPLACE FUNCTION public.recalculate_driver_score()
RETURNS TRIGGER AS $$
DECLARE
    avg_score NUMERIC(5, 2);
    total_km NUMERIC(10, 2);
    trips_count INT;
    clean_count INT;
    new_badge VARCHAR(30);
    new_risk risk_level_enum;
BEGIN
    SELECT 
        AVG(trip_safety_score), 
        SUM(distance_km), 
        COUNT(*),
        COUNT(*) FILTER (WHERE trip_safety_score >= 90.0)
    INTO avg_score, total_km, trips_count, clean_count
    FROM public.trip_telematics
    WHERE user_id = NEW.user_id;

    -- Determine Badge Level based on clean trips & score
    IF clean_count >= 50 AND avg_score >= 95 THEN
        new_badge := 'PLATINUM_GUARDIAN';
    ELSIF clean_count >= 25 AND avg_score >= 88 THEN
        new_badge := 'GOLD_GUARDIAN';
    ELSIF clean_count >= 10 AND avg_score >= 80 THEN
        new_badge := 'SILVER_GUARDIAN';
    ELSE
        new_badge := 'BRONZE_GUARDIAN';
    END IF;

    -- Determine Risk Level
    IF avg_score >= 85 THEN
        new_risk := 'SAFE';
    ELSIF avg_score >= 60 THEN
        new_risk := 'MODERATE';
    ELSE
        new_risk := 'HIGH_RISK';
    END IF;

    -- Upsert Driver Score
    INSERT INTO public.driver_scores (
        user_id, current_safety_score, total_trips_logged, clean_trips_count,
        total_distance_km, overall_risk_category, badge_level, points_earned, updated_at
    ) VALUES (
        NEW.user_id, COALESCE(avg_score, 100.0), COALESCE(trips_count, 0), COALESCE(clean_count, 0),
        COALESCE(total_km, 0.0), new_risk, new_badge, (COALESCE(clean_count, 0) * 50) + (COALESCE(trips_count, 0) * 10), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        current_safety_score = EXCLUDED.current_safety_score,
        total_trips_logged = EXCLUDED.total_trips_logged,
        clean_trips_count = EXCLUDED.clean_trips_count,
        total_distance_km = EXCLUDED.total_distance_km,
        overall_risk_category = EXCLUDED.overall_risk_category,
        badge_level = EXCLUDED.badge_level,
        points_earned = EXCLUDED.points_earned,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_trip_inserted
    AFTER INSERT ON public.trip_telematics
    FOR EACH ROW EXECUTE FUNCTION public.recalculate_driver_score();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_telematics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Driver Scores Policies
CREATE POLICY "Leaderboard driver scores are public" ON public.driver_scores FOR SELECT USING (true);
CREATE POLICY "System can manage driver scores" ON public.driver_scores FOR ALL USING (true);

-- Trip Telematics Policies
CREATE POLICY "Users can read own trips" ON public.trip_telematics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can log own trips" ON public.trip_telematics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Hazard Reports Policies
CREATE POLICY "Anyone can view hazard reports" ON public.hazard_reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create hazard reports" ON public.hazard_reports FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_telematics_user_id ON public.trip_telematics(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_safety_score ON public.driver_scores(current_safety_score DESC);
CREATE INDEX IF NOT EXISTS idx_hazards_geo ON public.hazard_reports(latitude, longitude);

-- 10. SEED DATA FOR GLOBAL LEADERBOARD & HAZARDS
INSERT INTO public.profiles (id, email, full_name, youth_cohort, preferred_language) VALUES
('11111111-1111-1111-1111-111111111111', 'alex.chen@drivesafe.org', 'Alex Chen', 'West Coast Youth Safety Club', 'en'),
('22222211-2222-2222-2222-222222222222', 'maria.garcia@drivesafe.org', 'Maria Garcia', 'Madrid Safe Teen Drivers', 'es'),
('33333311-3333-3333-3333-333333333333', 'jean.dubois@drivesafe.org', 'Jean Dubois', 'Paris Eco-Mobility Youth', 'fr'),
('44444411-4444-4444-4444-444444444444', 'wei.zhang@drivesafe.org', 'Wei Zhang', 'Shanghai Future Safety Ambassadors', 'zh')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.driver_scores (user_id, current_safety_score, total_trips_logged, clean_trips_count, total_distance_km, overall_risk_category, badge_level, points_earned) VALUES
('11111111-1111-1111-1111-111111111111', 98.50, 42, 40, 320.50, 'SAFE', 'PLATINUM_GUARDIAN', 2420),
('22222211-2222-2222-2222-222222222222', 96.20, 35, 31, 280.10, 'SAFE', 'GOLD_GUARDIAN', 1900),
('33333311-3333-3333-3333-333333333333', 92.80, 28, 24, 195.40, 'SAFE', 'GOLD_GUARDIAN', 1480),
('44444411-4444-4444-4444-444444444444', 89.10, 20, 15, 140.00, 'SAFE', 'SILVER_GUARDIAN', 950)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.hazard_reports (hazard_type, description, latitude, longitude, upvotes) VALUES
('POTHOLE', 'Deep pothole on right lane of Highway 101 North exit 12', 37.7749, -122.4194, 14),
('HIGH_ACCIDENT_ZONE', 'Blind intersection near High School entrance - slow down', 37.7833, -122.4167, 28),
('BLACK_ICE', 'Morning frost on bridge overpass', 37.7650, -122.4300, 9);
