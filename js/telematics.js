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
    this.useDemoSimulation = false;
    this.subscribers = [];

    // Current State Telematics Vector - Real Resting Baseline (0.0 km/h)
    this.state = {
      speedKmh: 0.0,
      targetSpeedKmh: 0.0,
      gForceX: 0.0, // Lateral (Left/Right turn)
      gForceY: 0.0, // Longitudinal (Accel/Braking)
      gForceZ: 1.0, // Vertical (Gravity)
      gForceMag: 0.0,
      jerkMs3: 0.0,
      headingDeg: 0,
      harshBrakingCount: 0,
      harshCorneringCount: 0,
      distanceKm: 0.0,
      tripStartTime: Date.now(),
      telemetryHistory: []
    };

    this.lastLat = null;
    this.lastLng = null;
    this.initSensors();
    if (this.canvas) {
      this.startHudAnimationLoop();
    }
  }

  async requestDeviceMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === 'granted') {
          console.log('DeviceMotion permission granted on iOS');
        }
      } catch (e) {
        console.warn('DeviceMotion permission notice:', e);
      }
    }
  }

  // Initialize live device GPS & accelerometer sensors
  initSensors() {
    // 1. Live Device Motion (Accelerometer)
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (event) => {
        if (!this.isTracking || this.useDemoSimulation) return;

        // Native Android Bridge takes precedence if available
        if (window.AndroidBridge && typeof window.AndroidBridge.getNativeTelematics === 'function') {
          try {
            const rawJson = window.AndroidBridge.getNativeTelematics();
            const nativeData = JSON.parse(rawJson);
            this.state.gForceX = nativeData.gForceX || 0;
            this.state.gForceY = nativeData.gForceY || 0;
            this.state.gForceZ = nativeData.gForceZ || 1.0;
            if (typeof nativeData.speedKmh === 'number') {
              this.state.speedKmh = nativeData.speedKmh;
            }
            this.updateMetrics();
            return;
          } catch (e) {
            console.warn('Native Bridge error:', e);
          }
        }

        const accel = event.acceleration || event.accelerationIncludingGravity;
        if (accel && accel.x !== null && accel.x !== undefined) {
          // Normalize to G (1G = 9.81 m/s^2)
          const rawGx = accel.x / 9.81;
          const rawGy = accel.y / 9.81;
          const rawGz = (accel.z || 9.81) / 9.81;

          // Apply Low-pass Exponential Moving Average Filter (alpha = 0.3) to dampen high-frequency road vibrations (train tracks/potholes)
          const alpha = 0.3;
          this.filteredGx = this.filteredGx !== undefined ? (this.filteredGx * (1 - alpha) + rawGx * alpha) : rawGx;
          this.filteredGy = this.filteredGy !== undefined ? (this.filteredGy * (1 - alpha) + rawGy * alpha) : rawGy;
          this.filteredGz = this.filteredGz !== undefined ? (this.filteredGz * (1 - alpha) + rawGz * alpha) : rawGz;

          this.state.gForceX = parseFloat(this.filteredGx.toFixed(2));
          this.state.gForceY = parseFloat(this.filteredGy.toFixed(2));
          this.state.gForceZ = parseFloat(this.filteredGz.toFixed(2));
          this.updateMetrics();
        }
      });
    }

    // 2. Live GPS Geolocation Watcher
    if (navigator.geolocation) {
      try {
        this.geoWatchId = navigator.geolocation.watchPosition(
          (position) => {
            if (!this.isTracking || this.useDemoSimulation) return;

            const coords = position.coords;
            if (coords) {
              if (coords.speed !== null && coords.speed !== undefined && !isNaN(coords.speed) && coords.speed >= 0) {
                // Convert m/s to km/h (filter out noise below 1 km/h)
                const realKmh = coords.speed * 3.6;
                this.state.speedKmh = realKmh >= 1.0 ? parseFloat(realKmh.toFixed(1)) : 0.0;
              } else {
                // Stationary or speed unavailable
                this.state.speedKmh = 0.0;
              }

              if (coords.heading !== null && coords.heading !== undefined && !isNaN(coords.heading)) {
                this.state.headingDeg = Math.round(coords.heading);
              }

              this.lastLat = coords.latitude;
              this.lastLng = coords.longitude;
            }
            this.updateMetrics();
          },
          (err) => {
            console.warn('GPS location access notice:', err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
          }
        );
      } catch (err) {
        console.warn('Geolocation setup notice:', err);
      }
    }
  }

  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Start real telemetry recording
  async startTracking(demoMode = false) {
    await this.requestDeviceMotionPermission();
    this.isTracking = true;
    this.useDemoSimulation = demoMode;
    this.state.tripStartTime = Date.now();
    this.lastMetricsTime = Date.now();
    this.state.distanceKm = 0.0;
    this.state.harshBrakingCount = 0;
    this.state.harshCorneringCount = 0;
    this.state.telemetryHistory = [];
    this.state.speedKmh = 0.0;
    this.state.gForceX = 0.0;
    this.state.gForceY = 0.0;
    this.state.gForceZ = 1.0;

    if (this.simInterval) clearInterval(this.simInterval);

    this.simInterval = setInterval(() => {
      if (!this.isTracking) return;
      
      if (this.useDemoSimulation) {
        this.runDemoDriveTick();
      } else {
        this.updateMetrics();
      }
    }, 250);
  }

  setDemoSpeed(kmh) {
    this.useDemoSimulation = true;
    this.state.speedKmh = Math.max(0, kmh);
    this.updateMetrics();
  }

  runDemoDriveTick() {
    this.state.speedKmh += (Math.random() - 0.48) * 2;
    this.state.speedKmh = Math.max(0, Math.min(120, this.state.speedKmh));
    this.state.gForceX = parseFloat(((Math.random() - 0.5) * 0.2).toFixed(2));
    this.state.gForceY = parseFloat(((Math.random() - 0.48) * 0.2).toFixed(2));
    this.state.gForceZ = 1.0;
    this.updateMetrics();
  }

  stopTracking() {
    this.isTracking = false;
    if (this.simInterval) clearInterval(this.simInterval);
    return this.getTripSummary();
  }

  updateMetrics() {
    // 1. Calculate precise wall-clock time delta since last metrics update
    const now = Date.now();
    if (this.isTracking && this.lastMetricsTime) {
      const dtSeconds = (now - this.lastMetricsTime) / 1000;
      // Cap dt to prevent massive jumps when tab is backgrounded
      if (dtSeconds > 0 && dtSeconds < 2.0) {
        if (this.state.speedKmh > 0) {
          // distance = (speed in km/h / 3600 s/h) * dtSeconds
          this.state.distanceKm += (this.state.speedKmh / 3600) * dtSeconds;
        }
      }
    }
    this.lastMetricsTime = now;

    // Calculate total G-Force magnitude minus gravity
    const netZ = this.state.gForceZ - 1.0;
    this.state.gForceMag = Math.sqrt(
      Math.pow(this.state.gForceX, 2) + 
      Math.pow(this.state.gForceY, 2) + 
      Math.pow(netZ, 2)
    );

    // Calculate Jerk (m/s^3)
    this.state.jerkMs3 = Math.abs(this.state.gForceY) * 9.81 * 0.4;

    // Detect harsh events with road bump (train tracks / pothole) suppression
    // Train tracks create high vertical shock (|netZ| > 0.5) without sustained deceleration.
    const isVerticalRoadBump = Math.abs(netZ) > 0.5;

    // Harsh Braking: Require gForceY < -0.42 AND avoid single-tick vertical shock spikes
    if (this.state.gForceY < -0.42) {
      this.brakingTicks = (this.brakingTicks || 0) + 1;
      // Require sustained g-force for 2 consecutive ticks (~500ms) or non-bump event
      if (this.brakingTicks === 2 && !isVerticalRoadBump) {
        this.state.harshBrakingCount++;
        if (window.AndroidBridge && window.AndroidBridge.triggerHapticWarning) {
          window.AndroidBridge.triggerHapticWarning('HARSH_BRAKING');
        }
      }
    } else {
      this.brakingTicks = 0;
    }

    // Harsh Cornering: Require |gForceX| > 0.45 sustained for 2 ticks and not a vertical bump
    if (Math.abs(this.state.gForceX) > 0.45) {
      this.corneringTicks = (this.corneringTicks || 0) + 1;
      if (this.corneringTicks === 2 && !isVerticalRoadBump) {
        this.state.harshCorneringCount++;
      }
    } else {
      this.corneringTicks = 0;
    }

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
