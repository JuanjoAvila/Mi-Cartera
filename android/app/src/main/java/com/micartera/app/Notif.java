package com.micartera.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Notificaciones locales de Mi Cartera (un solo canal). Las usa tanto el plugin
 * (avisos de la web: presupuesto superado, etc.) como el lector de notis de TR
 * (confirmación "✓ gasto apuntado" aunque la app esté cerrada).
 * En Android 13+ hace falta el permiso POST_NOTIFICATIONS (lo pide la app al abrirse);
 * sin él, el sistema descarta la notificación en silencio — no rompe nada.
 */
class Notif {
    static final String CHANNEL = "micartera";

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL, "Mi Cartera · avisos", NotificationManager.IMPORTANCE_DEFAULT);
                ch.setDescription("Gastos capturados y avisos de presupuesto");
                nm.createNotificationChannel(ch);
            }
        }
    }

    static void show(Context ctx, String title, String body, int id) {
        try {
            ensureChannel(ctx);
            Intent open = new Intent(ctx, MainActivity.class);
            open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(ctx, id, open,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            Notification.Builder b = Build.VERSION.SDK_INT >= 26
                    ? new Notification.Builder(ctx, CHANNEL)
                    : new Notification.Builder(ctx);
            b.setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new Notification.BigTextStyle().bigText(body))
                    .setSmallIcon(R.drawable.ic_stat_micartera)
                    .setAutoCancel(true)
                    .setContentIntent(pi);

            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(id, b.build());
        } catch (Exception ignored) {
            // best-effort: una noti que falla nunca debe tumbar el listener ni el plugin
        }
    }
}
