package com.micartera.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Puente nativo con Trade Republic (opt-in "beta"). Contrato que espera la web
 * (public/index.html, componente TRSync → trBridge()):
 *
 *   status()                     -> { connected }
 *   login({phone,pin})           -> { ok, processId?, error? }   (dispara el 2FA)
 *   verify({processId,code})     -> { ok, error? }               (guarda la sesión en cookies)
 *   sync()                       -> { ok, positions:[{isin,name,shares,value,cost}], cash?, error? }
 *   logout()                     -> { ok }
 *
 * CLAVE de diseño: TODO el HTTP/WebSocket contra TR se hace DENTRO de una WebView
 * oculta cargada en https://app.traderepublic.com — así el token de AWS WAF, las
 * cookies de sesión y el CORS los resuelve el propio navegador (la WebView ES un
 * navegador real). El JS inyectado es ASÍNCRONO (fetch/WebSocket), y como
 * evaluateJavascript NO espera Promesas, el resultado vuelve por un puente
 * @JavascriptInterface (AndroidTR.result(id,json)) que resuelve el PluginCall.
 *
 * Es una vía NO oficial (la misma que usa la web de TR): contra sus Términos,
 * puede pedir 2FA cada cierto tiempo y romperse si TR cambia el login.
 */
@CapacitorPlugin(name = "TradeRepublic")
public class TradeRepublicPlugin extends Plugin {

    private static final String TR_APP = "https://app.traderepublic.com/";

    /**
     * Helper JS inyectado en TODA petición contra api.traderepublic.com.
     *
     * EL BUG DE LAS 4 VUELTAS ANTERIORES: la WebView vive en app.traderepublic.com y hace
     * fetch a api.traderepublic.com (subdominio distinto). Cuando el token del AWS WAF caduca
     * (arranque en frío), el WAF intercepta la petición y responde SIN cabeceras CORS → el
     * navegador lanza `TypeError: Failed to fetch` (ni siquiera hay status). El intento previo
     * llamaba a AwsWafIntegration.getToken() y luego hacía un fetch NORMAL; pero getToken() deja
     * el token en una COOKIE de dominio app.traderepublic.com, que NO viaja a api.traderepublic.com
     * → mismo fallo idéntico.
     *
     * FIX: usar el wrapper OFICIAL window.AwsWafIntegration.fetch(), que adjunta el token como
     * CABECERA `x-aws-waf-token` (eso sí cruza subdominios) y resuelve el challenge solo. Fallbacks
     * en cascada: (1) AWI.fetch → (2) getToken()+cabecera manual → (3) fetch pelado. `wafInfo()`
     * expone el estado del SDK para que un fallo residual venga diagnosticado, no a ciegas.
     */
    private static final String WFETCH =
        "const wafInfo=()=>{const a=window.AwsWafIntegration;return a?('waf:fetch='+(typeof a.fetch)+'/token='+(typeof a.getToken)):'waf:absent';};" +
        // wafToken(force): con force=true intenta forceRefreshToken() (SDK moderno) — el getToken()
        // normal devuelve el token CACHEADO aunque el WAF ya lo rechace (diagnóstico alpha12: el SDK
        // estaba [waf:fetch=function/token=function] y aun así fallaba en frío → token rancio).
        "const wafToken=async(force)=>{try{const a=window.AwsWafIntegration;if(!a)return null;" +
        "if(force&&typeof a.forceRefreshToken==='function'){try{return await a.forceRefreshToken();}catch(e){}}" +
        "if(typeof a.getToken==='function')return await a.getToken();}catch(e){}return null;};" +
        "const wfetch=async(url,opts)=>{opts=opts||{};const a=window.AwsWafIntegration;" +
        "if(a&&typeof a.fetch==='function'){return await a.fetch(url,opts);}" +               // wrapper oficial: cabecera x-aws-waf-token
        "const tok=await wafToken();" +
        "if(tok){opts.headers=Object.assign({},opts.headers,{'x-aws-waf-token':tok});}" +      // fallback: cabecera manual
        "return await fetch(url,opts);};";                                                     // último recurso

