import { GoogleGenAI } from '@google/genai';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
      const { tripSummary, language = 'en' } = req.body || {};
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
