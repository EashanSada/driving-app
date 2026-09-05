var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// api/_security.ts
function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-gemini-key, x-auth-token, Authorization");
}
function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "127.0.0.1";
}
function isMaliciousUserAgent(req) {
  const userAgent = (req.headers?.["user-agent"] || "").toLowerCase();
  const blockedSignatures = [
    "sqlmap",
    "nikto",
    "acunetix",
    "nmap",
    "masscan",
    "zgrab",
    "dirbuster",
    "gobuster",
    "wpscan",
    "havij"
  ];
  return blockedSignatures.some((sig) => userAgent.includes(sig));
}
function enforceRateLimit(req, endpointKey, maxRequests = 60, windowMs = 60 * 1e3) {
  const ip = getClientIp(req);
  const now = Date.now();
  const key = `${endpointKey}:${ip}`;
  if (isMaliciousUserAgent(req)) {
    return {
      allowed: false,
      statusCode: 403,
      message: "Access Forbidden: Malicious agent detected.",
      clientIp: ip
    };
  }
  let record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimitStore.set(key, record);
    return { allowed: true, clientIp: ip };
  }
  record.count += 1;
  if (record.count > maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1e3);
    return {
      allowed: false,
      statusCode: 429,
      message: `Rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`,
      clientIp: ip
    };
  }
  return { allowed: true, clientIp: ip };
}
function sanitizeString(input, maxLength = 250) {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>?/gm, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, maxLength);
}
function sanitizeCoordinates(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (isNaN(nLat) || isNaN(nLng)) return null;
  if (nLat < -90 || nLat > 90) return null;
  if (nLng < -180 || nLng > 180) return null;
  return {
    lat: parseFloat(nLat.toFixed(6)),
    lng: parseFloat(nLng.toFixed(6))
  };
}
function maskPiiAccount(account) {
  if (!account || typeof account !== "object") return account;
  const sanitized = { ...account };
  if (typeof sanitized.phone === "string" && sanitized.phone.length > 4) {
    sanitized.phone = sanitized.phone.slice(-4).padStart(sanitized.phone.length, "*");
  }
  if (typeof sanitized.parent_phone === "string" && sanitized.parent_phone.length > 4) {
    sanitized.parent_phone = sanitized.parent_phone.slice(-4).padStart(sanitized.parent_phone.length, "*");
  }
  if (typeof sanitized.email === "string" && sanitized.email.includes("@")) {
    const [name, domain] = sanitized.email.split("@");
    sanitized.email = `${name.charAt(0)}***@${domain}`;
  }
  if (typeof sanitized.parent_email === "string" && sanitized.parent_email.includes("@")) {
    const [name, domain] = sanitized.parent_email.split("@");
    sanitized.parent_email = `${name.charAt(0)}***@${domain}`;
  }
  return sanitized;
}
var rateLimitStore;
var init_security = __esm({
  "api/_security.ts"() {
    rateLimitStore = /* @__PURE__ */ new Map();
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
          rateLimitStore.delete(key);
        }
      }
    }, 5 * 60 * 1e3);
  }
});

