package com.micartera.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * Lector de la notificación de gasto de Trade Republic → Edge Function `ingest`.
 * Reemplaza a MacroDroid: mismo POST, pero dentro de nuestra app.
 *
 * La URL con el token NO va en el código (el repo es público): se lee de
 * BuildConfig.INGEST_URL, que app/build.gradle rellena desde local.properties
 * (clave MICARTERA_INGEST_URL) — fichero que git ignora.
 */
public class TrExpenseListener extends NotificationListenerService {

    // Paquete de Trade Republic (verificar en el móvil: Ajustes → Apps → Trade Republic).
    private static final String TR_PACKAGE = "de.traderepublic.app";
    private static final Pattern HAS_AMOUNT = Pattern.compile("\\d+[.,]\\d+");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (!TR_PACKAGE.equals(sbn.getPackageName())) return;
        if (BuildConfig.INGEST_URL == null || BuildConfig.INGEST_URL.isEmpty()) return;

        CharSequence titleCs = sbn.getNotification().extras.getCharSequence("android.title");
        CharSequence textCs = sbn.getNotification().extras.getCharSequence("android.text");
        final String title = titleCs != null ? titleCs.toString() : "";
        final String text = textCs != null ? textCs.toString() : "";

        // Solo notificaciones con pinta de gasto (mencionan un importe).
        if (text.isEmpty()) return;
        if (!text.contains("€") && !HAS_AMOUNT.matcher(text).find()) return;

        new Thread(() -> {
            try {
                String body = new JSONObject()
                        .put("texto", text)
                        .put("titulo", title)
                        .put("fecha", String.valueOf(System.currentTimeMillis()))
                        .toString();

                HttpURLConnection conn = (HttpURLConnection) new URL(BuildConfig.INGEST_URL).openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setDoOutput(true);
                conn.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
                conn.getResponseCode();   // dispara el envío
                conn.disconnect();
            } catch (Exception ignored) {
                // v1: se ignora; más adelante, cola de reintentos.
            }
        }).start();
    }
}
