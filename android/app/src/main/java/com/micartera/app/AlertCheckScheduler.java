package com.micartera.app;

import android.content.Context;
import android.util.Log;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

/**
 * Programa el aviso de recibos-la-víspera con la app cerrada (mismo patrón que OtaCheckScheduler).
 * Cada 6 h con flex: alguna pasada cae siempre la tarde/noche anterior al cargo. Sin requisito
 * de red: el calendario ya está en prefs (lo empuja la web al abrir/sincronizar).
 */
final class AlertCheckScheduler {
    static final String UNIQUE = "mc_alert_check";

    private AlertCheckScheduler() {}

    static void ensure(Context ctx) {
        try {
            PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(
                            AlertCheckWorker.class, 6, TimeUnit.HOURS)
                    .setInitialDelay(30, TimeUnit.MINUTES)
                    .build();
            WorkManager.getInstance(ctx.getApplicationContext())
                    .enqueueUniquePeriodicWork(UNIQUE, ExistingPeriodicWorkPolicy.KEEP, req);
        } catch (Exception e) {
            Log.w("MiCartera", "AlertCheckScheduler: " + e.getMessage());
        }
    }
}
