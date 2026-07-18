package com.micartera.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MiCarteraPlugin.class);       // antes de super.onCreate (así lo pide Capacitor)
        registerPlugin(TradeRepublicPlugin.class);   // puente TR (beta)
        super.onCreate(savedInstanceState);
        // Edge-to-edge: la WebView pinta bajo status bar Y nav bar; el CSS usa --safe-top/--safe-bottom.
        try {
            Window w = getWindow();
            WindowCompat.setDecorFitsSystemWindows(w, false);
            w.setStatusBarColor(Color.TRANSPARENT);
            w.setNavigationBarColor(Color.TRANSPARENT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                w.setStatusBarContrastEnforced(false);
                w.setNavigationBarContrastEnforced(false);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = w.getAttributes();
                lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                w.setAttributes(lp);
            }
            View decor = w.getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility()
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
            WindowInsetsControllerCompat ctrl = WindowCompat.getInsetsController(w, decor);
            if (ctrl != null) {
                ctrl.setAppearanceLightStatusBars(false);
                ctrl.setAppearanceLightNavigationBars(false);
            }
        } catch (Exception ignored) {}
        stashGoto(getIntent());                      // punto 5: la app se ABRIÓ tocando una noti de gasto
        // Chequeo OTA/APK en background (app cerrada) — sin esto la noti solo salta al abrir.
        OtaCheckScheduler.ensure(this);
        // Avisos de recibos «la víspera» con la app cerrada (APK 29, 2026-07-18).
        AlertCheckScheduler.ensure(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        stashGoto(intent);                           // punto 5: la app YA estaba abierta y tocas la noti
    }

    // Guarda el deep-link en prefs; la web lo consume al volver a primer plano con
    // MiCartera.consumeGoto(). Dos orígenes: extra "mc_goto" de una notificación de gasto
    // (→ salta a la ficha) o el esquema micartera:// de la vuelta del banco (Open Banking):
    // micartera://bank?ok=1 → "bank|ok" · micartera://bank?msg=... → "bank|error|<msg>".
    private void stashGoto(Intent intent) {
        if (intent == null) return;
        String g = intent.getStringExtra("mc_goto");
        if (g == null || g.isEmpty()) {
            android.net.Uri u = intent.getData();
            if (u != null && "micartera".equals(u.getScheme()) && "bank".equals(u.getHost())) {
                String msg = u.getQueryParameter("msg");
                g = (msg != null && !msg.isEmpty()) ? "bank|error|" + msg : "bank|ok";
            }
        }
        if (g == null || g.isEmpty()) return;
        getSharedPreferences("micartera_goto", Context.MODE_PRIVATE)
                .edit().putString("pending", g).apply();
    }
}