    private WebView web;
    private boolean loaded = false;
    private boolean loading = false;
    private final java.util.List<Runnable> readyQueue = java.util.Collections.synchronizedList(new java.util.ArrayList<>());
    private final ConcurrentHashMap<String, PluginCall> pending = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> bodies = new ConcurrentHashMap<>();      // id → JS (para reintentar tras recargar)
    private final java.util.Set<String> verifyIds = java.util.Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final java.util.Set<String> retriedIds = java.util.Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final android.os.Handler main = new android.os.Handler(android.os.Looper.getMainLooper());

    // ---- Puente JS → nativo: el JS async llama esto al resolver su Promesa ----------
    private class Bridge {
        @JavascriptInterface
        public void result(String id, String json) {
            // ÚLTIMO RECURSO frío (alpha13): si aun con el token en cabecera el fetch peta a nivel
            // de red y todavía no lo hemos intentado, RECARGAMOS app.traderepublic.com (re-ejecuta
            // el challenge del AWS WAF desde cero, como haría un navegador de verdad) y reinyectamos
            // el MISMO JS una vez. La recarga destruye el contexto JS anterior, por eso se orquesta
            // aquí en nativo y no dentro del propio script.
            try {
                JSObject peek = new JSObject(json);
                String err = peek.getString("error", "");
                if (!peek.optBoolean("ok", false) && err != null && err.contains("Failed to fetch")
                        && pending.containsKey(id) && !retriedIds.contains(id)) {
                    retriedIds.add(id);
                    String body = bodies.get(id);
                    if (body != null) { reloadThen(() -> run(id, body)); return; }
                }
            } catch (Exception ignored) {}
            PluginCall call = pending.remove(id);
            boolean wasVerify = verifyIds.remove(id);
            retriedIds.remove(id); bodies.remove(id);
            if (call == null) return;
            try {
                JSObject res = new JSObject(json);
                if (wasVerify && res.optBoolean("ok", false)) {
                    prefs().edit().putBoolean("connected", true).apply();   // sesión TR establecida
                }
                // NUNCA desconecta por un sync fallido (arrancar la app en frío a menudo
                // devolvía AUTHENTICATION/401 momentáneo y borraba connected → OTP otra vez).
                // Solo logout() pone connected=false. Si la sesión murió de verdad, el botón
                // Sincronizar lo canta y el usuario reconecta a mano (feedback 2026-07-17).
                // Persistir cookies AHORA (tr_session/tr_refresh acaban de sentarse o rotar).
                // Antes se hacía flush() síncrono en verify(), ANTES de que el fetch async
                // terminara → la sesión podía no llegar a disco y el 2FA volvía tras reiniciar.
                // alpha18 (DIAGNÓSTICO REAL de la saga en frío, chrome://inspect 2026-07-13): el
                // /session devolvía 401 —NO un challenge WAF— porque tr_refresh NO viajaba: había
                // DESAPARECIDO del jar tras matar la app. flush() no basta: Android solo persiste a
                // disco las cookies CON caducidad; las de sesión (sin Max-Age, como tr_refresh) se
                // tiran al morir el proceso. snapshotCookies() las guarda en prefs a mano para
                // re-inyectarlas en frío (restoreCookies en ensureWeb). El WAF nunca fue el problema.
                snapshotCookies();
                call.resolve(res);
            } catch (Exception e) {
                resolveErr(call, "respuesta ilegible de TR");
            }
        }
    }

