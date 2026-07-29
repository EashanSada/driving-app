import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Initialize Gemini AI Client lazily/safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  };

  // 1. Python-Equivalent Serverless ML Risk Analyzer Endpoint
  app.post("/api/analyze-risk", (req, res) => {
    try {
      const payload = req.body || {};
      const telemetry = payload.telemetry || [];
      const driverId = payload.driver_id || "anonymous_youth";

      if (!Array.isArray(telemetry) || telemetry.length === 0) {
        return res.status(400).json({ status: "error", message: "Telemetry array required" });
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
      const baseRisk = 10.0;
      const speedRisk = Math.min(40.0, (velStdDev * 1.5) + (Math.max(0, maxVelocity - 100) * 0.8));
      const gForceRisk = Math.min(30.0, (gStdDev * 35.0) + (maxG * 12.0));
      const jerkRisk = Math.min(30.0, (highJerkEvents * 5.0) + (harshBrakingCount * 4.0) + (harshCorneringCount * 3.0));

      const totalRiskScore = Number(Math.min(100.0, baseRisk + speedRisk + gForceRisk + jerkRisk).toFixed(1));
      const safetyScore = Number(Math.max(0.0, 100.0 - totalRiskScore).toFixed(1));

      let riskCategory = "SAFE";
      let colorCode = "#10b981";
      if (totalRiskScore >= 60) {
        riskCategory = "HIGH_RISK";
        colorCode = "#ef4444";
      } else if (totalRiskScore >= 30) {
        riskCategory = "MODERATE";
        colorCode = "#f59e0b";
      }

      const riskFactors: string[] = [];
      if (velStdDev > 10.0) riskFactors.push("High Speed Fluctuations");
      if (maxG > 0.55) riskFactors.push("Extreme Acceleration / G-Force Spike");
      if (harshBrakingCount > 0) riskFactors.push(`${harshBrakingCount} Harsh Braking Events`);
      if (harshCorneringCount > 0) riskFactors.push(`${harshCorneringCount} Harsh Cornering Turns`);

      res.json({
        status: "success",
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
        key_risk_factors: riskFactors.length > 0 ? riskFactors : ["Smooth, steady momentum maintained."]
      });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message || "Risk calculation failed" });
    }
  });

  // 2. Gemini-Powered AI Driver Safety Coach
  app.post("/api/ai-coach", async (req, res) => {
    try {
      const { tripSummary, language = "en" } = req.body || {};
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback localized response if GEMINI_API_KEY is not set
        const fallbacks: Record<string, string> = {
          en: "Great effort on the drive! Keep a 3-second follow distance to anticipate smooth stops before traffic lights.",
          es: "¡Gran trabajo en la conducción! Mantén una distancia de 3 segundos para anticipar paradas suaves.",
          fr: "Excellent travail sur la route ! Gardez une distance de sécurité de 3 secondes pour anticiper les freins.",
          zh: "驱动安全提醒：保持至少 3 秒的安全跟车距离，以便在遇到弯道或红绿灯时平稳减速。"
        };
        return res.json({
          advice: fallbacks[language] || fallbacks.en,
          source: "Built-In Safety Rule Engine"
        });
      }

      const prompt = `You are a non-profit AI Youth Driving Safety Coach for the DriveSafe Youth Initiative.
Analyze the following driving trip summary and provide 2 bullet points of constructive, encouraging, highly specific driving safety tips for a teenage driver.
Respond strictly in the language code: '${language}' (en = English, es = Spanish, fr = French, zh = Mandarin Chinese).

Trip Summary Data:
- Average Speed: ${tripSummary?.avg_velocity_kmh || 50} km/h
- Max Speed: ${tripSummary?.max_velocity_kmh || 75} km/h
- Max G-Force: ${tripSummary?.max_g_force || 0.4} G
- Harsh Braking Events: ${tripSummary?.harsh_braking_count || 0}
- Harsh Cornering Events: ${tripSummary?.harsh_cornering_count || 0}
- Safety Score: ${tripSummary?.safety_score || 92} / 100`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

      res.json({
        advice: response.text || "Keep up the safe driving habits!",
        source: "Gemini 3.6 Flash AI Coach"
      });
    } catch (err: any) {
      console.error("Gemini AI Coach Error:", err);
      res.json({
        advice: "Maintain a steady distance and brake smoothly before turns.",
        source: "Safety Rule Engine (Fallback)"
      });
    }
  });

  // Serve Vite in Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DriveSafe Youth Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
