package com.micartera.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.SharedPreferences;
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
    private WebView web;
    private boolean loaded = false;
    private final ConcurrentHashMap<String, PluginCall> pending = new ConcurrentHashMap<>();
    private final java.util.Set<String> verifyIds = java.util.Collections.newSetFromMap(new ConcurrentHashMap<>());

    // ---- Puente JS → nativo: el JS async llama esto al resolver su Promesa ----------
    private class Bridge {
        @JavascriptInterface
        public void result(String id, String json) {
            PluginCall call = pending.remove(id);
            boolean wasVerify = verifyIds.remove(id);
            if (call == null) return;
            try {
                JSObject res = new JSObject(json);
                if (wasVerify && res.optBoolean("ok", false)) {
                    prefs().edit().putBoolean("connected", true).apply();   // sesión TR establecida
                }
                if (res.optBoolean("authExpired", false)) {
                    prefs().edit().putBoolean("connected", false).apply();  // sesión caducó → pedir reconexión
                }
                // Persistir cookies AHORA (tr_session/tr_refresh acaban de sentarse o rotar).
                // Antes se hacía flush() síncrono en verify(), ANTES de que el fetch async
                // terminara → la sesión podía no llegar a disco y el 2FA volvía tras reiniciar.
                CookieManager.getInstance().flush();
                call.resolve(res);
            } catch (Exception e) {
                resolveErr(call, "respuesta ilegible de TR");
            }
        }
    }

    // ---- WebView oculta (perezosa, en el hilo de UI) --------------------------------
    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface", "AddJavascriptInterface"})
    private void ensureWeb(Runnable onReady) {
        AppCompatActivity act = getActivity();
        if (act == null) return;
        act.runOnUiThread(() -> {
            if (web == null) {
                web = new WebView(act);
                web.getSettings().setJavaScriptEnabled(true);
                web.getSettings().setDomStorageEnabled(true);
                web.addJavascriptInterface(new Bridge(), "AndroidTR");
                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
                web.setWebViewClient(new WebViewClient() {
                    @Override public void onPageFinished(WebView v, String url) {
                        loaded = true;
                        if (onReady != null) onReady.run();
                    }
                    @Override public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                        if (req != null && req.isForMainFrame()) { loaded = true; }
                    }
                });
            }
            if (loaded) { if (onReady != null) onReady.run(); }
            else web.loadUrl(TR_APP);
        });
    }

    /** Inyecta un cuerpo JS async cuyo `return` (string JSON) vuelve por AndroidTR.result(id,...). */
    private void run(String id, String asyncBody) {
        AppCompatActivity act = getActivity();
        if (act == null || web == null) return;
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
        ensureWeb(() -> run(id,
            "const r=await fetch('https://api.traderepublic.com/api/v1/auth/web/login',{" +
            "method:'POST',credentials:'include',headers:{'Content-Type':'application/json'}," +
            "body:JSON.stringify({phoneNumber:" + jsStr(phone) + ",pin:" + jsStr(pin) + "})});" +
            "const t=await r.text();let j={};try{j=JSON.parse(t)}catch(e){}" +
            "if(r.status===200||r.status===201)return JSON.stringify({ok:true,processId:j.processId||j.processID||null,countdown:j.countdownInSeconds||null});" +
            "return JSON.stringify({ok:false,status:r.status,error:(j.errors&&j.errors[0]&&j.errors[0].errorMessage)||('login HTTP '+r.status)});"
        ));
    }

    @PluginMethod
    public void verify(final PluginCall call) {
        final String processId = call.getString("processId", "");
        final String code = call.getString("code", "");
        if (processId.isEmpty() || code.isEmpty()) { resolveErr(call, "faltan processId o código"); return; }
        final String id = track(call);
        verifyIds.add(id);   // al resolver ok=true, el Bridge marca "connected" (lo lee status())
        ensureWeb(() -> run(id,
            "const r=await fetch('https://api.traderepublic.com/api/v1/auth/web/login/'+" + jsStr(processId) + "+'/'+" + jsStr(code) + ",{" +
            "method:'POST',credentials:'include',headers:{'Content-Type':'application/json'}});" +
            "const t=await r.text();let j={};try{j=JSON.parse(t)}catch(e){}" +
            "if(r.status===200||r.status===201)return JSON.stringify({ok:true});" +
            "return JSON.stringify({ok:false,status:r.status,error:(j.errors&&j.errors[0]&&j.errors[0].errorMessage)||('código HTTP '+r.status)});"
        ));
        // (el flush de cookies se hace en Bridge.result, CUANDO el verify async ha terminado)
    }

    @PluginMethod
    public void sync(final PluginCall call) {
        final String id = track(call);
        ensureWeb(() -> run(id,
            // REFRESCO DE SESIÓN (corregido 2026-07-10): tr_session dura ~290 s y se renueva
            // SIN 2FA con GET /api/v1/auth/web/session (cookie tr_refresh) — exactamente lo que
            // hace pytr antes de cada petición. La versión anterior probaba PRIMERO un POST a
            // ese endpoint y si devolvía 200 se saltaba el GET: el POST no renueva y el usuario
            // acababa en el login+2FA en CADA sync. Devuelve "" si ok o el motivo si falla
            // (viaja en el mensaje de error para poder diagnosticar en remoto).
            "const refresh=async()=>{try{const r=await fetch('https://api.traderepublic.com/api/v1/auth/web/session',{method:'GET',credentials:'include'});" +
            "if(r.status===200||r.status===201)return '';return 'HTTP '+r.status;}catch(e){return String(e&&e.message||e);}};" +
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
            // Orquestación: refresca → sincroniza → si aún caduca, refresca otra vez y reintenta 1 vez.
            "const rerr=await refresh();" +
            "let r=await trySync();" +
            "if(!r.ok&&r.authExpired&&rerr){if(!(await refresh()))r=await trySync();}" +
            "if(!r.ok&&r.authExpired)r.error='Tu sesión de TR caducó (refresh: '+(rerr===''?'ok':rerr)+'). Pulsa «Desconectar» y vuelve a conectar.';" +
            "return r;"
        ));
    }

    @PluginMethod
    public void logout(PluginCall call) {
        prefs().edit().putBoolean("connected", false).apply();
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
