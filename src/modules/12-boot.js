/* ---------- Actualizaciones: OTA web bundle + APK nativo + aviso push/local ----------
   La app nativa arranca del bundle LOCAL (instantáneo, offline) y este bloque baja el bundle
   nuevo de GitHub Pages en segundo plano. Bug fix 2026-07-15: si _otaPending ya coincidía con
   version.json, el chequeo salía sin enseñar el botón — ahora restauramos el bundle al arrancar.
   Notificación al móvil cuando hay update lista (pareja no depende de enterarse a mano). */
var _mcNative=false;
try{ _mcNative=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()); }catch(e){}
var _mcOtaBASE="https://juanjoavila.github.io/Mi-Cartera/";
var _mcOtaChecking=false;

window._mcNewerVer=function(a,b){
  a=String(a).split("."); b=String(b).split(".");
  for(var i=0;i<Math.max(a.length,b.length);i++){
    var x=parseInt(a[i]||0,10), y=parseInt(b[i]||0,10);
    if(x!==y) return x>y;
  }
  return false;
};

window._mcNotifyUpdate=function(version, kind){
  var title="Mi Cartera";
  var body=kind==="apk"&&version?tf("upd_notif_apk",{v:version}):(version?tf("upd_notif",{v:version}):t("upd_notif_web"));
  try{
    var nat=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.MiCartera;
    if(nat&&nat.showNotification){
      var opts={title:title, body:body};
      if(_mcNative) opts.gotoTarget=kind==="apk"?"update|apk":"update|ota";
      nat.showNotification(opts).catch(function(){});
      // Marca en nativo para que el worker no vuelva a avisar la misma versión.
      try{
        if(nat.syncOtaState){
          var patch={version:CONFIG.APP_VERSION};
          if(kind==="apk") patch.markNotifiedApk=version;
          else if(version) patch.markNotifiedVer=version;
          nat.syncOtaState(patch).catch(function(){});
        }
      }catch(e){}
      return;
    }
  }catch(e){}
  try{
    if(typeof Notification!=="undefined"){
      if(Notification.permission==="granted"){
        new Notification(title,{body:body, tag:"mc-update-"+(version||"web")});
      }else if(Notification.permission==="default"){
        Notification.requestPermission().then(function(p){
          if(p==="granted") new Notification(title,{body:body, tag:"mc-update-"+(version||"web")});
        });
      }
    }
  }catch(e){}
};

/* Al arrancar: enseña al worker qué versión web hay (tras OTA ≠ versionName del APK) y
   si el nativo YA avisó en background, no repetimos la noti al abrir. */
window._mcSyncOtaNative=function(){
  try{
    var nat=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.MiCartera;
    if(!nat||!nat.syncOtaState) return;
    nat.syncOtaState({version:CONFIG.APP_VERSION}).then(function(r){
      try{
        if(r&&r.bgNotifiedVer) localStorage.setItem("_otaNotifVer", r.bgNotifiedVer);
        if(r&&r.bgNotifiedApk) localStorage.setItem("_apkNotifVer", r.bgNotifiedApk);
      }catch(e){}
    }).catch(function(){});
  }catch(e){}
};

window._mcSignalOtaPending=function(version){
  if(!version) return;
  try{ localStorage.setItem("_otaPending", version); }catch(e){}
  try{ window.dispatchEvent(new CustomEvent("mc-ota-ready")); }catch(e){}
};

window._mcSignalOtaReady=function(id, version, opts){
  if(!id||!version) return;
  var silent=opts&&opts.silent;
  var up=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorUpdater;
  window._mcOtaReady={id:id, version:version};
  window.__mcApplyOta=function(){ try{ if(up) up.set({id:id}); }catch(e){} };
  try{ localStorage.setItem("_otaPending", version); }catch(e){}
  try{ window.dispatchEvent(new CustomEvent("mc-ota-ready")); }catch(e){}
  var lastN=null; try{ lastN=localStorage.getItem("_otaNotifVer"); }catch(e){}
  if(!silent&&lastN!==version){
    try{ localStorage.setItem("_otaNotifVer", version); }catch(e){}
    window._mcNotifyUpdate(version, "ota");
  }
};

