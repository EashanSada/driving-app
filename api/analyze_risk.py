"""
DriveSafe Youth Initiative - Python Data Science Serverless Microservice
Vercel Python Serverless Function: analyze_risk.py

Accepts JSON trip telemetry array containing time-series sensor data:
- velocity (km/h)
- g_force_x (lateral acceleration)
- g_force_y (longitudinal acceleration)
- g_force_z (vertical acceleration)
- braking_jerk (m/s^3)
- cornering_speed (km/h)

Outputs ML Risk Classification Vector & Safety Metrics.
"""

from http.server import BaseHTTPRequestHandler
import json
import math

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode('utf-8')) if post_data else {}

            telemetry = payload.get('telemetry', [])
            driver_id = payload.get('driver_id', 'anonymous_youth')
            trip_duration_sec = payload.get('trip_duration_sec', max(len(telemetry), 1))

            if not telemetry or not isinstance(telemetry, list):
                # Sample fallback telemetry array if empty
                telemetry = [
                    {"velocity": 45, "g_force_x": 0.1, "g_force_y": 0.2, "g_force_z": 0.98, "braking_jerk": 0.5},
                    {"velocity": 48, "g_force_x": 0.2, "g_force_y": -0.4, "g_force_z": 1.02, "braking_jerk": 1.2},
                    {"velocity": 52, "g_force_x": 0.15, "g_force_y": 0.1, "g_force_z": 1.0, "braking_jerk": 0.3},
                    {"velocity": 30, "g_force_x": 0.6, "g_force_y": -1.2, "g_force_z": 1.1, "braking_jerk": 3.8}
                ]

            # 1. Extract Statistical Metrics
            velocities = [float(point.get('velocity', 0)) for point in telemetry]
            gx = [float(point.get('g_force_x', 0)) for point in telemetry]
            gy = [float(point.get('g_force_y', 0)) for point in telemetry]
            gz = [float(point.get('g_force_z', 1.0)) for point in telemetry]
            jerks = [float(point.get('braking_jerk', 0)) for point in telemetry]

            n = len(telemetry)
            avg_velocity = sum(velocities) / n
            max_velocity = max(velocities)

            # Velocity Variance
            vel_variance = sum((v - avg_velocity) ** 2 for v in velocities) / n
            vel_std_dev = math.sqrt(vel_variance)

            # Combined Vector G-Force Magnitude
            g_magnitudes = [
                math.sqrt(x**2 + y**2 + (z - 1.0)**2) for x, y, z in zip(gx, gy, gz)
            ]
            avg_g_mag = sum(g_magnitudes) / n
            max_g_mag = max(g_magnitudes)
            g_mag_variance = sum((g - avg_g_mag) ** 2 for g in g_magnitudes) / n
            g_std_dev = math.sqrt(g_mag_variance)

            # Jerk Metrics (Braking & Sudden Acceleration)
            max_jerk = max(jerks)
            avg_jerk = sum(jerks) / n
            high_jerk_events = sum(1 for j in jerks if j > 2.5)
            harsh_cornering_events = sum(1 for x in gx if abs(x) > 0.45)
            harsh_braking_events = sum(1 for y in gy if y < -0.4)

            # 2. Machine Learning Risk Classification Heuristic Model
            # Formula: Risk Index (0 - 100)
            base_risk = 10.0
            speed_risk = min(40.0, (vel_std_dev * 1.5) + (max(0, max_velocity - 100) * 0.8))
            g_force_risk = min(30.0, (g_std_dev * 35.0) + (max_g_mag * 12.0))
            jerk_risk = min(30.0, (high_jerk_events * 5.0) + (harsh_braking_events * 4.0) + (harsh_cornering_events * 3.0))

            total_risk_score = round(min(100.0, base_risk + speed_risk + g_force_risk + jerk_risk), 1)
            safety_score = round(max(0.0, 100.0 - total_risk_score), 1)

            # Classification Category Vector
            if total_risk_score < 30.0:
                risk_category = "SAFE"
                safety_rating = "EXCELLENT"
                color_code = "#10b981" # Neon Mint
            elif total_risk_score < 60.0:
                risk_category = "MODERATE"
                safety_rating = "CAUTION_REQUIRED"
                color_code = "#f59e0b" # Amber
            else:
                risk_category = "HIGH_RISK"
                safety_rating = "CRITICAL_ATTENTION"
                color_code = "#ef4444" # Coral Red

            # Key Risk Factor Identification
            risk_factors = []
            if vel_std_dev > 12.0:
                risk_factors.append("High Speed Fluctuations (Inconsistent Cruise Control)")
            if max_g_mag > 0.6:
                risk_factors.append("Extreme Lateral/Longitudinal Acceleration Detected")
            if harsh_braking_events > 0:
                risk_factors.append(f"{harsh_braking_events} Harsh Braking Incidents Recorded")
            if harsh_cornering_events > 0:
                risk_factors.append(f"{harsh_cornering_events} Aggressive Cornering Turns Recorded")
            if not risk_factors:
                risk_factors.append("Smooth driving profile maintained throughout trip.")

            # Recommendations for Youth Drivers
            coaching_tips = []
            if "Harsh Braking" in str(risk_factors):
                coaching_tips.append("Increase follow distance to 3+ seconds to anticipate stops early.")
            if "Cornering" in str(risk_factors):
                coaching_tips.append("Brake before entering turns rather than during the curve.")
            if vel_std_dev > 10.0:
                coaching_tips.append("Maintain smooth throttle pressure to improve fuel efficiency and stability.")
            if not coaching_tips:
                coaching_tips.append("Outstanding driver focus! You qualify for safe-driver insurance discount points.")

            response_data = {
                "status": "success",
                "driver_id": driver_id,
                "trip_summary": {
                    "data_points": n,
                    "avg_velocity_kmh": round(avg_velocity, 1),
                    "max_velocity_kmh": round(max_velocity, 1),
                    "velocity_std_dev": round(vel_std_dev, 2),
                    "max_g_force": round(max_g_mag, 2),
                    "g_force_std_dev": round(g_std_dev, 3),
                    "harsh_braking_count": harsh_braking_events,
                    "harsh_cornering_count": harsh_cornering_events,
                    "high_jerk_events": high_jerk_events
                },
                "classification": {
                    "risk_score": total_risk_score,
                    "safety_score": safety_score,
                    "risk_category": risk_category,
                    "safety_rating": safety_rating,
                    "color_code": color_code,
                    "vector": [round(speed_risk, 1), round(g_force_risk, 1), round(jerk_risk, 1)]
                },
                "key_risk_factors": risk_factors,
                "coaching_tips": coaching_tips,
                "timestamp_ms": payload.get('timestamp', 1785000000)
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data, indent=2).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {"status": "error", "message": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        info = {
            "service": "DriveSafe Youth ML Risk Analyzer Microservice",
            "version": "2.4.0",
            "runtime": "Python 3.11 Serverless Function (Vercel)",
            "supported_endpoints": ["POST /api/analyze_risk"],
            "model_architecture": "Statistical Standard Deviation Vector + Heuristic Jerk Classification"
        }
        self.wfile.write(json.dumps(info, indent=2).encode('utf-8'))