// api/analyze-risk.ts
var analyze_risk_exports = {};
__export(analyze_risk_exports, {
  default: () => handler
});
async function handler(req, res) {
  applySecurityHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const rateLimitCheck = enforceRateLimit(req, "analyze-risk", 60, 60 * 1e3);
  if (!rateLimitCheck.allowed) {
    return res.status(rateLimitCheck.statusCode || 429).json({
      status: "error",
      message: rateLimitCheck.message
    });
  }
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", service: "ML Telemetry Risk Analyzer" });
  }
  if (req.method === "POST") {
    try {
      const payload = req.body || {};
      const telemetry = payload.telemetry || [];
      const driverId = sanitizeString(payload.driver_id || "anonymous_youth", 50);
      if (!Array.isArray(telemetry) || telemetry.length === 0) {
        return res.status(400).json({ status: "error", message: "Telemetry array required" });
      }
      const safeTelemetry = telemetry.slice(0, 1e3);
      const velocities = safeTelemetry.map((t) => Number(t.velocity || 0));
      const gx = safeTelemetry.map((t) => Number(t.g_force_x || 0));
      const gy = safeTelemetry.map((t) => Number(t.g_force_y || 0));
      const gz = safeTelemetry.map((t) => Number(t.g_force_z || 1));
      const jerks = safeTelemetry.map((t) => Number(t.braking_jerk || 0));
      const n = safeTelemetry.length;
      const avgVelocity = velocities.reduce((a, b) => a + b, 0) / n;
      const maxVelocity = Math.max(...velocities);
      const velVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / n;
      const velStdDev = Math.sqrt(velVariance);
      const gMags = gx.map((x, i) => Math.sqrt(x * x + gy[i] * gy[i]));
      const avgG = gMags.reduce((a, b) => a + b, 0) / n;
      const maxG = Math.max(...gMags, 0);
      const gStdDev = Math.sqrt(gMags.reduce((sum, g) => sum + Math.pow(g - avgG, 2), 0) / n);
      let harshBrakingCount = typeof payload.harshBrakingCount === "number" ? payload.harshBrakingCount : 0;
      let harshCorneringCount = typeof payload.harshCorneringCount === "number" ? payload.harshCorneringCount : 0;
      let highJerkEvents = 0;
      if (harshBrakingCount === 0 && harshCorneringCount === 0 && n > 1) {
        for (let i = 0; i < n; i++) {
          const isVerticalShock = Math.abs(gz[i] - 1) > 0.55;
          const hasDeceleration = i > 0 && velocities[i - 1] - velocities[i] >= 0.5;
          if (gy[i] < -0.48 && (!isVerticalShock || hasDeceleration)) {
            harshBrakingCount++;
          }
          if (Math.abs(gx[i]) > 0.48 && !isVerticalShock) {
            harshCorneringCount++;
          }
          if (jerks[i] > 4 && !isVerticalShock) {
            highJerkEvents++;
          }
        }
      } else {
        for (let i = 0; i < n; i++) {
          const isVerticalShock = Math.abs(gz[i] - 1) > 0.55;
          if (jerks[i] > 4 && !isVerticalShock) {
            highJerkEvents++;
          }
        }
      }
      let speedPenalty = 0;
      if (maxVelocity > 115) {
        speedPenalty = Math.min(20, (maxVelocity - 115) * 0.5);
      }
      let gForcePenalty = 0;
      if (maxG > 0.45) {
        gForcePenalty += Math.min(10, (maxG - 0.45) * 20);
      }
      if (gStdDev > 0.22) {
        gForcePenalty += Math.min(10, (gStdDev - 0.22) * 30);
      }
      const brakingDeduction = Math.min(25, harshBrakingCount * 4.5);
      const corneringDeduction = Math.min(20, harshCorneringCount * 3.5);
      const jerkDeduction = Math.min(10, highJerkEvents * 1.5);
      const eventPenalty = brakingDeduction + corneringDeduction + jerkDeduction;
      const totalRiskDeduction = Math.min(75, speedPenalty + gForcePenalty + eventPenalty);
      const totalRiskScore = Number(totalRiskDeduction.toFixed(1));
      const safetyScore = Number(Math.max(25, 100 - totalRiskDeduction).toFixed(1));
      let riskCategory = "SAFE";
      let colorCode = "#10b981";
      if (safetyScore < 65) {
        riskCategory = "HIGH_RISK";
        colorCode = "#ef4444";
      } else if (safetyScore < 85) {
        riskCategory = "MODERATE";
        colorCode = "#f59e0b";
      }
      const riskFactors = [];
      if (harshBrakingCount > 0) {
        riskFactors.push(`${harshBrakingCount} Harsh Braking Event${harshBrakingCount > 1 ? "s" : ""}`);
      }
      if (harshCorneringCount > 0) {
        riskFactors.push(`${harshCorneringCount} Harsh Cornering Turn${harshCorneringCount > 1 ? "s" : ""}`);
      }
      if (maxVelocity > 115) {
        const mph = Math.round(maxVelocity * 0.621371);
        riskFactors.push(`High Maximum Speed (${mph} mph / ${Math.round(maxVelocity)} km/h)`);
      }
      if (gForcePenalty > 5) {
        riskFactors.push("Elevated Lateral G-Force during maneuvers");
      }
      return res.status(200).json({
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
          harsh_cornering_count: harshCorneringCount,
          distanceKm: typeof payload.distanceKm === "number" ? payload.distanceKm : 0
        },
        classification: {
          risk_score: totalRiskScore,
          safety_score: safetyScore,
          risk_category: riskCategory,
          color_code: colorCode,
          vector: [Number(speedPenalty.toFixed(1)), Number(gForcePenalty.toFixed(1)), Number(eventPenalty.toFixed(1))]
        },
        key_risk_factors: riskFactors.length > 0 ? riskFactors : ["Smooth, controlled driving maintained.", "Zero harsh events detected."]
      });
    } catch (e) {
      return res.status(500).json({ status: "error", message: e.message || "Risk calculation failed" });
    }
  }
  return res.status(405).json({ status: "error", message: "Method not allowed" });
}
var init_analyze_risk = __esm({
  "api/analyze-risk.ts"() {
    init_security();
  }
});

