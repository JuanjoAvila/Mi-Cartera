package com.micartera.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

/**
 * Programa el chequeo de updates con la app CERRADA (feedback 2026-07-17).
 * Antes solo se miraba al abrir → la noti saltaba al entrar, no al llegar el deploy.
 * WorkManager: mínimo 15 min entre pasadas; hace falta red.
 */
final class OtaCheckScheduler {
    static final String UNIQUE = "mc_ota_check";

    private OtaCheckScheduler() {}

    static void ensure(Context ctx) {
        try {
            Constraints constraints = new Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build();
            // 15 min = mínimo que permite Android para periódicas; flex 5 min deja al sistema agrupar.
            PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(
                            OtaCheckWorker.class, 15, TimeUnit.MINUTES)
                    .setConstraints(constraints)
                    .setInitialDelay(3, TimeUnit.MINUTES)
                    .build();
            WorkManager.getInstance(ctx.getApplicationContext())
                    .enqueueUniquePeriodicWork(UNIQUE, ExistingPeriodicWorkPolicy.KEEP, req);
        } catch (Exception e) {
            Log.w("MiCartera", "OtaCheckScheduler: " + e.getMessage());
        }
    }
}
