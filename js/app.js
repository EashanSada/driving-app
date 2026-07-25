/**
 * DriveSafe Youth Initiative - Core Application State & i18n Switcher
 * Manages active application views, runtime language switching (EN, ES, FR, ZH),
 * and native bridge integration triggers.
 */

const I18N_DICTIONARY = {
  en: {
    appTitle: "DriveSafe Youth Initiative",
    tagline: "Empowering Next-Gen Drivers Through Telematics & AI",
    navHUD: "Live G-Force HUD",
    navAnalysis: "ML Risk Analysis",
    navLeaderboard: "Safe Leaderboard",
    navHazards: "Community Hazards",
    navArchitecture: "Architecture Spec",
    liveSpeed: "Current Velocity",
    gForceLabel: "Vector G-Force",
    simSmooth: "Smooth Cruising",
    simCity: "City Commute",
    simAggressive: "Aggressive Drive",
    startTracking: "Start Drive Simulation",
    stopTracking: "End Trip & Analyze",
    riskScore: "Driver Safety Score",
    riskCategory: "Risk Vector Classification",
    coachingTitle: "AI Safety Coach Feedback",
    leaderboardTitle: "Global Youth Safety Champions",
    reportHazard: "Report Road Hazard"
  },
  es: {
    appTitle: "Iniciativa DriveSafe Juventud",
    tagline: "Empoderando a la próxima generación mediante telemática e IA",
    navHUD: "HUD Fuerza-G en Vivo",
    navAnalysis: "Análisis de Riesgo ML",
    navLeaderboard: "Tabla de Clasificación",
    navHazards: "Peligros Comunitarios",
    navArchitecture: "Especificación Técnica",
    liveSpeed: "Velocidad Actual",
    gForceLabel: "Vector Fuerza-G",
    simSmooth: "Navegación Suave",
    simCity: "Trayecto Urbano",
    simAggressive: "Conducción Agresiva",
    startTracking: "Iniciar Simulación",
    stopTracking: "Finalizar y Analizar",
    riskScore: "Puntaje de Seguridad",
    riskCategory: "Clasificación de Riesgo ML",
    coachingTitle: "Consejos del Entrenador IA",
    leaderboardTitle: "Campeones Globales de Seguridad",
    reportHazard: "Reportar Peligro Vial"
  },
  fr: {
    appTitle: "Initiative DriveSafe Jeunesse",
    tagline: "Autonomiser les jeunes conducteurs grâce à la télématique et l'IA",
    navHUD: "HUD Force-G en Direct",
    navAnalysis: "Analyse de Risque ML",
    navLeaderboard: "Classement Sécurité",
    navHazards: "Dangers Communautaires",
    navArchitecture: "Spécification Technique",
    liveSpeed: "Vitesse Actuelle",
    gForceLabel: "Vecteur Force-G",
    simSmooth: "Conduite Fluide",
    simCity: "Trajet Urbain",
    simAggressive: "Conduite Agressive",
    startTracking: "Lancer la Simulation",
    stopTracking: "Terminer & Analyser",
    riskScore: "Score de Sécurité",
    riskCategory: "Vectorisation du Risque",
    coachingTitle: "Conseils du Coach IA",
    leaderboardTitle: "Champions Mondiaux de la Sécurité",
    reportHazard: "Signaler un Danger"
  },
  zh: {
    appTitle: "DriveSafe 青年驾驶安全倡议",
    tagline: "通过车载车载信息系统和人工智能赋能下一代青年司机",
    navHUD: "实时 G 值 HUD",
    navAnalysis: "ML 风险分析",
    navLeaderboard: "安全驾驶排行榜",
    navHazards: "社区路况警报",
    navArchitecture: "技术架构规范",
    liveSpeed: "当前行驶速度",
    gForceLabel: "G 值矢量度量",
    simSmooth: "平稳巡航模式",
    simCity: "城市通勤模式",
    simAggressive: "激进驾驶模式",
    startTracking: "启动驾驶模拟",
    stopTracking: "结束行程并分析",
    riskScore: "安全驾驶得分",
    riskCategory: "机器学习风险分类",
    coachingTitle: "AI 导师指导建议",
    leaderboardTitle: "全球青年安全驾驶榜",
    reportHazard: "上报道路危险"
  }
};

class AppController {
  constructor() {
    this.currentLanguage = localStorage.getItem('DRIVESAFE_LANG') || 'en';
    this.activeTab = 'hud';
    this.backend = new window.DriveSafeBackend();
    this.telematics = null;
  }

  init(canvasElement) {
    if (canvasElement) {
      this.telematics = new window.TelematicsEngine(canvasElement);
    }
    this.applyLanguage(this.currentLanguage);
  }

  setLanguage(langCode) {
    if (I18N_DICTIONARY[langCode]) {
      this.currentLanguage = langCode;
      localStorage.setItem('DRIVESAFE_LANG', langCode);
      this.applyLanguage(langCode);
    }
  }

  applyLanguage(langCode) {
    const dict = I18N_DICTIONARY[langCode] || I18N_DICTIONARY.en;
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (dict[key]) {
        element.textContent = dict[key];
      }
    });
  }

  getTranslation(key) {
    const dict = I18N_DICTIONARY[this.currentLanguage] || I18N_DICTIONARY.en;
    return dict[key] || key;
  }
}

// Global Export
window.DriveSafeApp = new AppController();