// api/ai-coach.ts
var ai_coach_exports = {};
__export(ai_coach_exports, {
  default: () => handler2
});
function getGeminiClient(req) {
  const headerKey = req?.headers?.["x-gemini-key"] || req?.body?.apiKey;
  const apiKey = typeof headerKey === "string" && headerKey.trim() || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) return null;
  try {
    return new import_genai.GoogleGenAI({
      apiKey
    });
  } catch (err) {
    console.error("Failed to create Gemini client:", err);
    return null;
  }
}
async function handler2(req, res) {
  applySecurityHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const rateLimitCheck = enforceRateLimit(req, "ai-coach", 15, 60 * 1e3);
  if (!rateLimitCheck.allowed) {
    return res.status(rateLimitCheck.statusCode || 429).json({
      status: "error",
      message: rateLimitCheck.message
    });
  }
  if (req.method === "GET") {
    const ai = getGeminiClient(req);
    return res.status(200).json({
      status: "ok",
      configured: Boolean(ai),
      message: ai ? "Gemini AI Client initialized successfully!" : "GEMINI_API_KEY missing on server."
    });
  }
  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const tripSummary = body.tripSummary || {};
      const language = sanitizeString(body.language || "en", 5).toLowerCase();
      const ai = getGeminiClient(req);
      if (!ai) {
        const fallbacks = {
          en: "\u2022 Smooth deceleration before traffic signals: Maintain a 3-second follow distance to avoid abrupt stopping.\n\u2022 Gentle cornering: Ease off the accelerator before turning to reduce lateral G-force strain.",
          es: "\u2022 Desaceleraci\xF3n suave antes de los sem\xE1foros: Mant\xE9n una distancia de 3 segundos para evitar frenados bruscos.\n\u2022 Curvas suaves: Reduce la velocidad antes de girar para minimizar la fuerza G lateral.",
          fr: "\u2022 D\xE9c\xE9l\xE9ration progressive avant les feux : Conservez une distance de s\xE9curit\xE9 de 3 secondes.\n\u2022 Virages en douceur : Ralentissez avant le virage pour r\xE9duire la force G lat\xE9rale.",
          zh: "\u2022 \u7EFF\u706F\u524D\u5E73\u7A33\u51CF\u901F\uFF1A\u4FDD\u6301\u81F3\u5C11 3 \u79D2\u8DDF\u8F66\u8DDD\u79BB\uFF0C\u907F\u514D\u7D27\u6025\u5236\u52A8\u3002\n\u2022 \u5165\u5F2F\u524D\u653E\u6162\u8F66\u901F\uFF1A\u964D\u4F4E\u4FA7\u5411 G \u529B\u5BF9\u8F66\u8F86\u7A33\u5B9A\u6027\u7684\u5F71\u54CD\u3002"
        };
        return res.json({
          advice: fallbacks[language] || fallbacks.en,
          source: "Built-In Safety Rule Engine (GEMINI_API_KEY missing in Vercel / server env)",
          geminiConfigured: false
        });
      }
      const prompt = `You are a professional AI Driving Safety Advisor for the DriveSafe Initiative.
Analyze the following driving trip summary and provide 2 bullet points of constructive, clear, professional driving safety recommendations.
Do not use emojis. Keep the tone professional, encouraging, and mature.
Respond strictly in the language code: '${language}' (en = English, es = Spanish, fr = French, zh = Mandarin Chinese).

Trip Summary Data:
- Average Speed: ${Number(tripSummary?.avg_velocity_kmh) || 50} km/h
- Max Speed: ${Number(tripSummary?.max_velocity_kmh) || 75} km/h
- Max Lateral Force: ${Number(tripSummary?.max_g_force) || 0.4} G
- Abrupt Braking Events: ${Number(tripSummary?.harsh_braking_count) || 0}
- Abrupt Cornering Events: ${Number(tripSummary?.harsh_cornering_count) || 0}
- Safety Score: ${Number(tripSummary?.safety_score) || 92} / 100`;
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });
      const adviceText = response.text ? response.text.trim() : "Keep up the safe driving habits!";
      return res.json({
        advice: adviceText,
        source: "Gemini 3.6 Flash AI Coach (Live AI)",
        geminiConfigured: true
      });
    } catch (err) {
      console.error("Gemini AI Coach Error:", err);
      return res.json({
        advice: "\u2022 Smooth braking: Apply steady pressure early before intersections.\n\u2022 Mind your speed: Maintain a uniform pace through curves.",
        source: `Safety Rule Engine (Gemini Notice: ${err.message || "API error"})`,
        geminiConfigured: true,
        error: err.message
      });
    }
  }
  return res.status(405).json({ status: "error", message: "Method not allowed" });
}
var import_genai;
var init_ai_coach = __esm({
  "api/ai-coach.ts"() {
    import_genai = require("@google/genai");
    init_security();
  }
});

