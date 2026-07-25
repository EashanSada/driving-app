/**
 * DriveSafe Youth Initiative - Telematics Engine & Canvas G-Force HUD
 * Handles live phone sensor access, simulated driving scenarios,
 * and vector G-Force HUD canvas rendering.
 */

class TelematicsEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.isTracking = false;
    this.simulationMode = 'CITY_COMMUTE'; // SMOOTH, AGGRESSIVE, CITY_COMMUTE
    this.subscribers = [];

    // Current State Telematics Vector
    this.state = {
      speedKmh: 45.0,
      targetSpeedKmh: 45.0,
      gForceX: 0.05, // Lateral (Left/Right turn)
      gForceY: 0.10, // Longitudinal (Accel/Braking)
      gForceZ: 0.98, // Vertical (Gravity)
      gForceMag: 0.11,
      jerkMs3: 0.2,
      headingDeg: 120,
      harshBrakingCount: 0,
      harshCorneringCount: 0,
      distanceKm: 0.0,
      tripStartTime: Date.now(),
      telemetryHistory: []
    };

    this.initSensors();
    if (this.canvas) {
      this.startHudAnimationLoop();
    }
  }

  // Initialize native device orientation / accelerometer sensors if permitted
  initSensors() {
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (event) => {
        if (!this.isTracking || window.AndroidBridge) return; // Prefer native Android bridge if present
        
        const accel = event.accelerationIncludingGravity;
        if (accel && accel.x !== null) {
          // Convert m/s^2 to G-Force
          this.state.gForceX = accel.x / 9.81;
          this.state.gForceY = accel.y / 9.81;
          this.state.gForceZ = accel.z / 9.81;
          this.updateMetrics();
        }
      });
    }
  }

  // Start telemetry recording & drive scenario simulation loop
  startTracking(scenario = 'CITY_COMMUTE') {
    this.isTracking = true;
    this.simulationMode = scenario;
    this.state.tripStartTime = Date.now();
    this.state.distanceKm = 0.0;
    this.state.harshBrakingCount = 0;
    this.state.harshCorneringCount = 0;
    this.state.telemetryHistory = [];

    if (this.simInterval) clearInterval(this.simInterval);

    this.simInterval = setInterval(() => {
      if (!this.isTracking) return;
      this.simulateSensorTick();
    }, 250);
  }

  stopTracking() {
    this.isTracking = false;
    if (this.simInterval) clearInterval(this.simInterval);
    return this.getTripSummary();
  }

  // Simulates realistic vehicle dynamics if native hardware isn't moving
  simulateSensorTick() {
    // Check if Native Android Bridge is available
    if (window.AndroidBridge && typeof window.AndroidBridge.getNativeTelematics === 'function') {
      try {
        const rawJson = window.AndroidBridge.getNativeTelematics();
        const nativeData = JSON.parse(rawJson);
        this.state.gForceX = nativeData.gForceX || 0;
        this.state.gForceY = nativeData.gForceY || 0;
        this.state.gForceZ = nativeData.gForceZ || 1.0;
      } catch (e) {
        console.warn('Native Bridge error, falling back to simulator:', e);
      }
    } else {
      // Dynamic Simulation Algorithms based on scenario
      let speedVariance = 1.2;
      let targetBaseSpeed = 50;
      let aggressiveness = 0.2;

      if (this.simulationMode === 'AGGRESSIVE') {
        targetBaseSpeed = 85;
        aggressiveness = 0.8;
      } else if (this.simulationMode === 'SMOOTH') {
        targetBaseSpeed = 40;
        aggressiveness = 0.05;
      }

      // Smooth random walk speed
      this.state.speedKmh += (Math.random() - 0.48) * (aggressiveness * 8);
      this.state.speedKmh = Math.max(0, Math.min(130, this.state.speedKmh));

      // G-Force fluctuations
      const turnEvent = Math.random() < (aggressiveness * 0.25);
      const brakeEvent = Math.random() < (aggressiveness * 0.20);

      if (turnEvent) {
        this.state.gForceX = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * aggressiveness);
      } else {
        this.state.gForceX += (Math.random() - 0.5) * 0.08;
      }

      if (brakeEvent) {
        this.state.gForceY = -(0.35 + Math.random() * (aggressiveness * 0.8));
      } else {
        this.state.gForceY += (Math.random() - 0.48) * 0.1;
      }

      this.state.gForceZ = 0.98 + (Math.random() - 0.5) * 0.05;
    }

    this.updateMetrics();
  }

  updateMetrics() {
    // Calculate total G-Force magnitude minus gravity
    const netZ = this.state.gForceZ - 1.0;
    this.state.gForceMag = Math.sqrt(
      Math.pow(this.state.gForceX, 2) + 
      Math.pow(this.state.gForceY, 2) + 
      Math.pow(netZ, 2)
    );

    // Calculate Jerk (m/s^3)
    this.state.jerkMs3 = Math.abs(this.state.gForceY) * 9.81 * 0.4;

    // Detect harsh events
    if (this.state.gForceY < -0.42) {
      this.state.harshBrakingCount++;
      if (window.AndroidBridge && window.AndroidBridge.triggerHapticWarning) {
        window.AndroidBridge.triggerHapticWarning('HARSH_BRAKING');
      }
    }
    if (Math.abs(this.state.gForceX) > 0.45) {
      this.state.harshCorneringCount++;
    }

    // Distance increment (speed * time delta 0.25s)
    this.state.distanceKm += (this.state.speedKmh / 3600) * 0.25;

    // Record time-series telemetry data point
    const point = {
      timestamp: Date.now(),
      velocity: parseFloat(this.state.speedKmh.toFixed(1)),
      g_force_x: parseFloat(this.state.gForceX.toFixed(2)),
      g_force_y: parseFloat(this.state.gForceY.toFixed(2)),
      g_force_z: parseFloat(this.state.gForceZ.toFixed(2)),
      braking_jerk: parseFloat(this.state.jerkMs3.toFixed(2))
    };

    this.state.telemetryHistory.push(point);
    if (this.state.telemetryHistory.length > 300) {
      this.state.telemetryHistory.shift();
    }

    // Notify listeners
    this.notifySubscribers();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.state));
  }

  getTripSummary() {
    return {
      durationSec: Math.round((Date.now() - this.state.tripStartTime) / 1000),
      distanceKm: parseFloat(this.state.distanceKm.toFixed(2)),
      harshBrakingCount: this.state.harshBrakingCount,
      harshCorneringCount: this.state.harshCorneringCount,
      telemetry: [...this.state.telemetryHistory]
    };
  }

  // High-performance Canvas Render Loop for G-Force Radar HUD
  startHudAnimationLoop() {
    const render = () => {
      this.drawHudCanvas();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  drawHudCanvas() {
    if (!this.canvas || !this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 15;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    // 1. Outer Tech Frame
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Safe / Moderate / Critical Target Rings
    const ring05 = maxRadius * 0.33; // 0.5 G
    const ring10 = maxRadius * 0.66; // 1.0 G
    const ring15 = maxRadius * 1.0;  // 1.5 G

    // 0.5G Ring (Safe Green)
    ctx.beginPath();
    ctx.arc(cx, cy, ring05, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.stroke();

    // 1.0G Ring (Amber Warning)
    ctx.beginPath();
    ctx.arc(cx, cy, ring10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.stroke();

    // 1.5G Ring (Red Hazard)
    ctx.beginPath();
    ctx.arc(cx, cy, ring15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.setLineDash([]);
    ctx.stroke();

    // 3. Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - maxRadius, cy);
    ctx.lineTo(cx + maxRadius, cy);
    ctx.moveTo(cx, cy - maxRadius);
    ctx.lineTo(cx, cy + maxRadius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();

    // 4. Ring Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('0.5G', cx + 4, cy - ring05 + 12);
    ctx.fillText('1.0G', cx + 4, cy - ring10 + 12);

    // 5. Calculate Vector Dot Position (X = Lateral, Y = Longitudinal)
    const px = cx + (this.state.gForceX / 1.5) * maxRadius;
    const py = cy - (this.state.gForceY / 1.5) * maxRadius;

    // Glowing Trail Line
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    const dotColor = this.state.gForceMag > 0.5 ? '#ef4444' : (this.state.gForceMag > 0.3 ? '#f59e0b' : '#10b981');
    ctx.strokeStyle = dotColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing Dot
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.shadowColor = dotColor;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
  }
}

// Global Export
window.TelematicsEngine = TelematicsEngine;
