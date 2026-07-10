package com.micartera.app;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MiCarteraPlugin.class);       // antes de super.onCreate (así lo pide Capacitor)
        registerPlugin(TradeRepublicPlugin.class);   // puente TR (beta)
        super.onCreate(savedInstanceState);
        stashGoto(getIntent());                      // punto 5: la app se ABRIÓ tocando una noti de gasto
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
