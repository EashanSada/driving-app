/**
 * On-Device Intelligent Safety Coach for RadianDrive iOS
 * 
 * Provides tailored, professional driving feedback based on actual 
 * kinematic sensor metrics (braking, turning, velocity, G-forces)
 * in multiple languages, with zero server dependency.
 */

export function getLocalCoachAdvice(summary: any, language: string = 'en'): string {
  const lang = (language || 'en').toLowerCase().slice(0, 2);
  const harshBraking = Number(summary?.harsh_braking_count || 0);
  const harshCornering = Number(summary?.harsh_cornering_count || 0);
  const maxG = Number(summary?.max_g_force || 0);
  const maxVel = Number(summary?.max_velocity_kmh || 0);
  const score = Number(summary?.safety_score ?? summary?.trip_safety_score ?? 95);

  if (lang === 'es') {
    if (harshBraking > 0 && harshCornering > 0) {
      return '• Anticipación de frenado: Aumenta la distancia de seguridad a 3 segundos para evitar frenadas de emergencia.\n• Entrada en curvas: Reduce la velocidad progresivamente antes del giro para controlar la fuerza lateral G.';
    }
    if (harshBraking > 0) {
      return '• Desaceleración suave: Anticipa los semáforos y detenciones soltando el acelerador con antelación.\n• Presión de frenado progresiva: Aplica presión gradual al pedal para mantener la estabilidad del vehículo.';
    }
    if (harshCornering > 0 || maxG > 0.45) {
      return '• Trazado de curvas suave: Reduce la velocidad antes de entrar en la curva, no en medio de ella.\n• Control de fuerza lateral: Mantén movimientos de volante fluidos para un viaje cómodo y seguro.';
    }
    if (maxVel > 115) {
      return '• Control de velocidad punta: Mantente dentro de los límites señalizados para asegurar una distancia de frenado segura.\n• Velocidad constante: Utiliza una aceleración uniforme para optimizar la eficiencia y el control.';
    }
    return '• Excelente control del vehículo: Mantuviste una conducción suave y segura durante todo el trayecto.\n• Consistencia de telemetría: Continúa anticipando el tráfico con la misma atención y serenidad.';
  }

  if (lang === 'fr') {
    if (harshBraking > 0) {
      return '• Décélération progressive : Anticipez les feux de circulation pour éviter les arrêts brusques.\n• Distance de sécurité : Maintenez une règle de 3 secondes avec le véhicule qui vous précède.';
    }
    if (harshCornering > 0 || maxG > 0.45) {
      return '• Virages maîtrisés : Ralentissez avant d\'engager la courbe pour minimiser la force G latérale.\n• Trajectoire fluide : Adoptez des mouvements de volant mesurés et prévisibles.';
    }
    return '• Conduite exemplaire : Excellente anticipation et souplesse remarquable sur l\'ensemble du trajet.\n• Poursuivez ainsi : Votre score témoigne d\'une grande maturité au volant.';
  }

  if (lang === 'zh') {
    if (harshBraking > 0) {
      return '• 绿灯与路口预判：提前轻踩刹车减速，保持至少 3 秒车距，避免急刹车。\n• 平稳制动：循序渐进施加刹车踏板压力，提升乘车舒适与安全。';
    }
    if (harshCornering > 0 || maxG > 0.45) {
      return '• 入弯前减速：在进入弯道前完成减速，出弯后再缓慢加速，降低侧向 G 力。\n• 转向平稳：避免急打方向盘，保持车身姿态平稳。';
    }
    return '• 优秀平稳驾驶：全程未检测到激烈操作，车速与姿态控制良好。\n• 保持习惯：继续保持敏锐的路况预判与专注度。';
  }

  // Default: English
  if (harshBraking > 0 && harshCornering > 0) {
    return '• Progressive Braking: Extend follow distance to 3-4 seconds to avoid abrupt emergency stops at intersections.\n• Cornering Entry Speed: Ease off throttle prior to turn initiation to keep lateral G-forces under 0.35 G.';
  }
  if (harshBraking > 0) {
    return '• Intersection Anticipation: Begin gradual deceleration earlier before traffic signals to eliminate sudden stops.\n• Steady Pedal Modulation: Apply smooth, progressive brake pressure rather than abrupt compression.';
  }
  if (harshCornering > 0 || maxG > 0.45) {
    return '• Controlled Turn Entry: Complete all necessary braking in a straight line before steering into curves.\n• Steering Fluidity: Avoid sharp, sudden wheel corrections to maintain optimal tire traction.';
  }
  if (maxVel > 115) {
    const mph = Math.round(maxVel * 0.621371);
    return `• Top Speed Regulation: You peaked at ${mph} mph (${Math.round(maxVel)} km/h); keep highway speeds calibrated to posted limits.\n• Cruise Consistency: Steady velocity maximizes reaction margins and vehicle efficiency.`;
  }
  if (score >= 95) {
    return '• Exemplary Vehicle Control: Flawless smooth deceleration and gentle turning kinematics throughout the trip.\n• Defensive Habit Retention: Continue maintaining this high level of road scanning and anticipation.';
  }
  return '• Smooth Pace Management: Keep speed uniform and avoid rapid throttle bursts in urban traffic.\n• Anticipatory Scanning: Scan 12-15 seconds ahead to spot slowdowns before having to brake heavily.';
}
