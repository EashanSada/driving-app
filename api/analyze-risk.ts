export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'ML Telemetry Risk Analyzer' });
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body || {};
      const telemetry = payload.telemetry || [];
      const driverId = payload.driver_id || 'anonymous_youth';

      if (!Array.isArray(telemetry) || telemetry.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Telemetry array required' });
      }

      const velocities = telemetry.map((t: any) => Number(t.velocity || 0));
      const gx = telemetry.map((t: any) => Number(t.g_force_x || 0));
      const gy = telemetry.map((t: any) => Number(t.g_force_y || 0));
      const gz = telemetry.map((t: any) => Number(t.g_force_z || 1.0));
      const jerks = telemetry.map((t: any) => Number(t.braking_jerk || 0));

      const n = telemetry.length;
      const avgVelocity = velocities.reduce((a: number, b: number) => a + b, 0) / n;
      const maxVelocity = Math.max(...velocities);

      // Speed Variance (Normal stop-and-go driving naturally has variance; only extreme variance at high speed is penalized)
      const velVariance = velocities.reduce((sum: number, v: number) => sum + Math.pow(v - avgVelocity, 2), 0) / n;
      const velStdDev = Math.sqrt(velVariance);

      // Net Lateral & Longitudinal G-Force Magnitudes (excluding 1G gravity)
      const gMags = gx.map((x: number, i: number) => Math.sqrt(x * x + gy[i] * gy[i]));
      const avgG = gMags.reduce((a: number, b: number) => a + b, 0) / n;
      const maxG = Math.max(...gMags, 0);
      const gStdDev = Math.sqrt(gMags.reduce((sum: number, g: number) => sum + Math.pow(g - avgG, 2), 0) / n);

      let harshBrakingCount = typeof payload.harshBrakingCount === 'number' ? payload.harshBrakingCount : 0;
      let harshCorneringCount = typeof payload.harshCorneringCount === 'number' ? payload.harshCorneringCount : 0;
      let highJerkEvents = 0;

      // Scan telemetry time-series if counts were not pre-calculated
      if (harshBrakingCount === 0 && harshCorneringCount === 0 && n > 1) {
        for (let i = 0; i < n; i++) {
          const isVerticalShock = Math.abs(gz[i] - 1.0) > 0.55;
          const hasDeceleration = i > 0 && (velocities[i - 1] - velocities[i] >= 0.5);

          // Deceleration exceeding -0.48G without pure vertical shock
          if (gy[i] < -0.48 && (!isVerticalShock || hasDeceleration)) {
            harshBrakingCount++;
          }
          // Lateral turn exceeding 0.48G
          if (Math.abs(gx[i]) > 0.48 && !isVerticalShock) {
            harshCorneringCount++;
          }
          // Jerk exceeding 4.0 m/s3
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

      // Fair, motivating, industry-calibrated risk deductions
      // Perfect drive starts at 0 risk points (100.0 safety score)
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

      let riskCategory = 'SAFE';
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

      return res.status(200).json({
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
      });
    } catch (e: any) {
      return res.status(500).json({ status: 'error', message: e.message || 'Risk calculation failed' });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
