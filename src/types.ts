export type LanguageCode = 'en' | 'es' | 'fr' | 'zh';

export type NavTab = 'hud' | 'analysis' | 'leaderboard' | 'hazards' | 'gamification' | 'community';

export interface TelemetryPoint {
  timestamp: number;
  velocity: number;
  g_force_x: number;
  g_force_y: number;
  g_force_z: number;
  braking_jerk: number;
}

export interface TelematicsState {
  speedKmh: number;
  gForceX: number;
  gForceY: number;
  gForceZ: number;
  gForceMag: number;
  jerkMs3: number;
  harshBrakingCount: number;
  harshCorneringCount: number;
  distanceKm: number;
  tripStartTime: number;
  telemetryHistory: TelemetryPoint[];
}

export interface RiskAnalysisResult {
  status: string;
  driver_id: string;
  trip_summary: {
    data_points: number;
    avg_velocity_kmh: number;
    max_velocity_kmh: number;
    velocity_std_dev: number;
    max_g_force: number;
    g_force_std_dev: number;
    harsh_braking_count: number;
    harsh_cornering_count: number;
  };
  classification: {
    risk_score: number;
    safety_score: number;
    risk_category: 'SAFE' | 'MODERATE' | 'HIGH_RISK';
    color_code: string;
    vector: [number, number, number]; // [speedRisk, gForceRisk, jerkRisk]
  };
  key_risk_factors: string[];
}

export interface LeaderboardUser {
  id: string;
  full_name: string;
  cohort: string;
  safety_score: number;
  clean_trips: number;
  badge: 'PLATINUM_GUARDIAN' | 'GOLD_GUARDIAN' | 'SILVER_GUARDIAN' | 'BRONZE_GUARDIAN';
  points: number;
  language: string;
  level?: number;
  xp?: number;
}

export interface HazardReport {
  id: string;
  hazard_type: 'POTHOLE' | 'BLACK_ICE' | 'HIGH_ACCIDENT_ZONE' | 'POOR_LIGHTING' | 'CONSTRUCTION';
  description: string;
  lat: number;
  lng: number;
  upvotes: number;
  time: string;
  reported_by?: string;
  source_app?: 'WEB_APP' | 'ANDROID_NATIVE';
}

export interface BadgeMilestone {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  progress: number; // 0 to 100
  unlockedAt?: string;
  category: 'MILESTONE' | 'SAFETY' | 'COMMUNITY' | 'MASTERY';
  pointsReward: number;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  youth_cohort: string;
  avatar_url?: string;
  level: number;
  current_xp: number;
  next_level_xp: number;
  total_points: number;
  safety_score: number;
  total_distance_miles: number;
  clean_trips_count: number;
  badges_unlocked: string[];
  joined_date: string;
}

export interface YouthGroup {
  id: string;
  name: string;
  description: string;
  category: 'REGIONAL' | 'SCHOOL' | 'SAFETY_CLUB' | 'ECO_DRIVERS';
  member_count: number;
  avg_group_score: number;
  is_joined: boolean;
  avatar_color: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_name: string;
  sender_avatar?: string;
  sender_role: string;
  content: string;
  timestamp: string;
  reactions_count: number;
  achievement_share?: {
    title: string;
    score: number;
    badge: string;
  };
}

export interface GoogleMapPlace {
  id: string;
  name: string;
  category: string;
  formatted_address: string;
  rating?: number;
  lat: number;
  lng: number;
}

export interface RouteSearchResult {
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  safetyRating: 'HIGHLY_SAFE' | 'MODERATE_CAUTION' | 'CONGESTED';
  hazardsEnRoute: number;
}