// api/accounts.ts
var accounts_exports = {};
__export(accounts_exports, {
  default: () => handler3
});
function getSupabaseServerClient(req) {
  const headerUrl = req?.headers?.["x-supabase-url"] || req?.headers?.["authorization-url"];
  const headerKey = req?.headers?.["x-supabase-key"] || req?.headers?.["authorization-key"];
  const url = typeof headerUrl === "string" && headerUrl.trim() || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "";
  const key = typeof headerKey === "string" && headerKey.trim() || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (url && key) {
    try {
      return {
        client: (0, import_supabase_js.createClient)(url, key, { auth: { persistSession: false } }),
        url,
        key: key.substring(0, 10) + "..."
      };
    } catch (err) {
      console.error("Failed to create Supabase server client:", err);
      return { client: null, url, error: err.message };
    }
  }
  return { client: null, url: "", key: "" };
}
async function handler3(req, res) {
  applySecurityHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const rateLimitCheck = enforceRateLimit(req, "accounts", 60, 60 * 1e3);
  if (!rateLimitCheck.allowed) {
    return res.status(rateLimitCheck.statusCode || 429).json({
      status: "error",
      message: rateLimitCheck.message
    });
  }
  const { client: supabase, url: envUrl, error: clientErr } = getSupabaseServerClient(req);
  if (req.method === "GET" && req.query?.action === "test") {
    if (!supabase) {
      return res.status(200).json({
        status: "error",
        configured: false,
        message: clientErr || "Supabase URL or Anon Key is missing on the server. Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Environment Variables or set credentials in app settings.",
        envUrlPresent: Boolean(envUrl)
      });
    }
    try {
      const { error } = await supabase.from("driver_accounts").select("username").limit(1);
      if (error) {
        return res.status(200).json({
          status: "error",
          configured: true,
          tableExists: error.code !== "42P01",
          code: error.code,
          message: error.code === "42P01" ? 'Connected to Supabase, but "driver_accounts" table does not exist. Please run schema.sql in Supabase SQL Editor.' : error.message,
          details: error.details || error.hint || ""
        });
      }
      const testUsername = "__drivesafe_diagnostic_test__";
      const testPayload = {
        username: testUsername,
        full_name: "Diagnostic Test User",
        safety_score: 100,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { error: writeErr } = await supabase.from("driver_accounts").upsert(testPayload, { onConflict: "username" });
      let writeSuccess = !writeErr;
      if (writeErr) {
        const { error: insertErr } = await supabase.from("driver_accounts").insert(testPayload);
        if (!insertErr) writeSuccess = true;
      }
      if (writeSuccess) {
        await supabase.from("driver_accounts").delete().eq("username", testUsername);
      }
      return res.status(200).json({
        status: "success",
        configured: true,
        tableExists: true,
        writePermission: writeSuccess,
        message: writeSuccess ? "Connected to Supabase driver_accounts table! Read & Write access confirmed." : "Connected to Supabase driver_accounts table, but Write test returned a warning: " + (writeErr?.message || "Check RLS policy")
      });
    } catch (err) {
      return res.status(200).json({
        status: "error",
        configured: true,
        message: err.message || "Failed to query Supabase"
      });
    }
  }
  if (req.method === "GET") {
    const { username } = req.query || {};
    if (!supabase) {
      return res.status(503).json({
        status: "error",
        message: "Supabase database is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel."
      });
    }
    if (username) {
      const cleanName = sanitizeString(username, 50).toLowerCase();
      try {
        const { data, error } = await supabase.from("driver_accounts").select("*").eq("username", cleanName).maybeSingle();
        if (error) {
          return res.status(500).json({
            status: "error",
            message: `Supabase query error: ${error.message}`
          });
        }
        if (!data) {
          return res.status(404).json({ status: "not_found", message: "Account not found in Supabase" });
        }
        const acc = data.account_data || {
          username: data.username,
          fullName: data.full_name,
          phone: data.phone,
          email: data.email,
          city: data.city || "",
          stateProvince: data.state_province || "",
          country: data.country || "",
          preferredLanguage: data.preferred_language || "en",
          unitSystem: data.unit_system || "imperial",
          parentName: data.parent_name,
          parentPhone: data.parent_phone,
          parentEmail: data.parent_email,
          createdTime: data.created_time || Date.now(),
          safetyScore: Number(data.safety_score) || 100,
          cleanTrips: Number(data.clean_trips) || 0,
          totalTrips: Number(data.total_trips) || 0,
          totalDistanceMiles: Number(data.total_distance_miles) || 0,
          points: Number(data.points) || 0,
          level: Number(data.level) || 1,
          currentXp: Number(data.current_xp) || 0,
          nextLevelXp: Number(data.next_level_xp) || 1e3,
          badgesUnlocked: data.badges_unlocked || ["BRONZE_GUARDIAN"],
          tripHistory: data.trip_history || []
        };
        return res.status(200).json({ status: "success", account: acc, source: "supabase" });
      } catch (err) {
        return res.status(500).json({ status: "error", message: err.message || "Supabase exception" });
      }
    } else {
      try {
        const { data, error } = await supabase.from("driver_accounts").select("*").order("safety_score", { ascending: false });
        if (error) {
          return res.status(500).json({
            status: "error",
            message: `Supabase query error: ${error.message}`
          });
        }
        const accounts = (data || []).map((item) => {
          const raw = item.account_data || {
            username: item.username,
            fullName: item.full_name,
            phone: item.phone,
            email: item.email,
            city: item.city || "",
            stateProvince: item.state_province || "",
            country: item.country || "",
            preferredLanguage: item.preferred_language || "en",
            unitSystem: item.unit_system || "imperial",
            parentName: item.parent_name,
            parentPhone: item.parent_phone,
            parentEmail: item.parent_email,
            createdTime: item.created_time || Date.now(),
            safetyScore: Number(item.safety_score) || 100,
            cleanTrips: Number(item.clean_trips) || 0,
            totalTrips: Number(item.total_trips) || 0,
            totalDistanceMiles: Number(item.total_distance_miles) || 0,
            points: Number(item.points) || 0,
            level: Number(item.level) || 1,
            currentXp: Number(item.current_xp) || 0,
            nextLevelXp: Number(item.next_level_xp) || 1e3,
            badgesUnlocked: item.badges_unlocked || ["BRONZE_GUARDIAN"],
            tripHistory: item.trip_history || []
          };
          return maskPiiAccount(raw);
        });
        return res.status(200).json({ status: "success", accounts, source: "supabase" });
      } catch (err) {
        return res.status(500).json({ status: "error", message: err.message || "Supabase exception" });
      }
    }
  }
  if (req.method === "POST") {
    const rawAccount = req.body || {};
    if (!rawAccount.username) {
      return res.status(400).json({ status: "error", message: "Username is required" });
    }
    if (!supabase) {
      return res.status(503).json({
        status: "error",
        supabaseSaved: false,
        message: "Supabase server client not initialized. Check URL and Anon Key in Vercel environment variables or app settings."
      });
    }
    const cleanUsername = sanitizeString(rawAccount.username, 30).toLowerCase().replace(/[^a-z0-9_]/g, "");
    const cleanFullName = sanitizeString(rawAccount.fullName || rawAccount.username, 80);
    const cleanPhone = sanitizeString(rawAccount.phone || "", 25);
    const cleanEmail = sanitizeString(rawAccount.email || "", 100);
    const cleanCity = sanitizeString(rawAccount.city || "", 80);
    const cleanStateProvince = sanitizeString(rawAccount.stateProvince || "", 80);
    const cleanCountry = sanitizeString(rawAccount.country || "", 80);
    const cleanPreferredLanguage = sanitizeString(rawAccount.preferredLanguage || "en", 10);
    const cleanUnitSystem = rawAccount.unitSystem === "metric" ? "metric" : "imperial";
    const cleanParentName = sanitizeString(rawAccount.parentName || "", 80);
    const cleanParentPhone = sanitizeString(rawAccount.parentPhone || "", 25);
    const cleanParentEmail = sanitizeString(rawAccount.parentEmail || "", 100);
    try {
      const payload = {
        username: cleanUsername,
        full_name: cleanFullName,
        phone: cleanPhone,
        email: cleanEmail,
        parent_name: cleanParentName,
        parent_phone: cleanParentPhone,
        parent_email: cleanParentEmail,
        safety_score: Math.min(100, Math.max(0, Number(rawAccount.safetyScore) || 100)),
        clean_trips: Math.max(0, Number(rawAccount.cleanTrips) || 0),
        total_trips: Math.max(0, Number(rawAccount.totalTrips) || 0),
        total_distance_miles: Math.max(0, Number(rawAccount.totalDistanceMiles) || 0),
        points: Math.max(0, Number(rawAccount.points) || 0),
        level: Math.max(1, Number(rawAccount.level) || 1),
        current_xp: Math.max(0, Number(rawAccount.currentXp) || 0),
        next_level_xp: Math.max(100, Number(rawAccount.nextLevelXp) || 1e3),
        badges_unlocked: Array.isArray(rawAccount.badgesUnlocked) ? rawAccount.badgesUnlocked.slice(0, 30) : ["BRONZE_GUARDIAN"],
        trip_history: Array.isArray(rawAccount.tripHistory) ? rawAccount.tripHistory.slice(0, 50) : [],
        account_data: {
          username: cleanUsername,
          fullName: cleanFullName,
          phone: cleanPhone,
          email: cleanEmail,
          city: cleanCity,
          stateProvince: cleanStateProvince,
          country: cleanCountry,
          preferredLanguage: cleanPreferredLanguage,
          unitSystem: cleanUnitSystem,
          parentName: cleanParentName,
          parentPhone: cleanParentPhone,
          parentEmail: cleanParentEmail,
          safetyScore: Math.min(100, Math.max(0, Number(rawAccount.safetyScore) || 100)),
          cleanTrips: Math.max(0, Number(rawAccount.cleanTrips) || 0),
          totalTrips: Math.max(0, Number(rawAccount.totalTrips) || 0),
          totalDistanceMiles: Math.max(0, Number(rawAccount.totalDistanceMiles) || 0),
          points: Math.max(0, Number(rawAccount.points) || 0),
          level: Math.max(1, Number(rawAccount.level) || 1),
          current_xp: Math.max(0, Number(rawAccount.currentXp) || 0),
          next_level_xp: Math.max(100, Number(rawAccount.nextLevelXp) || 1e3),
          badgesUnlocked: Array.isArray(rawAccount.badgesUnlocked) ? rawAccount.badgesUnlocked.slice(0, 30) : ["BRONZE_GUARDIAN"],
          tripHistory: Array.isArray(rawAccount.tripHistory) ? rawAccount.tripHistory.slice(0, 50) : []
        },
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      const { data, error: upsertErr } = await supabase.from("driver_accounts").upsert(payload, { onConflict: "username" }).select();
      if (!upsertErr) {
        return res.status(200).json({
          status: "success",
          account: payload.account_data,
          supabaseSaved: true,
          data
        });
      }
      const { error: updateErr } = await supabase.from("driver_accounts").update(payload).eq("username", cleanUsername);
      if (!updateErr) {
        return res.status(200).json({
          status: "success",
          account: payload.account_data,
          supabaseSaved: true,
          method: "update"
        });
      }
      const { error: insertErr } = await supabase.from("driver_accounts").insert(payload);
      if (!insertErr) {
        return res.status(200).json({
          status: "success",
          account: payload.account_data,
          supabaseSaved: true,
          method: "insert"
        });
      }
      return res.status(500).json({
        status: "error",
        supabaseSaved: false,
        message: upsertErr.message || updateErr.message || insertErr.message
      });
    } catch (err) {
      console.error("Supabase write error:", err);
      return res.status(500).json({
        status: "error",
        supabaseSaved: false,
        message: err.message || "Supabase write failure"
      });
    }
  }
  if (req.method === "DELETE") {
    if (!supabase) {
      return res.status(200).json({ status: "success", message: "Local reset complete" });
    }
    try {
      await supabase.from("driver_accounts").delete().neq("username", "__keep_schema__");
      return res.status(200).json({ status: "success", message: "All cloud accounts purged" });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message });
    }
  }
  return res.status(405).json({ status: "error", message: "Method not allowed" });
}
var import_supabase_js;
var init_accounts = __esm({
  "api/accounts.ts"() {
    import_supabase_js = require("@supabase/supabase-js");
    init_security();
  }
});

