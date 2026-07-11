package com.micartera.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Plugin nativo único de Mi Cartera. La web lo encuentra en
 * window.Capacitor.Plugins.MiCartera y expone:
 *   - bioAvailable()          -> { available: bool }   (¿hay huella/candado configurado?)
 *   - bioVerify()             -> resuelve si el usuario se autentica (huella o PIN del móvil)
 *   - updateWidget({...})     -> guarda los datos del mes y refresca el widget de pantalla de inicio
 *   - showNotification({...}) -> notificación local (título + cuerpo)   [ojo: "notify" es final en Object]
 *   - ensureNotifPerm()       -> pide el permiso POST_NOTIFICATIONS (Android 13+) si falta
 *   - notifAccess()           -> { granted } ¿el lector de notis TR tiene acceso a notificaciones?
 *                                (se PIERDE al desinstalar/reinstalar — bug Consum 2026-07-06)
 *   - openNotifAccess()       -> abre Ajustes → Acceso a notificaciones para reactivarlo
 *   - consumeGoto()           -> { goto? } deep-link pendiente al tocar la noti de un gasto (punto 5);
 *                                la web salta a Gastos y abre la ficha. Se limpia al leerlo.
 *   - appInfo()               -> { versionName, versionCode } del APK instalado (la web lo
 *                                compara con apk.json de Pages para el botón «Actualizar app»)
 *   - installApk({url})       -> descarga el APK nuevo y abre el instalador del sistema
 *                                (actualización SIN cable; instala encima, mantiene datos).
 *                                { ok:false, needsPermission:true } si falta el permiso
 *                                "instalar apps desconocidas" (se abre el ajuste; reintentar).
 *   - setNotifPrefs({expenseConfirm}) -> si el lector TR enseña la noti "✓ Gasto apuntado"
 *                                (los avisos de presupuesto salen siempre).
 */
@CapacitorPlugin(
        name = "MiCartera",
        permissions = {
                @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
        }
)
public class MiCarteraPlugin extends Plugin {

