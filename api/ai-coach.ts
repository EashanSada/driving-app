import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    const { tripSummary, language = 'en' } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallbacks: Record<string, string> = {
        en: 'Great effort on the drive! Keep a 3-second follow distance to anticipate smooth stops before traffic lights.',
        es: '¡Gran trabajo en la conducción! Mantén una distancia de 3 segundos para anticipar paradas suaves.',
        fr: 'Excellent travail sur la route ! Gardez une distance de sécurité de 3 secondes pour anticiper les freins.',
        zh: '驱动安全提醒：保持至少 3 秒的安全跟车距离，以便在遇到弯道或红绿灯时平稳减速。'
      };
      return res.json({
        advice: fallbacks[language] || fallbacks.en,
        source: 'Built-In Safety Rule Engine'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    const prompt = `You are a non-profit AI Youth Driving Safety Coach for the DriveSafe Youth Initiative.
Analyze the following driving trip summary and provide 2 bullet points of constructive, encouraging, highly specific driving safety tips for a teenage driver.
Respond strictly in the language code: '${language}' (en = English, es = Spanish, fr = French, zh = Mandarin Chinese).

Trip Summary Data:
- Average Speed: ${tripSummary?.avg_velocity_kmh || 0} km/h
- Max Speed: ${tripSummary?.max_velocity_kmh || 0} km/h
- Max G-Force: ${tripSummary?.max_g_force || 0.0} G
- Harsh Braking Events: ${tripSummary?.harsh_braking_count || 0}
- Harsh Cornering Events: ${tripSummary?.harsh_cornering_count || 0}
- Safety Score: ${tripSummary?.safety_score || 100} / 100`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt
    });

    res.json({
      advice: response.text || 'Keep up the safe driving habits!',
      source: 'Gemini 3.6 Flash AI Coach'
    });
  } catch (err: any) {
    console.error('Gemini AI Coach Error:', err);
    res.json({
      advice: 'Maintain a steady distance and brake smoothly before turns.',
      source: 'Safety Rule Engine (Fallback)'
    });
  }
}
