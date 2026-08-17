package com.micartera.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import java.text.NumberFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * Widget de pantalla de inicio: gasto del mes vs presupuesto + saldo de la cuenta
 * de gasto diario. Los datos NO se calculan aquí: los empuja la web vía el plugin
 * (updateWidget) cada vez que cambian, y el lector de notis de TR actualiza el
 * gasto del mes con la respuesta de `ingest` aunque la app esté cerrada.
 * Tocar el widget abre la app.
 */
public class MiCarteraWidget extends AppWidgetProvider {

    static final String PREFS = "micartera_widget";
    private static final int MINT = Color.parseColor("#5FD08A");
    private static final int CORAL = Color.parseColor("#F28B82");
    private static final int MUTED = Color.parseColor("#9FB3A8");

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    /** Re-pinta todas las instancias del widget (si el usuario lo tiene puesto). */
    static void refreshAll(Context ctx) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, MiCarteraWidget.class));
            if (ids != null && ids.length > 0) mgr.updateAppWidget(ids, build(ctx));
        } catch (Exception ignored) {}
    }

    /**
     * Lo llama el lector de notis (TR / Google Wallet) con lo que devuelve `ingest`, con la app
     * CERRADA.
     *
     * EL WIDGET SE CONTRADECÍA A SÍ MISMO (bug 2026-08-17, visto en el crucero): enseñaba
     * «891 € de 1.000 · te quedan 109» y justo debajo «✅ Puedes gastar 324 €». Dos cifras que no
     * pueden salir del mismo cálculo. La causa era que aquí SOLO se escribían `spent` y `budget`,
     * mientras `build()` seguía leyendo `afford` y `cash` del último push de la app. Al abrir la
     * app todo cuadraba (un push escribe las cinco cosas a la vez) y a la primera noti volvía a
     * mentir — exactamente el «se arregla y al rato vuelve» que él describía.
     *
     * Ahora esta función mantiene TODAS las piezas que mueve un gasto nuevo:
     *   · `budgetLeft` viene calculado del servidor (exacto, misma regla que la cabecera de Gastos).
     *   · `safeLiq` y `cash` los baja aquí el importe del gasto: un gasto de la cuenta diaria hunde
     *     el saldo de hoy y todo el resto del mes en la misma cantidad, así que restar es exacto
     *     sin tener que resimular el mes (que es cosa de la app, no de aquí).
     * Si el gasto no cuenta para el presupuesto (`counts=false`: recibo, inversión, traspaso), no
     * se toca ninguna de las dos: no ha salido de la cuenta de gasto diario.
     */
    static void saveMonth(Context ctx, double spent, double budget, double budgetLeft,
                          double importe, boolean counts) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        SharedPreferences.Editor ed = p.edit();
        ed.putFloat("spent", (float) spent);
        if (budget > 0) ed.putFloat("budget", (float) budget);
        // `budgetLeft < 0` es la sentinela de «este ingest no lo manda» (APK nueva + función sin
        // desplegar). Ahí se deja el último bueno en vez de pintar «Puedes gastar 0 €».
        if (budgetLeft >= 0) ed.putFloat("budgetLeft", (float) budgetLeft);
        if (counts && importe != 0) {
            // Se resta el importe: un gasto va en positivo (baja el saldo) y un ingreso en
            // negativo (lo sube), que es como los manda `ingest`.
            // Solo si la app las había dejado puestas: sin base no hay nada que mover, y un 0
            // inventado aquí sería otra cifra mentirosa.
            if (p.contains("safeLiq")) {
                ed.putFloat("safeLiq", (float) Math.max(0, p.getFloat("safeLiq", 0f) - importe));
            }
            if (p.contains("cash")) {
                ed.putFloat("cash", (float) (p.getFloat("cash", 0f) - importe));
            }
        }
        ed.putLong("updated", System.currentTimeMillis());
        ed.apply();
        refreshAll(ctx);
    }

    private static String eur0(double n) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("es", "ES"));
        nf.setMaximumFractionDigits(0);
        return nf.format(Math.round(n)) + " €";
    }

    private static RemoteViews build(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        double spent = p.getFloat("spent", 0f);
        double budget = p.getFloat("budget", 0f);
        boolean hasCash = p.contains("cash");
        double cash = p.getFloat("cash", 0f);
        String cashLabel = p.getString("cashLabel", "");
        long updated = p.getLong("updated", 0L);

        /* «PUEDES GASTAR» SE CALCULA AQUÍ, NO SE RECIBE HECHO (2026-08-17).
           Antes la app empujaba un `afford` ya cocinado y la noti no sabía rehacerlo, así que se
           quedaba clavado del push anterior mientras `spent` sí avanzaba → el widget se
           contradecía. Ahora los dos escritores mantienen las mismas dos PRIMITIVAS y la fórmula
           («lo menor entre lo que te deja el presupuesto y la liquidez que no te deja en rojo»)
           vive solo aquí. Da igual quién escribió el último: el número siempre es coherente.
           Es la misma cuenta que hace la app en 11-app-main.js (`widgetAfford`). */
        boolean hasBudgetLeft = p.contains("budgetLeft");
        boolean hasSafeLiq = p.contains("safeLiq");
        double budgetLeft = Math.max(0, p.getFloat("budgetLeft", 0f));
        double safeLiq = Math.max(0, p.getFloat("safeLiq", 0f));
        boolean hasAfford = hasBudgetLeft || hasSafeLiq;
        double afford = hasBudgetLeft && hasSafeLiq ? Math.min(budgetLeft, safeLiq)
                      : (hasBudgetLeft ? budgetLeft : safeLiq);

        /* EL MES CAMBIA Y EL WIDGET NO SE ENTERA (2026-08-01, feedback de su pareja: sale -2 €
           el día 1 y no se resetea hasta que gasta más de lo que le sobró el mes anterior).
           `updatePeriodMillis=0` (a propósito, por batería) significa que ESTE `build()` solo se
           ejecuta cuando algo empuja datos nuevos — abrir la app o una notificación de TR
           procesada. Si ninguna de las dos pasa justo al empezar el mes, `spent`/`afford` se
           quedan con el ÚLTIMO número del mes ANTERIOR (aquí, -2 €: más ingresado que gastado en
           los últimos días de julio) mostrado como si fuera de este mes — no está mal calculado,
           está MAL FECHADO.
           No hay forma de recalcular AQUÍ el gasto real del mes nuevo (los datos viven en el
           almacenamiento de la WebView, no accesible desde este provider sin abrir la app) — pero
           SÍ se sabe que un número de un mes distinto no puede seguir enseñándose como si fuera de
           HOY. Se compara el mes de `updated` contra el mes de AHORA; si no coinciden, se pinta
           como si no hubiera datos todavía (0 €, sin "puedes gastar") en vez de mentir con la
           cifra vieja. En cuanto la app empuje el dato real del mes nuevo, esto se sustituye solo. */
        boolean mesDistinto = false;
        if (updated > 0) {
            Calendar cUpd = Calendar.getInstance(); cUpd.setTimeInMillis(updated);
            Calendar cNow = Calendar.getInstance();
            mesDistinto = cUpd.get(Calendar.MONTH) != cNow.get(Calendar.MONTH)
                    || cUpd.get(Calendar.YEAR) != cNow.get(Calendar.YEAR);
        }
        if (mesDistinto) { spent = 0; hasAfford = false; }

        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_micartera);
        rv.setTextViewText(R.id.w_amount, eur0(spent));
        rv.setTextColor(R.id.w_amount, (budget > 0 && spent > budget) ? CORAL : MINT);

        // «Lo que te puedes permitir» (gasto seguro): lo que puedes gastar sin pasarte ni quedarte
        // en rojo. Es la cifra que el usuario quería ver, no solo lo ya gastado (feedback 2026-07-18).
        if (hasAfford) {
            rv.setViewVisibility(R.id.w_afford, View.VISIBLE);
            rv.setTextViewText(R.id.w_afford, "✅ Puedes gastar " + eur0(afford));
            rv.setTextColor(R.id.w_afford, afford > 0 ? MINT : CORAL);
        } else {
            rv.setViewVisibility(R.id.w_afford, View.GONE);
        }

        if (budget > 0) {
            double left = budget - spent;
            rv.setTextViewText(R.id.w_sub, left >= 0
                    ? "de " + eur0(budget) + " este mes · te quedan " + eur0(left)
                    : "de " + eur0(budget) + " este mes · " + eur0(-left) + " de más 🚨");
            rv.setProgressBar(R.id.w_bar, 100, (int) Math.min(100, Math.round(spent / budget * 100)), false);
            rv.setViewVisibility(R.id.w_bar, View.VISIBLE);
        } else {
            rv.setTextViewText(R.id.w_sub, "gastado este mes");
            rv.setViewVisibility(R.id.w_bar, View.GONE);
        }

        String foot = "";
        if (hasCash) foot = "💳 " + (cashLabel.isEmpty() ? "Cuenta" : cashLabel) + ": " + eur0(cash);
        if (updated > 0) {
            Calendar c = Calendar.getInstance();
            c.setTimeInMillis(updated);
            String hm = String.format(Locale.ROOT, "%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE));
            foot = foot.isEmpty() ? ("actualizado " + hm) : (foot + " · " + hm);
        }
        rv.setTextViewText(R.id.w_foot, foot);
        rv.setTextColor(R.id.w_foot, MUTED);
        rv.setViewVisibility(R.id.w_foot, foot.isEmpty() ? View.GONE : View.VISIBLE);

        Intent open = new Intent(ctx, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        rv.setOnClickPendingIntent(R.id.w_root, pi);
        return rv;
    }
}