    // Huella (fuerte o débil) o, si no hay, el candado del propio móvil (PIN/patrón).
    private static final int AUTHS =
            BiometricManager.Authenticators.BIOMETRIC_WEAK | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void bioAvailable(PluginCall call) {
        int can = BiometricManager.from(getContext()).canAuthenticate(AUTHS);
        JSObject r = new JSObject();
        r.put("available", can == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(r);
    }

    @PluginMethod
    public void bioVerify(PluginCall call) {
        final AppCompatActivity act = getActivity();
        if (act == null) { call.reject("sin actividad"); return; }
        act.runOnUiThread(() -> {
            try {
                BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle("Mi Cartera")
                        .setSubtitle("Desbloquea para entrar")
                        .setAllowedAuthenticators(AUTHS)
                        .build();
                BiometricPrompt prompt = new BiometricPrompt(act,
                        ContextCompat.getMainExecutor(act),
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                                JSObject r = new JSObject();
                                r.put("ok", true);
                                call.resolve(r);
                            }

                            @Override
                            public void onAuthenticationError(int code, CharSequence err) {
                                call.reject(err != null ? err.toString() : "cancelado");
                            }
                            // onAuthenticationFailed (huella no reconocida) NO termina el prompt:
                            // el usuario puede reintentar; solo error/success cierran la Promise.
                        });
                prompt.authenticate(info);
            } catch (Exception e) {
                call.reject(String.valueOf(e.getMessage()));
            }
        });
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences.Editor ed = ctx.getSharedPreferences(MiCarteraWidget.PREFS, Context.MODE_PRIVATE).edit();
        Double spent = call.getDouble("spent");
        Double budget = call.getDouble("budget");
        Double cash = call.getDouble("cash");
        ed.putFloat("spent", spent != null ? spent.floatValue() : 0f);
        ed.putFloat("budget", budget != null ? budget.floatValue() : 0f);
        if (cash != null) ed.putFloat("cash", cash.floatValue()); else ed.remove("cash");
        String label = call.getString("cashLabel");
        ed.putString("cashLabel", label != null ? label : "");
        ed.putLong("updated", System.currentTimeMillis());
        ed.apply();
        MiCarteraWidget.refreshAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        String title = call.getString("title");
        String body = call.getString("body");
        if (body == null || body.isEmpty()) { call.reject("body vacío"); return; }
        Notif.show(getContext(), title != null ? title : "Mi Cartera", body,
                (int) (System.currentTimeMillis() % 100000));
        call.resolve();
    }

    @PluginMethod
    public void ensureNotifPerm(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve();
            return;
        }
        requestPermissionForAlias("notifications", call, "notifPermDone");
    }

    @PermissionCallback
    private void notifPermDone(PluginCall call) {
        call.resolve();   // conceda o no, la app sigue (sin permiso simplemente no hay notis)
    }

    @PluginMethod
    public void notifAccess(PluginCall call) {
        boolean granted = androidx.core.app.NotificationManagerCompat
                .getEnabledListenerPackages(getContext())
                .contains(getContext().getPackageName());
        JSObject r = new JSObject();
        r.put("granted", granted);
        call.resolve(r);
    }

    @PluginMethod
    public void consumeGoto(PluginCall call) {
        // Punto 5: entrega (y limpia) el deep-link que dejó MainActivity al tocar la noti de un gasto.
        SharedPreferences sp = getContext().getSharedPreferences("micartera_goto", Context.MODE_PRIVATE);
        String g = sp.getString("pending", null);
        if (g != null) sp.edit().remove("pending").apply();
        JSObject r = new JSObject();
        if (g != null) r.put("goto", g);
        call.resolve(r);
    }

    @PluginMethod
    public void appInfo(PluginCall call) {
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long code = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
            JSObject r = new JSObject();
            r.put("versionName", pi.versionName);
            r.put("versionCode", (int) code);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        final String url = call.getString("url", "");
        if (url == null || url.isEmpty()) { call.reject("falta url"); return; }
        final Context ctx = getContext();
        // Android 8+: sin el permiso "instalar apps desconocidas" el instalador ni se abre.
        // Lo llevamos a su ajuste (es un toggle por app, se concede UNA vez) y la web reintenta.
        if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + ctx.getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Exception ignored) {}
            JSObject r = new JSObject();
            r.put("ok", false);
            r.put("needsPermission", true);
            call.resolve(r);
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(ctx.getCacheDir(), "updates");
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
                File apk = new File(dir, "mi-cartera-update.apk");
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(120000);
                conn.setInstanceFollowRedirects(true);   // GitHub Releases redirige al CDN
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                }
                conn.disconnect();
                Uri uri = androidx.core.content.FileProvider.getUriForFile(
                        ctx, ctx.getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                ctx.startActivity(install);
                JSObject r = new JSObject();
                r.put("ok", true);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("descarga falló: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void setNotifPrefs(PluginCall call) {
        Boolean confirm = call.getBoolean("expenseConfirm", true);
        getContext().getSharedPreferences("micartera_notifprefs", Context.MODE_PRIVATE)
                .edit().putBoolean("expenseConfirm", confirm == null || confirm).apply();
        call.resolve();
    }

    // Multiusuario del lector de gastos TR (migración 0008): la web guarda aquí la URL de
    // `ingest` con el token del usuario logueado. TrExpenseListener la lee de estas prefs (y
    // si no hay, cae a BuildConfig.INGEST_URL, que solo tiene el APK del creador). Así cada
    // persona apunta sus gastos de Trade Republic en SU propia cuenta. url vacía = desactivar.
    @PluginMethod
    public void setIngestUrl(PluginCall call) {
        String url = call.getString("url", "");
        getContext().getSharedPreferences("micartera_ingest", Context.MODE_PRIVATE)
                .edit().putString("url", url != null ? url : "").apply();
        call.resolve();
    }

    @PluginMethod
    public void openNotifAccess(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }
}
