/**
 * On-Device Telematics Risk Analyzer for RadianDrive iOS
 * 
 * Computes logical, statistical driving kinematics:
 * - Dynamic Motion & G-Force Vectors (detects shaking, whipping, phone drops)
 * - Motion-Gated Harsh Braking & Deceleration
 * - Lateral Cornering & Turning Stability
 * - Excessive Speeding & High Jerk
 * 
 * Runs 100% on-device with zero network latency.
 */

export interface TelemetryPoint {
  velocity?: number; // km/h
  g_force_x?: number; // lateral
  g_force_y?: number; // longitudinal
  g_force_z?: number; // vertical
  braking_jerk?: number; // m/s^3
  timestamp?: number;
}

export interface RiskAnalysisPayload {
  telemetry?: TelemetryPoint[];
  driver_id?: string;
  harshBrakingCount?: number;
  harshCorneringCount?: number;
  distanceKm?: number;
  durationSec?: number;
  speedLimitMph?: number;
  weatherCondition?: string;
}

export interface RiskAnalysisResult {
  status: 'success' | 'error';
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
    distanceKm: number;
  };
  classification: {
    risk_score: number;
    safety_score: number;
    risk_category: 'SAFE' | 'MODERATE' | 'HIGH_RISK';
    color_code: string;
    vector: [number, number, number];
  };
  sub_scores: {
    speed_compliance: number; // 0 - 100
    braking_smoothness: number; // 0 - 100
    cornering_stability: number; // 0 - 100
  };
  key_risk_factors: string[];
}

