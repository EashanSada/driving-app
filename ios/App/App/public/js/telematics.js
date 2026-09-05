/**
 * DriveSafe Youth Initiative - Telematics Engine & Canvas G-Force HUD
 * Handles live phone sensor access, GPS distance calculation,
 * vibration filtering, and vector G-Force HUD canvas rendering.
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
    this.lastGpsTime = null;
    this.lastMetricsTime = null;
    this.hasLiveGpsFix = false;
    this.filteredGx = 0.0;
    this.filteredGy = 0.0;
    this.filteredGz = 1.0;
    this.prevGy = 0.0;

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
            this.updateSensorMetricsOnly();
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
          const rawGz = (accel.z !== null && accel.z !== undefined) ? accel.z / 9.81 : 1.0;

          // Low-pass Exponential Moving Average Filter (alpha = 0.2) to smooth high-frequency vehicle vibration
          const alpha = 0.2;
          this.filteredGx = this.filteredGx * (1 - alpha) + rawGx * alpha;
          this.filteredGy = this.filteredGy * (1 - alpha) + rawGy * alpha;
          this.filteredGz = this.filteredGz * (1 - alpha) + rawGz * alpha;

          // Deadband for tiny stationary phone vibration (< 0.05 G)
          const cleanGx = Math.abs(this.filteredGx) < 0.05 ? 0.0 : this.filteredGx;
          const cleanGy = Math.abs(this.filteredGy) < 0.05 ? 0.0 : this.filteredGy;

          this.state.gForceX = parseFloat(cleanGx.toFixed(2));
          this.state.gForceY = parseFloat(cleanGy.toFixed(2));
          this.state.gForceZ = parseFloat(this.filteredGz.toFixed(2));
          
          this.updateSensorMetricsOnly();
        }
      });
    }

    // 2. Live GPS Geolocation Watcher with Real Haversine Distance Accumulation
    if (navigator.geolocation) {
      try {
        this.geoWatchId = navigator.geolocation.watchPosition(
          (position) => {
            if (!this.isTracking || this.useDemoSimulation) return;

            const coords = position.coords;
            const now = Date.now();

            if (coords) {
              // 1. Evaluate GPS Position Accuracy
              const accuracy = coords.accuracy || 100;
              const hasAccurateFix = accuracy <= 50;

              if (hasAccurateFix && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
                this.hasLiveGpsFix = true;

                if (this.lastLat !== null && this.lastLng !== null && this.lastGpsTime) {
                  const dKm = this.calculateDistanceKm(this.lastLat, this.lastLng, coords.latitude, coords.longitude);
                  const dtHours = (now - this.lastGpsTime) / 3600000;

                  // Filter out GPS stationary drift: only accumulate if vehicle moved >= 6 meters (0.006 km)
                  if (dKm >= 0.006) {
                    // Sanity check: prevent GPS teleport jumps (implied speed must be < 200 km/h)
                    const impliedKmh = dtHours > 0 ? (dKm / dtHours) : 0;
                    if (impliedKmh < 200) {
                      this.state.distanceKm += dKm;
                      this.lastLat = coords.latitude;
                      this.lastLng = coords.longitude;
                      this.lastGpsTime = now;
                    }
                  }
                } else {
                  this.lastLat = coords.latitude;
                  this.lastLng = coords.longitude;
                  this.lastGpsTime = now;
                }
              }

              // 2. Evaluate GPS Speed
              if (coords.speed !== null && coords.speed !== undefined && !isNaN(coords.speed) && coords.speed >= 0) {
                // Convert m/s to km/h (filter noise below 1.5 km/h)
                const realKmh = coords.speed * 3.6;
                this.state.speedKmh = realKmh >= 1.5 ? parseFloat(realKmh.toFixed(1)) : 0.0;
              } else if (this.lastLat && this.lastGpsTime) {
                // Speed estimated from GPS delta
                const dtSec = (now - this.lastGpsTime) / 1000;
                if (dtSec > 4.0) {
                  this.state.speedKmh = 0.0;
                }
              }

              if (coords.heading !== null && coords.heading !== undefined && !isNaN(coords.heading)) {
                this.state.headingDeg = Math.round(coords.heading);
              }
            }
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
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Start real telemetry recording
  async startTracking(demoMode = false) {
    await this.requestDeviceMotionPermission();
    this.isTracking = true;
    this.useDemoSimulation = demoMode;
    this.state.tripStartTime = Date.now();
    this.lastMetricsTime = Date.now();
    this.lastGpsTime = null;
    this.lastLat = null;
    this.lastLng = null;
    this.hasLiveGpsFix = false;
    this.state.distanceKm = 0.0;
    this.state.harshBrakingCount = 0;
    this.state.harshCorneringCount = 0;
    this.state.telemetryHistory = [];
    this.state.speedKmh = 0.0;
    this.state.gForceX = 0.0;
    this.state.gForceY = 0.0;
    this.state.gForceZ = 1.0;
    this.filteredGx = 0.0;
    this.filteredGy = 0.0;
    this.filteredGz = 1.0;
    this.prevGy = 0.0;
    this.brakingTicks = 0;
    this.corneringTicks = 0;

    if (this.simInterval) clearInterval(this.simInterval);

    // Fixed 250ms Telemetry Loop (4 Hz)
    this.simInterval = setInterval(() => {
      if (!this.isTracking) return;

      if (this.useDemoSimulation) {
        this.runDemoDriveTick();
      } else {
        this.runLiveTelemetryTick();
      }
    }, 250);
  }

  setDemoSpeed(kmh) {
    this.useDemoSimulation = true;
    this.state.speedKmh = Math.max(0, kmh);
  }

  runDemoDriveTick() {
    // Smooth controlled demo simulation
    this.state.speedKmh += (Math.random() - 0.48) * 1.5;
    this.state.speedKmh = Math.max(10, Math.min(80, this.state.speedKmh));
    this.state.gForceX = parseFloat(((Math.random() - 0.5) * 0.15).toFixed(2));
    this.state.gForceY = parseFloat(((Math.random() - 0.48) * 0.15).toFixed(2));
    this.state.gForceZ = 1.0;

    // Accumulate distance accurately: (speed km/h / 3600 s/h) * 0.25 s
    this.state.distanceKm += (this.state.speedKmh / 3600) * 0.25;

    this.processTickTelemetry(0.25);
  }

  runLiveTelemetryTick() {
    const now = Date.now();
    const dtSeconds = this.lastMetricsTime ? Math.min(1.0, (now - this.lastMetricsTime) / 1000) : 0.25;
    this.lastMetricsTime = now;

    // If live GPS coordinates are NOT available, use dead-reckoning speed integration
    if (!this.hasLiveGpsFix && this.state.speedKmh > 0) {
      this.state.distanceKm += (this.state.speedKmh / 3600) * dtSeconds;
    }

    this.processTickTelemetry(dtSeconds);
  }

  updateSensorMetricsOnly() {
    // Quick sensor magnitude update for canvas responsiveness
    const netZ = this.state.gForceZ - 1.0;
    this.state.gForceMag = Math.sqrt(
      Math.pow(this.state.gForceX, 2) +
      Math.pow(this.state.gForceY, 2) +
      Math.pow(netZ, 2)
    );
    this.notifySubscribers();
  }

  processTickTelemetry(dtSeconds) {
    const netZ = this.state.gForceZ - 1.0;
    this.state.gForceMag = Math.sqrt(
      Math.pow(this.state.gForceX, 2) +
      Math.pow(this.state.gForceY, 2) +
      Math.pow(netZ, 2)
    );

    // Calculate Jerk (m/s^3) based on longitudinal change
    const deltaGy = this.state.gForceY - this.prevGy;
    this.prevGy = this.state.gForceY;
    const rawJerk = dtSeconds > 0 ? (Math.abs(deltaGy) * 9.81) / dtSeconds : 0.0;
    this.state.jerkMs3 = parseFloat(Math.min(15.0, rawJerk).toFixed(2));

    // Road bump suppression: high vertical shock (|netZ| > 0.55) indicates train tracks or potholes rather than hard braking
    const isVerticalRoadBump = Math.abs(netZ) > 0.55;

    // Genuine Harsh Braking: Deceleration exceeding -0.45 G sustained for 2 ticks (~500ms)
    if (this.state.gForceY < -0.45 && !isVerticalRoadBump) {
      this.brakingTicks = (this.brakingTicks || 0) + 1;
      if (this.brakingTicks === 2) {
        this.state.harshBrakingCount++;
        if (window.AndroidBridge && window.AndroidBridge.triggerHapticWarning) {
          window.AndroidBridge.triggerHapticWarning('HARSH_BRAKING');
        }
      }
    } else {
      this.brakingTicks = 0;
    }

    // Genuine Harsh Cornering: Lateral G-Force |gForceX| > 0.45 G sustained for 2 ticks (~500ms)
    if (Math.abs(this.state.gForceX) > 0.45 && !isVerticalRoadBump) {
      this.corneringTicks = (this.corneringTicks || 0) + 1;
      if (this.corneringTicks === 2) {
        this.state.harshCorneringCount++;
      }
    } else {
      this.corneringTicks = 0;
    }

    // Time-series recording
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

    this.notifySubscribers();
  }

  stopTracking() {
    this.isTracking = false;
    if (this.simInterval) clearInterval(this.simInterval);
    return this.getTripSummary();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach((cb) => cb(this.state));
  }

  getTripSummary() {
    const durationSec = Math.max(1, Math.round((Date.now() - this.state.tripStartTime) / 1000));
    return {
      durationSec,
      duration_seconds: durationSec,
      distanceKm: parseFloat(this.state.distanceKm.toFixed(3)),
      distance_km: parseFloat(this.state.distanceKm.toFixed(3)),
      harshBrakingCount: this.state.harshBrakingCount,
      harshCorneringCount: this.state.harshCorneringCount,
      telemetry: [...this.state.telemetryHistory]
    };
  }

  // High-performance Canvas Render Loop for Fun Smooth Drive Radar
  startHudAnimationLoop() {
    this.radarAngle = 0;
    this.smoothPx = null;
    this.smoothPy = null;

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
    const maxRadius = Math.min(width, height) / 2 - 14;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    this.radarAngle = ((this.radarAngle || 0) + 0.03) % (Math.PI * 2);

    // 1. Dark Futuristic Background Disc
    const bgGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxRadius);
    bgGradient.addColorStop(0, '#090d16');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Outer Smooth Rings with Friendly Zones
    const ringChill = maxRadius * 0.35;    // Chill Zone (< 0.35 G)
    const ringCruising = maxRadius * 0.70; // Cruising Zone (< 0.70 G)
    const ringLimit = maxRadius;           // Outer Limit

    // Animated Rotating Radar Sweeper
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxRadius, this.radarAngle, this.radarAngle + 0.35);
    ctx.closePath();
    const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
    sweepGrad.addColorStop(0, 'rgba(45, 212, 191, 0.0)');
    sweepGrad.addColorStop(1, 'rgba(45, 212, 191, 0.12)');
    ctx.fillStyle = sweepGrad;
    ctx.fill();
    ctx.restore();

    // Zone 1: The Chill Zone (Mint Green)
    ctx.beginPath();
    ctx.arc(cx, cy, ringChill, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.4)';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Zone 2: Steady Zone (Violet)
    ctx.beginPath();
    ctx.arc(cx, cy, ringCruising, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(167, 139, 250, 0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Zone 3: Outer Border (Rose)
    ctx.beginPath();
    ctx.arc(cx, cy, ringLimit, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Compass Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - maxRadius + 6, cy);
    ctx.lineTo(cx + maxRadius - 6, cy);
    ctx.moveTo(cx, cy - maxRadius + 6);
    ctx.lineTo(cx, cy + maxRadius - 6);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Directional Helpers (Clear, High-Precision Markers)
    ctx.fillStyle = '#64748b';
    ctx.font = '600 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ACCEL', cx, cy - maxRadius + 8);
    ctx.fillText('BRAKE', cx, cy + maxRadius - 8);
    ctx.fillText('LEFT', cx - maxRadius + 18, cy);
    ctx.fillText('RIGHT', cx + maxRadius - 18, cy);

    // 5. Target Position Calculation with Smooth Interpolation
    const targetPx = cx + (this.state.gForceX / 1.2) * maxRadius;
    const targetPy = cy - (this.state.gForceY / 1.2) * maxRadius;

    if (this.smoothPx === null) {
      this.smoothPx = targetPx;
      this.smoothPy = targetPy;
    } else {
      this.smoothPx += (targetPx - this.smoothPx) * 0.25;
      this.smoothPy += (targetPy - this.smoothPy) * 0.25;
    }

    // Dynamic State Colors
    const isHarsh = this.state.gForceMag > 0.6;
    const isMedium = this.state.gForceMag > 0.3;
    const beaconColor = isHarsh ? '#f43f5e' : (isMedium ? '#a78bfa' : '#2dd4bf');

    // Vector Trail from Center
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(this.smoothPx, this.smoothPy);
    ctx.strokeStyle = beaconColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center Anchor
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#2dd4bf';
    ctx.fill();

    // Outer Position Beacon Halo
    const pulseSize = 10 + Math.sin(Date.now() / 250) * 2;
    ctx.beginPath();
    ctx.arc(this.smoothPx, this.smoothPy, pulseSize, 0, Math.PI * 2);
    ctx.fillStyle = isHarsh ? 'rgba(244, 63, 94, 0.2)' : (isMedium ? 'rgba(167, 139, 250, 0.2)' : 'rgba(45, 212, 191, 0.2)');
    ctx.fill();

    // Core Position Beacon
    ctx.beginPath();
    ctx.arc(this.smoothPx, this.smoothPy, 6, 0, Math.PI * 2);
    ctx.fillStyle = beaconColor;
    ctx.shadowColor = beaconColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow
  }
}

// Global Export
window.TelematicsEngine = TelematicsEngine;