// api/hazards.ts
var hazards_exports = {};
__export(hazards_exports, {
  default: () => handler4
});
function getSupabaseServerClient2(req) {
  const headerUrl = req?.headers?.["x-supabase-url"] || req?.headers?.["authorization-url"];
  const headerKey = req?.headers?.["x-supabase-key"] || req?.headers?.["authorization-key"];
  const url = typeof headerUrl === "string" && headerUrl.trim() || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "";
  const key = typeof headerKey === "string" && headerKey.trim() || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (url && key) {
    try {
      return (0, import_supabase_js2.createClient)(url, key, { auth: { persistSession: false } });
    } catch {
      return null;
    }
  }
  return null;
}
async function handler4(req, res) {
  applySecurityHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const rateLimitCheck = enforceRateLimit(req, "hazards", 40, 60 * 1e3);
  if (!rateLimitCheck.allowed) {
    return res.status(rateLimitCheck.statusCode || 429).json({
      status: "error",
      message: rateLimitCheck.message
    });
  }
  const supabase = getSupabaseServerClient2(req);
  if (req.method === "GET") {
    if (!supabase) {
      return res.status(200).json({ status: "success", hazards: [], source: "unconfigured" });
    }
    try {
      const { data, error } = await supabase.from("road_hazards").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) {
        return res.status(500).json({ status: "error", message: error.message });
      }
      const hazards = (data || []).map((item) => ({
        id: item.id,
        hazard_type: item.hazard_type,
        description: item.description,
        lat: Number(item.lat),
        lng: Number(item.lng),
        upvotes: Number(item.upvotes) || 1,
        time: "Recently reported",
        source_app: item.source_app || "WEB_APP"
      }));
      return res.status(200).json({ status: "success", hazards, source: "supabase" });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message || "Failed to fetch hazards" });
    }
  }
  if (req.method === "POST") {
    const raw = req.body || {};
    const cleanId = sanitizeString(raw.id || `hz_${Date.now()}`, 50);
    const cleanType = sanitizeString(raw.hazard_type || "POTHOLE", 30);
    const cleanDesc = sanitizeString(raw.description || "", 200);
    const coords = sanitizeCoordinates(raw.lat, raw.lng);
    if (!cleanType || !cleanDesc || !coords) {
      return res.status(400).json({ status: "error", message: "Invalid hazard payload or coordinates" });
    }
    if (!supabase) {
      return res.status(503).json({ status: "error", supabaseSaved: false, message: "Supabase client not initialized" });
    }
    try {
      const { error } = await supabase.from("road_hazards").insert({
        id: cleanId,
        hazard_type: cleanType,
        description: cleanDesc,
        lat: coords.lat,
        lng: coords.lng,
        upvotes: Math.max(1, Math.min(1e3, Number(raw.upvotes) || 1)),
        source_app: sanitizeString(raw.source_app || "WEB_APP", 20)
      });
      if (error) {
        return res.status(500).json({ status: "error", supabaseSaved: false, message: error.message });
      }
      return res.status(200).json({ status: "success", supabaseSaved: true, hazardId: cleanId });
    } catch (err) {
      return res.status(500).json({ status: "error", supabaseSaved: false, message: err.message || "Insert error" });
    }
  }
  if (req.method === "PUT") {
    const raw = req.body || {};
    const cleanId = sanitizeString(raw.id, 50);
    const upvotes = Number(raw.upvotes);
    if (!cleanId || isNaN(upvotes)) {
      return res.status(400).json({ status: "error", message: "Invalid upvote payload" });
    }
    if (!supabase) {
      return res.status(503).json({ status: "error", supabaseSaved: false, message: "Supabase not configured" });
    }
    try {
      const { error } = await supabase.from("road_hazards").update({ upvotes: Math.max(1, Math.min(1e4, upvotes)) }).eq("id", cleanId);
      if (error) {
        return res.status(500).json({ status: "error", message: error.message });
      }
      return res.status(200).json({ status: "success", supabaseSaved: true });
    } catch (err) {
      return res.status(500).json({ status: "error", message: err.message || "Update error" });
    }
  }
  return res.status(405).json({ status: "error", message: "Method not allowed" });
}
var import_supabase_js2;
var init_hazards = __esm({
  "api/hazards.ts"() {
    import_supabase_js2 = require("@supabase/supabase-js");
    init_security();
  }
});

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
init_security();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.disable("x-powered-by");
  app.use(import_express.default.json({ limit: "500kb" }));
  app.use((req, res, next) => {
    applySecurityHeaders(res);
    if (isMaliciousUserAgent(req)) {
      return res.status(403).json({
        status: "error",
        message: "Access Forbidden: Suspicious client signature detected."
      });
    }
    const url = req.url.toLowerCase();
    if (url.includes("/.env") || url.includes("/.git") || url.includes("/wp-admin") || url.includes("/.aws") || url.includes("..")) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden access path."
      });
    }
    next();
  });
  app.all("/api/analyze-risk", async (req, res) => {
    try {
      const handler5 = (await Promise.resolve().then(() => (init_analyze_risk(), analyze_risk_exports))).default;
      return handler5(req, res);
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });
  app.all("/api/ai-coach", async (req, res) => {
    try {
      const handler5 = (await Promise.resolve().then(() => (init_ai_coach(), ai_coach_exports))).default;
      return handler5(req, res);
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });
  app.all("/api/accounts", async (req, res) => {
    try {
      const accountsHandler = (await Promise.resolve().then(() => (init_accounts(), accounts_exports))).default;
      return accountsHandler(req, res);
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });
  app.all("/api/hazards", async (req, res) => {
    try {
      const hazardsHandler = (await Promise.resolve().then(() => (init_hazards(), hazards_exports))).default;
      return hazardsHandler(req, res);
    } catch (err) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });
  app.get("/api/download-zip", (req, res) => {
    const zipPath = import_path.default.join(process.cwd(), "public", "radiandrive-project.zip");
    res.download(zipPath, "radiandrive-project.zip", (err) => {
      if (err) {
        res.status(500).send("Error downloading project archive");
      }
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DriveSafe Youth Platform running securely on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
