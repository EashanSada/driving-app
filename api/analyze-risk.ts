import type { Request, Response } from 'express';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const telemetry = payload.telemetry || [];
    const driverId = payload.driver_id || 'anonymous_youth';

    if (!Array.isArray(telemetry) || telemetry.length === 0) {
      return res.status(200).json({
        status: 'success',
        driver_id: driverId,
        trip_summary: {
          data_points: 0,
          avg_velocity_kmh: 0.0,
          max_velocity_kmh: 0.0,
          velocity_std_dev: 0.0,
          max_g_force: 0.0,
          g_force_std_dev: 0.0,
          harsh_braking_count: 0,
          harsh_cornering_count: 0
        },
        classification: {
          risk_score: 0.0,
          safety_score: 100.0,
          risk_category: 'SAFE',
          color_code: '#10b981',
          vector: [0.0, 0.0, 0.0]
        },
        key_risk_factors: ['Vehicle stationary. No risk detected.']
      });
    }

    const velocities = telemetry.map(t => Number(t.velocity || 0));
    const gx = telemetry.map(t => Number(t.g_force_x || 0));
    const gy = telemetry.map(t => Number(t.g_force_y || 0));
    const gz = telemetry.map(t => Number(t.g_force_z || 1.0));
    const jerks = telemetry.map(t => Number(t.braking_jerk || 0));

    const n = telemetry.length;
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / n;
    const maxVelocity = Math.max(...velocities);

    // Speed Variance
    const velVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / n;
    const velStdDev = Math.sqrt(velVariance);

    // G-Force Magnitudes
    const gMags = gx.map((x, i) => Math.sqrt(x*x + gy[i]*gy[i] + Math.pow(gz[i] - 1.0, 2)));
    const avgG = gMags.reduce((a, b) => a + b, 0) / n;
    const maxG = Math.max(...gMags);
    const gStdDev = Math.sqrt(gMags.reduce((sum, g) => sum + Math.pow(g - avgG, 2), 0) / n);

    const harshBrakingCount = gy.filter(y => y < -0.4).length;
    const harshCorneringCount = gx.filter(x => Math.abs(x) > 0.45).length;
    const highJerkEvents = jerks.filter(j => j > 2.5).length;

    // Risk Scoring Heuristics
    const baseRisk = 5.0;
    const speedRisk = Math.min(40.0, (velStdDev * 1.5) + (Math.max(0, maxVelocity - 100) * 0.8));
    const gForceRisk = Math.min(30.0, (gStdDev * 35.0) + (maxG * 12.0));
    const jerkRisk = Math.min(30.0, (highJerkEvents * 5.0) + (harshBrakingCount * 4.0) + (harshCorneringCount * 3.0));

    const totalRiskScore = Number(Math.min(100.0, baseRisk + speedRisk + gForceRisk + jerkRisk).toFixed(1));
    const safetyScore = Number(Math.max(0.0, 100.0 - totalRiskScore).toFixed(1));

    let riskCategory = 'SAFE';
    let colorCode = '#10b981';
    if (totalRiskScore >= 60) {
      riskCategory = 'HIGH_RISK';
      colorCode = '#ef4444';
    } else if (totalRiskScore >= 30) {
      riskCategory = 'MODERATE';
      colorCode = '#f59e0b';
    }

    const riskFactors: string[] = [];
    if (velStdDev > 10.0) riskFactors.push('High Speed Fluctuations');
    if (maxG > 0.55) riskFactors.push('Extreme Motion / G-Force Spike');
    if (harshBrakingCount > 0) riskFactors.push(`${harshBrakingCount} Harsh Braking Events`);
    if (harshCorneringCount > 0) riskFactors.push(`${harshCorneringCount} Harsh Cornering Turns`);

    res.json({
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
        harsh_cornering_count: harshCorneringCount
      },
      classification: {
        risk_score: totalRiskScore,
        safety_score: safetyScore,
        risk_category: riskCategory,
        color_code: colorCode,
        vector: [Number(speedRisk.toFixed(1)), Number(gForceRisk.toFixed(1)), Number(jerkRisk.toFixed(1))]
      },
      key_risk_factors: riskFactors.length > 0 ? riskFactors : ['Smooth, steady momentum maintained.']
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message || 'Risk calculation failed' });
  }
}
