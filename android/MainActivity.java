package org.drivesafe.youth;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * DriveSafe Youth Initiative - Native Android Bridge Shell
 * Wraps the Progressive Web App (PWA) inside a hardware-accelerated Android WebView
 * and exposes native hardware telematics (Hardware Accelerometer, Gyroscope, Battery, Haptics)
 * directly to JavaScript via @JavascriptInterface bridge window.AndroidBridge.
 */
public class MainActivity extends AppCompatActivity implements SensorEventListener {

    private static final int PERMISSION_REQUEST_CODE = 101;
    private WebView webView;
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private Sensor gyroscope;
    private Vibrator vibrator;

    private float currentAccelX = 0.0f;
    private float currentAccelY = 0.0f;
    private float currentAccelZ = 9.81f;
    private float currentGyroX = 0.0f;
    private float currentGyroY = 0.0f;
    private float currentGyroZ = 0.0f;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
        }
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);

        requestDevicePermissions();
        configureWebViewSettings();

        // Register Native JavaScript Bridge
        webView.addJavascriptInterface(new NativeTelematicsBridge(this), "AndroidBridge");

        // Load PWA Application URL (or local asset)
        String appUrl = "https://drivesafe-youth.web.app"; 
        webView.loadUrl(appUrl);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebViewSettings() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setGeolocationEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
    }

    private void requestDevicePermissions() {
        String[] permissions = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.VIBRATE,
            Manifest.permission.INTERNET
        };

        boolean needsRequest = false;
        for (String perm : permissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true;
                break;
            }
        }

        if (needsRequest) {
            ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (sensorManager != null) {
            if (accelerometer != null) {
                sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
            }
            if (gyroscope != null) {
                sensorManager.registerListener(this, gyroscope, SensorManager.SENSOR_DELAY_GAME);
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            currentAccelX = event.values[0];
            currentAccelY = event.values[1];
            currentAccelZ = event.values[2];
        } else if (event.sensor.getType() == Sensor.TYPE_GYROSCOPE) {
            currentGyroX = event.values[0];
            currentGyroY = event.values[1];
            currentGyroZ = event.values[2];
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    /**
     * Native JavaScript Interface exposed to Web Context as window.AndroidBridge
     */
    public class NativeTelematicsBridge {
        private final Context context;

        public NativeTelematicsBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String getNativeTelematics() {
            JSONObject data = new JSONObject();
            try {
                // Convert m/s^2 to G-Force (1G = 9.80665 m/s^2)
                data.put("gForceX", currentAccelX / 9.80665f);
                data.put("gForceY", currentAccelY / 9.80665f);
                data.put("gForceZ", currentAccelZ / 9.80665f);
                data.put("gyroX", currentGyroX);
                data.put("gyroY", currentGyroY);
                data.put("gyroZ", currentGyroZ);
                data.put("batteryLevel", getBatteryPercentage());
                data.put("isNativeBridge", true);
            } catch (JSONException e) {
                e.printStackTrace();
            }
            return data.toString();
        }

        @JavascriptInterface
        public void triggerHapticWarning(String warningType) {
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if ("HARSH_BRAKING".equals(warningType)) {
                        vibrator.vibrate(VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else if ("HIGH_SPEED".equals(warningType)) {
                        long[] pattern = {0, 100, 100, 100};
                        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                    } else {
                        vibrator.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE));
                    }
                } else {
                    vibrator.vibrate(250);
                }
            }
        }

        @JavascriptInterface
        public void showNativeToast(String message) {
            runOnUiThread(() -> Toast.makeText(context, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public int getBatteryPercentage() {
            BatteryManager bm = (BatteryManager) context.getSystemService(BATTERY_SERVICE);
            return bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : 100;
        }
    }
}