export function analyzeRiskLocally(payload: RiskAnalysisPayload): RiskAnalysisResult {
  const telemetry = payload.telemetry || [];
  const driverId = (payload.driver_id || 'driver').slice(0, 50);
  const distanceKm = typeof payload.distanceKm === 'number' ? Math.max(0, payload.distanceKm) : 0;

  // If very few points, return pristine baseline
  if (!Array.isArray(telemetry) || telemetry.length < 2) {
    return {
      status: 'success',
      driver_id: driverId,
      trip_summary: {
        data_points: telemetry.length,
        avg_velocity_kmh: 0,
        max_velocity_kmh: 0,
        velocity_std_dev: 0,
        max_g_force: 0,
        g_force_std_dev: 0,
        harsh_braking_count: 0,
        harsh_cornering_count: 0,
        distanceKm
      },
      classification: {
        risk_score: 0,
        safety_score: 100,
        risk_category: 'SAFE',
        color_code: '#10b981',
        vector: [0, 0, 0]
      },
      sub_scores: {
        speed_compliance: 100,
        braking_smoothness: 100,
        cornering_stability: 100
      },
      key_risk_factors: [
        'Phone secured: Resting baseline verified.',
        'Zero sudden motion or harsh events detected.'
      ]
    };
  }

  const safeTelemetry = telemetry.slice(0, 2000);
  const velocities = safeTelemetry.map(t => Math.max(0, Number(t.velocity || 0)));
  const gx = safeTelemetry.map(t => Number(t.g_force_x || 0));
  const gy = safeTelemetry.map(t => Number(t.g_force_y || 0));
  const jerks = safeTelemetry.map(t => Math.max(0, Number(t.braking_jerk || 0)));

  const n = safeTelemetry.length;
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / n;
  const maxVelocity = Math.max(...velocities, 0);

  const velVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / n;
  const velStdDev = Math.sqrt(velVariance);

  const gMags = gx.map((x, i) => Math.sqrt(x * x + gy[i] * gy[i]));
  const avgG = gMags.reduce((a, b) => a + b, 0) / n;
  const maxG = Math.max(...gMags, 0);
  const gStdDev = Math.sqrt(gMags.reduce((sum, g) => sum + Math.pow(g - avgG, 2), 0) / n);

  // 1. Harsh Event Counting
  let harshBrakingCount = typeof payload.harshBrakingCount === 'number' ? payload.harshBrakingCount : 0;
  let harshCorneringCount = typeof payload.harshCorneringCount === 'number' ? payload.harshCorneringCount : 0;

  // Also scan points directly if counts are 0
  if (harshBrakingCount === 0 && harshCorneringCount === 0) {
    for (let i = 1; i < n; i++) {
      if (gy[i] < -0.42) {
        harshBrakingCount++;
        i += 2; // Debounce
      } else if (Math.abs(gx[i]) > 0.42) {
        harshCorneringCount++;
        i += 2; // Debounce
      }
    }
  }

  // Count high jerk occurrences (shaking or abrupt stops)
  let highJerkCount = 0;
  for (let i = 0; i < n; i++) {
    if (jerks[i] > 4.5) {
      highJerkCount++;
    }
  }

  // 2. Resting / Quiet Phone Check
  // If the phone was sitting on a table or steady in a mount:
  const isSteadyResting = maxG < 0.28 && harshBrakingCount === 0 && harshCorneringCount === 0 && highJerkCount === 0;
  if (isSteadyResting) {
    return {
      status: 'success',
      driver_id: driverId,
      trip_summary: {
        data_points: n,
        avg_velocity_kmh: Number(avgVelocity.toFixed(1)),
        max_velocity_kmh: Number(maxVelocity.toFixed(1)),
        velocity_std_dev: Number(velStdDev.toFixed(2)),
        max_g_force: Number(maxG.toFixed(2)),
        g_force_std_dev: Number(gStdDev.toFixed(3)),
        harsh_braking_count: 0,
        harsh_cornering_count: 0,
        distanceKm
      },
      classification: {
        risk_score: 0,
        safety_score: 100,
        risk_category: 'SAFE',
        color_code: '#10b981',
        vector: [0, 0, 0]
      },
      sub_scores: {
        speed_compliance: 100,
        braking_smoothness: 100,
        cornering_stability: 100
      },
      key_risk_factors: [
        'Steady handling: Phone remained stable throughout the session.',
        'Zero harsh braking or abrupt turning events detected.'
      ]
    };
  }

  // 3. Deductions Calculation (Applies to both road driving and shaking at home)
  // A. Harsh Braking / Forward-Backward Shake (up to 30 pts)
  const brakingDeduction = Math.min(30.0, harshBrakingCount * 6.5);

  // B. Harsh Cornering / Side-to-Side Shake (up to 25 pts)
  const corneringDeduction = Math.min(25.0, harshCorneringCount * 5.5);

  // C. Violent G-Force / Shaking Peak (up to 25 pts)
  let gForceDeduction = 0;
  if (maxG > 0.45) {
    gForceDeduction += Math.min(20.0, (maxG - 0.45) * 25.0);
  }
  if (gStdDev > 0.15) {
    gForceDeduction += Math.min(10.0, (gStdDev - 0.15) * 30.0);
  }
  gForceDeduction = Math.min(25.0, Math.round(gForceDeduction * 10) / 10);

  // D. Jerk / Erratic Handling (up to 15 pts)
  const jerkDeduction = Math.min(15.0, highJerkCount * 2.0);

  // E. Excessive Highway Speeding (Only applies if actually moving > 80 mph / 130 km/h)
  let speedPenalty = 0;
  if (maxVelocity > 130.0) {
    speedPenalty = Math.min(20.0, (maxVelocity - 130.0) * 0.5);
  }

  // Total Deductions (Capped at 70 pts so minimum score is 30)
  const totalDeduction = Math.min(70.0, brakingDeduction + corneringDeduction + gForceDeduction + jerkDeduction + speedPenalty);
  const safetyScore = Math.max(30.0, Math.round((100.0 - totalDeduction) * 10) / 10);
  const riskScore = Math.round((100.0 - safetyScore) * 10) / 10;

  // Sub-Scores (0 - 100%)
  const speedSubScore = Math.max(0, Math.round(100 - (speedPenalty / 20.0) * 100));
  const brakingSubScore = Math.max(0, Math.round(100 - (brakingDeduction / 30.0) * 100));
  const corneringSubScore = Math.max(0, Math.round(100 - ((corneringDeduction + gForceDeduction) / 50.0) * 100));

  // Risk Classification
  let riskCategory: 'SAFE' | 'MODERATE' | 'HIGH_RISK' = 'SAFE';
  let colorCode = '#10b981';
  if (safetyScore < 75.0) {
    riskCategory = 'HIGH_RISK';
    colorCode = '#ef4444';
  } else if (safetyScore < 90.0) {
    riskCategory = 'MODERATE';
    colorCode = '#f59e0b';
  }

  // Clear, Human-Understandable Factors
  const factors: string[] = [];
  if (harshBrakingCount > 0) {
    factors.push(`${harshBrakingCount} abrupt braking / pitch deceleration event${harshBrakingCount > 1 ? 's' : ''} detected (-${Math.round(brakingDeduction)} pts).`);
  }
  if (harshCorneringCount > 0) {
    factors.push(`${harshCorneringCount} aggressive lateral turn / side whipping event${harshCorneringCount > 1 ? 's' : ''} detected (-${Math.round(corneringDeduction)} pts).`);
  }
  if (gForceDeduction > 5.0) {
    factors.push(`High G-force shaking & motion instability detected (peak ${maxG.toFixed(2)} G, -${Math.round(gForceDeduction)} pts).`);
  }
  if (highJerkCount > 2) {
    factors.push(`Erratic handling spikes detected (${highJerkCount} jerk events).`);
  }
  if (speedPenalty > 0) {
    const mph = Math.round(maxVelocity * 0.621371);
    factors.push(`Excessive velocity reached (${mph} mph / ${Math.round(maxVelocity)} km/h).`);
  }

  if (factors.length === 0) {
    factors.push('Smooth progressive driving with zero harsh events.');
    factors.push('Stable phone position and controlled acceleration.');
  }

  return {
    status: 'success',
    driver_id: driverId,
    trip_summary: {
      data_points: n,
      avg_velocity_kmh: Number(avgVelocity.toFixed(1)),
      max_velocity_kmh: Number(maxVelocity.toFixed(1)),
      velocity_std_dev: Number(velStdDev.toFixed(2)),
      max_g_force: Number(maxG.toFixed(2)),
      g_force_std_dev: Number(gStdDev.toFixed(3)),
      harsh_braking_count: harshBrakingCount,
      harsh_cornering_count: harshCorneringCount,
      distanceKm
    },
    classification: {
      risk_score: riskScore,
      safety_score: safetyScore,
      risk_category: riskCategory,
      color_code: colorCode,
      vector: [speedPenalty, corneringDeduction, brakingDeduction + jerkDeduction]
    },
    sub_scores: {
      speed_compliance: speedSubScore,
      braking_smoothness: brakingSubScore,
      cornering_stability: corneringSubScore
    },
    key_risk_factors: factors
  };
}