window._mcRestoreOtaPending=function(){
  try{
    var pend=localStorage.getItem("_otaPending");
    if(!pend||!window._mcNewerVer(pend, CONFIG.APP_VERSION)) return;
    if(window._mcOtaReady&&window._mcOtaReady.id) return;
    var up=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorUpdater;
    if(!up||!up.getNext) return;
    up.getNext().then(function(next){
      // silent:false → si aún no se notificó esta versión, avisa al abrir (antes no avisaba
      // al restaurar y parecía que «solo notifica cuando entro», feedback 2026-07-16).
      if(next&&next.id) window._mcSignalOtaReady(next.id, next.version||pend, {silent:false});
    }).catch(function(){});
  }catch(e){}
};

window._mcDownloadOta=function(up, v, opts){
  var manual=opts&&opts.manual;
  var toast=opts&&opts.showToast;
  // Pill YA mientras descarga (antes solo al terminar → «tarda un montón», 2026-07-16).
  if(!manual) window._mcSignalOtaPending(v.version);
  if(manual&&toast) toast(tf("st_up_applying",{v:v.version}));
  return up.download({url:(v.url||_mcOtaBASE+"bundle.zip"), version:v.version})
    .then(function(b){
      if(manual){
        try{ localStorage.setItem("_otaPending", v.version); }catch(e){}
        return up.set({id:b.id}).then(function(){ return true; });
      }
      return up.next({id:b.id}).then(function(){
        window._mcSignalOtaReady(b.id, v.version, {silent:false});
      }).then(function(){ try{ localStorage.setItem("_otaPending", v.version); }catch(e){} return true; });
    });
};

window._mcCheckOtaUpdates=function(opts){
  if(_mcOtaChecking) return Promise.resolve(false);
  var up=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorUpdater;
  if(!up) return Promise.resolve(false);
  _mcOtaChecking=true;
  var manual=opts&&opts.manual;
  return fetch(_mcOtaBASE+"version.json?ts="+Date.now(),{cache:"no-store"})
    .then(function(r){ return r.json(); })
    .then(function(v){
      if(!v||!v.version) return false;
      if(v.version===CONFIG.APP_VERSION){
        try{ localStorage.removeItem("_otaPending"); localStorage.removeItem("_otaNotifVer"); }catch(e){}
        return false;
      }
      if(!window._mcNewerVer(v.version, CONFIG.APP_VERSION)) return false;
      var pend=null; try{ pend=localStorage.getItem("_otaPending"); }catch(e){}
      if(pend===v.version){
        if(window._mcOtaReady&&window._mcOtaReady.id){
          if(manual&&window.__mcApplyOta) window.__mcApplyOta();
          return true;
        }
        if(up.getNext){
          return up.getNext().then(function(next){
            if(next&&next.id){
              window._mcSignalOtaReady(next.id, v.version, {silent:!manual});
              if(manual&&window.__mcApplyOta) window.__mcApplyOta();
              return true;
            }
            return window._mcDownloadOta(up, v, opts);
          });
        }
      }
      return window._mcDownloadOta(up, v, opts);
    }).catch(function(e){
      if(opts&&opts.showToast) opts.showToast("⚠ "+((e&&e.message)||e));
      return false;
    }).finally(function(){ _mcOtaChecking=false; });
};

window._mcSignalApkUpdate=function(info, silent){
  window._mcApkUpdate=info;
  try{ window.dispatchEvent(new CustomEvent("mc-apk-update")); }catch(e){}
  var lastN=null; try{ lastN=localStorage.getItem("_apkNotifVer"); }catch(e){}
  if(!silent&&lastN!==info.versionName){
    try{ localStorage.setItem("_apkNotifVer", info.versionName); }catch(e){}
    window._mcNotifyUpdate(info.versionName, "apk");
  }
};

