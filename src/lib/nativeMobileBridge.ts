import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Geolocation, Position, CallbackID } from '@capacitor/geolocation';
import { Motion, AccelListenerEvent } from '@capacitor/motion';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device, DeviceInfo, BatteryInfo } from '@capacitor/device';
import { Network } from '@capacitor/network';

// Detection flags
export const isNativePlatform = Capacitor.isNativePlatform();
export const getPlatformName = (): 'ios' | 'android' | 'web' => {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
};

// Screen WakeLock Reference
let wakeLockSentinel: any = null;

// BeforeInstallPrompt Event Storage
let deferredInstallPrompt: any = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('radian-pwa-installable'));
  });
}

/**
 * Initialize Native App Shell (Status bar, splash screen, lifecycle)
 */
export async function initializeNativeAppShell(): Promise<void> {
  if (isNativePlatform) {
    try {
      // Hide Splash Screen after launch
      await SplashScreen.hide({ fadeOutDuration: 400 });

      // Configure Native Status Bar
      await StatusBar.setStyle({ style: Style.Dark });
      if (getPlatformName() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#FBF9F5' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      }

      // Listen for back button on Android
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          // Confirm exit or minimize
          App.minimizeApp();
        }
      });
    } catch (err) {
      console.warn('Native shell initialization warning:', err);
    }
  }
}

/**
 * Native Haptic Feedback Engine
 * Provides physical tactile vibration for alerts, button presses, and telematics risk alerts
 */
export const NativeHaptics = {
  // Light tap on button press or tab change
  light: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch (e) {
      // Ignore fallback errors
    }
  },

  // Medium feedback on trip start/stop or toggle
  medium: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(35);
      }
    } catch (e) {}
  },

  // Heavy feedback on abrupt brake or severe cornering
  heavy: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([60, 40, 60]);
      }
    } catch (e) {}
  },

  // Notification success (badge unlocked, trip saved)
  success: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 30, 60]);
      }
    } catch (e) {}
  },

  // Notification warning (approaching speed limit)
  warning: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 50, 80]);
      }
    } catch (e) {}
  },

  // Notification error / harsh alert
  error: async () => {
    try {
      if (isNativePlatform) {
        await Haptics.notification({ type: NotificationType.Error });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 150]);
      }
    } catch (e) {}
  }
};

/**
 * Screen WakeLock (Keep Awake)
 * Prevents screen from dimming/sleeping while telematics cockpit is active
 */
export async function keepScreenAwake(enable: boolean = true): Promise<boolean> {
  if (enable) {
    try {
      if ('wakeLock' in navigator) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        return true;
      }
    } catch (err) {
      console.warn('WakeLock request error:', err);
    }
  } else {
    try {
      if (wakeLockSentinel) {
        await wakeLockSentinel.release();
        wakeLockSentinel = null;
        return true;
      }
    } catch (err) {
      console.warn('WakeLock release error:', err);
    }
  }
  return false;
}

/**
 * Native GPS / Geolocation Manager
 * High precision location tracking with native permissions
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    if (isNativePlatform) {
      const status = await Geolocation.requestPermissions();
      return status.location === 'granted';
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { enableHighAccuracy: true, timeout: 6000 }
        );
      });
    }
  } catch (err) {
    console.warn('Geolocation permission error:', err);
  }
  return false;
}

export async function getCurrentNativePosition(): Promise<{
  lat: number;
  lng: number;
  speedMps: number;
  heading: number | null;
  altitude: number | null;
  accuracy: number;
} | null> {
  try {
    if (isNativePlatform) {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speedMps: pos.coords.speed || 0,
        heading: pos.coords.heading,
        altitude: pos.coords.altitude,
        accuracy: pos.coords.accuracy
      };
    } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speedMps: pos.coords.speed || 0,
              heading: pos.coords.heading,
              altitude: pos.coords.altitude,
              accuracy: pos.coords.accuracy
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
        );
      });
    }
  } catch (err) {
    console.warn('Get position error:', err);
  }
  return null;
}

/**
 * Watch Native Position Stream
 */
