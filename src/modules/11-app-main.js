function App(){
  const [state,setStateRaw]=useState(loadState);
  const [tab,setTab]=useState(0);
  // Lazy mount: solo monta pestañas visitadas + vecinas (swipe) → menos trabajo en arranque.
  // mountNeighbors=false al cold start: NO montar Gastos/Fijos en el primer pintado (lag al
  // vaciar apps en Android — vídeo feedback 2026-07-16). Tras idle corto, vecinas OK.
  const [mountedTabs,setMountedTabs]=useState(function(){ return {}; });
  const [mountNeighbors,setMountNeighbors]=useState(false);
  const tabRef=useRef(tab); useEffect(function(){ tabRef.current=tab; });   // pestaña activa (la usa el gesto atrás nativo)
  const [tabOrderState,setTabOrderState]=useState(null);   // orden transitorio mientras arrastras una pestaña
  const tabDrag=useRef(null);
  // Nav inferior que se esconde al bajar y reaparece al subir (estilo Revolut, petición 2026-07-17).
  // navHiddenRef espeja el estado para no re-render en cada píxel de scroll; scrollTab evita que el
  // primer scroll tras cambiar de pestaña (scrollTop distinto) lo lea como un salto y esconda la barra.
  const [navHidden,setNavHidden]=useState(false);
  const navHiddenRef=useRef(false);
  const lastScrollY=useRef(0);
  const scrollTab=useRef(0);
  const revealNav=function(){ if(navHiddenRef.current){ navHiddenRef.current=false; setNavHidden(false); } };
  const onPageScroll=function(e){
    const y=e.currentTarget.scrollTop;
    // Cambió la pestaña (o es la primera lectura): sincroniza sin actuar. Cada .page tiene su propio
    // scrollTop y sin esto pasar de una tab scrolleada a otra escondería la barra de golpe.
    if(scrollTab.current!==tab){ scrollTab.current=tab; lastScrollY.current=y; revealNav(); return; }
    const dy=y-lastScrollY.current;
    lastScrollY.current=y;
    if(y<=8){ revealNav(); return; }                 // arriba del todo → siempre visible
    if(Math.abs(dy)<6) return;                        // micro-scroll/rebote: ni caso
    if(dy>0 && y>56){ if(!navHiddenRef.current){ navHiddenRef.current=true; setNavHidden(true); } }  // bajando → esconder
    else if(dy<0){ revealNav(); }                     // subiendo → mostrar
  };
  const [trashHot,setTrashHot]=useState(false);            // papelera resaltada durante el arrastre
  const trashRef=useRef(null);
  const [addTab,setAddTab]=useState(false);                // hoja "añadir pestaña" (botón +)
  const [gotoExp,setGotoExp]=useState(null);               // punto 5: gasto a enfocar al tocar la noti ({amount,merchant,ts})
  const [planGoto,setPlanGoto]=useState(null);             // segmento de Plan a forzar desde «Ver plan» ({id,ts})
  const [tourOpen,setTourOpen]=useState(false);            // tour guiado (coach-marks)
  const [toast,setToast]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const [syncStatus,setSyncStatus]=useState({type:"idle",msg:""});

  // Persistencia DEBOUNCED (2026-07-18): antes cada set() serializaba TODO el estado a
  // localStorage en el hilo principal (varios cientos de KB) → los micro-tirones esporádicos
  // («a veces se ralentiza, cuando chuta va hiper fluida»). Ahora se escribe como mucho 1 vez
  // cada 400 ms con el último valor, y SIEMPRE se vuelca al esconder/cerrar la app (pagehide +
  // visibilitychange) para no perder nada si Android mata el proceso.
  const persistRef=useRef({t:null,val:null});
  const flushPersist=useCallback(function(){
    const p=persistRef.current;
    if(p.t){ clearTimeout(p.t); p.t=null; }
    if(p.val!=null){ store.set("micartera_v3",p.val); p.val=null; }
  },[]);
  const set=useCallback((updater)=>{ setStateRaw(prev=>{
    const next=typeof updater==="function"?updater(prev):updater;
    if(next===prev) return prev;
    const stamped=Object.assign({},next,{_savedAt:Date.now()});
    const p=persistRef.current;
    p.val=stamped;
    if(!p.t) p.t=setTimeout(function(){ p.t=null; const v=persistRef.current.val; persistRef.current.val=null; if(v!=null) store.set("micartera_v3",v); },400);
    return stamped;
  }); },[]);
  useEffect(function(){
    const onVis=function(){ if(document.visibilityState==="hidden") flushPersist(); };
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("pagehide",flushPersist);
    return function(){
      flushPersist();
      document.removeEventListener("visibilitychange",onVis);
      window.removeEventListener("pagehide",flushPersist);
    };
  },[flushPersist]);
  const showToast=(m)=>{ setToast(m); setTimeout(()=>setToast(null),2200);
    // Telemetría: TODO error que ve el usuario en pantalla viaja a app_events. Antes solo se
    // subían los crashes/errores no capturados — los fallos "domados" (✕/⚠ en un toast, como el
    // permission denied del ingest) eran invisibles para el admin (bug 2026-07-11).
    try{ const s=String(m||""); if(/^[✕⚠✗]/.test(s)) cloud.logEvent('error','TOAST: '+s.slice(0,300)); }catch(e){}
  };
  // Moneda de visualización: convierte todos los importes (en €) a la moneda elegida en Ajustes.
  // GBP/CHF usan fxRates (XXX→EUR, del BCE) — si aún no ha llegado el FX, se queda en € antes
  // que enseñar un número inventado (regla de la casa: nunca inventar un tipo de cambio).
  (function(){
    const c=(state.settings&&state.settings.currency)||"EUR";
    const r=c==="EUR"?1:fxTableOf(state)[c];
    if(c!=="EUR" && r>0){ DISP.sym=CUR_SYM[c]||c; DISP.k=1/r; }
    else { DISP.sym="€"; DISP.k=1; }
  })();
  CURLANG = (state.settings&&state.settings.lang) || "es";   // idioma activo (i18n)
  SIMPLEMODE = !!(state.settings&&state.settings.simpleMode); // modo sencillo → etiquetas sin jerga

  /* ---------- Sincronización en la nube (Supabase) ---------- */
  const [session,setSession]=useState(null);
  const uid = session && session.user ? session.user.id : null;
  const stateRef=useRef(state); useEffect(function(){ stateRef.current=state; });
  const sessionRef=useRef(null);
  const cloudUpdatedAtRef=useRef(null);   // sello del servidor para sync sin pisar otro dispositivo
  const bankSyncing=useRef(false);          // evita syncs de banco solapados
  const bankJustConnected=useRef(false);    // marca la vuelta de ?bank=ok para sincronizar en cuanto haya sesión

  // Trae los gastos de la tabla y los mezcla en el estado (dedup).
  const syncCloudExpenses=function(){
    return cloud.pullExpenses().then(function(rows){
      const keyOf=function(e){ return String(e.date).slice(0,10)+"|"+e.amount+"|"+(e.merchant||""); };
      const delSet={}; (stateRef.current.deleted||[]).forEach(function(k){ delSet[k]=1; });
      const incoming=rows.map(expenseFromRow).filter(function(e){ return e.amount!==0 && !delSet[keyOf(e)]; });
      // La tabla `expenses` es la FUENTE DE VERDAD de los gastos de la nube: se reemplazan los
      // de origen "supabase" con lo que hay en la tabla (refresca categorías, importes y borrados).
      // Los manuales/sheet locales NO se tocan nunca (por eso esto es seguro y no borra datos).
      // Backfill: sube a la tabla TODO gasto local que aún no esté en ella (no solo los manuales).
      // Esto garantiza que la tabla sea la fuente de verdad COMPLETA antes de dejar de duplicar
      // los gastos en app_state (ver slimForCloud). Upsert idempotente (ignoreDuplicates).
      const tableKeys={}; incoming.forEach(function(e){ tableKeys[keyOf(e)]=1; });
      (stateRef.current.expenses||[]).forEach(function(e){ if(e.amount!==0 && !tableKeys[keyOf(e)]) cloud.addExpense(e).catch(function(){}); });
      // "nuevo" = no lo teníamos en NINGÚN origen local (así, ya sincronizado → 0 → "Ya estás al día")
      const prevKeys={}; (stateRef.current.expenses||[]).forEach(function(e){ prevKeys[keyOf(e)]=1; });
      let count=0; const seenC={};
      incoming.forEach(function(e){ const k=keyOf(e); if(!seenC[k]){ seenC[k]=1; if(!prevKeys[k]) count++; } });
      set(function(prev){
        const keep=prev.expenses.filter(function(e){ return e.source!=="supabase"; });
        const keepKeys={}; keep.forEach(function(e){ keepKeys[keyOf(e)]=1; });
        const seen={}; const add=[];
        incoming.forEach(function(e){ const k=keyOf(e); if(!keepKeys[k] && !seen[k]){ seen[k]=1; add.push(e); } });
        return Object.assign({},prev,{expenses:keep.concat(add),lastSync:Date.now()});
      });
      return { total:incoming.length, nuevos:count };
    });
  };

  // Al iniciar sesión: adopta el estado de la nube (o sube el local la 1ª vez) y trae gastos.
  const syncFromCloud=function(s, opts){
    if(!s || !s.user) return;
    const u=s.user.id;
    const freshLogin=!!(opts&&opts.freshLogin);   // acaba de INICIAR SESIÓN (no un reconecta del mismo user)
    cloud.pullState().then(function(cloudPack){
      const cloudState=cloudPack ? cloudPack.data : null;
      if(cloudPack && cloudPack.updated_at) cloudUpdatedAtRef.current=cloudPack.updated_at;
      if(cloudState && validCloudState(cloudState)){
        // LAST-WRITE-WINS: si lo LOCAL es más reciente (p.ej. cambios hechos sin conexión),
        // NO lo pisamos con la nube vieja; solo unimos los gastos (aditivo). Si la nube es más
        // nueva o igual, adoptamos su estado. Los gastos SIEMPRE se mezclan (nunca se pierden).
        // EXCEPCIÓN CLAVE (fresh login): al INICIAR SESIÓN (móvil nuevo / reinstalado) la nube es la
        // verdad SIEMPRE. Sin esto, una cartera vacía recién creada podía "ganar" y machacar la nube.
        set(function(prev){
          const merged=mergeExpenses(prev.expenses, cloudState.expenses||[]);
          const localNewer=!freshLogin && (prev._savedAt||0) > (cloudState._savedAt||0);
          const baseObj = localNewer ? Object.assign({},prev,{expenses:merged.list})
                                     : Object.assign({},prev,cloudState,{expenses:merged.list});
          // Usuario que ya tenía cartera en la nube: no repetir onboarding en otro dispositivo.
          if(freshLogin && (cloudState.accounts||[]).length) baseObj.onboarded=true;
          if(freshLogin && ((cloudState.accounts||[]).length || (cloudState.monthStartNet||0)>0)) baseObj.setupHint=false;
          return seedFlows(fixRevoDupes(fixInvAuto(fixInvSold(reconcileTR(baseObj)))));
        });
      } else if(cloudState){
        // llegó algo pero con forma inválida (corrupto/parcial) → NO machacar lo local; resube lo bueno
        showToast("⚠ Nube con formato inesperado: se conservan tus datos locales");
        return cloud.pushState(u, slimForCloud(stateRef.current), cloudUpdatedAtRef.current).then(function(r){
          if(r && r.updated_at) cloudUpdatedAtRef.current=r.updated_at;
        });
      } else { return cloud.pushState(u, slimForCloud(stateRef.current), cloudUpdatedAtRef.current).then(function(r){
          if(r && r.updated_at) cloudUpdatedAtRef.current=r.updated_at;
        }); }   // primera vez: sube lo que ya tienes
    }).then(function(){ return syncCloudExpenses(); })
      .catch(function(e){ if(navigator.onLine!==false) showToast("✕ Nube: "+((e&&e.message)||e)); });   // si estás sin conexión, ni avisamos (es normal)
  };

  // CAPA 2 — Open Banking: lee el saldo del banco y re-ancla el motor (= editar el saldo a mano,
  // pero con el número real). opts.manual = avisa siempre (botón "Actualizar saldo").
  // (Los throttles de auto-sync BANK_SYNC_THROTTLE/BANK_FG_MIN se retiraron el 2026-07-18
  //  junto con el propio auto-sync: el banco solo se consulta a demanda.)
  const runBankSync=function(opts){
    opts=opts||{};
    if(!cloud.enabled() || !sessionRef.current || bankSyncing.current) return Promise.resolve();
    bankSyncing.current=true;
    return cloud.bankSync().then(function(res){
      const links=(res&&res.links)||[];
      // Telemetría (caso CaixaBank 2026-07-11): banco que sincroniza «bien» (ok!==false) pero no
      // trae NINGUNA cuenta con saldo utilizable → invisible para el usuario (ni rol ni patrimonio).
      // Se canta a app_events con el detalle por cuenta para poder diagnosticarlo desde Actividad.
      try{
        links.forEach(function(l){
          if(!l || l.ok===false) return;
          const accs=Array.isArray(l.accounts)?l.accounts:[];
          const usable=accs.filter(function(a){ return a && a.ok!==false && pickBankBalance(a.balances)!=null; }).length;
          if(accs.length && !usable){
            cloud.logEvent('error','OB '+(l.aspsp||'?')+': sync ok pero sin cuentas con saldo utilizable',
              JSON.stringify(accs.slice(0,6).map(function(a){ return {ok:a&&a.ok, nbal:((a&&a.balances)||[]).length, types:((a&&a.balances)||[]).map(function(b){ return b&&b.type; })}; })));
          }
        });
      }catch(e){}
      const preview=applyBankBalances(stateRef.current, links);   // función pura: solo para decidir el aviso
      let obAdded=[];                                             // compras de tarjeta importadas (roles de cuenta)
      set(function(prev){
        const txs=flattenBankTx(links);
        // ORDEN anti-doble-conteo: primero entran las compras de tarjeta como gastos, y DESPUÉS
        // se re-ancla con el saldo real del banco (que ya incluye esas compras).
        const add=importObExpenses(prev, txs);
        obAdded=add||[];
        const withExp=add? Object.assign({},prev,{expenses:add.concat(prev.expenses||[])}) : prev;
        const r=applyBankBalances(withExp, links);
        // Bancos con permiso CADUCADO → banner «Reconectar» en Cartera (UX padre 2026-07-18:
        // el saldo no cuadraba, le dio a sincronizar, no pasó nada y acabó en la app de TR).
        // Se recalcula entero en cada sync: reconectar un banco lo saca solo.
        const issues=links.filter(function(l){ return l&&l.ok===false&&l.expired; })
          .map(function(l){ return {aspsp:l.aspsp, ent:entFromAspsp(l.aspsp)}; });
        return Object.assign({}, r.state, { lastBankSync:Date.now(), hasBankLink: links.length?true:prev.hasBankLink, bankTx: txs, bankIssues: issues });
      });
      // sube las importadas a la tabla expenses (best-effort; el estado local ya las tiene)
      setTimeout(function(){ obAdded.forEach(function(e){ cloud.addExpense(e).catch(function(){}); }); }, 0);
      if(obAdded.length) showToast(tf("ob_imported",{n:obAdded.length}));
      // Resultado por banco (servidor tolerante a fallos): aplica los que funcionaron y avisa SOLO
      // del que falló. ok===false explícito → fallo (respuestas antiguas sin 'ok' se tratan como ok).
      const bankLabelOf=function(l){ const e=entFromAspsp(l&&l.aspsp); return e?entOf(e).label:((l&&l.aspsp)||"🏦"); };
      const failed=links.filter(function(l){ return l&&l.ok===false; });
      const expired=failed.filter(function(l){ return l&&l.expired; });
      // Saldo del banco: SOLO cuando lo pides tú (opts.manual). Antes también saltaba en cada sync
      // automático al abrir la app («el dinero de los bancos me sale, no me vale para nada»
      // — feedback 2026-07-15): el saldo ya se ve en Patrimonio, no hace falta interrumpir.
      if(preview.synced.length && opts.manual) showToast("🏦 "+entOf(preview.synced[0].ent).label+": "+eur(preview.synced[0].bal));
      if(expired.length){ showToast("⚠ "+bankLabelOf(expired[0])+": "+t("bank_expired_re")); }
      // Fallo NO caducado = hipo transitorio del banco (rate-limit PSD2, 5xx…): el enlace sigue
      // vivo (el servidor ya no lo marca 'expired' por un 403/404), así que no mandamos «reconéctate»
      // — solo un aviso suave y únicamente si lo pediste tú (feedback 2026-07-17: «se caen cada dos
      // por tres» era este falso positivo). En auto-sync nos callamos: se reintenta solo.
      else if(failed.length && opts.manual){ showToast("⚠ "+tf("bank_syncsoft",{bank:bankLabelOf(failed[0])})); }
      else if(!preview.synced.length && !links.length && opts.manual){ showToast(t("bank_none")); }
    }).catch(function(e){
      if(opts.manual || navigator.onLine!==false) showToast("⚠ "+t("bank_syncfail"));
    }).finally(function(){ bankSyncing.current=false; });
  };

  /* ── Auto-refresh de brókers al abrir (petición 2026-07-15: «que se actualicen solos») ──
     SILENCIOSO a propósito y CONSERVADOR: solo re-ancla las posiciones que YA están mapeadas
     (mismo ISIN/ticker). Nunca crea ni borra: lo nuevo se sigue revisando a mano en su tarjeta
     con su previsualización, que es donde tú decides. Sin toasts ni de éxito ni de fallo — si la
     sesión caducó o no hay red, se calla y te enteras al entrar en la tarjeta (que ya lo canta). */
  const BROKER_SYNC_THROTTLE=30*60*1000;   // 30 min: abrir la app 5 veces seguidas no machaca a TR/MI
  const brokerSyncing=useRef(false);

  // Re-ancla contra el bróker las posiciones reconocidas y sella la marca de tiempo.
  const applyBrokerPositions=function(positions, stampKey){
    set(function(s){
      const keyOf=function(p){ return p.isin||p.ticker||p.name; };
      const m={};
      (positions||[]).forEach(function(po){ const sug=brokerSuggest(po, s.investments); if(sug) m[keyOf(po)]=sug; });
      const inv=(s.investments||[]).map(function(i){
        const po=(positions||[]).find(function(p){ return m[keyOf(p)]===i.id; });
        if(!po) return i;
        const patch={};
        if(po.shares!=null) patch.shares=po.shares;
        // el bróker da € (TR/MI); si la posición se muestra en $, se convierte con el cambio del BCE
        if(po.value!=null) patch.value = i.cur==="EUR" ? po.value : fromEurAmt(po.value, i.cur, s);
        if(po.cost!=null)  patch.cost  = i.cur==="EUR" ? po.cost  : fromEurAmt(po.cost,  i.cur, s);
        if(po.isin && !i.isin) patch.isin=po.isin;
        return Object.assign({},i,patch);
      });
      const stamp={}; stamp[stampKey]=Date.now();
      return Object.assign({},s,{investments:inv},stamp);
    });
  };

  // opts.manual = botón «Sincronizar» de Cartera (2026-07-18): además de MyInvestor entra
  // Trade Republic (solo a demanda: el TR de arranque deslogueaba APKs viejos) y se salta el
  // throttle. En automático (al abrir) sigue siendo solo MI, silencioso y con throttle.
  const runBrokerSync=function(opts){
    opts=opts||{};
    if(brokerSyncing.current) return Promise.resolve();
    brokerSyncing.current=true;
    const jobs=[];
    const st=stateRef.current||{};
    let touched=0; const expiredB=[];
    const bridge=(opts.manual && typeof trBridge==="function") ? trBridge() : null;
    if(bridge && bridge.status && bridge.sync){
      jobs.push(Promise.resolve(bridge.status()).then(function(r){
        if(!(r&&r.connected)) return;
        return Promise.resolve(bridge.sync()).then(function(res){
          if(res&&res.authExpired&&!res.softFail&&!res.wafBlocked){ expiredB.push("Trade Republic"); return; }
          if(!res||!res.ok||!Array.isArray(res.positions)) return;   // anti-bot/hipo: silencio, se reintenta luego
          applyBrokerPositions(res.positions, "lastTrSync"); touched++;
        });
      }).catch(function(){}));
    }
    // MyInvestor — Edge Function (funciona en web y en app)
    if(cloud.enabled() && sessionRef.current && (opts.manual || Date.now()-(st.lastMiSync||0) >= BROKER_SYNC_THROTTLE)){
      jobs.push(cloud.myinvestorStatus().then(function(r){
        if(!(r && r.status==="active")) return;               // caducada → se reconecta a mano
        return cloud.myinvestorSync().then(function(res){
          if(res&&res.authExpired){ expiredB.push("MyInvestor"); return; }
          if(!res || !res.ok || !Array.isArray(res.positions)) return;
          applyBrokerPositions(res.positions, "lastMiSync"); touched++;
        });
      }).catch(function(){}));
    }
    return Promise.all(jobs).catch(function(){}).then(function(){
      brokerSyncing.current=false;
      if(opts.manual){
        if(expiredB.length) showToast(tf("v4_sync_broker_exp",{b:expiredB[0]}));
        else if(touched) showToast(t("v4_sync_brokers_ok"));
      }
    });
  };

  // Detecta sesión al cargar y escucha cambios (incluida la vuelta del magic link).
  useEffect(function(){
    if(!cloud.enabled()) return;
    cloud.session().then(function(s){ sessionRef.current=s; setSession(s); if(s) mcScheduleIdle(function(){ syncFromCloud(s); }); });
    cloud.onAuth(function(s, ev){
      const prev=sessionRef.current;
      const changed=(!prev&&s)||(prev&&!s)||(prev&&s&&prev.user.id!==s.user.id);
      sessionRef.current=s; setSession(s);
      // Vuelta del email de recuperación: abre el panel para poner contraseña nueva.
      if(ev==="PASSWORD_RECOVERY"){ setRecovery(true); setShowAuth(true); }
      // changed = pasó de sin-sesión a con-sesión (o cambió de usuario) → es un LOGIN → la nube manda.
      if(changed && s) syncFromCloud(s, {freshLogin:!prev});
    });
  },[]);

  // Empuja el estado a la nube (debounced) cuando cambie y haya sesión. Sin los gastos (ya en su tabla).
  useEffect(function(){
    if(!uid) return;
    const t=setTimeout(function(){
      cloud.pushState(uid, slimForCloud(state), cloudUpdatedAtRef.current).then(function(r){
        if(r && r.conflict){ showToast(t("st_sync_conflict")); syncFromCloud(sessionRef.current); return; }
        if(r && r.updated_at) cloudUpdatedAtRef.current=r.updated_at;
      }).catch(function(){});
    }, 1200);
    return function(){ clearTimeout(t); };
  },[state,uid]);

  // Auto-sincroniza los gastos al volver a primer plano (abrir la app o cambiar de app y volver).
  // THROTTLE: si acabas de sincronizar (<30s) no repetimos el pull+merge de red → evita el "lagazo"
  // al alternar apps rápido (el sync dispara una descarga y un re-render de toda la app).
  // Además: si hay bancos OB y ≥30 min desde lastBankSync → bankSync en idle (gastos de Caixa/etc.).
  const lastVisSync=useRef(0);
  useEffect(function(){
    if(!uid) return;
    const onVis=function(){
      if(document.visibilityState!=="visible") return;
      if(Date.now()-lastVisSync.current < 30000) return;   // ya sincronizado hace nada: no recargues
      lastVisSync.current=Date.now();
      syncCloudExpenses().catch(function(){});
      // (2026-07-18) Aquí había un bankSync automático al volver a primer plano. RETIRADO:
      // cada apertura disparaba una consulta PSD2 desatendida y los bancos (Caixa, Sabadell)
      // acababan tumbando el consentimiento por «uso robótico». Ahora el banco se sincroniza
      // SOLO cuando lo pides: botón «Sincronizar bancos» en Cartera, «Actualizar» en Mis
      // bancos, o la noti del banco (ajuste st_banksync_notif, que sí es un evento real).
      // APK: ping pendiente del listener de notis de banco (si la app estaba en frío).
      const nat=natPlugin();
      if(nat&&nat.consumeBankSyncPing){
        try{ nat.consumeBankSyncPing().then(function(r){
          if(r&&r.ping) mcScheduleIdle(function(){ runBankSync({}); });
        }).catch(function(){}); }catch(e){}
      }
    };
    document.addEventListener("visibilitychange", onVis);
    // Capacitor: appStateChange (más fiable que visibility en algunos Android)
    const A=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;
    let sub=null;
    if(A&&A.addListener){
      try{ sub=A.addListener("appStateChange", function(st){ if(st&&st.isActive) onVis(); }); }catch(e){}
    }
    return function(){
      document.removeEventListener("visibilitychange", onVis);
      try{ if(sub&&sub.remove) sub.remove(); }catch(e){}
    };
  },[uid]);

  // APK alpha22: noti de Caixa/Sabadell/… → evento nativo bankNotif → sync OB (sin parsear importe).
  const lastBankNotifSync=useRef(0);
  useEffect(function(){
    if(!uid) return;
    const nat=natPlugin();
    if(!nat||!nat.addListener) return undefined;
    let h=null;
    const onPing=function(){
      if(!(stateRef.current||{}).hasBankLink) return;
      if(Date.now()-lastBankNotifSync.current < 120000) return;   // debounce web 2 min (nativo ya frena)
      lastBankNotifSync.current=Date.now();
      mcScheduleIdle(function(){ runBankSync({}); });
    };
    try{
      const p=nat.addListener("bankNotif", onPing);
      if(p&&p.then) p.then(function(handle){ h=handle; }).catch(function(){});
      else h=p;
    }catch(e){}
    return function(){ try{ if(h&&h.remove) h.remove(); }catch(e){} };
  },[uid]);

  // PUNTO 5 · Noti → ficha del gasto. Al tocar la notificación de un gasto, la parte nativa deja un
  // "goto" (token) que aquí consumimos: saltamos a la pestaña Gastos y abrimos la ficha del gasto.
  // Token: "exp|<importe>|<comercio>" (o "gastos" a secas). En frío se lee al arrancar; en caliente,
  // al volver a primer plano (visibilitychange). Solo hace algo en la app nativa (natPlugin+consumeGoto).
  const handleGoto=function(g){
    if(!g||typeof g!=="string") return;
    if(g.indexOf("bank|")===0){
      const parts=g.split("|");
      if(parts[1]==="ok"){
        showToast("✓ "+t("bank_connected"));
        set(function(s){ return s.hasBankLink?s:Object.assign({},s,{hasBankLink:true}); });
        runBankSync({manual:true});
      } else {
        const m=parts.slice(2).join("|");
        if(m.indexOf("nolink:")===0){ const nm=m.slice(7), en=entFromAspsp(nm), lbl=en?entOf(en).label:(nm||"🏦"); showToast("⚠ "+lbl+": "+t("bank_nolink")); }
        else showToast("⚠ "+t("bank_error")+(m?": "+m:""));
      }
      return;
    }
    // APK ANTES que el genérico update|: "update|apk".indexOf("update|")===0 y nunca
    // llegaba al instalador (feedback 2026-07-17 — padre/pareja tocaban la noti y no pasaba).
    if(g==="update|apk"){
      const nat=natPlugin();
      const run=function(url){
        if(!nat||!nat.installApk||!url) return;
        showToast(t("apk_downloading"));
        nat.installApk({url:url}).then(function(r){
          if(r&&r.needsPermission) showToast(t("apk_perm"));
        }).catch(function(e){ showToast("⚠ "+((e&&e.message)||e)); });
      };
      if(window._mcApkUpdate&&window._mcApkUpdate.url){
        run(window._mcApkUpdate.url);
        return;
      }
      // Frío: la noti abre la app antes de que el chequeo de apk.json acabe.
      if(window._mcCheckApkUpdate){
        window._mcCheckApkUpdate({manual:true, showToast:showToast}).catch(function(){});
      }
      return;
    }
    if(g==="update|ota"||g.indexOf("update|")===0){
      if(window.__mcApplyOta){ window.__mcApplyOta(); return; }
      if(window.__mcApplyUpdate){ window.__mcApplyUpdate(); return; }
      return;
    }
    if(g==="gastos" || g.indexOf("exp|")===0){
      const gi=tabOrderOf(stateRef.current).indexOf("gastos");
      if(gi>=0) setTab(gi);
      if(g.indexOf("exp|")===0){
        const parts=g.split("|");
        const amount=Math.abs(parseFloat(String(parts[1]||"").replace(',','.'))||0);
        const merchant=parts.slice(2).join("|").trim();   // el comercio podría llevar "|"
        syncCloudExpenses().catch(function(){});   // el gasto de la noti puede no haber bajado aún
        setGotoExp({amount:amount, merchant:merchant, ts:Date.now()});
      }
    }
  };
  useEffect(function(){
    const nat=natPlugin();
    if(!nat || !nat.consumeGoto) return;
    const pull=function(){ try{ nat.consumeGoto().then(function(r){ if(r&&r.goto) handleGoto(r.goto); }).catch(function(){}); }catch(e){} };
    pull();
    const onGoto=function(){ if(document.visibilityState==="visible") pull(); };
    document.addEventListener("visibilitychange", onGoto);
    return function(){ document.removeEventListener("visibilitychange", onGoto); };
  },[]);

  // Copia de seguridad diaria del estado completo en la nube (1×/día, tras asentarse el arranque).
  useEffect(function(){
    if(!uid) return;
    const today=new Date().toISOString().slice(0,10);
    if(state.lastBackup===today) return;
    const tm=setTimeout(function(){
      cloud.backupState(uid, stateRef.current)
        .then(function(){ set(function(s){ return Object.assign({},s,{lastBackup:today}); }); })
        .catch(function(){});   // tabla 0002 sin aplicar u offline → se reintenta otro día
    }, 4000);
    return function(){ clearTimeout(tm); };
  },[uid,state.lastBackup]);

  // CAPA 2 — vuelta del banco (?bank=ok / ?bank=error tras autorizar). Avisa y limpia la URL.
  useEffect(function(){
    if(!cloud.enabled()) return;
    let params=null; try{ params=new URLSearchParams(location.search); }catch(e){}
    const bankParam=params && params.get("bank");
    if(!bankParam) return;
    try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){}   // que no se repita al recargar
    if(bankParam==="ok"){ showToast("✓ "+t("bank_connected")); bankJustConnected.current=true; }
    else if(bankParam==="error"){
      const m=params.get("msg")||"";
      if(m.indexOf("nolink:")===0){   // autorizó pero la cuenta no está dada de alta (modo restringido EB) → mensaje accionable
        const nm=m.slice(7), e=entFromAspsp(nm), lbl=e?entOf(e).label:(nm||"🏦");
        showToast("⚠ "+lbl+": "+t("bank_nolink"));
      } else { showToast("⚠ "+t("bank_error")+(m?": "+m:"")); }
    }
  },[]);

  // CAPA 2 — al abrir, el banco YA NO se sincroniza solo (2026-07-18): el sync desatendido en
  // cada apertura hacía que Caixa/Sabadell marcaran el consentimiento como uso robótico y lo
  // caducaran una y otra vez. Quedan solo dos syncs «con motivo»:
  //  · justo tras autorizar un banco (vuelta del ?bank=ok) — lo acabas de pedir tú;
  //  · la primera vez que hay banco sin movimientos capturados (bootstrap de conciliación).
  useEffect(function(){
    if(!uid) return;
    if(bankJustConnected.current){ bankJustConnected.current=false; runBankSync({manual:true}); return; }
    if(!state.hasBankLink) return;   // nadie ha conectado banco en esta cartera → no llamamos a la función
    if(typeof state.bankTx==="undefined"){ runBankSync({}); return; }   // bootstrap: solo 1 vez en la vida del enlace
  },[uid, state.hasBankLink]);

  // Y lo mismo para los brókers que SÍ sincronizan solos (TR nativo + MyInvestor): al abrir,
  // Brokers: sync suave al abrir (solo si ya conectados). Nunca crea posiciones nuevas.
  // TR/MI: authExpired/softFail/waf se callan — no piden OTP/captcha (feedback 2026-07-17).
  useEffect(function(){ if(uid) mcScheduleIdle(function(){ runBrokerSync(); }); },[uid]);

  const [showAuth,setShowAuth]=useState(false);
  const [recovery,setRecovery]=useState(false);
  const [drawerOpen,setDrawerOpen]=useState(false);
  // v4: Ajustes es push a pantalla completa (SPEC §9). drawerMounted = primera apertura.
  const [drawerMounted,setDrawerMounted]=useState(false);
  const [apuntarOpen,setApuntarOpen]=useState(false);
  // Perfil pull-down (Inicio): panel hermano al shell, como Ajustes (feedback 2026-07-17).
  const [profileOpen,setProfileOpen]=useState(false);
  const [profileMounted,setProfileMounted]=useState(false);
  const profileRef=useRef(null);
  const pDY=useRef(0), pT=useRef(0);
  useEffect(function(){ if(drawerOpen) setDrawerMounted(true); },[drawerOpen]);
  useEffect(function(){ if(profileOpen) setProfileMounted(true); },[profileOpen]);
  useBackClose(drawerOpen, function(){ setDrawerOpen(false); });
  useBackClose(profileOpen, function(){ setProfileOpen(false); });
  useEffect(function(){
    try{ window.__mcEmail=(session&&session.user&&session.user.email)||""; }catch(e){}
  },[session]);
  useBackClose(addTab, function(){ setAddTab(false); });           // gesto atrás: cierra la hoja "añadir pestaña"
  // APK Android: el gesto/botón "atrás". En navegador lo maneja la History API (useBackClose); en la
  // app nativa Capacitor NO enruta el gesto por el historial de la WebView (cierra la Activity y SALE),
  // así que lo capturamos con @capacitor/app: cerramos el overlay de arriba (_mcBackStack) o vamos al
  // Resumen; solo salimos si no hay nada que cerrar y ya estás en el Resumen.
  // (tabRef, sincronizado con la pestaña activa, se declara arriba junto a `tab`.)
  useEffect(function(){
    const A=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;
    if(!A||!A.addListener) return undefined;
    const h=A.addListener("backButton", function(){
      if(_mcBackStack.length){ const top=_mcBackStack.pop(); top._byPop=true; try{ top.close(); }catch(e){} return; }
      if(tabRef.current>0){ setTab(0); return; }
      try{ A.exitApp(); }catch(e){}
    });
    return function(){ try{ Promise.resolve(h).then(function(x){ x&&x.remove&&x.remove(); }); }catch(e){} };
  },[]);
  const [locked,setLocked]=useState(function(){ return bio.enabled(); });
  // Premonta Settings/Perfil en idle: la 1ª vez que arrastras salía el panel negro vacío
  // (contenido solo al soltar — feedback 2026-07-18). El shell cerrado no se ve.
  useEffect(function(){
    if(state.onboarded===false||locked) return undefined;
    var cancelled=false;
    mcScheduleIdle(function(){
      if(cancelled) return;
      setDrawerMounted(true);
      setProfileMounted(true);
    }, 1400);
    return function(){ cancelled=true; };
  },[state.onboarded, locked]);

  // Estado de conexión: la app es offline-first (todo en localStorage); esto solo informa y, al
  // reconectar, sube los cambios hechos sin red. Sin conexión NO se rompe ni se pierde nada.
  const [online,setOnline]=useState(typeof navigator==="undefined" || navigator.onLine!==false);
  const wasOnline=useRef(online);
  // Actualizaciones (SW web + OTA + APK): TODO el estado vive en useUpdates (10-app-components).
  // Antes eran tres efectos sueltos aquí — el «spaghetti» del feedback 2026-07-18.
  const upd=useUpdates();
  // («Personalizar widgets del Resumen» y su evento mc-dash-edit se retiraron el 2026-07-18:
  //  apuntaban al Dashboard v3, que ya no existe en la nav v4.)
  useEffect(function(){
    const h=function(){ setDrawerOpen(true); };
    window.addEventListener("mc-open-settings",h);
    return function(){ window.removeEventListener("mc-open-settings",h); };
  },[]);
  // «Reconectar Trade Republic» desde el banner de Cartera: abre Ajustes YA en Mis bancos
  // (con el teléfono precargado) — sin pasear al usuario por menús (UX padre 2026-07-18).
  const [banksGoto,setBanksGoto]=useState(0);
  useEffect(function(){
    const h=function(){ setDrawerMounted(true); setDrawerOpen(true); setBanksGoto(Date.now()); };
    window.addEventListener("mc-open-banks",h);
    return function(){ window.removeEventListener("mc-open-banks",h); };
  },[]);
  // Banner «Reconectar {banco}» de Cartera: directo a la autorización del banco (vuelve con ?bank=ok).
  const reconnectBank=function(aspsp){
    if(!cloud.enabled()||!sessionRef.current){ showToast(t("bp_need_login")); return; }
    showToast(t("bank_connecting"));
    cloud.bankConnect(aspsp,"ES").then(function(d){ location.href=d.url; })
      .catch(function(e){ showToast("⚠ "+t("bank_error")+": "+((e&&e.message)||e)); });
  };
  useEffect(function(){
    const on=function(){ setOnline(true); }; const off=function(){ setOnline(false); };
    window.addEventListener("online",on); window.addEventListener("offline",off);
    return function(){ window.removeEventListener("online",on); window.removeEventListener("offline",off); };
  },[]);
  useEffect(function(){
    if(online && !wasOnline.current && uid){ cloud.pushState(uid, slimForCloud(stateRef.current), cloudUpdatedAtRef.current).then(function(r){
      if(r && r.conflict){ showToast(t("st_sync_conflict")); syncFromCloud(sessionRef.current); return; }
      if(r && r.updated_at) cloudUpdatedAtRef.current=r.updated_at;
    }).catch(function(){}); }   // reconectó → sube lo de offline
    wasOnline.current=online;
  },[online,uid]);

  // Cajón de Ajustes tipo Revolut: panel full-bleed desde la izquierda; el app se emborrona debajo.
  // El SHELL del panel vive siempre montado (si no, el swipe de borde no tiene ref que mover —
  // feedback 2026-07-17). SettingsPanel (pesado) sí se monta lazy la 1ª vez.
  const drawerRef=useRef(null), appShellRef=useRef(null), gestureMode=useRef(null);
  const dW=function(){ return window.innerWidth||360; };
  const setSettingsProgress=function(p){
    const v=Math.min(1,Math.max(0,p));
    if(appShellRef.current){
      // Solo clase on/off — sin --set-p ni transform en el shell (feedback 2026-07-18).
      if(v>0.02) appShellRef.current.classList.add("settings-dim");
      else appShellRef.current.classList.remove("settings-dim");
    }
  };
  useEffect(function(){
    document.documentElement.classList.toggle("settings-open", !!drawerOpen);
    if(!dragging.current && gestureMode.current!=="drawer"){
      setSettingsProgress(drawerOpen?1:0);
      if(drawerRef.current){
        drawerRef.current.classList.toggle("open", !!drawerOpen);
        drawerRef.current.style.transform="";
      }
    }
    return function(){ document.documentElement.classList.remove("settings-open"); };
  },[drawerOpen]);
  const dimLayerRef=useRef(null);
  const setProfileProgress=function(p){
    const v=Math.min(1,Math.max(0,p));
    if(appShellRef.current){
      if(v>0.02) appShellRef.current.classList.add("profile-dim");
      else appShellRef.current.classList.remove("profile-dim");
    }
    const dim=dimLayerRef.current||document.querySelector(".profile-dim-layer");
    if(dim){
      // Opacidad fija al abrir/cerrar — NUNCA interpolar frame a frame (re-pintaba el fondo).
      dim.style.opacity=v>0.02?"1":"0";
      if(v>0.02) dim.classList.add("on"); else dim.classList.remove("on");
      if(v>0.5) dim.classList.add("blurred"); else dim.classList.remove("blurred");
    }
    try{
      const av=document.querySelector(".v4-avatar");
      if(av){ if(v>0.5) av.classList.add("pulling"); else av.classList.remove("pulling"); }
    }catch(e){}
  };
  const freezeShell=function(on, kind){
    if(!appShellRef.current) return;
    if(on){
      appShellRef.current.classList.add("gesture-freeze","dragging");
      if(kind==="profile") appShellRef.current.classList.add("profile-gesturing");
      // Bloquea scroll de Resumen: si pelea con el pull-down del perfil → lag (feedback 2026-07-18).
      if(kind==="profile" && trackRef.current){
        const pageEl=trackRef.current.children[tabRef.current];
        if(pageEl){
          pageEl.dataset.mcLockY=String(pageEl.scrollTop||0);
          pageEl.style.overflow="hidden";
          pageEl.style.touchAction="none";
        }
      }
    } else {
      appShellRef.current.classList.remove("gesture-freeze","dragging","profile-gesturing");
      if(trackRef.current){
        const pageEl=trackRef.current.children[tabRef.current];
        if(pageEl){
          pageEl.style.overflow="";
          pageEl.style.touchAction="";
          const y=parseFloat(pageEl.dataset.mcLockY);
          if(!isNaN(y)) try{ pageEl.scrollTop=y; }catch(e){}
          delete pageEl.dataset.mcLockY;
        }
      }
    }
  };
  // Ancla la animación del perfil al avatar REAL (vídeo Revolut 2026-07-17): transform-origin en
  // su centro y escala inicial = diámetro del avatar / ancho del panel. Se mide en cada apertura
  // (safe-area, fuente o rotación cambian el rect). offsetWidth/offsetLeft y NO getBoundingClientRect:
  // el panel puede estar ya escalado y el rect vendría transformado.
  const profSetOrigin=function(){
    const el=profileRef.current; if(!el) return;
    try{
      const av=document.querySelector(".v4-avatar"); if(!av) return;
      const a=av.getBoundingClientRect();
      const w=el.offsetWidth||window.innerWidth||360;
      const L=el.offsetLeft||0;   // panel fixed centrado (max-width 520): su borde izquierdo real
      el.style.setProperty("--pp-ox",Math.round(a.left+a.width/2-L)+"px");
      el.style.setProperty("--pp-oy",Math.round(a.top+a.height/2)+"px");
      el.style.setProperty("--pp-s0",String(Math.max(0.06,a.width/Math.max(1,w))));
    }catch(e){}
  };
  const profS0=function(){
    const el=profileRef.current;
    const v=el?parseFloat(el.style.getPropertyValue("--pp-s0")):NaN;
    return isNaN(v)?0.12:v;
  };
  useEffect(function(){
    document.documentElement.classList.toggle("profile-open", !!profileOpen);
    if(!dragging.current && gestureMode.current!=="profile"){
      if(profileOpen) profSetOrigin();   // re-ancla al avatar ANTES de animar (apertura por tap)
      setProfileProgress(profileOpen?1:0);
      if(profileRef.current){
        profileRef.current.classList.toggle("open", !!profileOpen);
        profileRef.current.style.transform="";
        profileRef.current.style.opacity="";
        profileRef.current.style.borderRadius="";
      }
    }
    return function(){ document.documentElement.classList.remove("profile-open"); };
  },[profileOpen]);
  const dSX=useRef(0), dSY=useRef(0), dAx=useRef(null), dDrag=useRef(false), dDX=useRef(0), dT=useRef(0);
  const drawerStart=function(e){ const t=e.touches[0]; dSX.current=t.clientX; dSY.current=t.clientY; dAx.current=null; dDrag.current=true; dDX.current=0; dT.current=Date.now(); };
  const drawerMove=function(e){
    if(!dDrag.current) return;
    const t=e.touches[0], ddx=t.clientX-dSX.current, ddy=t.clientY-dSY.current;
    if(dAx.current===null){ if(Math.abs(ddx)<8 && Math.abs(ddy)<8) return; dAx.current=Math.abs(ddx)>Math.abs(ddy)?"x":"y"; if(dAx.current==="x"&&drawerRef.current){ drawerRef.current.classList.add("dragging"); freezeShell(true,"drawer"); } }
    if(dAx.current!=="x") return;
    // Solo cierra tirando a la izquierda (derecha→izquierda). Si tiras a la derecha, no pelea.
    if(ddx>0){ dDX.current=0; if(drawerRef.current) drawerRef.current.style.transform="translate3d(0,0,0)"; return; }
    dDX.current=ddx;
    const closeProg=Math.min(1,Math.max(0,(-ddx)/dW()));
    if(drawerRef.current) drawerRef.current.style.transform="translate3d("+(-closeProg*100)+"%,0,0)";
  };
  const drawerEnd=function(){
    if(!dDrag.current) return; dDrag.current=false;
    if(drawerRef.current) drawerRef.current.classList.remove("dragging");
    freezeShell(false);
    const dist=dDX.current;
    const dt=Math.max(1,Date.now()-dT.current);
    const vel=dist/dt;
    const closeProg=Math.min(1,Math.max(0,(-dist)/dW()));
    const flick=vel<-0.35 && dist<-24;
    if(drawerRef.current) drawerRef.current.style.transform="";
    setDrawerOpen(!(closeProg>0.35 || flick));
    setSettingsProgress(!(closeProg>0.35 || flick)?1:0);
    dAx.current=null;
  };
  // Cerrar perfil tirando ABAJO (arriba→abajo): misma escala al avatar en reversa.
  // Abrir ya es pull-down desde Inicio; cerrar «tira hacia atrás» el mismo gesto (feedback 2026-07-17).
  const pSX=useRef(0), pSY=useRef(0), pAx=useRef(null), pDrag=useRef(false);
  const profileStart=function(e){ const t=e.touches[0]; pSX.current=t.clientX; pSY.current=t.clientY; pAx.current=null; pDrag.current=true; pDY.current=0; pT.current=Date.now(); };
  const profileMove=function(e){
    if(!pDrag.current) return;
    const t=e.touches[0], ddx=t.clientX-pSX.current, ddy=t.clientY-pSY.current;
    if(pAx.current===null){
      if(Math.abs(ddx)<8 && Math.abs(ddy)<8) return;
      pAx.current=Math.abs(ddy)>Math.abs(ddx)?"y":"x";
      if(pAx.current==="y"&&profileRef.current){
        profSetOrigin();
        profileRef.current.classList.add("dragging");
        freezeShell(true,"profile");
        // Velo fijo una sola vez — sin interpolar opacidad por frame.
        const dim=dimLayerRef.current;
        if(dim){ dim.style.opacity="1"; dim.classList.add("on"); dim.classList.remove("blurred"); }
      }
    }
    if(pAx.current!=="y") return;
    if(profileRef.current && profileRef.current.scrollTop>0){
      pDY.current=0;
      profileRef.current.style.transform=""; profileRef.current.style.opacity=""; profileRef.current.style.borderRadius="";
      return;
    }
    if(ddy<=0){ pDY.current=0; if(profileRef.current){ profileRef.current.style.transform="scale(1)"; profileRef.current.style.opacity="1"; } return; }
    pDY.current=ddy;
    const h=window.innerHeight||700;
    const resist=Math.pow(Math.min(1,Math.max(0,ddy/(h*0.48))),0.88);
    const s0c=profS0(), sc=1-(1-s0c)*resist;
    if(profileRef.current){
      profileRef.current.style.transform="scale("+sc+")";
      profileRef.current.style.opacity=String(1-resist*0.8);
      profileRef.current.style.borderRadius=Math.round(resist*24)+"px";
    }
    if(e.cancelable) e.preventDefault();
  };
  const profileEnd=function(){
    if(!pDrag.current) return; pDrag.current=false;
    if(profileRef.current) profileRef.current.classList.remove("dragging");
    freezeShell(false);
    if(pAx.current!=="y"){ pAx.current=null; return; }
    const dist=pDY.current;
    const dt=Math.max(1,Date.now()-pT.current);
    const h=window.innerHeight||700;
    const closeProg=Math.min(1,Math.max(0,dist/(h*0.28)));
    const flick=(dist/dt)>0.45 && dist>24;
    if(profileRef.current){ profileRef.current.style.transform=""; profileRef.current.style.opacity=""; profileRef.current.style.borderRadius=""; }
    const stay=!(closeProg>0.22 || flick);
    setProfileOpen(stay);
    setProfileProgress(stay?1:0);
    pAx.current=null; pDY.current=0;
  };

  const [authStart,setAuthStart]=useState("in");   // modo con el que se abre AuthPanel ("in"/"up")
  const onCloudClick=function(){
    if(!cloud.enabled()){ showToast("Nube no disponible"); return; }
    setAuthStart("in");
    setShowAuth(true);
  };
  const onSignupClick=function(){
    if(!cloud.enabled()){ showToast("Nube no disponible"); return; }
    setAuthStart("up");   // onboarding → "Crear cuenta" directo, sin pasar por el login (punto 5)
    setShowAuth(true);
  };
  const [showDots,setShowDots]=useState(false);
  const dotsTimer=useRef(null);
  const tabbarRef=useRef(null);

  const totals=useMemo(()=>{
    const thisMonthExp=(state.expenses||[]).filter(e=>parseDate(e.date)>=startOfMonth());
    const thisMonthSpent=thisMonthExp.reduce((a,e)=>a+e.amount,0);
    // Efectivo de TR = base del mes + nómina (si ya entró el último día laborable) − gasto del mes.
    // El round-up & saveback (#19) se aplican al CERRAR el mes (reconcileTR), persistidos, para que
    // todas las pestañas lean lo mismo. El mes en curso se muestra como informativo en Inversiones.
    const trAcc=state.accounts.find(a=>a.spendFrom);
    const injTR = (trAcc && nominaYaEntro()) ? accInject(trAcc) : 0;
    // si has puesto un importe a mano (roundupManual/savebackManual) manda ese; si no, se estima de los gastos
    const roundupThisMonth = trAcc ? ((trAcc.roundupManual!=null)?trAcc.roundupManual:roundupOf(thisMonthExp, trAcc.roundup||0)) : 0;
    const savebackThisMonth = trAcc ? ((trAcc.savebackManual!=null)?trAcc.savebackManual:(trAcc.saveback?savebackOf(thisMonthExp):0)) : 0;
    // Aporte periódico a inversión (plan de ahorro TR, p.ej. 50€/mes al FTSE): sale del efectivo
    // y compra participaciones. Igual que el round-up, se muestra restado en vivo y se persiste al cerrar mes.
    const monthlyInvestThisMonth = trAcc ? (trAcc.monthlyInvest||0) : 0;
    const trRewardsTotal = state.trRewardsTotal||0;
    const curMonth=new Date().getMonth()+1;
    const curYear=new Date().getFullYear();
    const today=new Date().getDate();                    // día de hoy (para separar pagado/pendiente)
    // SALDO DINÁMICO: cada banco = base (inicio de mes) + movimientos YA ocurridos este mes
    // (ingresos/nómina/bizums − fijos − cuotas − puntuales − transfers). El de gasto (TR) usa su inyección.
    const paidNetByBank={};
    state.accounts.forEach(function(a){ if(accFixed(a)) paidNetByBank[a.ent]=(paidNetByBank[a.ent]||0)+monthNetForAccount(state,a.ent,curYear,curMonth,today); });
    // el round-up y el aporte periódico del mes ya salieron del efectivo de gasto (TR) hacia la inversión (en tránsito)
    const dynBal=function(a){
      if(!accDaily(a)) return (a.value||0)+(paidNetByBank[a.ent]||0);
      let v=a.value+injTR-thisMonthSpent-roundupThisMonth-monthlyInvestThisMonth;
      if(accRole(a)==="ambos") v+=(paidNetByBank[a.ent]||0);   // una cuenta para todo: también lleva sus fijos/nómina
      return v;
    };
    // cuentas extra de Open Banking (2ª cuenta de un banco, compartidas…): saldo puro, suma al líquido
    const obLiquid=(state.obAccounts||[]).reduce((a,o)=> a + toEurAmt(o.value||0, o.cur||"EUR", state), 0);
    const liquid=state.accounts.reduce((a,i)=> a + dynBal(i), 0) + obLiquid;
    const investedBase=state.investments.reduce((a,i)=>a+invValueEur(i, state),0);
    const investedCost=state.investments.reduce((a,i)=>a+invCostEur(i, state),0);
    const invested=investedBase + roundupThisMonth + savebackThisMonth + monthlyInvestThisMonth;
    const assetsTotal=state.assets.reduce((a,i)=>a+i.value,0);
    const debtTotal=state.debts.reduce((a,d)=>a+debtBalance(d),0);   // saldo proyectado (baja solo cada mes)
    const activos=liquid+invested+assetsTotal;
    const netWorth=activos-debtTotal;
    const delta=netWorth-state.monthStartNet;
    const deltaPct=state.monthStartNet?delta/state.monthStartNet*100:0;
    const fijosVar=state.fixed.reduce((a,e)=>a+e.amount*(FREQ_M[e.freq]||1),0);
    const cuotas=state.debts.reduce((a,d)=>a+(debtActive(d)?(d.monthly||0):0),0);
    const fijosMensual=fijosVar+cuotas;
    const ahorroMensual=state.aportaciones.reduce((a,x)=>a+x.amount,0);
    // --- MOTOR DINÁMICO: cargos de fijos que tocan ESTE mes, por banco ---
    const fijosEsteMes=state.fixed.reduce((a,e)=> occursIn(e,curMonth) ? a+occAmountIn(e,curMonth) : a, 0);
    const cargosMes=fijosEsteMes+cuotas;                 // fijos del mes + cuotas de deuda (todos los bancos)
    // saldo disponible por banco (la cuenta de gasto descuenta el gasto del mes)
    const bankBal={};
    state.accounts.forEach(a=>{ bankBal[a.ent]=(bankBal[a.ent]||0)+dynBal(a); });
    // cargos del mes por banco, separando lo YA PAGADO (día ya pasado) de lo PENDIENTE.
    // El saldo del banco ya refleja lo pagado; para "lo que te queda" solo cuenta lo pendiente.
    const chargesByBank={}, pendingByBank={};
    let paidThisMonth=0, pendingThisMonth=0;
    const acc=(amt,bank,paid)=>{ chargesByBank[bank]=(chargesByBank[bank]||0)+amt;
      if(paid){ paidThisMonth+=amt; }
      else { pendingThisMonth+=amt; pendingByBank[bank]=(pendingByBank[bank]||0)+amt; } };
    state.fixed.forEach(e=>{ if(occursIn(e,curMonth)) acc(occAmountIn(e,curMonth),accOf(e),isPaidIn(e,curMonth,today)); });
    state.debts.forEach(d=>{ if(debtActive(d)) acc((d.monthly||0)+debtBalloonIn(d,curYear,curMonth),d.account||"sabadell",isDebtPaidThisMonth(d,today)); });
    (state.oneoffs||[]).forEach(o=>{ if(oneoffOccurs(o,curYear,curMonth) && (o.amount||0)!==0) acc(o.amount,o.account||"sabadell",isPaidThisMonth(o,today)); });
    // --- CASH-FLOW: ingresos (nómina) y transferencias recurrentes PENDIENTES este mes ---
    // El saldo del banco ya refleja lo que ya ocurrió (día pasado); solo proyectamos lo pendiente.
    const incomeInByBank={}, transferOutByBank={};
    let pendingIncome=0, pendingTransferOut=0;
    (state.flows||[]).forEach(f=>{
      if(!flowOccursIn(f,curMonth,curYear) || flowPaid(f,curYear,curMonth,today)) return;
      const amt=f.amount||0;
      if(f.kind==="income"){ const b=f.to||"sabadell"; incomeInByBank[b]=(incomeInByBank[b]||0)+amt; pendingIncome+=amt; }
      else if(f.kind==="transfer"){ const b=f.from||"sabadell"; transferOutByBank[b]=(transferOutByBank[b]||0)+amt; pendingTransferOut+=amt; }
    });
    // disponible proyectado a fin de mes por banco = saldo + ingresos pend − transfers pend − fijos pend
    const allBanks={}; [bankBal,incomeInByBank,transferOutByBank,pendingByBank].forEach(o=>Object.keys(o).forEach(b=>allBanks[b]=1));
    const projectedByBank={};
    Object.keys(allBanks).forEach(b=>{ projectedByBank[b]=(bankBal[b]||0)+(incomeInByBank[b]||0)-(transferOutByBank[b]||0)-(pendingByBank[b]||0); });
    // --- SIMULACIÓN INTRA-MES: recorre el resto del mes por día y busca el saldo MÍNIMO.
    // Importa el ORDEN: si los fijos se cobran antes de que entre la nómina, puedes quedarte
    // en negativo a mitad de mes aunque a fin de mes cuadres. Sin día: cargos al principio
    // (día 0, peor caso) e ingresos al final (día 99). ---
    const evsByBank={};
    const pushEv=(bank,day,amt)=>{ (evsByBank[bank]=evsByBank[bank]||[]).push({day:day,amt:amt}); };
    state.fixed.forEach(e=>{ if(occursIn(e,curMonth)&&!isPaidIn(e,curMonth,today)) pushEv(accOf(e), dayIn(e,curMonth)||0, -occAmountIn(e,curMonth)); });
    state.debts.forEach(d=>{ if(debtActive(d)&&!isDebtPaidThisMonth(d,today)){ pushEv(d.account||"sabadell", debtChargeDay(d), -d.monthly); const bl=debtBalloonIn(d,curYear,curMonth); if(bl>0) pushEv(d.account||"sabadell", debtChargeDay(d), -bl); } });
    (state.oneoffs||[]).forEach(o=>{ if(oneoffOccurs(o,curYear,curMonth)&&(o.amount||0)!==0&&!isPaidThisMonth(o,today)) pushEv(o.account||"sabadell", o.day||0, -o.amount); });
    (state.flows||[]).forEach(f=>{ if(!flowOccursIn(f,curMonth,curYear)||flowPaid(f,curYear,curMonth,today))return; const dd=flowDay(f,curYear,curMonth); if(f.kind==="income") pushEv(f.to||"sabadell", dd||99, f.amount); else if(f.kind==="transfer") pushEv(f.from||"sabadell", dd||0, -f.amount); });
    const minByBank={}, minDayByBank={};
    Object.keys(allBanks).forEach(b=>{ const evs=(evsByBank[b]||[]).slice().sort((x,y)=>x.day-y.day); let run=bankBal[b]||0, mn=run, md=0; evs.forEach(ev=>{ run+=ev.amt; if(run<mn-0.005){ mn=run; md=ev.day; } }); minByBank[b]=mn; minDayByBank[b]=md; });
    // foco en el banco principal de gastos fijos (Sabadell)
    const mainBank="sabadell";
    const mainBal=bankBal[mainBank]||0;
    const mainCharges=chargesByBank[mainBank]||0;
    const mainPending=pendingByBank[mainBank]||0;
    const mainIncome=incomeInByBank[mainBank]||0;
    const mainTransferOut=transferOutByBank[mainBank]||0;
    const liquidTrasFijos=mainBal-mainPending;           // lo que quedaría tras los fijos PENDIENTES (sin contar nómina/transfers)
    const mainProjected=projectedByBank[mainBank]||0;    // disponible proyectado a fin de mes (con cash-flow)
    const mainMin=minByBank[mainBank]!=null?minByBank[mainBank]:mainBal;   // saldo mínimo del mes (peor momento)
    const mainMinDay=minDayByBank[mainBank]||0;
    // alarma: el saldo mínimo del mes se va a negativo (cubre tanto el bajón intra-mes como no llegar a fin de mes)
    const bankAlerts=Object.keys(minByBank).filter(b=> minByBank[b] < -0.005);
    const sinProgramar=state.fixed.filter(needsMonth).length; // anuales sin mes asignado (nudge)
    return {liquid,invested,investedCost,assetsTotal,debtTotal,activos,netWorth,delta,deltaPct,thisMonthSpent,injTR,fijosMensual,ahorroMensual,cargosMes,fijosEsteMes,liquidTrasFijos,curMonth,curYear,today,sinProgramar,bankBal,chargesByBank,pendingByBank,paidThisMonth,pendingThisMonth,mainBank,mainBal,mainCharges,mainPending,bankAlerts,incomeInByBank,transferOutByBank,pendingIncome,pendingTransferOut,projectedByBank,mainIncome,mainTransferOut,mainProjected,minByBank,minDayByBank,mainMin,mainMinDay,roundupThisMonth,savebackThisMonth,monthlyInvestThisMonth,trRewardsTotal,paidNetByBank};
  },[state]);

  const [pricing,setPricing]=useState(false);
  // Cambio USD→EUR dinámico (tipos de referencia del BCE vía frankfurter.app, gratis y sin key).
  const refreshFx=function(){
    fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,JPY,CAD,AUD,CNY,MXN,SEK,NOK,DKK,PLN,BRL,INR").then(function(r){ return r.json(); }).then(function(d){
      const rates=d&&d.rates;
      if(!rates) return;
      const fxRates={};
      for(const c in rates){ if(rates[c]>0) fxRates[c]=+(1/rates[c]).toFixed(6); }   // XXX→EUR
      const usd=fxRates.USD;
      set(function(s){
        const prev=fxTableOf(s);
        let changed=false;
        for(const k in fxRates){ if(Math.abs((prev[k]||0)-fxRates[k])>=0.000001){ changed=true; break; } }
        if(!changed && (usd==null || Math.abs((s.fx||0)-(usd||0))<0.0001)) return s;
        const patch={fxRates:fxRates};
        if(usd>0) patch.fx=+(usd.toFixed(4));
        return Object.assign({},s,patch);
      });
    }).catch(function(){});
  };
  useEffect(function(){ mcScheduleIdle(refreshFx, 4000); },[]);   // FX tras primer pintado
  useEffect(function(){ applyTheme(state.settings&&state.settings.theme); },[state.settings&&state.settings.theme]);  // tema de color
  // Accesibilidad + temática de temporada: tamaño de letra, reducir animaciones, contraste, estación.
  useEffect(function(){ applyTextSize(textSizeOf(state)); },[state.settings&&state.settings.textSize, state.settings&&state.settings.bigText]);
  useEffect(function(){ applyReduceMotion(!!(state.settings&&state.settings.reduceMotion)); },[state.settings&&state.settings.reduceMotion]);
  useEffect(function(){ applyContrast(!!(state.settings&&state.settings.hiContrast)); },[state.settings&&state.settings.hiContrast]);
  useEffect(function(){ applySeason(state.settings&&state.settings.season); },[state.settings&&state.settings.season]);
  // App Android: pide el permiso de notificaciones (Android 13+) una sola vez al arrancar.
  useEffect(function(){
    const nat=natPlugin();
    if(nat && nat.ensureNotifPerm){ try{ nat.ensureNotifPerm().catch(function(){}); }catch(e){} }
    // Aviso si el lector de gastos TR perdió el acceso a notificaciones (se pierde al
    // desinstalar/reinstalar y el gasto NO llega — bug Consum 2026-07-06). Arreglo en Ajustes.
    if(nat && nat.notifAccess){ try{ nat.notifAccess().then(function(r){ if(r&&r.granted===false) showToast(t("na_toast")); }).catch(function(){}); }catch(e){} }
  },[]);
  // Telemetría solo-admin: errores no capturados de CUALQUIER usuario → app_events (RLS: solo
  // los lee el admin) + ping 1×/día para saber quién usa la app. Cero datos financieros.
  useEffect(function(){
    const onErr=function(ev){ try{ cloud.logEvent('error', ev.message||'error', ((ev.error&&ev.error.stack)||String(ev.filename||'')+':'+(ev.lineno||'')) ); }catch(e){} };
    const onRej=function(ev){ try{ const r=ev.reason; cloud.logEvent('error', 'Promise: '+(((r&&r.message)||String(r))).slice(0,300), r&&r.stack); }catch(e){} };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return function(){ window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  },[]);
  useEffect(function(){
    if(!uid) return;
    const today=new Date().toISOString().slice(0,10);
    try{
      if(localStorage.getItem("_evPing")===today) return;
      localStorage.setItem("_evPing", today);
    }catch(e){}
    cloud.logEvent('ping','app abierta');
  },[uid]);
  // (Antes aquí saltaba un toast «🐞 N errores nuevos» en CADA apertura. Era telemetría de admin
  // interrumpiendo al usuario por algo que no puede accionar en ese momento — y como el admin usa
  // la app a diario, saltaba constantemente. RETIRADO 2026-07-15: los errores se siguen guardando y
  // se consultan cuando TÚ quieras en Ajustes → Actividad, que ya lleva su contador.)
  // Propaga al lector nativo si debe confirmar cada gasto con una noti (ajuste st_trnotif)
  // y si una noti de banco debe disparar bankSync (alpha22). Se re-envía al arrancar.
  useEffect(function(){
    const nat=natPlugin();
    if(!nat || !nat.setNotifPrefs) return;
    try{ nat.setNotifPrefs({
      expenseConfirm:!(state.settings&&state.settings.trNotifyConfirm===false),
      bankSyncOnNotif:!(state.settings&&state.settings.bankSyncOnNotif===false)
    }).catch(function(){}); }catch(e){}
  },[state.settings&&state.settings.trNotifyConfirm, state.settings&&state.settings.bankSyncOnNotif]);
  // Re-propaga al lector nativo la URL de ingest con el token del usuario (apuntado multiusuario
  // de TR, 0008). Se re-envía al arrancar y al cambiar: una reinstalación pierde las prefs nativas.
  useEffect(function(){
    const nat=natPlugin();
    if(!nat || !nat.setIngestUrl) return;
    const on=!!(state.settings&&state.settings.trIngest);
    const tok=state.settings&&state.settings.ingestToken;
    if(!on || !tok) return;
    const url=CONFIG.SUPABASE_URL+"/functions/v1/ingest?token="+encodeURIComponent(tok);
    try{ nat.setIngestUrl({url:url}).catch(function(){}); }catch(e){}
  },[state.settings&&state.settings.trIngest, state.settings&&state.settings.ingestToken]);
  // App Android: alimenta el widget de pantalla de inicio (gasto del mes + saldo de la cuenta diaria).
  const trAccW=state.accounts.find(function(a){ return a.spendFrom; });
  const widgetCash=trAccW ? Math.round((totals.bankBal[trAccW.ent]||0)*100)/100 : null;
  // «Lo que te puedes permitir» (petición 2026-07-18): lo que puedes gastar SIN pasarte ni quedarte
  // en rojo = mínimo entre lo que te deja el presupuesto y la liquidez segura de la cuenta de gasto
  // (su peor saldo del mes; no puedes gastar lo que no tienes). Nunca negativo.
  const widgetAfford=(function(){
    const budgetLeft = (state.budget>0) ? Math.max(0, state.budget - (totals.thisMonthSpent||0)) : null;
    const dailyEnt = trAccW && trAccW.ent;
    const safeLiq = dailyEnt!=null
      ? Math.max(0, (totals.minByBank && totals.minByBank[dailyEnt]!=null) ? totals.minByBank[dailyEnt] : (totals.bankBal[dailyEnt]||0))
      : null;
    let a = budgetLeft!=null && safeLiq!=null ? Math.min(budgetLeft, safeLiq) : (budgetLeft!=null?budgetLeft:safeLiq);
    return a!=null ? Math.round(a*100)/100 : null;
  })();
  useEffect(function(){
    const nat=natPlugin();
    if(!nat || !nat.updateWidget) return;
    const data={ spent:Math.round((totals.thisMonthSpent||0)*100)/100, budget:state.budget||0 };
    if(widgetCash!=null){ data.cash=widgetCash; data.cashLabel=entOf(trAccW.ent).label; }
    if(widgetAfford!=null) data.afford=widgetAfford;
    try{ nat.updateWidget(data).catch(function(){}); }catch(e){}
  },[totals.thisMonthSpent,state.budget,widgetCash,widgetAfford]);
  // Tour de bienvenida: 1ª vez tras el onboarding (tourSeen=false), con la app ya pintada
  useEffect(function(){
    // No arrancar el tour encima del login (showAuth) ni con el cajón abierto: causaba el caos
    // "tutorial + iniciar sesión a la vez" del primer arranque.
    if(state.tourSeen===false && state.onboarded!==false && !locked && !tourOpen && !showAuth && !drawerOpen){
      const tm=setTimeout(function(){ setTourOpen(true); },700);
      return function(){ clearTimeout(tm); };
    }
  },[state.tourSeen,state.onboarded,locked,showAuth,drawerOpen]);
  const endTour=function(){
    setTourOpen(false);
    if(stateRef.current.tourSeen===false) set(function(s){ return Object.assign({},s,{tourSeen:true}); });
  };
  const openTour=function(){ setDrawerOpen(false); setProfileOpen(false); setTab(0); setTourOpen(true); };
  // ✨ Novedades: al estrenar una versión nueva, popup UNA vez (petición 2026-07-12: la pareja
  // no se entera de qué trae cada update). No en el primer arranque de un usuario nuevo (sella
  // silencioso tras el onboarding), ni encima del login/candado/tour.
  const [whatsNew,setWhatsNew]=useState(false);
  const newsTimer=useRef(null); const newsDone=useRef(false);
  useEffect(function(){
    if(newsDone.current) return;
    // Espera a que la app esté lista (no encima del onboarding/candado/login/tour).
    if(state.onboarded===false || locked || showAuth || tourOpen) return;
    var seen=null; try{ seen=localStorage.getItem("_seenVersion"); }catch(e){}
    if(seen===CONFIG.APP_VERSION){ newsDone.current=true; return; }   // ya vista esta versión
    if(newsTimer.current) return;                                     // ya programado: no reprogramar ni cancelar
    // OJO: NO sellamos aquí ni devolvemos cleanup que mate el timer — un re-render que cambie las
    // deps cancelaría el popup y, al re-entrar ya sellado, no volvería a disparar (bug 2026-07-12).
    // Sellamos al DISPARAR. Los usuarios nuevos ya vienen sellados por el onboarding (finish).
    newsTimer.current=setTimeout(function(){
      newsDone.current=true;
      try{ localStorage.setItem("_seenVersion",CONFIG.APP_VERSION); }catch(e){}
      setWhatsNew(true);
    },420);
  },[state.onboarded,locked,showAuth,tourOpen]);
  // Informe mensual automático el día 1 (prioridad pareja 2026-07-15).
  const [monthReportOpen,setMonthReportOpen]=useState(false);
  useEffect(function(){
    if(state.onboarded===false||locked||showAuth||tourOpen||whatsNew) return;
    const d=new Date();
    if(d.getDate()!==1) return;
    const key="_mr"+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    try{ if(localStorage.getItem(key)==="1") return; }catch(e){}
    const tmr=setTimeout(function(){
      try{ localStorage.setItem(key,"1"); }catch(e){}
      setMonthReportOpen(true);
    },3000);
    return function(){ clearTimeout(tmr); };
  },[state.onboarded,locked,showAuth,tourOpen,whatsNew]);
  // Recordatorio de recibos: TODOS avisan LA VÍSPERA (petición 2026-07-18: «el banco no te
  // avisa, la app podría»); los gordos además con 2–3 días de antelación como hasta ahora.
  // Incluye también las cuotas de deuda. Una noti por cargo y mes.
  useEffect(function(){
    if(state.onboarded===false||locked||showAuth) return;
    const nat=natPlugin();
    if(!nat||!nat.showNotification) return;
    const today=totals.today||new Date().getDate();
    const cm=totals.curMonth, cy=totals.curYear;
    const minAmt=Math.max(80, (totals.fijosMensual||0)*0.12);
    const ym=cy+"-"+String(cm).padStart(2,"0");
    const notify=function(key,title,body){
      try{ if(localStorage.getItem(key)==="1") return; localStorage.setItem(key,"1"); }catch(err){}
      try{ nat.showNotification({title:title,body:body}).catch(function(){}); }catch(err){}
    };
    (state.fixed||[]).forEach(function(e){
      if(!occursIn(e,cm)) return;
      const d=dayIn(e,cm); if(d==null) return;
      if(isPaidIn(e,cm,today)) return;
      const amt=occAmountIn(e,cm)||0;
      if(!(amt>0)) return;
      const daysLeft=d-today;
      if(daysLeft===1){
        notify("_rc1_"+e.id+"_"+ym, t("rc_title_tmrw"), tf("rc_body_tmrw",{name:e.name||"?",x:eur0(amt)}));
      } else if(amt>=minAmt && daysLeft>=2 && daysLeft<=3){
        notify("_rc_"+e.id+"_"+ym+"_"+d, t("rc_title"), tf("rc_body",{name:e.name||"?",x:eur0(amt),d:String(d)}));
      }
    });
    // cuotas de deuda (hipoteca, financiaciones…): también avisan la víspera
    (state.debts||[]).forEach(function(d){
      if(!debtActive(d) || !(d.monthly>0)) return;
      if(isDebtPaidThisMonth(d,today)) return;
      if(debtChargeDay(d)-today!==1) return;
      notify("_rc1_debt_"+d.id+"_"+ym, t("rc_title_tmrw"), tf("rc_body_tmrw",{name:d.name||"?",x:eur0(d.monthly)}));
    });
  },[state.onboarded,locked,showAuth,state.fixed,state.debts,totals.today,totals.curMonth]);

  // Empuja el calendario de recibos del mes al NATIVO (APK ≥29): AlertCheckWorker avisa la
  // víspera aunque la app esté CERRADA. Intercambio de sellos para no avisar dos veces:
  // mandamos lo que la web ya avisó (_rc1_*) y sellamos lo que avisó el nativo.
  useEffect(function(){
    const nat=natPlugin();
    if(!nat||!nat.setAlertData) return;
    const cm=totals.curMonth, cy=totals.curYear;
    const ym=cy+"-"+String(cm).padStart(2,"0");
    const charges=[];
    (state.fixed||[]).forEach(function(e){
      if(!occursIn(e,cm)) return;
      const d=dayIn(e,cm); const amt=occAmountIn(e,cm)||0;
      if(d==null||!(amt>0)) return;
      charges.push({id:String(e.id),name:e.name||"Recibo",amount:+amt.toFixed(2),day:d});
    });
    (state.debts||[]).forEach(function(d){
      if(!debtActive(d)||!(d.monthly>0)) return;
      charges.push({id:"debt_"+d.id,name:d.name||"Cuota",amount:+d.monthly.toFixed(2),day:debtChargeDay(d)});
    });
    const fired=[];
    charges.forEach(function(c){ try{ if(localStorage.getItem("_rc1_"+c.id+"_"+ym)==="1") fired.push(c.id); }catch(e){} });
    try{
      nat.setAlertData({ym:ym,charges:charges,fired:fired}).then(function(r){
        ((r&&r.fired)||[]).forEach(function(id){ try{ localStorage.setItem("_rc1_"+id+"_"+ym,"1"); }catch(e){} });
      }).catch(function(){});
    }catch(e){}
  },[state.fixed,state.debts,totals.curMonth]);

  // Avisos de presupuesto al cruzar 50/80/95/100% (petición 2026-07-18). Una noti por umbral
  // y mes; si al abrir ya vas por el 97%, solo suena el umbral MÁS ALTO (los demás se sellan
  // en silencio para no disparar tres de golpe). Suena también como toast en la app.
  useEffect(function(){
    if(state.onboarded===false||locked) return;
    const bud=state.budget||0; if(!(bud>0)) return;
    const spent=totals.thisMonthSpent||0;
    const pct=spent/bud*100;
    const ym=new Date().toISOString().slice(0,7);
    let fired=false;
    [100,95,80,50].forEach(function(th){
      if(pct<th) return;
      const k="_bn"+th+"_"+ym;
      let seen=true;
      try{ seen=localStorage.getItem(k)==="1"; localStorage.setItem(k,"1"); }catch(e){}
      if(seen||fired) return;
      fired=true;
      const msg=tf("bn_"+th,{x:eur0(spent),b:eur0(bud),p:Math.round(pct)});
      showToast(msg);
      const nat=natPlugin();
      if(nat&&nat.showNotification){ try{ nat.showNotification({title:"Mi Cartera",body:msg}).catch(function(){}); }catch(e){} }
    });
  },[state.onboarded,locked,totals.thisMonthSpent,state.budget]);
  // Snapshot diario del total invertido (€) para el gráfico de evolución (#6). Se actualiza si cambia valor/coste hoy.
  const invSnapRef=useRef("");
  useEffect(function(){
    if(!(totals.invested>0)) return;
    const today=new Date().toISOString().slice(0,10);
    const v=+totals.invested.toFixed(2);
    const c=+(totals.investedCost||0).toFixed(2);
    const key=today+"|"+v+"|"+c;
    if(invSnapRef.current===key) return;
    invSnapRef.current=key;
    set(function(s){
      const h=recordInvSnapshot(s.invHistory, today, v, c);
      return Object.assign({},s,{invHistory:h});
    });
  },[totals.invested, totals.investedCost]);

  // GAMIFICACIÓN: detecta logros nuevos y subidas de nivel → toast/confeti (1ª vez siembra sin avisar).
  useEffect(function(){
    const g=gamifOf(state, totals);
    const stored=state.badges||[];
    const nowUnlocked=g.badges.filter(function(b){return b.unlocked;}).map(function(b){return b.id;});
    const fresh=nowUnlocked.filter(function(id){ return stored.indexOf(id)<0; });
    const seeded=state.gmLevel!=null;
    const levelUp=seeded && g.lvl>state.gmLevel;
    if(!fresh.length && !levelUp && seeded) return;
    set(function(s){ return Object.assign({},s,{badges:Array.from(new Set((s.badges||[]).concat(nowUnlocked))),gmLevel:g.lvl}); });
    if(levelUp){ showToast(tf("gm_levelup",{n:g.lvl+1})); }   // rediseño 1c: subir de nivel = aviso tranquilo, sin confeti (el confeti se reserva a metas)
    else if(fresh.length && seeded){ showToast(tf("gm_badge_new",{x:t("gm_b_"+fresh[0])})); }
  },[state.expenses,state.goals,state.budget,state.trRewardsTotal]);
  const fetchPrices=function(silent){
    refreshFx();   // y también al pulsar "Precios USD"
    const withTicker=state.investments.filter(function(i){ return i.ticker; });
    if(withTicker.length===0){ if(!silent) showToast("No hay tickers configurados"); return Promise.resolve(); }
    if(!(cloud.enabled() && uid)){ if(!silent) showToast("Inicia sesión para actualizar precios"); return Promise.resolve(); }
    if(!silent){ setPricing(true); showToast("Actualizando precios…"); }
    const symbols=Array.from(new Set(withTicker.map(function(i){ return String(i.ticker).toUpperCase(); })));
    return Promise.resolve(cloud.prices(symbols)).then(function(data){
      if(data && data.ok===false) throw new Error(data.error||"el servidor devolvió un error");
      const prices = data && (data.prices||data.quotes||data); // admite {prices:{...}} o {...}
      // si el servidor responde OK pero sin cotizaciones, no es "sin cambios": es un fallo de Finnhub
      if(!prices || Object.keys(prices).length===0){
        if(!silent) showToast("✕ Finnhub no devolvió cotizaciones");
        return;
      }
      // cuántos tickers nuestros llegan con precio válido (se calcula desde el estado actual,
      // no dentro del updater de set() que corre en diferido y dejaría el conteo en 0)
      const matched=state.investments.filter(function(i){
        return i.ticker && i.shares && prices[i.ticker]!=null && parseFloat(prices[i.ticker])>0;
      });
      set(function(prev){
        const inv=prev.investments.map(function(i){
          if(i.ticker && prices[i.ticker]!=null){
            const price=parseFloat(prices[i.ticker]);
            if(price>0 && i.shares){ return Object.assign({},i,{value:+(i.shares*price).toFixed(2)}); }
          }
          return i;
        });
        return Object.assign({},prev,{investments:inv,lastPriceSync:Date.now()});
      });
      if(!silent) showToast(matched.length>0?("✓ "+matched.length+" precios actualizados"):"Sin cambios");
    }).catch(function(err){
      if(!silent) showToast("✕ "+((err&&err.message)?err.message:"No se pudieron traer precios"));
    }).then(function(){ if(!silent) setPricing(false); });
  };

  const onSync=function(){
    if(!(cloud.enabled() && uid)){ setSyncStatus({type:"err",msg:"Inicia sesión para sincronizar"}); showToast("Inicia sesión para sincronizar"); return; }
    setSyncing(true); setSyncStatus({type:"idle",msg:"Conectando con Supabase…"});
    syncCloudExpenses().then(function(r){
      if(r.nuevos>0){ const m="✓ "+r.nuevos+(r.nuevos===1?" gasto nuevo":" gastos nuevos"); setSyncStatus({type:"",msg:m}); showToast(m); }
      else { setSyncStatus({type:"",msg:"Ya estás al día · "+r.total+" gastos en la nube"}); showToast("✓ Ya estás al día"); }
    }).catch(function(e){ setSyncStatus({type:"err",msg:"No se pudo conectar con Supabase: "+((e&&e.message)||e)}); showToast("✕ Error al sincronizar"); }).then(function(){ setSyncing(false); });
  };

  const tabIds = tabOrderState || tabOrderOf(state);
  const prepMountTab=function(i){
    var id=tabIds[i]; if(!id) return;
    setMountedTabs(function(m){ return m[id]? m : Object.assign({},m,{[id]:true}); });
  };
  const prepMountId=function(id){
    if(!id) return;
    setMountedTabs(function(m){ return m[id]? m : Object.assign({},m,{[id]:true}); });
  };
  // startTransition: la animación del track va primero; React monta la pestaña en segundo plano.
  const goTab=function(i){
    if(i<0||i>=tabIds.length||i===tab) return;
    revealNav();   // cambiar de pestaña siempre muestra la barra (petición 2026-07-17)
    prepMountTab(i);
    if(i>0) prepMountId(tabIds[i-1]);
    if(i<tabIds.length-1) prepMountId(tabIds[i+1]);
    React.startTransition(function(){ setTab(i); });
  };
  // «Ver más» desde Resumen: la pestaña destino conserva su scroll y aterrizabas a mitad de
  // Metas/Gastos (feedback 2026-07-18) → estos enlaces resetean el scroll de la página destino.
  const goTabTop=function(i){
    if(i<0) return;
    goTab(i);
    const pg=trackRef.current&&trackRef.current.children&&trackRef.current.children[i];
    if(pg) pg.scrollTop=0;
  };

  /* swipe — distingue eje vertical/horizontal, menos sensible */
  const startX=useRef(0), startY=useRef(0), startT=useRef(0), dx=useRef(0), axis=useRef(null), dragging=useRef(false), trackRef=useRef(null);
  const revealDots=()=>{ setShowDots(true); if(dotsTimer.current) clearTimeout(dotsTimer.current); };
  const hideDotsSoon=()=>{ if(dotsTimer.current) clearTimeout(dotsTimer.current); dotsTimer.current=setTimeout(()=>setShowDots(false),1100); };
  const drawerW=function(){ return window.innerWidth||360; };
  const EDGE_OPEN=52;
  const onStart=(e)=>{
    if(e.touches&&e.touches.length>1) return;
    if(drawerOpen||profileOpen) return;
    // Sheets portaleados desde una tab (editar gasto): el DOM está en body pero el árbol
    // React burbujea hasta aquí — sin esto, scroll de chips mueve las tabs (2026-07-17).
    if(document.documentElement.classList.contains("sheet-open")) return;
    dragging.current=true; axis.current=null; dx.current=0; startT.current=Date.now(); gestureMode.current=null;
    pDY.current=0; pT.current=Date.now();
    startX.current=e.touches?e.touches[0].clientX:e.clientX;
    startY.current=e.touches?e.touches[0].clientY:e.clientY;
    // En Inicio, swipe a la derecha abre Ajustes desde toda la pantalla (no solo el borde).
    // En el resto de tabs, el borde sigue valiendo (feedback 2026-07-17).
    // No montar Settings/Perfil en touchstart: cada toque en Inicio montaba el árbol pesado
    // a mitad de gesto → drag lento a ~3 fps (vídeo 2026-07-18). Contenido al soltar/abrir.
  };
  const onMove=(e)=>{
    if(!dragging.current||drawerOpen||profileOpen) return;
    if(document.documentElement.classList.contains("sheet-open")) return;
    const x=e.touches?e.touches[0].clientX:e.clientX;
    const y=e.touches?e.touches[0].clientY:e.clientY;
    const ddx=x-startX.current, ddy=y-startY.current;
    // Inicio arriba: cortar overscroll/rebote ANTES de fijar eje (vídeo 2026-07-18).
    if(axis.current===null && tab===0 && ddy>0 && Math.abs(ddy)>=Math.abs(ddx)){
      const pages=trackRef.current&&trackRef.current.children;
      const pageEl=pages&&pages[tab];
      if((!pageEl||pageEl.scrollTop<=2) && e.cancelable) e.preventDefault();
    }
    if(axis.current===null){
      if(Math.abs(ddx)<10 && Math.abs(ddy)<10) return;
      axis.current = Math.abs(ddx) > Math.abs(ddy)*1.25 ? "x" : "y";
      if(axis.current==="x"){
        const openSettings = ddx>0 && (tab===0 || startX.current < EDGE_OPEN);
        if(openSettings){
          gestureMode.current="drawer";
          setDrawerMounted(true);   // por si el idle aún no ha premontado (1ª vez sin negro)
          if(drawerRef.current) drawerRef.current.classList.add("dragging");
          freezeShell(true,"drawer");
        } else {
          gestureMode.current="tab";
          if(trackRef.current) trackRef.current.classList.add("dragging"); revealDots();
        }
      } else if(axis.current==="y" && tab===0 && ddy>0){
        const pages=trackRef.current&&trackRef.current.children;
        const pageEl=pages&&pages[tab];
        const atTop=!pageEl||pageEl.scrollTop<=2;
        const fromAv=!!(e.target&&e.target.closest&&e.target.closest(".v4-avatar"));
        if(atTop||fromAv){
          gestureMode.current="profile";
          setProfileMounted(true);
          profSetOrigin();
          if(profileRef.current) profileRef.current.classList.add("dragging");
          freezeShell(true,"profile");
          const dim=dimLayerRef.current;
          if(dim){ dim.style.opacity="1"; dim.classList.add("on"); dim.classList.remove("blurred"); }
        }
      }
    }
    if(axis.current==="y" && gestureMode.current==="profile"){
      const h=window.innerHeight||700;
      const resist=Math.pow(Math.min(1,Math.max(0,ddy/(h*0.55))),0.85);
      pDY.current=ddy;
      const s0o=profS0(), so=s0o+(1-s0o)*resist;
      if(profileRef.current){
        profileRef.current.style.transform="scale("+so+")";
        profileRef.current.style.opacity=String(Math.min(1,resist*3));
        profileRef.current.style.borderRadius=Math.round((1-resist)*24)+"px";
      }
      if(e.cancelable) e.preventDefault();
      return;
    }
    if(axis.current!=="x") return;
    dx.current=ddx;
    if(gestureMode.current==="drawer"){
      const prog=Math.min(1,Math.max(0,ddx/drawerW()));
      if(drawerRef.current) drawerRef.current.style.transform="translate3d("+(-100+prog*100)+"%,0,0)";
      if(e.cancelable) e.preventDefault();
      return;
    }
    const w=trackRef.current?trackRef.current.offsetWidth:360;
    let off=-tab*100+(dx.current/w)*100;
    // Sin rubber-band a la derecha en Inicio (ese gesto es Ajustes) — evitaba el rebote raro.
    if(tab===tabIds.length-1&&dx.current<0) off=-tab*100+(dx.current/w)*100*0.28;
    else if(tab===0&&dx.current>0) off=-tab*100;
    if(trackRef.current) trackRef.current.style.transform="translateX("+off+"%)";
    if(dx.current<-24 && tab<tabIds.length-1) prepMountTab(tab+1);
    else if(dx.current>24 && tab>0) prepMountTab(tab-1);
  };
  const onEnd=()=>{
    if(!dragging.current) return; dragging.current=false;
    if(axis.current==="y" && gestureMode.current==="profile"){
      if(profileRef.current) profileRef.current.classList.remove("dragging");
      freezeShell(false);
      const h=window.innerHeight||700;
      const dist=pDY.current;
      const dt=Math.max(1,Date.now()-startT.current);
      const open=dist>h*0.16 || ((dist/dt)>0.5 && dist>36);
      if(profileRef.current){ profileRef.current.style.transform=""; profileRef.current.style.opacity=""; profileRef.current.style.borderRadius=""; }
      setProfileOpen(open);
      setProfileProgress(open?1:0);
      pDY.current=0;
    } else if(axis.current==="x"){
      if(gestureMode.current==="drawer"){
        if(drawerRef.current) drawerRef.current.classList.remove("dragging");
        freezeShell(false);
        const dw=drawerW(), dist=dx.current, dt=Math.max(1,Date.now()-startT.current);
        const open = dist > dw*0.35 || ((dist/dt)>0.4 && dist>28);
        if(drawerRef.current) drawerRef.current.style.transform="";
        setDrawerOpen(open);
        setSettingsProgress(open?1:0);
      } else {
        if(trackRef.current) trackRef.current.classList.remove("dragging");
        const w=trackRef.current?trackRef.current.offsetWidth:360;
        const dist=dx.current;
        const dt=Math.max(1,Date.now()-startT.current);
        const vel=dist/dt;
        const distTh=Math.max(50, w*0.20);
        const flick=Math.abs(vel)>0.45 && Math.abs(dist)>32;
        let nt=tab;
        if((dist<-distTh || (flick&&dist<0)) && tab<tabIds.length-1) nt=tab+1;
        else if((dist>distTh || (flick&&dist>0)) && tab>0) nt=tab-1;
        if(nt!==tab) goTab(nt);
        else if(trackRef.current) trackRef.current.style.transform="translateX("+(-tab*100)+"%)";
        hideDotsSoon();
      }
    }
    gestureMode.current=null;
    axis.current=null;
  };
  useEffect(()=>{ if(trackRef.current&&!dragging.current) trackRef.current.style.transform="translateX("+(-tab*100)+"%)"; },[tab]);
  /* auto-scroll del tab bar para que la pestaña activa siempre se vea */
  useEffect(()=>{
    const bar=tabbarRef.current; if(!bar) return;
    const btn=bar.children[tab]; if(!btn) return;
    const left = btn.offsetLeft - (bar.clientWidth/2) + (btn.clientWidth/2);
    try{ bar.scrollTo({left:Math.max(0,left),behavior:"smooth"}); }catch(e){ bar.scrollLeft=Math.max(0,left); }
  },[tab]);
  /* ARRASTRE de pestañas por mantener pulsado, RESTAURADO a petición del usuario (2026-07-10;
     se quitó en 3.83 y lo echaba de menos). Convive con Ajustes › «Editar pestañas»: los dos
     escriben settings.tabOrder/tabHidden. Suelta sobre la papelera para ocultar (+ para recuperar). */
  useEffect(function(){
    const bar=tabbarRef.current; if(!bar) return;
    const onTS=function(e){
      const btn=e.target.closest && e.target.closest('[data-ti]'); if(!btn) return;
      const tch=e.touches[0];
      const order=tabOrderOf(stateRef.current);
      // se arrastra la pestaña que TOCAS (no la activa): más natural
      const ti=parseInt(btn.getAttribute('data-ti'),10);
      const d={startX:tch.clientX,startY:tch.clientY,active:false,order:order,activeId:order[ti]||order[tabRef.current],timer:null,overTrash:false};
      d.timer=setTimeout(function(){ d.active=true; bar.classList.add('reordering'); setTab(order.indexOf(d.activeId)); setTabOrderState(d.order.slice()); try{navigator.vibrate&&navigator.vibrate(15);}catch(_){} },380);
      tabDrag.current=d;
    };
    const onTM=function(e){
      const d=tabDrag.current; if(!d) return; const tch=e.touches[0];
      if(!d.active){ if(Math.abs(tch.clientX-d.startX)>10||Math.abs(tch.clientY-d.startY)>10){ clearTimeout(d.timer); tabDrag.current=null; } return; }
      e.preventDefault();
      // ¿está el dedo sobre la papelera? → resáltala y no reordenes
      const tr=trashRef.current;
      if(tr){
        const r=tr.getBoundingClientRect();
        const over = tch.clientX>=r.left-10 && tch.clientX<=r.right+10 && tch.clientY>=r.top-10 && tch.clientY<=r.bottom+10;
        if(over!==d.overTrash){ d.overTrash=over; setTrashHot(over); try{ if(over&&navigator.vibrate) navigator.vibrate(10); }catch(_){} }
        if(over) return;
      }
      const kids=Array.prototype.slice.call(bar.querySelectorAll('[data-ti]'));
      let target=-1,best=1e9;
      kids.forEach(function(k,idx){ const r=k.getBoundingClientRect(); const c=r.left+r.width/2; const dist=Math.abs(c-tch.clientX); if(dist<best){best=dist;target=idx;} });
      if(target<0) return;
      const cur=d.order.indexOf(d.activeId);
      if(target!==cur){ const o=d.order.slice(); o.splice(cur,1); o.splice(target,0,d.activeId); d.order=o; setTabOrderState(o.slice()); setTab(target); }
    };
    const onTE=function(){
      const d=tabDrag.current; if(!d) return; clearTimeout(d.timer);
      if(d.active){
        bar.classList.remove('reordering'); setTrashHot(false);
        if(d.overTrash && d.activeId!=="dash"){
          // soltada en la papelera → se oculta (se recupera cuando quieras con el botón +)
          const id=d.activeId; const fin=d.order.filter(function(x){ return x!==id; });
          set(function(s){
            const hid=tabHiddenOf(s); const nh=hid.indexOf(id)<0?hid.concat([id]):hid;
            return Object.assign({},s,{settings:Object.assign({},s.settings,{tabHidden:nh, tabOrder:fin})});
          });
          setTab(Math.max(0, Math.min(d.order.indexOf(id), fin.length-1)));
          setTabOrderState(null);
          showToast(t("tb_removed"));
        } else {
          if(d.overTrash) showToast(t("tb_nodel"));   // el Resumen es fijo
          const fin=d.order.slice();
          set(function(s){ return Object.assign({},s,{settings:Object.assign({},s.settings,{tabOrder:fin})}); });
          setTab(fin.indexOf(d.activeId)); setTabOrderState(null);
        }
      }
      tabDrag.current=null;
    };
    bar.addEventListener('touchstart',onTS,{passive:true});
    bar.addEventListener('touchmove',onTM,{passive:false});
    bar.addEventListener('touchend',onTE,{passive:true});
    bar.addEventListener('touchcancel',onTE,{passive:true});
    return function(){ bar.removeEventListener('touchstart',onTS); bar.removeEventListener('touchmove',onTM); bar.removeEventListener('touchend',onTE); bar.removeEventListener('touchcancel',onTE); };
    // deps: si la app arranca en el candado o el onboarding, la tabbar aún no existe en el
    // primer montaje y los listeners no se instalarían nunca; al desbloquear se re-ejecuta.
  },[locked, state.onboarded]);
  const stopSwipe={ onTouchStart:(e)=>e.stopPropagation(), onTouchMove:(e)=>e.stopPropagation() };
  // Cancela el gesto de tabs/ajustes a mitad (chips de Gastos: scroll interno sin cambiar de pestaña).
  const cancelSwipe=function(){
    if(!dragging.current) return;
    dragging.current=false; axis.current=null; gestureMode.current=null; dx.current=0;
    if(trackRef.current){ trackRef.current.classList.remove("dragging"); trackRef.current.style.transform="translateX("+(-tab*100)+"%)"; }
    if(drawerRef.current){ drawerRef.current.classList.remove("dragging"); drawerRef.current.style.transform=""; }
    freezeShell(false);
    setSettingsProgress(drawerOpen?1:0);
  };

  useEffect(function(){
    var id=tabIds[tab];
    if(!id) return;
    setMountedTabs(function(m){ return m[id]? m : Object.assign({},m,{[id]:true}); });
  },[tab, tabIds.join("|")]);
  // Tras el primer pintado: NO montar vecinas en auto. Montar ±1 al toque/swipe (prepMountTab)
  // evitaba un segundo hitch a ~900 ms junto con WhatsNew (feedback 2026-07-16).
  useEffect(function(){
    if(state.onboarded===false||locked) return;
    mcScheduleIdle(function(){ setMountNeighbors(true); }, 3200);
  },[state.onboarded, locked]);
  useEffect(function(){ if(tab>tabIds.length-1) setTab(0); },[tabIds.length]);   // modo simple reduce pestañas → no dejar un índice fuera de rango
  // Ocultar bloques por pestaña: publica el estado para CollapsibleCard (que no recibe props
  // de App) y escucha el toggle. settings.cardHidden se sincroniza con la nube como todo.
  window.__mcBlocksEdit = !!(state.settings && state.settings.blocksEdit);
  window.__mcCardHidden = (state.settings && state.settings.cardHidden) || [];
  useEffect(function(){
    const h=function(e){
      const k=e&&e.detail; if(!k) return;
      set(function(s){
        const cur=(s.settings&&s.settings.cardHidden)||[];
        const n=cur.indexOf(k)>=0?cur.filter(function(x){return x!==k;}):cur.concat([k]);
        return Object.assign({},s,{settings:Object.assign({},s.settings,{cardHidden:n})});
      });
    };
    window.addEventListener("mc-card-toggle",h);
    return function(){ window.removeEventListener("mc-card-toggle",h); };
  },[]);
  const TABBYID={}; TABS.forEach(function(tt){ TABBYID[tt.id]=tt; });
  const hiddenTabIds = TABS.map(function(tt){return tt.id;}).filter(function(id){ return tabIds.indexOf(id)<0; });
  const pageFor=function(id){
    const simple=!!(state.settings&&state.settings.simpleMode);
    if(id==="dash") return React.createElement(Dashboard,{state:state,totals:totals,set:set,
      onOpenSettings:function(){ setDrawerOpen(true); },
      onOpenProfile:function(){
        // Montar cerrado un frame y luego abrir: si montas ya con .open no hay animación de entrada.
        setProfileMounted(true);
        requestAnimationFrame(function(){ requestAnimationFrame(function(){ profSetOrigin(); setProfileOpen(true); }); });
      },
      onGoGastos:function(){ const i=tabIds.indexOf("gastos"); if(i>=0) goTabTop(i); },
      onGoPlan:function(seg){ if(seg) setPlanGoto({id:seg,ts:Date.now()}); const i=tabIds.indexOf("plan"); if(i>=0) goTabTop(i); }});
    if(id==="gastos") return React.createElement(Expenses,{state:state,set:set,onSync:onSync,syncing:syncing,syncStatus:syncStatus,showToast:showToast,stopSwipe:stopSwipe,cancelSwipe:cancelSwipe,focusExp:gotoExp,clearFocus:function(){ setGotoExp(null); },active:tabIds[tab]==="gastos"});
    if(id==="plan") return React.createElement(PlanTab,{state:state,set:set,totals:totals,showToast:showToast,simple:simple,gotoSeg:planGoto,clearGoto:function(){ setPlanGoto(null); }});
    // El «Sincronizar» de Cartera actualiza TODO lo conectado: Open Banking + TR + MyInvestor
    // (petición 2026-07-18: «que también sincronice Trade Republic y MyInvestor»).
    if(id==="cartera") return React.createElement(CarteraTab,{state:state,set:set,totals:totals,fetchPrices:fetchPrices,pricing:pricing,simple:simple,onBankSync:function(){ return Promise.all([runBankSync({manual:true}), runBrokerSync({manual:true})]); },onReconnectBank:reconnectBank});
    return null;
  };

  if(locked) return React.createElement(LockScreen,{onUnlock:function(){ setLocked(false); }});
  if(state.onboarded===false) return React.createElement(React.Fragment,null,
    React.createElement(Onboarding,{set:set, onCloud:(cloud.enabled()?onCloudClick:null), onSignup:(cloud.enabled()?onSignupClick:null)}),
    showAuth && React.createElement(AuthPanel,{session:session,onClose:function(){ setShowAuth(false); setRecovery(false); },showToast:showToast,recovery:recovery,startMode:authStart}),
    toast && React.createElement("div",{className:"toast"},toast)
  );

  // Capa ambiental de temporada (emojis cayendo): solo si hay temática y no está «reducir animaciones».
  const season=(state.settings&&state.settings.season)||"";
  const reduceMo=!!(state.settings&&state.settings.reduceMotion);
  const seasonFx=(season && season!=="none" && !reduceMo && SEASON_FX[season])
    ? React.createElement("div",{className:"season-fx","data-season":season,"aria-hidden":"true"},
        SEASON_FX[season].map(function(em,i){
          const left=(i*11+7)%96, dur=(7+(i%4)*2.5), delay=(i*0.9), sz=17+(i%3)*4;
          return React.createElement("span",{key:i,style:{left:left+"vw",fontSize:sz+"px",animationDuration:dur+"s",animationDelay:(-delay)+"s"}}, em);
        }))
    : null;
  return React.createElement("div",{className:"app v4"},
    seasonFx,
    React.createElement("div",{className:"app-shell",ref:appShellRef},
      React.createElement("div",{className:"viewport",onTouchStart:onStart,onTouchMove:onMove,onTouchEnd:onEnd},
        React.createElement("div",{className:"track",ref:trackRef},
          tabIds.map(function(id,i){
            var live=mountNeighbors ? Math.abs(tab-i)<=1 : (i===tab);
            var show=live||!!mountedTabs[id];
            return React.createElement("div",{className:"page"+(show?" page-live":""),key:id,onScroll:onPageScroll},
              show ? pageFor(id) : null
            );
          })
        )
      ),
      React.createElement("nav",{className:"botnav"+(navHidden&&!drawerOpen&&!profileOpen?" botnav-hidden":""),"aria-label":"Navegación"},
        React.createElement("div",{className:"botnav-row"},
          React.createElement("div",{className:"botnav-ind"+(drawerOpen||profileOpen?" hide":""),
            style:{transform:"translateX("+(tab<=1?tab*100:(tab+1)*100)+"%)"}},
            React.createElement("span",null)
          ),
          React.createElement("button",{className:"botnav-tab"+(tab===0&&!drawerOpen&&!profileOpen?" active":""),"data-tour":"inicio",onTouchStart:function(){ prepMountTab(0); },onClick:function(){ setDrawerOpen(false); setProfileOpen(false); goTab(0); }},
            React.createElement(I.home,null), t("tab_dash")),
          React.createElement("button",{className:"botnav-tab"+(tab===1&&!drawerOpen&&!profileOpen?" active":""),"data-tour":"gastos",onTouchStart:function(){ prepMountTab(1); },onClick:function(){ setDrawerOpen(false); setProfileOpen(false); goTab(1); }},
            React.createElement(I.expense,null), t("tab_gastos")),
          React.createElement("div",{className:"botnav-fab-slot"},
            React.createElement("button",{className:"botnav-fab","aria-label":t("v4_apuntar"),"data-tour":"apuntar",onClick:function(){ setApuntarOpen(true); }},
              React.createElement(I.plus,{width:26,height:26,stroke:"currentColor"}))
          ),
          React.createElement("button",{className:"botnav-tab"+(tab===2&&!drawerOpen&&!profileOpen?" active":""),"data-tour":"plan",onTouchStart:function(){ prepMountTab(2); },onClick:function(){ setDrawerOpen(false); setProfileOpen(false); goTab(2); }},
            React.createElement(I.calendar,null), t("tab_plan")),
          React.createElement("button",{className:"botnav-tab"+(tab===3&&!drawerOpen&&!profileOpen?" active":""),"data-tour":"cartera",onTouchStart:function(){ prepMountTab(3); },onClick:function(){ setDrawerOpen(false); setProfileOpen(false); goTab(3); }},
            React.createElement(I.invest,null), t("tab_cartera"))
        )
      )
    ),
    React.createElement(AskHost,null),
    React.createElement(ApuntarSheet,{open:apuntarOpen,onClose:function(){ setApuntarOpen(false); },state:state,set:set,showToast:showToast,
      goGastos:function(){ const i=tabIds.indexOf("gastos"); if(i>=0) goTabTop(i); }}),
    tourOpen && React.createElement(Tour,{onDone:endTour, goTab:goTab, tabIds:tabIds}),
    whatsNew && React.createElement(WhatsNew,{onClose:function(){ setWhatsNew(false); },showToast:showToast,set:set,state:state}),
    monthReportOpen && React.createElement(MonthReportPrompt,{state:state,totals:totals,showToast:showToast,onClose:function(){ setMonthReportOpen(false); }}),
    (upd.updateReady||upd.otaReady) && React.createElement("button",{className:"update-pill",onClick:function(){ upd.applyUpdate(showToast); }},
      (upd.otaReady&&!upd.otaDownloaded)?t("upd_downloading"):t("upd_ready")),
    upd.apkUpd && React.createElement("button",{className:"update-pill",onClick:function(){ upd.installApk(showToast); }}, tf("apk_ready",{v:upd.apkUpd.versionName})),
    !online && React.createElement("div",{className:"offline-pill"}, t("off_pill")),
    toast && React.createElement("div",{className:"toast"},toast),
    showAuth && React.createElement(AuthPanel,{session:session,onClose:function(){ setShowAuth(false); setRecovery(false); },showToast:showToast,recovery:recovery,startMode:authStart}),
    React.createElement("div",{
      className:"settings-push"+(drawerOpen?" open":""),
      ref:drawerRef,
      onTouchStart:drawerOpen?drawerStart:undefined,
      onTouchMove:drawerOpen?drawerMove:undefined,
      onTouchEnd:drawerOpen?drawerEnd:undefined
    },
      React.createElement("div",{className:"settings-push-h"},
        React.createElement("button",{className:"back","aria-label":t("v4_back"),onClick:function(){ setDrawerOpen(false); }},"‹"),
        React.createElement("h1",null, t("settings"))
      ),
      drawerMounted && React.createElement(SettingsPanel,{state:state,set:set,onClose:function(){ setDrawerOpen(false); },showToast:showToast,uid:uid,onBankSync:function(){ return runBankSync({manual:true}); },onTour:openTour,totals:totals,fetchPrices:fetchPrices,goBanks:banksGoto})
    ),
    React.createElement("div",{className:"profile-dim-layer"+(profileOpen?" on":""),ref:dimLayerRef,style:profileOpen?{opacity:"1"}:undefined,"aria-hidden":"true"}),
    React.createElement("div",{
      className:"profile-pull"+(profileOpen?" open":""),
      ref:profileRef,
      onTouchStart:profileOpen?profileStart:undefined,
      onTouchMove:profileOpen?profileMove:undefined,
      onTouchEnd:profileOpen?profileEnd:undefined
    },
      profileMounted && React.createElement(ProfilePanel,{state:state,set:set,
        onClose:function(){ setProfileOpen(false); },
        onOpenSettings:function(){ setProfileOpen(false); setDrawerOpen(true); }})
    )
  );
}

