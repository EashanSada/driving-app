import { GoogleGenAI } from '@google/genai';
import { applySecurityHeaders, enforceRateLimit, sanitizeString } from './_security';

function getGeminiClient(req?: any) {
  const headerKey = req?.headers?.['x-gemini-key'] || req?.body?.apiKey;
  const apiKey =
    (typeof headerKey === 'string' && headerKey.trim()) ||
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';

  if (!apiKey) return null;

  try {
    return new GoogleGenAI({
      apiKey
    });
  } catch (err) {
    console.error('Failed to create Gemini client:', err);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Enforce sliding-window rate limit (15 AI coach requests per minute per IP)
  const rateLimitCheck = enforceRateLimit(req, 'ai-coach', 15, 60 * 1000);
  if (!rateLimitCheck.allowed) {
    return res.status(rateLimitCheck.statusCode || 429).json({
      status: 'error',
      message: rateLimitCheck.message
    });
  }

  if (req.method === 'GET') {
    const ai = getGeminiClient(req);
    return res.status(200).json({
      status: 'ok',
      configured: Boolean(ai),
      message: ai ? 'Gemini AI Client initialized successfully!' : 'GEMINI_API_KEY missing on server.'
    });
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const tripSummary = body.tripSummary || {};
      const language = sanitizeString(body.language || 'en', 5).toLowerCase();
      const ai = getGeminiClient(req);

      if (!ai) {
        const fallbacks: Record<string, string> = {
          en: '• Smooth deceleration before traffic signals: Maintain a 3-second follow distance to avoid abrupt stopping.\n• Gentle cornering: Ease off the accelerator before turning to reduce lateral G-force strain.',
          es: '• Desaceleración suave antes de los semáforos: Mantén una distancia de 3 segundos para evitar frenados bruscos.\n• Curvas suaves: Reduce la velocidad antes de girar para minimizar la fuerza G lateral.',
          fr: '• Décélération progressive avant les feux : Conservez une distance de sécurité de 3 secondes.\n• Virages en douceur : Ralentissez avant le virage pour réduire la force G latérale.',
          zh: '• 绿灯前平稳减速：保持至少 3 秒跟车距离，避免紧急制动。\n• 入弯前放慢车速：降低侧向 G 力对车辆稳定性的影响。'
        };
        return res.json({
          advice: fallbacks[language] || fallbacks.en,
          source: 'Built-In Safety Rule Engine (GEMINI_API_KEY missing in Vercel / server env)',
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
        model: 'gemini-3.6-flash',
        contents: prompt
      });

      const adviceText = response.text ? response.text.trim() : 'Keep up the safe driving habits!';

      return res.json({
        advice: adviceText,
        source: 'Gemini 3.6 Flash AI Coach (Live AI)',
        geminiConfigured: true
      });
    } catch (err: any) {
      console.error('Gemini AI Coach Error:', err);
      return res.json({
        advice: '• Smooth braking: Apply steady pressure early before intersections.\n• Mind your speed: Maintain a uniform pace through curves.',
        source: `Safety Rule Engine (Gemini Notice: ${err.message || 'API error'})`,
        geminiConfigured: true,
        error: err.message
      });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
}