window._mcCheckApkUpdate=function(opts){
  var mc=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.MiCartera;
  if(!mc||!mc.appInfo) return Promise.resolve(false);
  var manual=opts&&opts.manual;
  var toast=opts&&opts.showToast;
  var autoInstall=opts&&opts.autoInstall!==false;   // al detectar APK nueva, abre el instalador sola
  return fetch(_mcOtaBASE+"apk.json?ts="+Date.now(),{cache:"no-store"})
    .then(function(r){ return r.json(); })
    .then(function(a){
      if(!a||!a.versionCode||!a.url) return false;
      return mc.appInfo().then(function(info){
        if(!info||!info.versionCode||Number(a.versionCode)<=Number(info.versionCode)) return false;
        var payload={url:a.url, versionName:a.versionName||("v"+a.versionCode)};
        window._mcSignalApkUpdate(payload, !!manual);
        var startInstall=function(){
          if(toast) toast(tf("st_up_apk",{v:payload.versionName}));
          return mc.installApk({url:payload.url}).then(function(r){
            if(r&&r.needsPermission&&toast) toast(t("apk_perm"));
            return true;
          });
        };
        // Manual (Ajustes / deep-link noti) o auto al abrir: mismo camino — Android exige
        // un «Instalar» del sistema, pero ya no hace falta encontrar el pill (familia 2026-07-17).
        if(manual || autoInstall){
          if(manual) return startInstall();
          return new Promise(function(resolve){
            setTimeout(function(){
              startInstall().then(resolve).catch(function(){ resolve(true); });
            }, 900);
          });
        }
        return true;
      });
    }).catch(function(){ return false; });
};

(function(){
  try{
    var up=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorUpdater;
    if(!up) return;
    up.notifyAppReady().catch(function(){});
    window._mcSyncOtaNative();
    window._mcRestoreOtaPending();
    setTimeout(function(){
      window._mcCheckOtaUpdates();
      window._mcCheckApkUpdate();
    }, 120);
  }catch(e){}
})();

if('serviceWorker' in navigator && location.protocol.indexOf('http')===0 && !_mcNative){
  // El SW es stale-while-revalidate: arranque INSTANTÁNEO desde caché y la versión fresca
  // se descarga por detrás. NO forzamos skipWaiting solos (eso causaba el "se abre y se
  // recarga sola"). En su lugar, cuando hay una versión nueva ESPERANDO, avisamos con un
  // botón "Actualizar": SOLO al pulsarlo activamos el SW nuevo y recargamos (control del
  // usuario, sin sorpresas). Si no pulsa, la versión nueva entra sola al siguiente arranque.
  var _mcWaiting=null, _mcReloading=false, _mcUserInitiated=false;
  function _mcSignalUpdate(w){ _mcWaiting=w; try{ window.dispatchEvent(new CustomEvent('mc-sw-update')); }catch(e){} }
  window.__mcApplyUpdate=function(){
    if(!_mcWaiting){ location.reload(); return; }
    _mcUserInitiated=true;
    _mcWaiting.postMessage('skipWaiting');       // el SW en espera hace skipWaiting → controllerchange
  };
  // SOLO recargamos si la actualización la pidió el usuario con el botón. Sin este guard,
  // la PRIMERA instalación del SW (clients.claim) dispara controllerchange y recargaría sola
  // — el viejo bug "se abre y se recarga" (v3.20) que no queremos de vuelta.
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    if(!_mcUserInitiated || _mcReloading) return; _mcReloading=true; location.reload();
  });
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').then(function(reg){
      if(reg.waiting && navigator.serviceWorker.controller) _mcSignalUpdate(reg.waiting);  // ya había una esperando
      reg.addEventListener('updatefound', function(){
        var nw=reg.installing; if(!nw) return;
        nw.addEventListener('statechange', function(){
          // "installed" + ya hay controller = actualización (no es la primera instalación)
          if(nw.state==='installed' && navigator.serviceWorker.controller) _mcSignalUpdate(reg.waiting||nw);
        });
      });
    }).catch(function(){});
  });
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ErrorBoundary,null,React.createElement(App)));
// Tras pintar Resumen: carga Sentry sin pelearse con el arranque (antes bloqueaba ~340 KB).
mcScheduleIdle(function(){ mcLoadSentryDeferred(); }, 1800);