    // ---- WebView oculta (perezosa, en el hilo de UI) --------------------------------
    // Los que esperan la página van a readyQueue (varios a la vez, y sobrevive recargas);
    // onPageFinished la drena. Antes el onReady se capturaba al crear el WebViewClient →
    // solo el PRIMER llamador se enteraba de la carga.
    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface", "AddJavascriptInterface"})
    private void ensureWeb(Runnable onReady) {
        AppCompatActivity act = getActivity();
        if (act == null) return;
        act.runOnUiThread(() -> {
            if (web == null) {
                // (alpha17 encendía aquí setWebContentsDebuggingEnabled para depurar la saga en frío
                // con chrome://inspect. RETIRADO en alpha19: la saga se cerró y dejarlo abriría la
                // WebView —con la sesión de TR dentro— a cualquiera con un cable y adb.)
                web = new WebView(act);
                web.getSettings().setJavaScriptEnabled(true);
                web.getSettings().setDomStorageEnabled(true);
                web.addJavascriptInterface(new Bridge(), "AndroidTR");
                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
                // ARRANQUE EN FRÍO (alpha16, hipótesis (a) de la saga TR): el challenge del AWS WAF
                // usa requestAnimationFrame/layout para generar el token. Un WebView creado pero
                // NUNCA añadido a la jerarquía de vistas está desacoplado de la ventana → su rAF y
                // sus pasadas de layout se estrangulan o no corren, así que el challenge nunca acaba
                // («Failed to fetch» eterno). Lo ATAMOS a la vista a 1×1 px con alpha 0 (imperceptible
                // pero "visible" para el pipeline de render, que es lo que el challenge necesita).
                // View.INVISIBLE/GONE NO sirven: rAF también se estrangula para vistas no visibles.
                try {
                    web.setAlpha(0f);
                    web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                    act.addContentView(web, new ViewGroup.LayoutParams(1, 1));
                    web.setOnTouchListener((v, e) -> true);   // 1px no molesta, pero por si acaso no capta toques útiles
                } catch (Throwable ignore) { /* si falla el attach, seguimos con el WebView desacoplado (comportamiento previo) */ }
                // ARRANQUE EN FRÍO (alpha14): la cookie aws-waf-token sobrevive al matar la app y el
                // SDK la reutiliza RANCIA (el WAF ya la rechaza) → challenge que nunca se rehace →
                // "Failed to fetch" eterno. La purgamos SOLO a ella (no tr_session/tr_refresh) para
                // forzar un challenge nuevo en esta primera carga.
                clearWafToken();
                web.setWebViewClient(new WebViewClient() {
                    @Override public void onPageFinished(WebView v, String url) {
                        loaded = true; loading = false;
                        drainReady();
                    }
                    @Override public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                        if (req != null && req.isForMainFrame()) { loaded = true; loading = false; drainReady(); }
                    }
                });
            }
            if (loaded) { if (onReady != null) onReady.run(); }
            else {
                if (onReady != null) readyQueue.add(onReady);
                if (!loading) { loading = true; restoreCookies(); web.loadUrl(TR_APP); }
            }
        });
    }

    // ---- Persistencia de la sesión de TR a través de matar la app (alpha18) ----------
    // getCookie(url) devuelve TODAS las cookies que viajarían a esa URL, incluidas las httpOnly
    // (a diferencia de document.cookie en JS) y las path-scoped a /api/v1/auth. Guardamos solo
    // las tr_* (sesión), NUNCA aws-waf-token (se refresca solo) ni analytics.
    private static final String SESSION_URL = "https://api.traderepublic.com/api/v1/auth/web/session";

    private void snapshotCookies() {
        CookieManager cm = CookieManager.getInstance();
        String raw = cm.getCookie(SESSION_URL);
        if (raw == null) raw = cm.getCookie("https://api.traderepublic.com/");
        java.util.LinkedHashMap<String, String> keep = new java.util.LinkedHashMap<>();
        if (raw != null) {
            for (String part : raw.split(";")) {
                String p = part.trim(); int eq = p.indexOf('=');
                if (eq <= 0) continue;
                String name = p.substring(0, eq);
                if (name.startsWith("tr_")) keep.put(name, p);   // tr_session / tr_refresh / tr_device
            }
        }
        // Solo guardamos si hay sesión DE VERDAD: así un frío fallido no machaca un snapshot bueno.
        if (keep.containsKey("tr_refresh") || keep.containsKey("tr_session")) {
            StringBuilder sb = new StringBuilder();
            for (String v : keep.values()) { if (sb.length() > 0) sb.append("; "); sb.append(v); }
            prefs().edit()
                .putString("cookieSnap", sb.toString())
                .putString("cookieSnapNames", android.text.TextUtils.join(",", keep.keySet()))   // diagnóstico adb
                .putLong("cookieSnapAt", System.currentTimeMillis())
                .apply();
        }
        cm.flush();
    }

    private void restoreCookies() {
        String snap = prefs().getString("cookieSnap", null);
        if (snap == null || snap.isEmpty()) return;
        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        for (String part : snap.split(";")) {
            String p = part.trim(); if (p.isEmpty()) continue;
            // host-only en api.traderepublic.com, Path=/ (llega a /api/v1/auth/*), Secure + SameSite=None
            // (la web va cross-site app→api). Se pierde el flag httpOnly: irrelevante para que viaje.
            cm.setCookie("https://api.traderepublic.com", p + "; Path=/; Secure; SameSite=None");
        }
        cm.flush();
    }

    /** Recarga app.traderepublic.com y ejecuta `then` cuando termine (challenge WAF fresco). */
    private void reloadThen(Runnable then) {
        AppCompatActivity act = getActivity();
        if (act == null || web == null) { if (then != null) then.run(); return; }
        act.runOnUiThread(() -> {
            loaded = false; loading = true;
            clearWafToken();     // recarga = challenge WAF de cero: fuera el token viejo antes
            restoreCookies();    // y re-inyecta la sesión guardada por si la recarga es en frío
            if (then != null) readyQueue.add(then);
            web.loadUrl(TR_APP);
        });
    }

    /** Caduca SOLO la cookie aws-waf-token en los dominios de TR (no toca la sesión). */
    private void clearWafToken() {
        CookieManager cm = CookieManager.getInstance();
        String expire = "aws-waf-token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/;";
        cm.setCookie("https://app.traderepublic.com", expire);
        cm.setCookie("https://api.traderepublic.com", expire);
        cm.setCookie("https://traderepublic.com", expire);
        cm.flush();
    }

    private void drainReady() {
        java.util.List<Runnable> jobs;
        synchronized (readyQueue) { jobs = new java.util.ArrayList<>(readyQueue); readyQueue.clear(); }
        // pequeño respiro tras cargar: deja al SDK del WAF de la página inicializarse
        for (Runnable r : jobs) main.postDelayed(r, 600);
    }

    /** Inyecta un cuerpo JS async cuyo `return` (string JSON) vuelve por AndroidTR.result(id,...). */
    private void run(String id, String asyncBody) {
        AppCompatActivity act = getActivity();
        if (act == null || web == null) return;
        bodies.put(id, asyncBody);
        String wrapped =
            "(async()=>{let r;try{r=await (async()=>{" + asyncBody + "})();}" +
            "catch(e){r=JSON.stringify({ok:false,error:String(e&&e.message||e)});}" +
            "if(typeof r!=='string')r=JSON.stringify(r);" +
            "try{AndroidTR.result(" + JSONObject.quote(id) + ",r);}catch(e){}})();";
        act.runOnUiThread(() -> web.evaluateJavascript(wrapped, null));
    }

    private String track(PluginCall call) {
        String id = String.valueOf(System.nanoTime());
        pending.put(id, call);
        call.setKeepAlive(true);   // la respuesta llega asíncrona por el puente
        // Red de seguridad: si una recarga se come el contexto JS y nada responde, resolvemos
        // con error en vez de dejar el botón girando para siempre. 90 s: el peor camino en frío
        // (backoff ~9,5 s + WS 15 s + recarga + segunda pasada completa) ronda los 55 s — con el
        // timeout de 60 s de alpha14 el segundo intento moría a medias y el usuario veía un
        // "timeout" falso tras un minuto de espera (feedback 2026-07-11).
        main.postDelayed(() -> {
            PluginCall stale = pending.remove(id);
            bodies.remove(id); retriedIds.remove(id); verifyIds.remove(id);
            if (stale != null) resolveErr(stale, "TR no respondió (timeout) · reintenta");
        }, 90000);
        return id;
    }

    // ---- Métodos del contrato -------------------------------------------------------

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("tr_bridge", Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void status(PluginCall call) {
        // "conectado" = verify tuvo éxito alguna vez (flag persistente). Más fiable que
        // adivinar el nombre de la cookie de sesión (que cambia entre versiones de TR).
        JSObject r = new JSObject();
        r.put("connected", prefs().getBoolean("connected", false));
        call.resolve(r);
    }

    @PluginMethod
    public void login(final PluginCall call) {
        final String phone = call.getString("phone", "");
        final String pin = call.getString("pin", "");
        if (phone.isEmpty() || pin.isEmpty()) { resolveErr(call, "faltan teléfono o PIN"); return; }
        final String id = track(call);
        // El login también pasa por el AWS WAF: en frío (token caducado) el primer POST puede
        // fallar sin CORS ("Failed to fetch") o con 403/405 → wfetch adjunta el token del WAF como
        // cabecera y reintentamos UNA vez tras forzar token fresco.
        ensureWeb(() -> run(id, WFETCH +
            "const call=async()=>{const r=await wfetch('https://api.traderepublic.com/api/v1/auth/web/login',{" +
            "method:'POST',credentials:'include',headers:{'Content-Type':'application/json'}," +
            "body:JSON.stringify({phoneNumber:" + jsStr(phone) + ",pin:" + jsStr(pin) + "})});" +
            "const t=await r.text();let j={};try{j=JSON.parse(t)}catch(e){}return {status:r.status,j:j};};" +
            "let res;" +
            "try{res=await call();}catch(e){await wafToken(true);try{res=await call();}catch(e2){return JSON.stringify({ok:false,error:String(e2&&e2.message||e2)+' ['+wafInfo()+']'});}}" +
            "if(res.status===403||res.status===405){await wafToken(true);res=await call();}" +
            "if(res.status===200||res.status===201)return JSON.stringify({ok:true,processId:res.j.processId||res.j.processID||null,countdown:res.j.countdownInSeconds||null});" +
            "return JSON.stringify({ok:false,status:res.status,error:(res.j.errors&&res.j.errors[0]&&res.j.errors[0].errorMessage)||('login HTTP '+res.status)});"
        ));
    }

    @PluginMethod
    public void verify(final PluginCall call) {
        final String processId = call.getString("processId", "");
        final String code = call.getString("code", "");
        if (processId.isEmpty() || code.isEmpty()) { resolveErr(call, "faltan processId o código"); return; }
        final String id = track(call);
        verifyIds.add(id);   // al resolver ok=true, el Bridge marca "connected" (lo lee status())
        ensureWeb(() -> run(id, WFETCH +
            "const doVerify=async()=>await wfetch('https://api.traderepublic.com/api/v1/auth/web/login/'+" + jsStr(processId) + "+'/'+" + jsStr(code) + ",{" +
            "method:'POST',credentials:'include',headers:{'Content-Type':'application/json'}});" +
            "let r;try{r=await doVerify();}catch(e){await wafToken(true);try{r=await doVerify();}catch(e2){return JSON.stringify({ok:false,error:String(e2&&e2.message||e2)+' ['+wafInfo()+']'});}}" +
            "const t=await r.text();let j={};try{j=JSON.parse(t)}catch(e){}" +
            "if(r.status===200||r.status===201)return JSON.stringify({ok:true});" +
            "return JSON.stringify({ok:false,status:r.status,error:(j.errors&&j.errors[0]&&j.errors[0].errorMessage)||('código HTTP '+r.status)});"
        ));
        // (el flush de cookies se hace en Bridge.result, CUANDO el verify async ha terminado)
    }

    @PluginMethod
    public void sync(final PluginCall call) {
        final String id = track(call);
        ensureWeb(() -> run(id, WFETCH +
            // REFRESCO DE SESIÓN: tr_session dura ~290 s y se renueva SIN 2FA con
            // GET /api/v1/auth/web/session (cookie tr_refresh) — igual que pytr antes de cada petición.
            // TERCERA VUELTA (el «refresh: Failed to fetch» crónico): la causa real era CROSS-ORIGIN +
            // AWS WAF. app.traderepublic.com → api.traderepublic.com con token WAF caducado devuelve
            // un challenge SIN CORS → TypeError "Failed to fetch". getToken() solo dejaba una cookie de
            // dominio app.* que NO viaja a api.* → nunca arreglaba nada. Ahora wfetch() usa el wrapper
            // oficial AwsWafIntegration.fetch (cabecera x-aws-waf-token, que SÍ cruza subdominios).
            // Devuelve "" si ok, o el motivo (con estado del SDK) si falla — ya no a ciegas.
            // ARRANQUE EN FRÍO (alpha14→15): el challenge del AWS WAF tarda unos segundos en producir
            // un token VÁLIDO tras cargar la página. Disparar una sola vez (a los 600 ms) llega
            // demasiado pronto → "Failed to fetch". Reintentamos con espera creciente (~9,5 s)
            // forzando token nuevo entre intentos; si aun así no entra, la mejor apuesta NO es seguir
            // esperando (alpha14 gastaba ~22 s aquí y el total se comía el timeout) sino la RECARGA
            // de la página (Bridge.result → reloadThen): challenge de cero y segunda pasada completa.
            // En caliente el token ya vale → entra al primer intento sin esperar.
            // 401 = sesión de VERDAD caducada (2FA) → no insistir.
            "const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));" +
            "const refreshOnce=async()=>{const r=await wfetch('https://api.traderepublic.com/api/v1/auth/web/session',{method:'GET',credentials:'include',headers:{}});return r.status;};" +
            "const refresh=async()=>{const delays=[0,1500,3000,5000];let last='';" +
            "for(let i=0;i<delays.length;i++){if(delays[i])await sleep(delays[i]);if(i>0)await wafToken(true);" +
            "try{const s=await refreshOnce();if(s===200||s===201)return '';if(s===401){return 'HTTP 401';}last='HTTP '+s;}" +
            "catch(e){last=String(e&&e.message||e)+' ['+wafInfo()+']';}}" +
            "return last;};" +
            // Protocolo real de TR (mapeado en vivo 2026-07): connect 31 → "connected";
            //   sub {id} {type:compactPortfolioByType} → {categories:[{positions:[{isin,netSize,averageBuyIn,name}]}]}
            //   sub {id} {type:availableCash}          → [{currencyId,amount}]
            //   sub {id} {type:ticker,id:"ISIN.LSX"}   → {last:{price},bid,ask}  (precio EUR en vivo)
            // value = precio × participaciones; cost = averageBuyIn × participaciones. Todo EUR.
            // IMPORTANTE: los IDs de suscripción DEBEN ser numéricos (TR ignora en silencio los de letra).
            // Posiciones=1, efectivo=2, tickers=100+i.
            "const trySync=()=>new Promise((resolve)=>{" +
            "const ws=new WebSocket('wss://api.traderepublic.com/');" +
            "let positions=null,cash=null,posDone=false;const price={};" +
            "let done=false;const fin=(o)=>{if(done)return;done=true;try{ws.close()}catch(e){};resolve(o);};" +
            "const hardTo=setTimeout(()=>finishOk(),15000);let graceTo=null;" +
            "const finishOk=()=>{clearTimeout(hardTo);if(graceTo)clearTimeout(graceTo);" +
              "const pos=(positions||[]).map(p=>{const sh=Number(p.netSize||0);const pr=price[p.isin];" +
              "return {isin:p.isin,shares:sh,name:p.name||''," +
              "cost:(p.averageBuyIn!=null?Number(p.averageBuyIn)*sh:undefined)," +
              "value:(pr!=null?pr*sh:undefined)};});" +
              "fin({ok:true,positions:pos,cash:cash});};" +
            "const maybeGrace=()=>{if(posDone&&cash!=null&&!graceTo)graceTo=setTimeout(finishOk,3500);};" +
            "ws.onopen=()=>ws.send('connect 31 '+JSON.stringify({locale:'es',platformId:'webtrading',platformVersion:'chrome - 138.0',clientId:'app.traderepublic.com',clientVersion:'1.0.0'}));" +
            "ws.onerror=()=>fin({ok:false,error:'error de conexión con TR'});" +
            "ws.onclose=(e)=>{if(!done)fin({ok:false,error:'TR cerró la conexión ('+e.code+') · vuelve a conectar'});};" +
            "ws.onmessage=(m)=>{const d=String(m.data);" +
            "if(d==='connected'){ws.send('sub 1 '+JSON.stringify({type:'compactPortfolioByType'}));ws.send('sub 2 '+JSON.stringify({type:'availableCash'}));return;}" +
            "const sp=d.indexOf(' ');if(sp<0)return;const fid=d.slice(0,sp);const rest=d.slice(sp+1);" +
            "const sp2=rest.indexOf(' ');const code=sp2<0?rest:rest.slice(0,sp2);const body=sp2<0?'':rest.slice(sp2+1);" +
            "let j=null;try{j=JSON.parse(body)}catch(e){}" +
            "if(code==='E'){const ec=j&&j.errors&&j.errors[0]&&j.errors[0].errorCode;" +
              "if(String(ec).indexOf('AUTHENTICATION')>=0){return fin({ok:false,authExpired:true});}return;}" +
            "if(fid==='1'&&j&&j.categories&&positions==null){positions=[];j.categories.forEach(c=>(c.positions||[]).forEach(p=>positions.push(p)));posDone=true;" +
              "positions.forEach((p,i)=>{try{ws.send('sub '+(100+i)+' '+JSON.stringify({type:'ticker',id:p.isin+'.LSX'}));}catch(e){}});" +
              "if(positions.length===0)finishOk();else maybeGrace();}" +
            "if(fid==='2'&&j&&cash==null){let c=0;if(Array.isArray(j)){j.forEach(x=>{if(x&&x.amount!=null)c+=Number(x.amount);});}else if(j.amount!=null){c=Number(j.amount);}cash=c;maybeGrace();}" +
            "if(Number(fid)>=100&&code==='A'&&j){const idx=Number(fid)-100;const p=positions&&positions[idx];" +
              "if(p&&price[p.isin]==null){const pr=(j.last&&j.last.price)||(j.bid&&j.bid.price)||(j.ask&&j.ask.price);if(pr!=null){price[p.isin]=Number(pr);try{ws.send('unsub '+fid);}catch(e){}}}" +
              "if(positions&&Object.keys(price).length>=positions.length&&cash!=null)finishOk();}" +
            "};});" +
            // Orquestación: refresca (backoff ~9,5 s) → sincroniza → si aún caduca, UN disparo
            // forzado más (no otro backoff, para no reventar el timeout) y reintenta 1 vez.
            // · 401 REAL en el refresh → sesión caducada de verdad: fuera ya, sin gastar 15 s de WS.
            // · authExpired con el refresh BLOQUEADO por el WAF (no-401) ≠ sesión caducada: se marca
            //   wafBlocked (la sesión sigue viva, NO desconectar) — antes esto ponía connected=false
            //   y pedía re-hacer el 2FA sin necesidad (feedback 2026-07-11). El texto conserva el
            //   motivo (p.ej. "Failed to fetch") para que Bridge.result dispare la recarga+reintento.
            "const refreshForced=async()=>{await wafToken(true);try{const s=await refreshOnce();return (s===200||s===201)?'':('HTTP '+s);}catch(e){return String(e&&e.message||e);}};" +
            "const rerr=await refresh();" +
            "if(rerr==='HTTP 401')return JSON.stringify({ok:false,authExpired:true,error:'Tu sesión de TR caducó. Pulsa «Desconectar» y vuelve a conectar.'});" +
            "let r=await trySync();" +
            "if(!r.ok&&r.authExpired&&rerr){if(!(await refreshForced()))r=await trySync();}" +
            "if(!r.ok&&r.authExpired){" +
            "if(rerr){delete r.authExpired;r.wafBlocked=true;r.error='TR aún no deja pasar (control anti-bot · '+rerr+'). Espera unos segundos y vuelve a sincronizar.';}" +
            "else{r.error='Tu sesión de TR caducó (refresh: ok). Pulsa «Desconectar» y vuelve a conectar.';}}" +
            "return r;"
        ));
    }

    @PluginMethod
    public void logout(PluginCall call) {
        prefs().edit().putBoolean("connected", false)
            .remove("cookieSnap").remove("cookieSnapNames").remove("cookieSnapAt").apply();  // fuera la sesión guardada
        CookieManager cm = CookieManager.getInstance();
        cm.removeAllCookies(null);
        cm.flush();
        loaded = false;
        AppCompatActivity act = getActivity();
        if (act != null && web != null) act.runOnUiThread(() -> web.clearCache(true));
        JSObject r = new JSObject();
        r.put("ok", true);
        call.resolve(r);
    }

    // ---- utilidades -----------------------------------------------------------------
    private static void resolveErr(PluginCall call, String msg) {
        JSObject r = new JSObject();
        r.put("ok", false);
        r.put("error", msg);
        call.resolve(r);
    }

    private static String jsStr(String s) {
        return JSONObject.quote(s == null ? "" : s);
    }
}