export async function watchNativePosition(
  onUpdate: (coords: {
    lat: number;
    lng: number;
    speedMps: number;
    heading: number | null;
    altitude: number | null;
    accuracy: number;
    timestamp: number;
  }) => void
): Promise<{ unsubscribe: () => void }> {
  if (isNativePlatform) {
    let watchId: CallbackID | null = null;
    try {
      watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 },
        (position, err) => {
          if (!err && position) {
            onUpdate({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              speedMps: position.coords.speed || 0,
              heading: position.coords.heading,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp
            });
          }
        }
      );
      return {
        unsubscribe: () => {
          if (watchId) Geolocation.clearWatch({ id: watchId });
        }
      };
    } catch (err) {
      console.warn('Native watchPosition error:', err);
    }
  }

  // Web Geolocation Watcher Fallback
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        onUpdate({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speedMps: pos.coords.speed || 0,
          heading: pos.coords.heading,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        });
      },
      (err) => console.warn('Web watch error:', err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
    );
    return {
      unsubscribe: () => navigator.geolocation.clearWatch(id)
    };
  }

  return { unsubscribe: () => {} };
}

/**
 * Native IMU Motion & Accelerometer Listener
 */
export async function startNativeMotionListener(
  onMotion: (data: {
    accelX: number;
    accelY: number;
    accelZ: number;
    gForceTotal: number;
    rotAlpha?: number;
    rotBeta?: number;
    rotGamma?: number;
  }) => void
): Promise<{ stop: () => void }> {
  try {
    if (isNativePlatform) {
      const handle = await Motion.addListener('accel', (event: AccelListenerEvent) => {
        const x = event.acceleration.x || 0;
        const y = event.acceleration.y || 0;
        const z = event.acceleration.z || 0;
        const gForce = Math.sqrt(x * x + y * y + z * z) / 9.80665;
        onMotion({
          accelX: x,
          accelY: y,
          accelZ: z,
          gForceTotal: parseFloat(gForce.toFixed(2))
        });
      });

      return {
        stop: () => {
          handle.remove();
        }
      };
    }
  } catch (err) {
    console.warn('Native Motion addListener error:', err);
  }

  // Web DeviceMotion API Fallback
  if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity || e.acceleration;
      const x = acc?.x || 0;
      const y = acc?.y || 0;
      const z = acc?.z || 0;
      const gForce = Math.sqrt(x * x + y * y + z * z) / 9.80665;
      onMotion({
        accelX: x,
        accelY: y,
        accelZ: z,
        gForceTotal: parseFloat(gForce.toFixed(2))
      });
    };

    // For iOS 13+ permission request
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        (DeviceMotionEvent as any).requestPermission().then((res: string) => {
          if (res === 'granted') {
            window.addEventListener('devicemotion', handler, true);
          }
        });
      } catch {}
    } else {
      window.addEventListener('devicemotion', handler, true);
    }

    return {
      stop: () => {
        window.removeEventListener('devicemotion', handler, true);
      }
    };
  }

  return { stop: () => {} };
}

/**
 * Get Comprehensive Device & Battery Diagnostics
 */
export async function getDeviceDiagnostics(): Promise<{
  platform: 'ios' | 'android' | 'web';
  isNative: boolean;
  model: string;
  osVersion: string;
  batteryLevel?: number;
  isCharging?: boolean;
  networkConnected: boolean;
  connectionType: string;
}> {
  let model = 'Web Browser';
  let osVersion = '1.0';
  let batteryLevel: number | undefined = undefined;
  let isCharging: boolean | undefined = undefined;
  let networkConnected = true;
  let connectionType = 'unknown';

  try {
    const info: DeviceInfo = await Device.getInfo();
    model = info.model || info.manufacturer || 'Universal Device';
    osVersion = info.osVersion || info.operatingSystem || '1.0';
  } catch {}

  try {
    const battery: BatteryInfo = await Device.getBatteryInfo();
    batteryLevel = battery.batteryLevel;
    isCharging = battery.isCharging;
  } catch {}

  try {
    const net = await Network.getStatus();
    networkConnected = net.connected;
    connectionType = net.connectionType;
  } catch {}

  return {
    platform: getPlatformName(),
    isNative: isNativePlatform,
    model,
    osVersion,
    batteryLevel: typeof batteryLevel === 'number' ? Math.round(batteryLevel * 100) : undefined,
    isCharging,
    networkConnected,
    connectionType
  };
}

/**
 * PWA 1-Click Install Trigger
 */
export function hasInstallPrompt(): boolean {
  return Boolean(deferredInstallPrompt);
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
  if (deferredInstallPrompt) {
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch {
      return 'dismissed';
    }
  }
  return 'unsupported';
}
