export type LanguageCode = 'en' | 'es' | 'fr' | 'zh';

export type UnitSystem = 'imperial' | 'metric';

export type UserRole = 'young_driver' | 'gdl_student' | 'parent_mentor' | 'driving_instructor';

export type NavTab = 'hud' | 'analysis' | 'trips' | 'gdl' | 'supervisor' | 'leaderboard' | 'gamification' | 'hazards';

export interface TelemetryPoint {
  timestamp: number;
  velocity: number;
  g_force_x: number;
  g_force_y: number;
  g_force_z: number;
  braking_jerk: number;
  lat?: number;
  lng?: number;
  speedLimitMph?: number;
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

export interface TripBreadcrumb {
  timestamp: number;
  lat: number;
  lng: number;
  speedMph: number;
  speedLimitMph: number;
  isHarsh: boolean;
  eventLabel?: string;
}

export interface StoredTrip {
  id: string;
  driverUsername: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  distanceMiles: number;
  safetyScore: number;
  topSpeedMph: number;
  avgSpeedMph: number;
  harshBrakingCount: number;
  harshCorneringCount: number;
  isNightTrip: boolean;
  weatherCondition: 'Clear' | 'Rain' | 'Fog' | 'Overcast';
  syncedToCloud: boolean;
  breadcrumbs: TripBreadcrumb[];
  summaryNotes?: string[];
}

export interface GdlProgress {
  requiredDayHours: number;
  completedDayHours: number;
  requiredNightHours: number;
  completedNightHours: number;
  totalRequiredHours: number;
  permitIssueDate: string;
  targetTestDate: string;
  supervisedTripsCount: number;
}

export interface UserPreferences {
  audioVoiceAlerts: boolean;
  audioChimes: boolean;
  autoTripDetection: boolean;
  speedLimitWarnings: boolean;
  offlineSyncEnabled: boolean;
  role: UserRole;
  gdlEnabled: boolean;
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
    vector: [number, number, number];
  };
  key_risk_factors: string[];
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
  progress: number;
  unlockedAt?: string;
  category: 'MILESTONE' | 'SAFETY' | 'COMMUNITY' | 'MASTERY';
  pointsReward: number;
}

export interface RouteSearchResult {
  origin: string;
  destination: string;
  distanceKm: number;
  durationMinutes: number;
  safetyRating: 'HIGHLY_SAFE' | 'MODERATE_CAUTION' | 'CONGESTED';
  hazardsEnRoute: number;
}

declare global {
  interface Window {
    DriveSafeBackend: any;
    TelematicsEngine: any;
    AndroidBridge: any;
    DriveSafeApp: any;
  }
}
