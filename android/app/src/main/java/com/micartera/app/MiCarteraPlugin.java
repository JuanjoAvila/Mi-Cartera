package com.micartera.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;

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
