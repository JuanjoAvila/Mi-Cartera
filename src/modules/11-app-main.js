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
  const [trashHot,setTrashHot]=useState(false);            // papelera resaltada durante el arrastre
  const trashRef=useRef(null);
  const [addTab,setAddTab]=useState(false);                // hoja "añadir pestaña" (botón +)
  const [gotoExp,setGotoExp]=useState(null);               // punto 5: gasto a enfocar al tocar la noti ({amount,merchant,ts})
  const [tourOpen,setTourOpen]=useState(false);            // tour guiado (coach-marks)
  const [toast,setToast]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const [syncStatus,setSyncStatus]=useState({type:"idle",msg:""});

  const set=useCallback((updater)=>{ setStateRaw(prev=>{ const next=typeof updater==="function"?updater(prev):updater; if(next===prev) return prev; const stamped=Object.assign({},next,{_savedAt:Date.now()}); store.set("micartera_v3",stamped); return stamped; }); },[]);
  const showToast=(m)=>{ setToast(m); setTimeout(()=>setToast(null),2200);
    // Telemetría: TODO error que ve el usuario en pantalla viaja a app_events. Antes solo se
    // subían los crashes/errores no capturados — los fallos "domados" (✕/⚠ en un toast, como el
    // permission denied del ingest) eran invisibles para el admin (bug 2026-07-11).
    try{ const s=String(m||""); if(/^[✕⚠✗]/.test(s)) cloud.logEvent('error','TOAST: '+s.slice(0,300)); }catch(e){}
  };
  // Moneda de visualización: convierte todos los importes (en €) a la moneda elegida en Ajustes.
  (function(){ const c=(state.settings&&state.settings.currency)||"EUR"; DISP.sym=c==="USD"?"$":"€"; DISP.k=c==="USD"?((state.fx>0)?1/state.fx:1):1; })();
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
  const BANK_SYNC_THROTTLE=90*60*1000;    // auto: ~cada 1,5h (cap PSD2 desatendido ≈ 4/día; antes 6h se quedaba frío)
  const BANK_FG_MIN=30*60*1000;           // al volver a primer plano: sync si han pasado ≥30 min
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
        return Object.assign({}, r.state, { lastBankSync:Date.now(), hasBankLink: links.length?true:prev.hasBankLink, bankTx: txs });
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
      else if(failed.length && (opts.manual || navigator.onLine!==false)){ showToast("⚠ "+bankLabelOf(failed[0])+": "+t("bank_syncfail")); }
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

  const runBrokerSync=function(){
    if(brokerSyncing.current) return Promise.resolve();
    brokerSyncing.current=true;
    const jobs=[];
    const st=stateRef.current||{};
    // Trade Republic — NO sync automático al boot con APK viejo: un 401 de arranque
    // borraba connected en nativo y pedía OTP otra vez (feedback 2026-07-17). Sync a mano.
    // MyInvestor — Edge Function (funciona en web y en app)
    if(cloud.enabled() && sessionRef.current && Date.now()-(st.lastMiSync||0) >= BROKER_SYNC_THROTTLE){
      jobs.push(cloud.myinvestorStatus().then(function(r){
        if(!(r && r.status==="active")) return;               // caducada → se reconecta a mano
        return cloud.myinvestorSync().then(function(res){
          if(!res || !res.ok || !Array.isArray(res.positions)) return;
          applyBrokerPositions(res.positions, "lastMiSync");
        });
      }).catch(function(){}));
    }
    return Promise.all(jobs).catch(function(){}).then(function(){ brokerSyncing.current=false; });
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
      const st=stateRef.current||{};
      if(st.hasBankLink && Date.now()-(st.lastBankSync||0) >= BANK_FG_MIN){
        mcScheduleIdle(function(){ runBankSync({}); });
      }
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
    if(g==="update|ota"||g.indexOf("update|")===0){
      if(window.__mcApplyOta){ window.__mcApplyOta(); return; }
      if(window.__mcApplyUpdate){ window.__mcApplyUpdate(); return; }
      return;
    }
    if(g==="update|apk"){
      if(window._mcApkUpdate){
        const nat=natPlugin();
        if(nat&&nat.installApk){
          nat.installApk({url:window._mcApkUpdate.url}).catch(function(){});
        }
      }
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

  // CAPA 2 — auto-sync del saldo al abrir: justo tras conectar, o pasado el margen (throttle).
  useEffect(function(){
    if(!uid) return;
    if(bankJustConnected.current){ bankJustConnected.current=false; runBankSync({manual:true}); return; }
    if(!state.hasBankLink) return;   // nadie ha conectado banco en esta cartera → no llamamos a la función
    // CAPA 3: primera vez que hay banco pero aún no se han capturado movimientos (bankTx sin definir)
    // → sincroniza saltándose el throttle, para que la tarjeta de conciliación aparezca sola.
    // Tras el 1er sync, bankTx es un array (aunque vacío) y deja de cumplirse → no se repite.
    if(typeof state.bankTx==="undefined"){ runBankSync({}); return; }
    if(Date.now()-(state.lastBankSync||0) < BANK_SYNC_THROTTLE) return;
    runBankSync({});
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

  // Estado de conexión: la app es offline-first (todo en localStorage); esto solo informa y, al
  // reconectar, sube los cambios hechos sin red. Sin conexión NO se rompe ni se pierde nada.
  const [online,setOnline]=useState(typeof navigator==="undefined" || navigator.onLine!==false);
  const wasOnline=useRef(online);
  // Aviso "hay una versión nueva" (lo dispara el registro del Service Worker cuando queda una esperando)
  const [updateReady,setUpdateReady]=useState(false);
  useEffect(function(){
    const h=function(){
      setUpdateReady(true);
      if(window._mcNotifyUpdate) window._mcNotifyUpdate(null);
    };
    window.addEventListener("mc-sw-update", h);
    return function(){ window.removeEventListener("mc-sw-update", h); };
  },[]);
  // App nativa: cuando el OTA descarga un bundle web nuevo y lo deja listo, volvemos a enseñar
  // el botoncito de arriba «Nueva versión · toca para actualizar» (feedback 2026-07-12: había
  // desaparecido al pasar el OTA a modo silencioso «entra al próximo arranque»). Tocarlo lo
  // estrena al momento (up.set); si no se toca, entra solo en el siguiente arranque igual.
  const [otaReady,setOtaReady]=useState(function(){
    if(window._mcOtaReady&&window._mcOtaReady.id) return true;
    try{
      var p=localStorage.getItem("_otaPending");
      return !!(p&&window._mcNewerVer&&window._mcNewerVer(p, CONFIG.APP_VERSION));
    }catch(e){ return false; }
  });
  useEffect(function(){
    const h=function(){
      // Pill si hay bundle listo O si ya hay pending (descargando / listo al próximo arranque).
      if(window._mcOtaReady&&window._mcOtaReady.id){ setOtaReady(true); return; }
      try{
        var p=localStorage.getItem("_otaPending");
        setOtaReady(!!(p&&window._mcNewerVer&&window._mcNewerVer(p, CONFIG.APP_VERSION)));
      }catch(e){ setOtaReady(false); }
    };
    window.addEventListener("mc-ota-ready", h);
    if(window._mcRestoreOtaPending) window._mcRestoreOtaPending();
    var tick=function(){
      if(window._mcCheckOtaUpdates) window._mcCheckOtaUpdates();
      if(window._mcCheckApkUpdate) window._mcCheckApkUpdate();
    };
    setTimeout(tick, 150);
    var onVis=function(){ if(document.visibilityState==="visible") tick(); };
    document.addEventListener("visibilitychange", onVis);
    var iv=setInterval(tick, 30*60*1000);
    return function(){
      window.removeEventListener("mc-ota-ready", h);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(iv);
    };
  },[]);
  // Ajustes › "Personalizar widgets del Resumen": salta a la pestaña Resumen (Dashboard
  // enciende su modo edición con el mismo evento).
  useEffect(function(){
    const h=function(){ const i=tabOrderOf(stateRef.current).indexOf("dash"); if(i>=0) setTab(i); };
    window.addEventListener("mc-dash-edit",h);
    return function(){ window.removeEventListener("mc-dash-edit",h); };
  },[]);
  useEffect(function(){
    const h=function(){ setDrawerOpen(true); };
    window.addEventListener("mc-open-settings",h);
    return function(){ window.removeEventListener("mc-open-settings",h); };
  },[]);
  // Aviso "hay APK nuevo" (solo app nativa; lo dispara el chequeo de apk.json del bloque OTA).
  // Al tocar: MiCartera.installApk descarga y abre el instalador — actualización SIN cable.
  const [apkUpd,setApkUpd]=useState(window._mcApkUpdate||null);
  useEffect(function(){
    const h=function(){ setApkUpd(window._mcApkUpdate||null); };
    window.addEventListener("mc-apk-update", h);
    return function(){ window.removeEventListener("mc-apk-update", h); };
  },[]);
  const doApkInstall=function(){
    const nat=natPlugin();
    if(!nat||!nat.installApk||!apkUpd) return;
    showToast(t("apk_downloading"));
    nat.installApk({url:apkUpd.url}).then(function(r){
      if(r&&r.needsPermission){ showToast(t("apk_perm")); return; }   // Android abrió el ajuste; reintocar el botón
      // ok: el instalador del sistema se abre solo encima de la app
    }).catch(function(e){ showToast("⚠ "+((e&&e.message)||e)); });
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
      appShellRef.current.style.setProperty("--set-p", String(v));
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
  const setProfileProgress=function(p){
    const v=Math.min(1,Math.max(0,p));
    if(appShellRef.current){
      appShellRef.current.style.setProperty("--prof-p", String(v));
      if(v>0.02) appShellRef.current.classList.add("profile-dim");
      else appShellRef.current.classList.remove("profile-dim");
    }
    const dim=document.querySelector(".profile-dim-layer");
    if(dim){
      dim.style.opacity=String(v*0.9);
      if(v>0.02) dim.classList.add("on"); else dim.classList.remove("on");
    }
    try{
      const av=document.querySelector(".v4-avatar");
      if(av){ if(v>0.02) av.classList.add("pulling"); else av.classList.remove("pulling"); }
    }catch(e){}
  };
  useEffect(function(){
    document.documentElement.classList.toggle("profile-open", !!profileOpen);
    if(!dragging.current && gestureMode.current!=="profile"){
      setProfileProgress(profileOpen?1:0);
      if(profileRef.current){
        profileRef.current.classList.toggle("open", !!profileOpen);
        profileRef.current.style.transform="";
      }
    }
    return function(){ document.documentElement.classList.remove("profile-open"); };
  },[profileOpen]);
  const dSX=useRef(0), dSY=useRef(0), dAx=useRef(null), dDrag=useRef(false), dDX=useRef(0), dT=useRef(0);
  const drawerStart=function(e){ const t=e.touches[0]; dSX.current=t.clientX; dSY.current=t.clientY; dAx.current=null; dDrag.current=true; dDX.current=0; dT.current=Date.now(); };
  const drawerMove=function(e){
    if(!dDrag.current) return;
    const t=e.touches[0], ddx=t.clientX-dSX.current, ddy=t.clientY-dSY.current;
    if(dAx.current===null){ if(Math.abs(ddx)<8 && Math.abs(ddy)<8) return; dAx.current=Math.abs(ddx)>Math.abs(ddy)?"x":"y"; if(dAx.current==="x"&&drawerRef.current){ drawerRef.current.classList.add("dragging"); if(appShellRef.current) appShellRef.current.classList.add("dragging"); } }
    if(dAx.current!=="x") return;
    // Solo cierra tirando a la izquierda (derecha→izquierda). Si tiras a la derecha, no pelea.
    if(ddx>0){ dDX.current=0; if(drawerRef.current) drawerRef.current.style.transform="translate3d(0,0,0)"; setSettingsProgress(1); return; }
    dDX.current=ddx;
    const closeProg=Math.min(1,Math.max(0,(-ddx)/dW()));
    if(drawerRef.current) drawerRef.current.style.transform="translate3d("+(-closeProg*100)+"%,0,0)";
    setSettingsProgress(1-closeProg);
  };
  const drawerEnd=function(){
    if(!dDrag.current) return; dDrag.current=false;
    if(drawerRef.current) drawerRef.current.classList.remove("dragging");
    if(appShellRef.current) appShellRef.current.classList.remove("dragging");
    const dist=dDX.current;
    const dt=Math.max(1,Date.now()-dT.current);
    const vel=dist/dt;
    const closeProg=Math.min(1,Math.max(0,(-dist)/dW()));
    const flick=vel<-0.35 && dist<-24;
    if(drawerRef.current) drawerRef.current.style.transform="";
    setDrawerOpen(!(closeProg>0.35 || flick));
    dAx.current=null;
  };
  // Cerrar perfil tirando HACIA ARRIBA (vuelve por donde entró). Tirar abajo no cierra:
  // antes cerraba empujando hacia abajo y se sentía raro vs Revolut (feedback 2026-07-17).
  const pSX=useRef(0), pSY=useRef(0), pAx=useRef(null), pDrag=useRef(false);
  const profileStart=function(e){ const t=e.touches[0]; pSX.current=t.clientX; pSY.current=t.clientY; pAx.current=null; pDrag.current=true; pDY.current=0; pT.current=Date.now(); };
  const profileMove=function(e){
    if(!pDrag.current) return;
    const t=e.touches[0], ddx=t.clientX-pSX.current, ddy=t.clientY-pSY.current;
    if(pAx.current===null){
      if(Math.abs(ddx)<8 && Math.abs(ddy)<8) return;
      pAx.current=Math.abs(ddy)>Math.abs(ddx)?"y":"x";
      if(pAx.current==="y"&&profileRef.current){
        profileRef.current.classList.add("dragging");
        if(appShellRef.current) appShellRef.current.classList.add("dragging");
      }
    }
    if(pAx.current!=="y") return;
    // Con scroll: primero el contenido; al top, tirar arriba cierra.
    if(profileRef.current && profileRef.current.scrollTop>0){ pDY.current=0; return; }
    if(ddy>=0){ pDY.current=0; if(profileRef.current) profileRef.current.style.transform="translate3d(0,0,0)"; setProfileProgress(1); return; }
    pDY.current=ddy;   // negativo = hacia arriba
    const h=window.innerHeight||700;
    const resist=Math.pow(Math.min(1,Math.max(0,(-ddy)/(h*0.48))),0.88);
    if(profileRef.current) profileRef.current.style.transform="translate3d(0,"+(-resist*100)+"%,0)";
    setProfileProgress(1-resist);
    if(e.cancelable) e.preventDefault();
  };
  const profileEnd=function(){
    if(!pDrag.current) return; pDrag.current=false;
    if(profileRef.current) profileRef.current.classList.remove("dragging");
    if(appShellRef.current) appShellRef.current.classList.remove("dragging");
    if(pAx.current!=="y"){ pAx.current=null; return; }
    const dist=-pDY.current;   // distancia hacia arriba
    const dt=Math.max(1,Date.now()-pT.current);
    const h=window.innerHeight||700;
    const closeProg=Math.min(1,Math.max(0,dist/(h*0.28)));
    const flick=(dist/dt)>0.45 && dist>24;
    if(profileRef.current) profileRef.current.style.transform="";
    setProfileOpen(!(closeProg>0.22 || flick));
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
    fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF").then(function(r){ return r.json(); }).then(function(d){
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
  useEffect(function(){ applyBigText(state.settings&&state.settings.bigText); },[state.settings&&state.settings.bigText]);  // letra grande
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
  useEffect(function(){
    const nat=natPlugin();
    if(!nat || !nat.updateWidget) return;
    const data={ spent:Math.round((totals.thisMonthSpent||0)*100)/100, budget:state.budget||0 };
    if(widgetCash!=null){ data.cash=widgetCash; data.cashLabel=entOf(trAccW.ent).label; }
    try{ nat.updateWidget(data).catch(function(){}); }catch(e){}
  },[totals.thisMonthSpent,state.budget,widgetCash]);
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
  // Recordatorio de recibos gordos (2–3 días antes). Una noti/día máx. por cargo.
  useEffect(function(){
    if(state.onboarded===false||locked||showAuth) return;
    const nat=natPlugin();
    if(!nat||!nat.showNotification) return;
    const today=totals.today||new Date().getDate();
    const cm=totals.curMonth, cy=totals.curYear;
    const minAmt=Math.max(80, (totals.fijosMensual||0)*0.12);
    const ym=cy+"-"+String(cm).padStart(2,"0");
    (state.fixed||[]).forEach(function(e){
      if(!occursIn(e,cm)) return;
      const d=dayIn(e,cm); if(d==null) return;
      if(isPaidIn(e,cm,today)) return;
      const amt=occAmountIn(e,cm)||0;
      if(amt<minAmt) return;
      const daysLeft=d-today;
      if(daysLeft<1||daysLeft>3) return;
      const key="_rc_"+e.id+"_"+ym+"_"+d;
      try{ if(localStorage.getItem(key)==="1") return; localStorage.setItem(key,"1"); }catch(err){}
      try{ nat.showNotification({title:t("rc_title"),body:tf("rc_body",{name:e.name||"?",x:eur0(amt),d:String(d)})}).catch(function(){}); }catch(err){}
    });
  },[state.onboarded,locked,showAuth,state.fixed,totals.today,totals.curMonth]);
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
    prepMountTab(i);
    if(i>0) prepMountId(tabIds[i-1]);
    if(i<tabIds.length-1) prepMountId(tabIds[i+1]);
    React.startTransition(function(){ setTab(i); });
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
    dragging.current=true; axis.current=null; dx.current=0; startT.current=Date.now(); gestureMode.current=null;
    pDY.current=0; pT.current=Date.now();
    startX.current=e.touches?e.touches[0].clientX:e.clientX;
    startY.current=e.touches?e.touches[0].clientY:e.clientY;
    // En Inicio, swipe a la derecha abre Ajustes desde toda la pantalla (no solo el borde).
    // En el resto de tabs, el borde sigue valiendo (feedback 2026-07-17).
    if(tab===0 || startX.current<EDGE_OPEN) setDrawerMounted(true);
    if(tab===0) setProfileMounted(true);
  };
  const onMove=(e)=>{
    if(!dragging.current||drawerOpen||profileOpen) return;
    const x=e.touches?e.touches[0].clientX:e.clientX;
    const y=e.touches?e.touches[0].clientY:e.clientY;
    const ddx=x-startX.current, ddy=y-startY.current;
    if(axis.current===null){
      if(Math.abs(ddx)<10 && Math.abs(ddy)<10) return;
      axis.current = Math.abs(ddx) > Math.abs(ddy)*1.25 ? "x" : "y";
      if(axis.current==="x"){
        // Inicio: cualquier swipe a la derecha = Ajustes. Otras tabs: solo borde izquierdo.
        const openSettings = ddx>0 && (tab===0 || startX.current < EDGE_OPEN);
        if(openSettings){
          gestureMode.current="drawer";
          setDrawerMounted(true);
          if(drawerRef.current) drawerRef.current.classList.add("dragging");
          if(appShellRef.current) appShellRef.current.classList.add("dragging");
        } else {
          gestureMode.current="tab";
          if(trackRef.current) trackRef.current.classList.add("dragging"); revealDots();
        }
      } else if(axis.current==="y" && tab===0 && ddy>0){
        // Pull-down perfil (Revolut): solo Inicio, scrolleado arriba o tirando del avatar.
        const pages=trackRef.current&&trackRef.current.children;
        const pageEl=pages&&pages[tab];
        const atTop=!pageEl||pageEl.scrollTop<=2;
        const fromAv=!!(e.target&&e.target.closest&&e.target.closest(".v4-avatar"));
        if(atTop||fromAv){
          gestureMode.current="profile";
          setProfileMounted(true);
          if(profileRef.current) profileRef.current.classList.add("dragging");
          if(appShellRef.current) appShellRef.current.classList.add("dragging","profile-dim");
        }
      }
    }
    if(axis.current==="y" && gestureMode.current==="profile"){
      const h=window.innerHeight||700;
      // Resistencia (no 1:1): el panel “pesa” un poco, como Revolut.
      const resist=Math.pow(Math.min(1,Math.max(0,ddy/(h*0.55))),0.85);
      pDY.current=ddy;
      if(profileRef.current) profileRef.current.style.transform="translate3d(0,"+(-100+resist*100)+"%,0)";
      setProfileProgress(resist);
      if(e.cancelable) e.preventDefault();
      return;
    }
    if(axis.current!=="x") return;
    dx.current=ddx;
    if(gestureMode.current==="drawer"){
      const prog=Math.min(1,Math.max(0,ddx/drawerW()));
      if(drawerRef.current) drawerRef.current.style.transform="translate3d("+(-100+prog*100)+"%,0,0)";
      setSettingsProgress(prog);
      if(e.cancelable) e.preventDefault();
      return;
    }
    const w=trackRef.current?trackRef.current.offsetWidth:360;
    let off=-tab*100+(dx.current/w)*100;
    if((tab===0&&dx.current>0)||(tab===tabIds.length-1&&dx.current<0)) off=-tab*100+(dx.current/w)*100*0.28;
    if(trackRef.current) trackRef.current.style.transform="translateX("+off+"%)";
    if(dx.current<-24 && tab<tabIds.length-1) prepMountTab(tab+1);
    else if(dx.current>24 && tab>0) prepMountTab(tab-1);
  };
  const onEnd=()=>{
    if(!dragging.current) return; dragging.current=false;
    if(axis.current==="y" && gestureMode.current==="profile"){
      if(profileRef.current) profileRef.current.classList.remove("dragging");
      if(appShellRef.current) appShellRef.current.classList.remove("dragging");
      const h=window.innerHeight||700;
      const dist=pDY.current;
      const dt=Math.max(1,Date.now()-startT.current);
      const open=dist>h*0.16 || ((dist/dt)>0.5 && dist>36);
      if(profileRef.current) profileRef.current.style.transform="";
      setProfileOpen(open);
      setProfileProgress(open?1:0);
      pDY.current=0;
    } else if(axis.current==="x"){
      if(gestureMode.current==="drawer"){
        if(drawerRef.current) drawerRef.current.classList.remove("dragging");
        if(appShellRef.current) appShellRef.current.classList.remove("dragging");
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
    if(appShellRef.current) appShellRef.current.classList.remove("dragging");
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
        requestAnimationFrame(function(){ requestAnimationFrame(function(){ setProfileOpen(true); }); });
      },
      onGoGastos:function(){ const i=tabIds.indexOf("gastos"); if(i>=0) goTab(i); },
      onGoPlan:function(){ const i=tabIds.indexOf("plan"); if(i>=0) goTab(i); }});
    if(id==="gastos") return React.createElement(Expenses,{state:state,set:set,onSync:onSync,syncing:syncing,syncStatus:syncStatus,showToast:showToast,stopSwipe:stopSwipe,cancelSwipe:cancelSwipe,focusExp:gotoExp,clearFocus:function(){ setGotoExp(null); },active:tabIds[tab]==="gastos"});
    if(id==="plan") return React.createElement(PlanTab,{state:state,set:set,totals:totals,showToast:showToast,simple:simple});
    if(id==="cartera") return React.createElement(CarteraTab,{state:state,set:set,totals:totals,fetchPrices:fetchPrices,pricing:pricing,simple:simple});
    return null;
  };

  if(locked) return React.createElement(LockScreen,{onUnlock:function(){ setLocked(false); }});
  if(state.onboarded===false) return React.createElement(React.Fragment,null,
    React.createElement(Onboarding,{set:set, onCloud:(cloud.enabled()?onCloudClick:null), onSignup:(cloud.enabled()?onSignupClick:null)}),
    showAuth && React.createElement(AuthPanel,{session:session,onClose:function(){ setShowAuth(false); setRecovery(false); },showToast:showToast,recovery:recovery,startMode:authStart}),
    toast && React.createElement("div",{className:"toast"},toast)
  );

  return React.createElement("div",{className:"app v4"},
    React.createElement("div",{className:"app-shell",ref:appShellRef},
      React.createElement("div",{className:"viewport",onTouchStart:onStart,onTouchMove:onMove,onTouchEnd:onEnd},
        React.createElement("div",{className:"track",ref:trackRef},
          tabIds.map(function(id,i){
            var live=mountNeighbors ? Math.abs(tab-i)<=1 : (i===tab);
            var show=live||!!mountedTabs[id];
            return React.createElement("div",{className:"page"+(show?" page-live":""),key:id},
              show ? pageFor(id) : null
            );
          })
        )
      ),
      React.createElement("nav",{className:"botnav","aria-label":"Navegación"},
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
      goGastos:function(){ const i=tabIds.indexOf("gastos"); if(i>=0) goTab(i); }}),
    tourOpen && React.createElement(Tour,{onDone:endTour, goTab:goTab, tabIds:tabIds}),
    whatsNew && React.createElement(WhatsNew,{onClose:function(){ setWhatsNew(false); },showToast:showToast,set:set,state:state}),
    monthReportOpen && React.createElement(MonthReportPrompt,{state:state,totals:totals,showToast:showToast,onClose:function(){ setMonthReportOpen(false); }}),
    (updateReady||otaReady) && React.createElement("button",{className:"update-pill",onClick:function(){
      if(otaReady){
        if(window.__mcApplyOta){ window.__mcApplyOta(); return; }
        showToast(t("upd_downloading")); return;
      }
      if(window.__mcApplyUpdate) window.__mcApplyUpdate();
    }}, (otaReady&&!(window._mcOtaReady&&window._mcOtaReady.id))?t("upd_downloading"):t("upd_ready")),
    apkUpd && React.createElement("button",{className:"update-pill",onClick:doApkInstall}, tf("apk_ready",{v:apkUpd.versionName})),
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
      drawerMounted && React.createElement(SettingsPanel,{state:state,set:set,onClose:function(){ setDrawerOpen(false); },showToast:showToast,uid:uid,onBankSync:function(){ return runBankSync({manual:true}); },onTour:openTour,totals:totals,fetchPrices:fetchPrices})
    ),
    React.createElement("div",{className:"profile-dim-layer"+(profileOpen?" on":""),style:profileOpen?{opacity:"0.9"}:undefined,"aria-hidden":"true"}),
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

