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

    /** Lo llama el lector de notis de TR con el total del mes que devuelve `ingest`. */
    static void saveMonth(Context ctx, double spent, double budget) {
        SharedPreferences.Editor ed = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        ed.putFloat("spent", (float) spent);
        if (budget > 0) ed.putFloat("budget", (float) budget);
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

        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_micartera);
        rv.setTextViewText(R.id.w_amount, eur0(spent));
        rv.setTextColor(R.id.w_amount, (budget > 0 && spent > budget) ? CORAL : MINT);

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
