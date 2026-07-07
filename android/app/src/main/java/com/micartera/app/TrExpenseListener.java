package com.micartera.app;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Lector de la notificación de gasto de Trade Republic → Edge Function `ingest`.
 * Reemplaza a MacroDroid: mismo POST, pero dentro de nuestra app.
 *
 * El SERVIDOR clasifica (gasto tarjeta / bizum recibido=ingreso / bizum enviado /
 * ruido de TR que se ignora) — así el filtro se mejora sin reinstalar el APK.
 * Con la respuesta, este servicio:
 *   1. enseña una notificación de confirmación ("✓ Gasto apuntado: 12,34 € en X"),
 *   2. lanza la alerta de presupuesto si el servidor la devuelve (superado/80%/tocho),
 *   3. refresca el widget de pantalla de inicio con el gasto del mes,
 * todo aunque la app esté cerrada.
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

        // Solo notificaciones con pinta de movimiento (mencionan un importe).
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
                int code = conn.getResponseCode();
                String resp = readAll(code >= 400 ? conn.getErrorStream() : conn.getInputStream());
                conn.disconnect();
                if (code >= 200 && code < 300 && !resp.isEmpty()) handleResponse(resp);
            } catch (Exception ignored) {
                // v1: se ignora; más adelante, cola de reintentos.
            }
        }).start();
    }

    private static String readAll(InputStream is) {
        if (is == null) return "";
        try (InputStream in = is; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private static String eur(double n) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("es", "ES"));
        nf.setMinimumFractionDigits(2);
        nf.setMaximumFractionDigits(2);
        return nf.format(n) + " €";
    }

    private static String eur0(double n) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("es", "ES"));
        nf.setMaximumFractionDigits(0);
        return nf.format(Math.round(n)) + " €";
    }

    /** Confirmación + alerta de presupuesto + widget, con lo que devuelve `ingest`. */
    private void handleResponse(String resp) {
        try {
            JSONObject r = new JSONObject(resp);
            if (!r.optBoolean("ok", false)) return;
            String tipo = r.optString("tipo", "");
            if (r.optBoolean("skipped", false) || tipo.equals("ignorado")) return;   // ruido: ni noti ni widget

            double importe = r.optDouble("importe", 0);
            String comercio = r.optString("comercio", "");
            int id = (int) (System.currentTimeMillis() % 100000);

            // Punto 5: deep-link a la ficha del gasto — al tocar la noti, la web abre este gasto en Gastos.
            String gotoTok = "exp|" + importe + "|" + comercio;
            if (tipo.equals("ingreso")) {
                Notif.show(this, "💰 Dinero recibido", "+" + eur(-importe) + " · " + comercio, id, gotoTok);
            } else if (tipo.equals("gasto_nocard")) {
                Notif.show(this, "🔄 Bizum enviado apuntado", eur(importe) + " · " + comercio, id, gotoTok);
            } else {
                Notif.show(this, "✓ Gasto apuntado", eur(importe) + " en " + comercio, id, gotoTok);
            }

            JSONObject alert = r.optJSONObject("alert");
            if (alert != null) {
                String kind = alert.optString("kind", "");
                double spent = alert.optDouble("monthSpent", 0);
                double budget = alert.optDouble("budget", 0);
                if (kind.equals("over")) {
                    Notif.show(this, "🚨 Presupuesto superado", "Llevas " + eur0(spent) + " de " + eur0(budget) + " este mes", id + 1);
                } else if (kind.equals("p80")) {
                    long p = budget > 0 ? Math.round(spent / budget * 100) : 0;
                    Notif.show(this, "⚠️ Ya llevas el " + p + "% del presupuesto", eur0(spent) + " de " + eur0(budget) + " este mes", id + 1);
                } else if (kind.equals("big")) {
                    Notif.show(this, "💥 Gasto tocho apuntado", eur(importe) + " en " + comercio, id + 1);
                }
            }

            JSONObject month = r.optJSONObject("month");
            if (month != null) {
                MiCarteraWidget.saveMonth(this, month.optDouble("spent", 0), month.optDouble("budget", 0));
            }
        } catch (Exception ignored) {}
    }
}
