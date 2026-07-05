package com.micartera.app;

import android.annotation.SuppressLint;
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

    // ---- Puente JS → nativo: el JS async llama esto al resolver su Promesa ----------
    private class Bridge {
        @JavascriptInterface
        public void result(String id, String json) {
            PluginCall call = pending.remove(id);
            if (call == null) return;
            try {
                call.resolve(new JSObject(json));
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

    @PluginMethod
    public void status(PluginCall call) {
        String cookies = CookieManager.getInstance().getCookie(TR_APP);
        boolean connected = cookies != null && (cookies.contains("tr_session") || cookies.contains("session"));
        JSObject r = new JSObject();
        r.put("connected", connected);
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
        ensureWeb(() -> run(id,
            "const r=await fetch('https://api.traderepublic.com/api/v1/auth/web/login/'+" + jsStr(processId) + "+'/'+" + jsStr(code) + ",{" +
            "method:'POST',credentials:'include',headers:{'Content-Type':'application/json'}});" +
            "const t=await r.text();let j={};try{j=JSON.parse(t)}catch(e){}" +
            "if(r.status===200||r.status===201)return JSON.stringify({ok:true});" +
            "return JSON.stringify({ok:false,status:r.status,error:(j.errors&&j.errors[0]&&j.errors[0].errorMessage)||('código HTTP '+r.status)});"
        ));
        // persiste cookies tras la respuesta
        CookieManager.getInstance().flush();
    }

    @PluginMethod
    public void sync(final PluginCall call) {
        final String id = track(call);
        ensureWeb(() -> run(id,
            // WebSocket dentro de la página de TR: la cookie de sesión viaja en el upgrade.
            // Protocolo TR: "connect 31 {...}" → "sub 1 {compactPortfolio}" + "sub 2 {cash}".
            // Frames del servidor: "<id> <code> <payload>" (code A=answer, C=continue, E=error).
            "const ws=new WebSocket('wss://api.traderepublic.com/');" +
            "const out={positions:null,cash:null};" +
            "return await new Promise((resolve)=>{" +
            "let done=false;const fin=(o)=>{if(done)return;done=true;try{ws.close()}catch(e){};resolve(JSON.stringify(o));};" +
            "const to=setTimeout(()=>fin({ok:false,error:'timeout WS'}),25000);" +
            "ws.onopen=()=>ws.send('connect 31 '+JSON.stringify({locale:'es',platformId:'webtrading',platformVersion:'app',clientId:'app.traderepublic.com',clientVersion:'3.0.0'}));" +
            "ws.onerror=()=>fin({ok:false,error:'error WS (sesión caducada?)'});" +
            "const ready=()=>{if(out.positions!=null&&out.cash!=null){clearTimeout(to);" +
            "const pos=out.positions.map(p=>({isin:p.instrumentId||p.isin,shares:Number(p.netSize||0)," +
            "cost:(p.averageBuyIn!=null?Number(p.averageBuyIn)*Number(p.netSize||0):undefined)," +
            "value:(p.netValue!=null?Number(p.netValue):undefined),name:''}));" +
            "fin({ok:true,positions:pos,cash:out.cash});}};" +
            "ws.onmessage=(m)=>{const d=String(m.data);" +
            "if(d==='connect ok'){ws.send('sub 1 '+JSON.stringify({type:'compactPortfolio'}));ws.send('sub 2 '+JSON.stringify({type:'cash'}));return;}" +
            "const sp=d.indexOf(' ');if(sp<0)return;const fid=d.slice(0,sp);const rest=d.slice(sp+1);" +
            "const sp2=rest.indexOf(' ');const code=sp2<0?rest:rest.slice(0,sp2);const body=sp2<0?'':rest.slice(sp2+1);" +
            "if(code==='E'){clearTimeout(to);fin({ok:false,error:'TR: '+body});return;}" +
            "let j=null;try{j=JSON.parse(body)}catch(e){return;}" +
            "if(fid==='1'&&j){out.positions=j.positions||[];ready();}" +
            "if(fid==='2'&&j){let c=0;if(Array.isArray(j)){j.forEach(x=>{if(x&&x.amount!=null)c+=Number(x.amount);});}else if(j.amount!=null){c=Number(j.amount);}out.cash=c;ready();}" +
            "};});"
        ));
    }

    @PluginMethod
    public void logout(PluginCall call) {
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
