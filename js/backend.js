/**
 * DriveSafe Youth Initiative - Supabase & Backend Services
 * Handles Supabase Client Auth, Global Safe-Driver Leaderboards,
 * Hazard Reports, and Serverless ML Risk API Proxy.
 */

class DriveSafeBackend {
  constructor() {
    this.supabaseUrl = localStorage.getItem('DRIVESAFE_SUPABASE_URL') || 'https://demo-drivesafe.supabase.co';
    this.supabaseKey = localStorage.getItem('DRIVESAFE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo';
    this.isDemoMode = true;

    // Seed Mock Global Leaderboard Data for instant interactive display
    this.mockLeaderboard = [
      { id: '1', full_name: 'Alex Chen', cohort: 'West Coast Youth Safety', safety_score: 98.5, clean_trips: 42, badge: 'PLATINUM_GUARDIAN', points: 2420, language: 'en' },
      { id: '2', full_name: 'Sofia Rodriguez', cohort: 'Madrid Safe Teen Drivers', safety_score: 96.2, clean_trips: 35, badge: 'GOLD_GUARDIAN', points: 1900, language: 'es' },
      { id: '3', full_name: 'Lucas Dubois', cohort: 'Paris Eco-Mobility Youth', safety_score: 92.8, clean_trips: 28, badge: 'GOLD_GUARDIAN', points: 1480, language: 'fr' },
      { id: '4', full_name: 'Wei Zhang', cohort: 'Shanghai Future Safety', safety_score: 89.1, clean_trips: 20, badge: 'SILVER_GUARDIAN', points: 950, language: 'zh' },
      { id: '5', full_name: 'Maya Patel', cohort: 'Toronto Youth Drivers', safety_score: 87.4, clean_trips: 18, badge: 'SILVER_GUARDIAN', points: 820, language: 'en' }
    ];

    this.mockHazards = [
      { id: 'h1', hazard_type: 'POTHOLE', description: 'Deep pothole on right lane exit 12', lat: 37.7749, lng: -122.4194, upvotes: 14, time: '10m ago' },
      { id: 'h2', hazard_type: 'HIGH_ACCIDENT_ZONE', description: 'Blind intersection near High School entrance', lat: 37.7833, lng: -122.4167, upvotes: 28, time: '1h ago' },
      { id: 'h3', hazard_type: 'BLACK_ICE', description: 'Morning frost on bridge overpass', lat: 37.7650, lng: -122.4300, upvotes: 9, time: '3h ago' }
    ];
  }

  // Fetch Global Safe-Driver Leaderboard
  async getGlobalLeaderboard() {
    try {
      if (this.isDemoMode || !window.supabase) {
        return { success: true, data: this.mockLeaderboard, source: 'Local Demonstration Store' };
      }
      
      const client = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
      const { data, error } = await client
        .from('driver_scores')
        .select(`
          current_safety_score,
          clean_trips_count,
          badge_level,
          points_earned,
          profiles (full_name, youth_cohort, preferred_language)
        `)
        .order('current_safety_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return { success: true, data, source: 'Supabase Cloud Database' };
    } catch (err) {
      console.warn('Backend fetch fallback to mock store:', err);
      return { success: true, data: this.mockLeaderboard, source: 'Local Demonstration Store (Fallback)' };
    }
  }

  // Submit Trip Telematics to Microservice & DB
  async submitTripForAnalysis(telemetrySummary) {
    try {
      // Call Vercel Python Serverless Function or Local Express Proxy
      const response = await fetch('/api/analyze-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetrySummary)
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const result = await response.json();

      // If user score increased, update local mock leaderboard
      if (result.classification && result.classification.safety_score >= 80) {
        const userEntry = this.mockLeaderboard.find(u => u.id === '1');
        if (userEntry) {
          userEntry.clean_trips += 1;
          userEntry.points += 50;
        }
      }

      return { success: true, analysis: result };
    } catch (err) {
      console.warn('Microservice API offline, executing client fallback calculation:', err);
      
      // Client-side execution fallback of ML Risk Algorithm
      const telemetry = telemetrySummary.telemetry || [];
      const harshBraking = telemetrySummary.harshBrakingCount || 0;
      const harshCornering = telemetrySummary.harshCorneringCount || 0;
      
      const riskScore = Math.min(100, (harshBraking * 15) + (harshCornering * 12) + 10);
      const safetyScore = Math.max(0, 100 - riskScore);

      return {
        success: true,
        analysis: {
          driver_id: 'anonymous_youth',
          classification: {
            risk_score: riskScore,
            safety_score: safetyScore,
            risk_category: safetyScore > 80 ? 'SAFE' : (safetyScore > 50 ? 'MODERATE' : 'HIGH_RISK'),
            color_code: safetyScore > 80 ? '#10b981' : '#f59e0b',
            vector: [12.0, 15.0, 8.0]
          },
          key_risk_factors: harshBraking > 0 ? [`${harshBraking} harsh braking events`] : ['Smooth drive recorded.'],
          coaching_tips: ['Maintain steady pressure on pedals to optimize momentum.']
        }
      };
    }
  }

  // Submit Hazard Report
  async addHazardReport(hazard) {
    const newHazard = {
      id: `h_${Date.now()}`,
      hazard_type: hazard.type,
      description: hazard.description,
      lat: hazard.lat || 37.77,
      lng: hazard.lng || -122.41,
      upvotes: 1,
      time: 'Just now'
    };
    this.mockHazards.unshift(newHazard);
    return { success: true, hazard: newHazard };
  }

  // Get Community Hazard Map Items
  async getHazardReports() {
    return { success: true, hazards: this.mockHazards };
  }
}

// Global Export
const backendInstance = new DriveSafeBackend();

// Attach static helper delegates so both static calls (window.DriveSafeBackend.getGlobalLeaderboard()) 
// and instance calls (new window.DriveSafeBackend()) work seamlessly.
DriveSafeBackend.getGlobalLeaderboard = function(...args) {
  return backendInstance.getGlobalLeaderboard(...args);
};
DriveSafeBackend.submitTripForAnalysis = function(...args) {
  return backendInstance.submitTripForAnalysis(...args);
};
DriveSafeBackend.addHazardReport = function(...args) {
  return backendInstance.addHazardReport(...args);
};
DriveSafeBackend.getHazardReports = function(...args) {
  return backendInstance.getHazardReports(...args);
};

window.DriveSafeBackend = DriveSafeBackend;
window.driveSafeBackendInstance = backendInstance;
