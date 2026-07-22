package com.micartera.app;

import android.content.Intent;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Lector de notificaciones:
 *   1) Trade Republic → Edge Function `ingest` (apunta el gasto; parsea en servidor).
 *   2) Otros bancos (Caixa, Sabadell…) → NO parsea importe; marca ping + broadcast para
 *      que la WebView dispare `bankSync` por Open Banking (alpha22 / v3.111).
 *
 * La URL con el token NO va en el código (el repo es público): se lee de
 * BuildConfig.INGEST_URL, que app/build.gradle rellena desde local.properties
 * (clave MICARTERA_INGEST_URL) — fichero que git ignora.
 */
public class TrExpenseListener extends NotificationListenerService {

    // Paquete de Trade Republic (verificar en el móvil: Ajustes → Apps → Trade Republic).
    private static final String TR_PACKAGE = "de.traderepublic.app";
    private static final Pattern HAS_AMOUNT = Pattern.compile("\\d+[.,]\\d+");

    /** Broadcast que escucha MiCarteraPlugin para emitir el evento JS `bankNotif`. */
    public static final String ACTION_BANK_NOTIF = "com.micartera.app.BANK_NOTIF";

    // Paquetes de apps bancarias ES (IDs habituales; si falta alguno se añade sin parsear texto).
    private static final Set<String> BANK_PACKAGES = new HashSet<>(Arrays.asList(
            "es.lacaixa.mobile.android.newwapicon",   // CaixaBank
            "com.caixabank.mobile.android",
            "com.caixabank.app",
            "com.bancsabadell.android",               // Sabadell
            "com.bancsabadell.wallet",
            "com.bbva.bbvacontigo",                    // BBVA
            "es.bancosantander.android",              // Santander
            "com.ing.mobile",                         // ING
            "www.ingdirect.nativeframe",
            "com.bankinter.android",
            "com.imaginbank.app",
            "com.openbank",
            "es.unicaja.unicajamovil",
            "com.kutxabank.android",
            "es.evobanco.bancomovil",
            "com.abanca.bm.android",
            "es.ibercaja.ibercaja",
            "com.db.pbc.mibanco"
    ));

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String pkg = sbn.getPackageName();
        if (TR_PACKAGE.equals(pkg)) {
            handleTradeRepublic(sbn);
            return;
        }
        if (BANK_PACKAGES.contains(pkg)) {
            handleBankWake(pkg);
        }
    }

    /**
     * Noti de banco tradicional: solo despierta sync OB. Sin leer importe/comercio
     * (las notis suelen ser genéricas y se rompen; PSD2 trae el movimiento real).
     */
    private void handleBankWake(String pkg) {
        android.content.SharedPreferences prefs =
                getSharedPreferences("micartera_banksync", MODE_PRIVATE);
        // Defecto ON; Ajustes → «Al detectar aviso del banco…» lo apaga vía setNotifPrefs.
        if (!prefs.getBoolean("onNotif", true)) return;

        long now = System.currentTimeMillis();
        // Debounce nativo 2 min (límite PSD2 desatendido ~4/día + no martillar al abrir la app).
        if (now - prefs.getLong("lastPing", 0) < 120000) return;
        prefs.edit()
                .putLong("lastPing", now)
                .putBoolean("pending", true)
                .putString("lastPkg", pkg != null ? pkg : "")
                .apply();

        Intent i = new Intent(ACTION_BANK_NOTIF);
        i.setPackage(getPackageName());
        sendBroadcast(i);
    }

    private void handleTradeRepublic(StatusBarNotification sbn) {
        // MULTIUSUARIO (migración 0008): la URL de `ingest` con el token del usuario la guarda la
        // web en estas prefs (Ajustes → "Apuntar aquí mis gastos de TR"). Si no la hay, caemos a
        // BuildConfig.INGEST_URL (solo la tiene el APK del creador). Sin ninguna de las dos, no hay
        // a dónde mandar → no hacemos nada (evita apuntar en la cuenta de otro).
        String ingestUrl = getSharedPreferences("micartera_ingest", MODE_PRIVATE).getString("url", "");
        if (ingestUrl == null || ingestUrl.isEmpty()) ingestUrl = BuildConfig.INGEST_URL;
        if (ingestUrl == null || ingestUrl.isEmpty()) return;
        final String INGEST_URL = ingestUrl;

        CharSequence titleCs = sbn.getNotification().extras.getCharSequence("android.title");
        CharSequence textCs = sbn.getNotification().extras.getCharSequence("android.text");
        final String title = titleCs != null ? titleCs.toString() : "";
        final String text = textCs != null ? textCs.toString() : "";

        // Solo notificaciones con pinta de movimiento (mencionan un importe).
        if (text.isEmpty()) return;
        if (!text.contains("€") && !HAS_AMOUNT.matcher(text).find()) return;

        // DEDUPE (bug pareja 2026-07-10): Android re-entrega la MISMA notificación cuando TR la
        // actualiza (y al reconectar el listener) → cada re-entrega disparaba otro POST y otra
        // noti de confirmación ("a veces 2"). El servidor ya dedupea el GASTO (expenses_dedup_idx),
        // pero la confirmación local salía igual. Mismo texto en <3 min ⇒ ya procesada, fuera.
        android.content.SharedPreferences dd =
                getSharedPreferences("micartera_ingest_dedupe", MODE_PRIVATE);
        int sig = (title + "|" + text).hashCode();
        long now = System.currentTimeMillis();
        if (dd.getInt("sig", 0) == sig && now - dd.getLong("ts", 0) < 180000) return;
        dd.edit().putInt("sig", sig).putLong("ts", now).apply();

        new Thread(() -> {
            try {
                String body = new JSONObject()
                        .put("texto", text)
                        .put("titulo", title)
                        .put("fecha", String.valueOf(System.currentTimeMillis()))
                        .toString();

                HttpURLConnection conn = (HttpURLConnection) new URL(INGEST_URL).openConnection();
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

            // La alerta se mira ANTES de la confirmación: si es «gasto tocho», esa noti ya dice
            // importe y comercio → la "✓ Gasto apuntado" salía ADEMÁS, duplicada (feedback 2026-07-21).
            JSONObject alert = r.optJSONObject("alert");
            String alertKind = alert != null ? alert.optString("kind", "") : "";
            boolean big = alertKind.equals("big");

            // Ajuste "confirmar gastos" (punto 9): TR ya avisa del cargo, así que la confirmación
            // "✓ Gasto apuntado" es opcional (MiCartera.setNotifPrefs). Los avisos de presupuesto
            // de abajo salen SIEMPRE — esos no los da el banco.
            boolean confirm = getSharedPreferences("micartera_notifprefs", MODE_PRIVATE)
                    .getBoolean("expenseConfirm", true);
            // Punto 5: deep-link a la ficha del gasto — al tocar la noti, la web abre este gasto en Gastos.
            String gotoTok = "exp|" + importe + "|" + comercio;
            if (confirm && !big) {
                if (tipo.equals("ingreso")) {
                    Notif.show(this, "💰 Dinero recibido", "+" + eur(-importe) + " · " + comercio, id, gotoTok);
                } else if (tipo.equals("gasto_nocard")) {
                    Notif.show(this, "🔄 Bizum enviado apuntado", eur(importe) + " · " + comercio, id, gotoTok);
                } else {
                    Notif.show(this, "✓ Gasto apuntado", eur(importe) + " en " + comercio, id, gotoTok);
                }
            }

            if (alert != null) {
                double spent = alert.optDouble("monthSpent", 0);
                double budget = alert.optDouble("budget", 0);
                if (alertKind.equals("over")) {
                    Notif.show(this, "🚨 Presupuesto superado", "Llevas " + eur0(spent) + " de " + eur0(budget) + " este mes", id + 1);
                } else if (alertKind.equals("p95")) {
                    // p95/p50 añadidos 2026-07-18 (los calcula `ingest`; con APK viejo se ignoran sin romper)
                    Notif.show(this, "🔶 ¡95% del presupuesto!", eur0(spent) + " de " + eur0(budget) + " este mes", id + 1);
                } else if (alertKind.equals("p80")) {
                    long p = budget > 0 ? Math.round(spent / budget * 100) : 0;
                    Notif.show(this, "⚠️ Ya llevas el " + p + "% del presupuesto", eur0(spent) + " de " + eur0(budget) + " este mes", id + 1);
                } else if (alertKind.equals("p50")) {
                    Notif.show(this, "🟢 Mitad del presupuesto", eur0(spent) + " de " + eur0(budget) + " este mes", id + 1);
                } else if (big) {
                    // Sustituye a la confirmación (arriba se salta): una sola noti, con su deep-link.
                    Notif.show(this, "💥 Gasto tocho apuntado", eur(importe) + " en " + comercio, id + 1, gotoTok);
                }
            }

            JSONObject month = r.optJSONObject("month");
            if (month != null) {
                MiCarteraWidget.saveMonth(this, month.optDouble("spent", 0), month.optDouble("budget", 0));
            }
        } catch (Exception ignored) {}
    }
}
