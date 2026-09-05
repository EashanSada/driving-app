/**
 * On-Device Telematics Risk Analyzer for RadianDrive iOS
 * 
 * Computes statistical driving kinematics (variance, G-force vectors, 
 * harsh events, jerk, and safety scores) natively on-device in real-time.
 * Runs with 0ms network latency and zero server dependency.
 */

export interface TelemetryPoint {
  velocity?: number;
  g_force_x?: number;
  g_force_y?: number;
  g_force_z?: number;
  braking_jerk?: number;
}

export interface RiskAnalysisPayload {
  telemetry?: TelemetryPoint[];
  driver_id?: string;
  harshBrakingCount?: number;
  harshCorneringCount?: number;
  distanceKm?: number;
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
  key_risk_factors: string[];
}

export function analyzeRiskLocally(payload: RiskAnalysisPayload): RiskAnalysisResult {
  const telemetry = payload.telemetry || [];
  const driverId = (payload.driver_id || 'driver').slice(0, 50);

  if (!Array.isArray(telemetry) || telemetry.length === 0) {
    return {
      status: 'success',
      driver_id: driverId,
      trip_summary: {
        data_points: 0,
        avg_velocity_kmh: 0,
        max_velocity_kmh: 0,
        velocity_std_dev: 0,
        max_g_force: 0,
        g_force_std_dev: 0,
        harsh_braking_count: 0,
        harsh_cornering_count: 0,
        distanceKm: payload.distanceKm || 0
      },
      classification: {
        risk_score: 0,
        safety_score: 100,
        risk_category: 'SAFE',
        color_code: '#10b981',
        vector: [0, 0, 0]
      },
      key_risk_factors: ['Smooth, controlled driving maintained.', 'Zero harsh events detected.']
    };
  }

  const safeTelemetry = telemetry.slice(0, 2000);
  const velocities = safeTelemetry.map(t => Number(t.velocity || 0));
  const gx = safeTelemetry.map(t => Number(t.g_force_x || 0));
  const gy = safeTelemetry.map(t => Number(t.g_force_y || 0));
  const gz = safeTelemetry.map(t => Number(t.g_force_z ?? 1.0));
  const jerks = safeTelemetry.map(t => Number(t.braking_jerk || 0));

  const n = safeTelemetry.length;
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / n;
  const maxVelocity = Math.max(...velocities, 0);

  const velVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / n;
  const velStdDev = Math.sqrt(velVariance);

  const gMags = gx.map((x, i) => Math.sqrt(x * x + gy[i] * gy[i]));
  const avgG = gMags.reduce((a, b) => a + b, 0) / n;
  const maxG = Math.max(...gMags, 0);
  const gStdDev = Math.sqrt(gMags.reduce((sum, g) => sum + Math.pow(g - avgG, 2), 0) / n);

  let harshBrakingCount = typeof payload.harshBrakingCount === 'number' ? payload.harshBrakingCount : 0;
  let harshCorneringCount = typeof payload.harshCorneringCount === 'number' ? payload.harshCorneringCount : 0;
  let highJerkEvents = 0;

  if (harshBrakingCount === 0 && harshCorneringCount === 0 && n > 1) {
    for (let i = 0; i < n; i++) {
      const isVerticalShock = Math.abs(gz[i] - 1.0) > 0.55;
      const hasDeceleration = i > 0 && (velocities[i - 1] - velocities[i] >= 0.5);

      if (gy[i] < -0.48 && (!isVerticalShock || hasDeceleration)) {
        harshBrakingCount++;
      }
      if (Math.abs(gx[i]) > 0.48 && !isVerticalShock) {
        harshCorneringCount++;
      }
      if (jerks[i] > 4.0 && !isVerticalShock) {
        highJerkEvents++;
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      const isVerticalShock = Math.abs(gz[i] - 1.0) > 0.55;
      if (jerks[i] > 4.0 && !isVerticalShock) {
        highJerkEvents++;
      }
    }
  }

  let speedPenalty = 0;
  if (maxVelocity > 115) { // > ~72 mph
    speedPenalty = Math.min(20.0, (maxVelocity - 115) * 0.5);
  }

  let gForcePenalty = 0;
  if (maxG > 0.45) {
    gForcePenalty += Math.min(10.0, (maxG - 0.45) * 20.0);
  }
  if (gStdDev > 0.22) {
    gForcePenalty += Math.min(10.0, (gStdDev - 0.22) * 30.0);
  }

  const brakingDeduction = Math.min(25.0, harshBrakingCount * 4.5);
  const corneringDeduction = Math.min(20.0, harshCorneringCount * 3.5);
  const jerkDeduction = Math.min(10.0, highJerkEvents * 1.5);
  const eventPenalty = brakingDeduction + corneringDeduction + jerkDeduction;

  const totalRiskDeduction = Math.min(75.0, speedPenalty + gForcePenalty + eventPenalty);
  const totalRiskScore = Number(totalRiskDeduction.toFixed(1));
  const safetyScore = Number(Math.max(25.0, 100.0 - totalRiskDeduction).toFixed(1));

  let riskCategory: 'SAFE' | 'MODERATE' | 'HIGH_RISK' = 'SAFE';
  let colorCode = '#10b981';
  if (safetyScore < 65.0) {
    riskCategory = 'HIGH_RISK';
    colorCode = '#ef4444';
  } else if (safetyScore < 85.0) {
    riskCategory = 'MODERATE';
    colorCode = '#f59e0b';
  }

  const riskFactors: string[] = [];
  if (harshBrakingCount > 0) {
    riskFactors.push(`${harshBrakingCount} Harsh Braking Event${harshBrakingCount > 1 ? 's' : ''}`);
  }
  if (harshCorneringCount > 0) {
    riskFactors.push(`${harshCorneringCount} Harsh Cornering Turn${harshCorneringCount > 1 ? 's' : ''}`);
  }
  if (maxVelocity > 115) {
    const mph = Math.round(maxVelocity * 0.621371);
    riskFactors.push(`High Maximum Speed (${mph} mph / ${Math.round(maxVelocity)} km/h)`);
  }
  if (gForcePenalty > 5.0) {
    riskFactors.push('Elevated Lateral G-Force during maneuvers');
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
      distanceKm: typeof payload.distanceKm === 'number' ? payload.distanceKm : 0
    },
    classification: {
      risk_score: totalRiskScore,
      safety_score: safetyScore,
      risk_category: riskCategory,
      color_code: colorCode,
      vector: [Number(speedPenalty.toFixed(1)), Number(gForcePenalty.toFixed(1)), Number(eventPenalty.toFixed(1))]
    },
    key_risk_factors: riskFactors.length > 0 ? riskFactors : ['Smooth, controlled driving maintained.', 'Zero harsh events detected.']
  };
}
