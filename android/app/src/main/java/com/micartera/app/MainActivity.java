package com.micartera.app;

import android.animation.ValueAnimator;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static int dp(Context c, float value) {
        return Math.round(value * c.getResources().getDisplayMetrics().density);
    }

    /* EL ICONO SE ENCOGE EN DIRECTO, NO DESAPARECE (2026-08-03, varios intentos tras ver vídeos
       reales). El icono que obliga a enseñar Android en cada arranque en frío tiene un tamaño FIJO
       que no se puede reducir por tema, muy por encima de los 94dp de la tarjeta `.mcl-mark` del
       splash web — pasar de uno a otro daba un salto de tamaño que se leía como "pantallas
       distintas". Se MIDE el tamaño de verdad que ha pintado Android (`getIconView()`, real para
       este móvil) y se anima hasta el tamaño/sitio de la tarjeta web.
       ⚠ La tarjeta empieza INVISIBLE (alpha 0, sin relleno): el icono real de Android no lleva
       círculo ni tarjeta detrás (varios atributos de personalización que el sistema ignora), así
       que arrancar con la tarjeta ya puesta era un cambio de forma a bocajarro. Ahora se desvanece
       hacia dentro a la vez que encoge.
       ⚠ 3os frames por segundo en un móvil a 120Hz (2026-08-03): la causa era animar ANCHO/ALTO/
       MÁRGENES con `LayoutParams` — cada frame disparaba una pasada de layout completa desde este
       FrameLayout hasta la raíz, justo cuando Capacitor está montando la WebView a la vez en el
       mismo hilo. Ahora el tamaño se fija UNA VEZ al principio y el movimiento es `scaleX/scaleY` +
       `translationX/Y` — lo pinta el compositor, sin tocar layout, tan fluido como deje la GPU. */
    private void shrinkSplashIcon(androidx.core.splashscreen.SplashScreenViewProvider provider) {
        try {
            View iconView = provider.getIconView();
            FrameLayout root = findViewById(android.R.id.content);
            if (iconView == null || root == null) { provider.remove(); return; }
            android.util.Log.i("MC_SPLASH", "iconView=" + iconView.getClass().getSimpleName()
                + " drawable=" + (iconView instanceof ImageView ? String.valueOf(((ImageView) iconView).getDrawable()) : "n/a")
                + " rootChildren=" + root.getChildCount());
            int[] loc = new int[2];
            iconView.getLocationOnScreen(loc);
            final int startX = loc[0], startY = loc[1];
            final int startW = iconView.getWidth(), startH = iconView.getHeight();
            if (startW <= 0 || startH <= 0) { provider.remove(); return; }

            ImageView clone = new ImageView(this);
            clone.setImageResource(R.drawable.ic_launcher_foreground); // vector, nítido a cualquier tamaño
            final GradientDrawable cardBg = new GradientDrawable();
            cardBg.setColor(getResources().getColor(R.color.mcSplashCard, getTheme()));
            cardBg.setAlpha(0); // invisible al empezar: el icono real no llevaba tarjeta detrás
            clone.setBackground(cardBg);
            // Sin padding al empezar: el icono ocupa el mismo hueco, al mismo tamaño, que el real.

            // Tamaño y sitio FIJOS al del icono real — nunca se vuelven a tocar (eso es lo que
            // antes forzaba layout cada frame). El movimiento entero va por transform.
            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(startW, startH);
            lp.leftMargin = startX; lp.topMargin = startY;
            lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
            clone.setPivotX(startW / 2f);
            clone.setPivotY(startH / 2f);
            root.addView(clone, lp);
            provider.remove(); // el clon ya ocupa el mismo hueco exacto: el relevo es invisible

            android.util.DisplayMetrics dm = getResources().getDisplayMetrics();
            final int targetSize = dp(this, 94);
            final int targetX = (dm.widthPixels - targetSize) / 2;
            // 28dp por encima del centro real: ahí es donde cae el icono en el splash web, que
            // centra icono+hueco(18dp)+nombre como bloque y el icono queda arriba de ese bloque.
            final int targetY = (dm.heightPixels - targetSize) / 2 - dp(this, 28);
            final float endRadius = targetSize * (26f / 94f);          // mismo border-radius que .mcl-mark
            final float endPadFrac = 0.16f;                            // misma proporción trazo↔tarjeta que en la web
            final float endScale = targetSize / (float) startW;
            // Traslación necesaria para que el CENTRO acabe en el centro de la tarjeta destino
            // (la escala ya se aplica desde el centro propio del icono, por el pivot de arriba).
            final float endTx = (targetX + targetSize / 2f) - (startX + startW / 2f);
            final float endTy = (targetY + targetSize / 2f) - (startY + startH / 2f);

            ValueAnimator anim = ValueAnimator.ofFloat(0f, 1f);
            anim.setDuration(420);
            // Misma curva que el resto de la app (mclpop del splash web, el rebote de Ajustes):
            // cubic-bezier(.32,.72,0,1). Así el encogido se siente de la misma familia de gestos,
            // no un movimiento genérico aparte.
            anim.setInterpolator(new android.view.animation.PathInterpolator(.32f, .72f, 0f, 1f));
            anim.addUpdateListener(a -> {
                float t = (float) a.getAnimatedValue();
                float scale = 1f + (endScale - 1f) * t;
                clone.setScaleX(scale);
                clone.setScaleY(scale);
                clone.setTranslationX(endTx * t);
                clone.setTranslationY(endTy * t);
                int padNow = Math.round(startW * endPadFrac * t); // fracción de startW: invariante a la escala
                clone.setPadding(padNow, padNow, padNow, padNow);
                // El radio se dibuja en el lienzo SIN escalar (startW×startH) y luego todo el
                // view se escala por `scale` — para que el radio VISIBLE crezca como endRadius*t,
                // hay que pedirle al drawable ese valor ya compensado por la escala actual.
                cardBg.setCornerRadius((endRadius * t) / scale);
                cardBg.setAlpha(Math.round(255 * t));                    // la tarjeta se desvanece hacia dentro
            });
            anim.addListener(new android.animation.AnimatorListenerAdapter() {
                @Override public void onAnimationEnd(android.animation.Animator a) {
                    ViewGroup parent = (ViewGroup) clone.getParent();
                    android.util.Log.i("MC_SPLASH", "animEnd rootChildren=" + (parent != null ? parent.getChildCount() : -1));
                    if (parent != null) parent.removeView(clone); // misma pinta, mismo sitio: sin fundido
                }
            });
            anim.start();
        } catch (Exception e) {
            android.util.Log.e("MC_SPLASH", "shrinkSplashIcon failed", e);
            provider.remove(); // red de seguridad: si algo falla, el arranque no se queda colgado
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        /* ACTIVA de verdad la librería de compatibilidad del splash (2026-08-01). Estaba en
           build.gradle desde el principio pero nunca se llamaba — sin esto, el tema
           `Theme.SplashScreen` de styles.xml no coordina su comportamiento con esta Activity y
           en versiones antiguas de Android (< 12, minSdk 23) el splash "de verdad" no siempre se
           encadena bien con el primer pintado. Tiene que ir ANTES de super.onCreate(), que es
           justo cuando la librería necesita enganchar la ventana. */
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setOnExitAnimationListener(this::shrinkSplashIcon);
        registerPlugin(MiCarteraPlugin.class);       // antes de super.onCreate (así lo pide Capacitor)
        registerPlugin(TradeRepublicPlugin.class);   // puente TR (beta)
        super.onCreate(savedInstanceState);
        /* INSPECCIÓN DE LA WEBVIEW EN EL MÓVIL DE VERDAD (2026-07-27). Sin esto no hay forma de
           medir el lag donde ocurre: `dumpsys gfxinfo` da 120 fps aunque la web esté congelada,
           porque una WebView pinta siempre su ÚLTIMO fotograma disponible y Android lo cuenta como
           frame bueno. Con esto, `chrome://inspect` (o CDP por adb) ve el proceso de render real y
           se puede medir el gesto que falla con sus datos y su dedo. Así se encontró el candado
           que no se soltaba (docs/LAG-DESLIZAR.md §0).
           ⚠ APAGADO salvo que se compile con MICARTERA_WEBDEBUG=1 en local.properties: la APK que
           publica el CI NO abre el socket. El de casa sí, y por adb desde un PC autorizado.
           ⚠ DESPUÉS de super.onCreate() a propósito: Capacitor hace
           `WebView.setWebContentsDebuggingEnabled(config.isWebContentsDebuggingEnabled())` al
           montar el puente (Bridge.java:599), o sea que en release lo APAGA. Si esta línea va
           antes, Capacitor la pisa y el socket no aparece nunca. */
        if (BuildConfig.WEB_DEBUG) {
            try { android.webkit.WebView.setWebContentsDebuggingEnabled(true); } catch (Throwable ignored) {}
        }
        // Edge-to-edge: la WebView pinta bajo status bar Y nav bar; el CSS usa --safe-top/--safe-bottom.
        try {
            Window w = getWindow();
            WindowCompat.setDecorFitsSystemWindows(w, false);
            w.setStatusBarColor(Color.TRANSPARENT);
            w.setNavigationBarColor(Color.TRANSPARENT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                w.setStatusBarContrastEnforced(false);
                w.setNavigationBarContrastEnforced(false);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = w.getAttributes();
                lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                w.setAttributes(lp);
            }
            View decor = w.getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility()
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
            WindowInsetsControllerCompat ctrl = WindowCompat.getInsetsController(w, decor);
            if (ctrl != null) {
                ctrl.setAppearanceLightStatusBars(false);
                ctrl.setAppearanceLightNavigationBars(false);
            }
        } catch (Exception ignored) {}
        stashGoto(getIntent());                      // punto 5: la app se ABRIÓ tocando una noti de gasto
        // Chequeo OTA/APK en background (app cerrada) — sin esto la noti solo salta al abrir.
        OtaCheckScheduler.ensure(this);
        // Avisos de recibos «la víspera» con la app cerrada (APK 29, 2026-07-18).
        AlertCheckScheduler.ensure(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        stashGoto(intent);                           // punto 5: la app YA estaba abierta y tocas la noti
    }

    // Guarda el deep-link en prefs; la web lo consume al volver a primer plano con
    // MiCartera.consumeGoto(). Dos orígenes: extra "mc_goto" de una notificación de gasto
    // (→ salta a la ficha) o el esquema micartera:// de la vuelta del banco (Open Banking):
    // micartera://bank?ok=1 → "bank|ok" · micartera://bank?msg=... → "bank|error|<msg>".
    private void stashGoto(Intent intent) {
        if (intent == null) return;
        String g = intent.getStringExtra("mc_goto");
        if (g == null || g.isEmpty()) {
            android.net.Uri u = intent.getData();
            if (u != null && "micartera".equals(u.getScheme()) && "bank".equals(u.getHost())) {
                String msg = u.getQueryParameter("msg");
                g = (msg != null && !msg.isEmpty()) ? "bank|error|" + msg : "bank|ok";
            }
        }
        if (g == null || g.isEmpty()) return;
        getSharedPreferences("micartera_goto", Context.MODE_PRIVATE)
                .edit().putString("pending", g).apply();
    }
}
