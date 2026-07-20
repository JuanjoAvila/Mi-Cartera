/* ============================================================
   APP
   ============================================================ */
/* Mini-tutorial por pestaña: la primera vez que se abre una pestaña sale desplegado
   (feedback: «mi pareja no encontraba el lápiz de editar gastos»); al cerrarlo queda un
   botoncito «💡 ¿Cómo va esto?» para releerlo. Estado por pestaña en localStorage. */
const TabCoach=React.memo(function TabCoach({tabId}){
  const tips=t("coach_"+tabId);
  // v2 en roles Gastos/Fijos/Patri: tras aclarar variable vs fijo + filtro banco (2026-07-16)
  // se vuelve a mostrar una vez aunque ya hubieran cerrado el coach antiguo.
  const coachKey="_coach_"+tabId+((tabId==="gastos"||tabId==="fijos"||tabId==="patri")?"_v2":"");
  const [seen,setSeen]=useState(function(){ try{ return localStorage.getItem(coachKey)==="1"; }catch(e){ return true; } });
  const [open,setOpen]=useState(!seen);
  if(!Array.isArray(tips)||!tips.length) return null;
  const dismiss=function(){ try{ localStorage.setItem(coachKey,"1"); }catch(e){} setSeen(true); setOpen(false); };
  if(!open) return React.createElement("button",{className:"coach-pill",onClick:function(){ setOpen(true); }},"💡 "+t("coach_btn"));
  return React.createElement("div",{className:"coach-card"},
    React.createElement("div",{style:{fontWeight:800,fontSize:13.5,color:"var(--text)",marginBottom:4}},"💡 "+tf("coach_title",{tab:t("tab_"+tabId)})),
    tips.map(function(tip,i){ return React.createElement("div",{key:i,style:{display:"flex",gap:8,fontSize:12.5,color:"var(--muted)",lineHeight:1.5,marginTop:5}},
      React.createElement("span",{style:{flex:"0 0 auto"}},"·"),React.createElement("span",null,tip)); }),
    React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:10},onClick:dismiss},t("coach_ok"))
  );
});
const TABS=[
  {id:"dash",label:"Inicio",icon:I.home},
  {id:"gastos",label:"Gastos",icon:I.expense},
  {id:"plan",label:"Plan",icon:I.calendar},
  {id:"cartera",label:"Cartera",icon:I.invest},
];
// v4: nav fija 5 slots (4 tabs + FAB). Los destinos viejos viven dentro de Plan/Cartera/Ajustes.
const ADVANCED_TABS=[];
const SIMPLE_DASH_HIDDEN=[];
function tabHiddenOf(s){
  return [];
}
function tabOrderOf(s){
  return ["dash","gastos","plan","cartera"];
}

/* ============================================================
   ACTUALIZACIONES — hook único (2026-07-18)
   ============================================================
   La app tiene TRES canales de update y estaban desperdigados por App en efectos sueltos
   («spaghetti», feedback 2026-07-18). Este hook los agrupa; el transporte de bajo nivel
   (descargas, notis, service worker) sigue en 12-boot.js, que publica window._mc* y avisa
   por eventos. El mapa completo:
     1) WEB (PWA):  Service Worker esperando  → evento "mc-sw-update"  → pill «actualizar».
     2) OTA (APK):  bundle web nuevo (Capgo)  → evento "mc-ota-ready"  → pill; entra solo
        al próximo arranque si no lo tocas.
     3) APK:        apk.json con versionCode mayor → evento "mc-apk-update" → instalador.
   Chequeos: al arrancar (tick 150ms), al volver a primer plano y cada 30 min. */
function useUpdates(){
  // 1) SW web esperando
  const [updateReady,setUpdateReady]=useState(false);
  useEffect(function(){
    const h=function(){ setUpdateReady(true); if(window._mcNotifyUpdate) window._mcNotifyUpdate(null); };
    window.addEventListener("mc-sw-update", h);
    return function(){ window.removeEventListener("mc-sw-update", h); };
  },[]);
  // 2) OTA: pill también mientras descarga (hay _otaPending más nuevo aunque el bundle no esté listo)
  const readOta=function(){
    if(window._mcOtaReady&&window._mcOtaReady.id) return true;
    try{
      var p=localStorage.getItem("_otaPending");
      return !!(p&&window._mcNewerVer&&window._mcNewerVer(p, CONFIG.APP_VERSION));
    }catch(e){ return false; }
  };
  const [otaReady,setOtaReady]=useState(readOta);
  useEffect(function(){
    const h=function(){ setOtaReady(readOta()); };
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
  // 3) APK nativo
  const [apkUpd,setApkUpd]=useState(window._mcApkUpdate||null);
  useEffect(function(){
    const h=function(){ setApkUpd(window._mcApkUpdate||null); };
    window.addEventListener("mc-apk-update", h);
    return function(){ window.removeEventListener("mc-apk-update", h); };
  },[]);
  // Acciones (la pill/el toast las pinta App; aquí solo la lógica).
  const applyUpdate=function(showToast){
    if(otaReady){
      if(window.__mcApplyOta){ window.__mcApplyOta(); return; }
      if(showToast) showToast(t("upd_downloading"));   // pending sin bundle listo aún
      return;
    }
    if(window.__mcApplyUpdate) window.__mcApplyUpdate();
  };
  const installApk=function(showToast){
    const nat=natPlugin();
    if(!nat||!nat.installApk||!apkUpd) return;
    if(showToast) showToast(t("apk_downloading"));
    nat.installApk({url:apkUpd.url}).then(function(r){
      if(r&&r.needsPermission&&showToast){ showToast(t("apk_perm")); return; }   // Android abrió el ajuste; reintocar
    }).catch(function(e){ if(showToast) showToast("⚠ "+((e&&e.message)||e)); });
  };
  const otaDownloaded=!!(window._mcOtaReady&&window._mcOtaReady.id);
  return { updateReady:updateReady, otaReady:otaReady, otaDownloaded:otaDownloaded, apkUpd:apkUpd, applyUpdate:applyUpdate, installApk:installApk };
}

/* Pantalla de bloqueo: pide huella al abrir la app cuando el candado está activado. */
function LockScreen({onUnlock}){
  const [err,setErr]=useState(false);
  const tryUnlock=function(){ setErr(false); bio.unlock().then(onUnlock).catch(function(){ setErr(true); }); };
  useEffect(function(){ const t=setTimeout(tryUnlock,350); return function(){ clearTimeout(t); }; },[]);
  const wrap={position:"fixed",inset:0,background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:100,color:"var(--text)",gap:"16px",padding:"24px",textAlign:"center"};
  const btn={padding:"14px 22px",borderRadius:"14px",border:"none",background:"var(--mint)",color:"#06120C",fontWeight:700,fontSize:"15px",cursor:"pointer"};
  const escape=function(){
    // la pantalla del candado va ANTES del árbol de la app: si AskHost aún no está montado,
    // askConfirm cae solo al confirm nativo (ver askDialog) y la salida de emergencia sigue viva.
    askConfirm({ title:t("lk_escape"), sub:t("lk_escape_sub"), ok:t("lk_escape_ok"), danger:true })
      .then(function(yes){ if(yes){ bio.disable(); onUnlock(); } });
  };
  const link={background:"none",border:"none",color:"var(--muted-2)",cursor:"pointer",fontSize:"12px",marginTop:"10px",textDecoration:"underline"};
  return React.createElement("div",{style:wrap},
    React.createElement("div",{style:{width:64,height:64,borderRadius:"50%",background:"#5FD08A22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"30px"}},"🔒"),
    React.createElement("div",{style:{fontWeight:700,fontSize:"22px",fontFamily:"Fraunces, serif"}},"Mi cartera"),
    React.createElement("div",{style:{color:"var(--muted)",fontSize:"14px"}}, err?t("lk_failed"):t("lk_unlock")),
    React.createElement("button",{style:btn,onClick:tryUnlock},t("lk_unlockbtn")),
    React.createElement("button",{style:link,onClick:escape},t("lk_cant"))
  );
}

/* Panel de cuenta: login/registro con contraseña y toggle de huella. */
function AuthPanel({session, onClose, showToast, recovery, startMode}){
  const uid = session && session.user ? session.user.id : null;
  // startMode: "up" abre directo en "Crear cuenta" (onboarding → registro sin pasar por login;
  // feedback pareja 2026-07-10, punto 5). Por defecto "in" (iniciar sesión), como siempre.
  const [mode,setMode]=useState(recovery?"newpass":(startMode||"in"));
  const [email,setEmail]=useState((session&&session.user&&session.user.email)||"");
  const [pass,setPass]=useState("");
  const [busy,setBusy]=useState(false);
  const [bioOn,setBioOn]=useState(bio.enabled());
  // zIndex ALTO: debe quedar por encima del onboarding (z90) para que "Ya tengo cuenta" sea visible.
  const overlay={position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:120,padding:"20px"};
  const card={background:"#0F1A15",border:"1px solid #1e2b24",borderRadius:"18px",padding:"22px",width:"100%",maxWidth:"360px",color:"#E8F0EB",fontFamily:"Manrope, sans-serif"};
  const inp={width:"100%",padding:"12px 14px",margin:"6px 0",borderRadius:"12px",border:"1px solid #2a3a31",background:"#0B1410",color:"#fff",fontSize:"16px",boxSizing:"border-box"};
  const btn={width:"100%",padding:"12px",borderRadius:"12px",border:"none",background:"#5FD08A",color:"#06120C",fontWeight:700,fontSize:"15px",marginTop:"8px",cursor:"pointer"};
  const link={background:"none",border:"none",color:"#9BD0E0",cursor:"pointer",fontSize:"13px",marginTop:"12px",padding:"4px",width:"100%"};
  const submit=function(){
    if(!email||!pass){ showToast(t("au_need")); return; }
    setBusy(true);
    const p = mode==="in" ? cloud.signInPassword(email.trim(),pass) : cloud.signUpPassword(email.trim(),pass);
    p.then(function(){ showToast(mode==="in"?t("au_signedin"):t("au_created")); onClose(); })
     .catch(function(e){ showToast("✕ "+((e&&e.message)||e)); })
     .then(function(){ setBusy(false); });
  };
  const toggleBio=function(){
    if(bioOn){ bio.disable(); setBioOn(false); showToast(t("au_bio_dis")); return; }
    bio.enable(uid, (session&&session.user&&session.user.email)).then(function(){ setBioOn(true); showToast(t("au_bio_en")); }).catch(function(e){ showToast("✕ "+((e&&e.message)||e)); });
  };
  const stop=function(e){ e.stopPropagation(); };
  const sendReset=function(){
    if(!email){ showToast(t("au_need_email")); return; }
    setBusy(true);
    cloud.resetPassword(email.trim())
      .then(function(){ showToast(t("au_reset_sent")); setMode("in"); })
      .catch(function(e){ showToast("✕ "+((e&&e.message)||e)); })
      .then(function(){ setBusy(false); });
  };
  const saveNewPass=function(){
    if(!pass||pass.length<6){ showToast(t("au_pass_short")); return; }
    setBusy(true);
    cloud.updatePassword(pass)
      .then(function(){ showToast(t("au_pass_changed")); onClose(); })
      .catch(function(e){ showToast("✕ "+((e&&e.message)||e)); })
      .then(function(){ setBusy(false); });
  };
  // Recuperación: poner contraseña nueva (se llega desde el enlace del email; ya hay sesión temporal).
  if(mode==="newpass"){
    return React.createElement("div",{style:overlay,onClick:onClose},
      React.createElement("div",{style:card,onClick:stop},
        React.createElement("div",{style:{fontWeight:700,fontSize:"17px",marginBottom:"14px"}}, t("au_newpass_title")),
        React.createElement("input",{style:inp,type:"password",placeholder:t("au_pass"),value:pass,autoComplete:"new-password",onChange:function(e){ setPass(e.target.value); }}),
        React.createElement("button",{style:btn,disabled:busy,onClick:saveNewPass}, busy?"…":t("au_newpass_save")),
        React.createElement("button",{style:link,onClick:onClose},t("au_cancel"))
      )
    );
  }
  if(uid){
    return React.createElement("div",{style:overlay,onClick:onClose},
      React.createElement("div",{style:card,onClick:stop},
        React.createElement("div",{style:{fontWeight:700,fontSize:"17px"}},t("au_account")),
        React.createElement("div",{style:{color:"#9fb3a8",fontSize:"13px",marginBottom:"16px"}},(session.user.email||"")),
        bio.supported()
          ? React.createElement("button",{style:Object.assign({},btn,{background:bioOn?"#243b30":"#5FD08A",color:bioOn?"#cfe9da":"#06120C"}),onClick:toggleBio}, bioOn?t("au_bio_off"):t("au_bio_on"))
          : React.createElement("div",{style:{color:"#E6C36A",fontSize:"12px",margin:"6px 0"}},t("au_nobio")),
        React.createElement("button",{style:Object.assign({},btn,{background:"#3a2430",color:"#f3d0d8"}),onClick:function(){ cloud.signOut().then(function(){ showToast(t("au_signedout")); onClose(); }); }},t("au_signout")),
        React.createElement("button",{style:link,onClick:onClose},t("au_close"))
      )
    );
  }
  // Recuperar contraseña: pedir email y enviar el enlace.
  if(mode==="reset"){
    return React.createElement("div",{style:overlay,onClick:onClose},
      React.createElement("div",{style:card,onClick:stop},
        React.createElement("div",{style:{fontWeight:700,fontSize:"17px",marginBottom:"14px"}}, t("au_reset_title")),
        React.createElement("input",{style:inp,type:"email",placeholder:t("au_email"),value:email,autoComplete:"username",onChange:function(e){ setEmail(e.target.value); }}),
        React.createElement("button",{style:btn,disabled:busy,onClick:sendReset}, busy?"…":t("au_reset_send")),
        React.createElement("button",{style:link,onClick:function(){ setMode("in"); }}, t("au_back")),
        React.createElement("button",{style:link,onClick:onClose},t("au_cancel"))
      )
    );
  }
  return React.createElement("div",{style:overlay,onClick:onClose},
    React.createElement("div",{style:card,onClick:stop},
      React.createElement("div",{style:{fontWeight:700,fontSize:"17px",marginBottom:"14px"}}, mode==="in"?t("au_signin"):t("au_signup")),
      React.createElement("input",{style:inp,type:"email",placeholder:t("au_email"),value:email,autoComplete:"username",onChange:function(e){ setEmail(e.target.value); }}),
      React.createElement("input",{style:inp,type:"password",placeholder:t("au_pass"),value:pass,autoComplete:mode==="in"?"current-password":"new-password",onChange:function(e){ setPass(e.target.value); }}),
      React.createElement("button",{style:btn,disabled:busy,onClick:submit}, busy?"…":(mode==="in"?t("au_enter"):t("au_signup"))),
      mode==="in" && React.createElement("button",{style:link,onClick:function(){ setMode("reset"); }}, t("au_forgot")),
      React.createElement("button",{style:link,onClick:function(){ setMode(mode==="in"?"up":"in"); }}, mode==="in"?t("au_toup"):t("au_toin")),
      React.createElement("button",{style:link,onClick:onClose},t("au_cancel"))
    )
  );
}

/* ============================================================
   OPEN BANKING — sección dedicada "Mis bancos": conecta varios bancos,
   ve su estado y elige de la lista REAL de Enable Banking (con buscador y logos).
   Overlay a pantalla completa que abre SettingsPanel.
   ============================================================ */
/* IMPORTAR HISTÓRICO vía Open Banking (~90 días PSD2). Cargos + ingresos; por fila eliges
   destino: Gasto (variable) · Recibo (fijo mensual) · Ingreso. Tarjeta→Gasto, no-tarjeta→Recibo,
   crédito→Ingreso (pre-marcados). TR no aplica (no está en OB). Feedback 2026-07-18. */
function BankHistoryImport({state, set, showToast, onClose, linkEnts}){
  const expEnts=expenseBankEnts(state);
  const allowList=(linkEnts&&linkEnts.length)? linkEnts : expEnts;
  const allow={}; allowList.forEach(function(e){ allow[e]=1; });
  const banksLbl=allowList.map(function(e){ return entOf(e).label; }).join(", ");
  const [months,setMonths]=useState(3);
  const [loading,setLoading]=useState(false);
  const [cands,setCands]=useState(null);
  const [sel,setSel]=useState({});       // índice -> bool
  const [dest,setDest]=useState({});     // índice -> "gasto"|"recibo"|"ingreso"
  const [importing,setImporting]=useState(false);
  useBackClose(true, onClose);
  const kOf=function(dt,am,mc){ return String(dt).slice(0,10)+"|"+am+"|"+(mc||""); };
  const defDest=function(x){
    if(x.kind==="in") return "ingreso";
    if(x.card) return "gasto";
    return "recibo";
  };
  const search=function(){
    if(!allowList.length){ showToast(t("bp_hist_nodaily")); return; }
    setLoading(true); setCands(null);
    const d=new Date(); d.setMonth(d.getMonth()-months); const dateFrom=d.toISOString().slice(0,10);
    cloud.bankSyncHistory(dateFrom).then(function(res){
      const links=(res&&res.links)||[];
      const seen={}; (state.expenses||[]).forEach(function(e){ if(e.extId) seen[e.extId]=1; });
      const keys={}; (state.expenses||[]).forEach(function(e){ keys[kOf(e.date,e.amount,e.merchant)]=1; });
      const fixNames={}; (state.fixed||[]).forEach(function(f){ fixNames[(f.name||"").toLowerCase()+"|"+(f.amount||0)+"|"+(f.account||"")]=1; });
      const out=[], uniq={};
      links.forEach(function(lk){
        const ent=entFromAspsp(lk&&lk.aspsp); if(!allow[ent]) return;
        (lk.accounts||[]).forEach(function(ac){
          (ac.transactions||[]).forEach(function(tx){
            const dt=String(tx.date||"").slice(0,10), am=Number(tx.amount)||0;
            if(!dt || !am) return;
            const isIn=am<0;
            const abs=Math.abs(am);
            if(tx.ext_id && seen[tx.ext_id]) return;
            if(!isIn && keys[kOf(dt,abs,tx.merchant)]) return;
            if(isIn && keys[kOf(dt,-abs,tx.merchant)]) return;
            const k=(tx.ext_id||"")+"|"+(isIn?"in":"out")+"|"+kOf(dt,abs,tx.merchant); if(uniq[k]) return; uniq[k]=1;
            out.push({ id:tx.ext_id||null, date:dt, amount:abs, merchant:tx.merchant||(isIn?t("cat_ingreso"):"Compra"), card:!!tx.card, ent:ent, kind:isIn?"in":"out" });
          });
        });
      });
      out.sort(function(a,b){ return b.date.localeCompare(a.date); });
      setCands(out);
      const s0={}, d0={};
      out.forEach(function(x,i){
        d0[i]=defDest(x);
        // Pre-marca: tarjeta/ingreso sí; recibo (no tarjeta) también — es lo que evita teclear fijos.
        s0[i]=true;
        if(d0[i]==="recibo"){
          const fk=(x.merchant||"").toLowerCase()+"|"+x.amount+"|"+x.ent;
          if(fixNames[fk]) s0[i]=false;   // ya tienes ese fijo
        }
      });
      setSel(s0); setDest(d0);
    }).catch(function(e){ showToast("⚠ "+((e&&e.message)||e)); setCands([]); }).finally(function(){ setLoading(false); });
  };
  const toggle=function(i){ setSel(function(p){ const n=Object.assign({},p); n[i]=!n[i]; return n; }); };
  const setDestI=function(i,d){ setDest(function(p){ const n=Object.assign({},p); n[i]=d; return n; }); setSel(function(p){ const n=Object.assign({},p); n[i]=true; return n; }); };
  const selCount=cands? cands.filter(function(x,i){ return sel[i]; }).length : 0;
  const doImport=function(){
    if(!cands || !selCount) return;
    setImporting(true);
    const expAdds=[], fixAdds=[];
    cands.forEach(function(x,i){
      if(!sel[i]) return;
      const d=dest[i]||defDest(x);
      if(d==="recibo"){
        const it={id:uid(),name:x.merchant||t("bp_hist_recibo"),amount:+Number(x.amount).toFixed(2),freq:"mes",account:x.ent};
        const dd=recDay(x.date); if(dd) it.day=dd;
        fixAdds.push(it);
        return;
      }
      if(d==="ingreso"){
        const e={ id:uid(), date:new Date(x.date+"T12:00:00").toISOString(), merchant:x.merchant, amount:-Math.abs(x.amount), category:"ingreso", source:"ob-hist", ent:x.ent, noCard:true, income:true };
        if(x.id) e.extId=x.id; expAdds.push(e); return;
      }
      const e={ id:uid(), date:new Date(x.date+"T12:00:00").toISOString(), merchant:x.merchant, amount:Math.abs(x.amount), category:autoCategory(x.merchant||""), source:"ob-hist", ent:x.ent };
      if(x.id) e.extId=x.id; expAdds.push(e);
    });
    set(function(s){
      const next=Object.assign({},s);
      if(expAdds.length) next.expenses=expAdds.concat(s.expenses||[]);
      if(fixAdds.length) next.fixed=(s.fixed||[]).concat(fixAdds);
      return next;
    });
    setTimeout(function(){ expAdds.forEach(function(e){ cloud.addExpense(e).catch(function(){}); }); },0);
    const parts=[];
    if(expAdds.filter(function(e){ return e.amount>0; }).length) parts.push(tf("bp_hist_done_g",{n:expAdds.filter(function(e){ return e.amount>0; }).length}));
    if(expAdds.filter(function(e){ return e.amount<0; }).length) parts.push(tf("bp_hist_done_i",{n:expAdds.filter(function(e){ return e.amount<0; }).length}));
    if(fixAdds.length) parts.push(tf("bp_hist_done_r",{n:fixAdds.length}));
    showToast(parts.length?parts.join(" · "):tf("bp_hist_done",{n:selCount}));
    setImporting(false); onClose();
  };
  const wrap={position:"fixed",inset:0,zIndex:97,overflowY:"auto",background:"var(--bg)",color:"var(--text)",padding:"calc(var(--safe-top) + 18px) 18px calc(var(--safe-bottom) + 28px)",fontFamily:"'Manrope',sans-serif"};
  const inner={maxWidth:480,margin:"0 auto"};
  const back={background:"none",border:"none",color:"var(--blue)",fontSize:15,fontWeight:700,cursor:"pointer",padding:"6px 0",marginBottom:6};
  const chip=function(n){ const on=months===n; return React.createElement("button",{key:n,onClick:function(){ setMonths(n); },style:{flex:1,padding:"9px 0",borderRadius:10,border:"1px solid "+(on?"var(--mint)":"var(--line)"),background:on?"var(--mint)":"var(--surface)",color:on?"#06120C":"var(--text)",fontWeight:800,fontSize:13,cursor:"pointer"}}, tf("bp_hist_m",{n:n})); };
  const bigBtn={width:"100%",padding:"14px",borderRadius:14,border:"none",background:"var(--mint)",color:"#06120C",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:12};
  const destChip=function(i,id,label){
    const on=(dest[i]||"")==id;
    return React.createElement("button",{key:id,type:"button",onClick:function(e){ e.stopPropagation(); setDestI(i,id); },
      style:{padding:"4px 9px",borderRadius:999,border:"1px solid "+(on?"var(--mint)":"var(--line)"),background:on?"rgba(95,208,138,.18)":"transparent",color:on?"var(--mint)":"var(--muted)",fontWeight:800,fontSize:11,cursor:"pointer"}}, label);
  };
  return React.createElement("div",{style:wrap}, React.createElement("div",{style:inner},
    React.createElement("button",{style:back,onClick:onClose}, "‹ "+t("bp_close")),
    React.createElement("div",{className:"serif",style:{fontSize:24,margin:"4px 0 4px"}}, t("bp_hist_title")),
    React.createElement("div",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.5,marginBottom:14}},
      allowList.length? tf("bp_hist_sub",{banks:banksLbl}) : t("bp_hist_nodaily")),
    allowList.length>0 && React.createElement(React.Fragment,null,
      React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}}, [1,2,3].map(chip)),
      React.createElement("button",{style:{width:"100%",padding:"12px",borderRadius:12,border:"1px solid var(--line)",background:"var(--surface)",color:"var(--text)",fontWeight:800,fontSize:14,cursor:"pointer"},disabled:loading,onClick:search}, loading?t("bp_hist_searching"):t("bp_hist_search")),
      cands!==null && cands.length===0 && !loading && React.createElement("div",{style:{color:"var(--muted)",fontSize:13,textAlign:"center",padding:"20px 0"}}, t("bp_hist_none")),
      cands!==null && cands.length>0 && React.createElement("div",{style:{marginTop:14}},
        React.createElement("div",{style:{fontSize:12,color:"var(--muted-2)",marginBottom:8}}, tf("bp_hist_found",{n:cands.length})),
        cands.map(function(x,i){
          const on=!!sel[i];
          const isIn=x.kind==="in";
          return React.createElement("div",{key:i,style:{border:"1px solid "+(on?"var(--mint)":"var(--line)"),background:on?"var(--mint)14":"var(--surface)",borderRadius:12,marginBottom:7,padding:"10px 12px"}},
            React.createElement("button",{type:"button",onClick:function(){ toggle(i); },style:{display:"flex",alignItems:"center",gap:11,width:"100%",background:"none",border:"none",color:"inherit",cursor:"pointer",textAlign:"left",padding:0}},
              React.createElement("span",{style:{width:20,height:20,borderRadius:6,border:"2px solid "+(on?"var(--mint)":"var(--muted-2)"),background:on?"var(--mint)":"transparent",color:"#06120C",fontWeight:900,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}, on?"✓":""),
              React.createElement("div",{style:{flex:1,minWidth:0}},
                React.createElement("div",{style:{fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}, x.merchant),
                React.createElement("div",{style:{fontSize:11,color:"var(--muted-2)",marginTop:1}}, x.date, " · ", entOf(x.ent).label, isIn?"":(x.card?"":" · "+t("bp_hist_notcard")))),
              React.createElement("span",{style:{fontWeight:800,fontSize:14,flexShrink:0,color:isIn?"var(--mint)":"var(--text)"}}, (isIn?"+":"")+eur(x.amount))
            ),
            on && React.createElement("div",{style:{display:"flex",gap:6,marginTop:8,flexWrap:"wrap",paddingLeft:31}},
              !isIn && destChip(i,"gasto",t("bp_hist_as_gasto")),
              !isIn && destChip(i,"recibo",t("bp_hist_as_recibo")),
              destChip(i,"ingreso",t("bp_hist_as_ingreso"))
            )
          );
        }),
        React.createElement("button",{style:Object.assign({},bigBtn,{opacity:(selCount&&!importing)?1:0.5}),disabled:!selCount||importing,onClick:doImport}, tf("bp_hist_import",{n:selCount}))
      )
    )
  ));
}

function BankPanel({state, set, showToast, uid, onBankSync, onClose, totals, onLinks, fetchPrices}){
  const [histOpen,setHistOpen]=useState(false);
  const [links,setLinks]=useState(null);          // null = cargando
  const [aspsps,setAspsps]=useState(null);        // null = sin cargar
  const [loadingA,setLoadingA]=useState(false);
  const [q,setQ]=useState("");
  const [busy,setBusy]=useState("");              // aspsp en curso / "__sync"
  const [picking,setPicking]=useState(false);
  const [confirming,setConfirming]=useState("");  // aspsp cuyo "¿quitar?" está abierto
  useBackClose(picking, function(){ setPicking(false); setQ(""); });   // gesto atrás: sale del picker, no de la app
  const loadLinks=function(){ if(!cloud.enabled()){ setLinks([]); return; } cloud.bankLinks().then(function(rows){ setLinks(rows||[]); if(onLinks) onLinks(rows||[]);   // el contador de Ajustes se entera al momento
    if((rows||[]).some(function(r){return r.status==='active'||r.status==='pending';})) set(function(s){ return s.hasBankLink?s:Object.assign({},s,{hasBankLink:true}); });
    else if((rows||[]).length===0) set(function(s){ return s.hasBankLink?Object.assign({},s,{hasBankLink:false}):s; });   // sin bancos → dejar de llamar a bank-sync
  }).catch(function(){ setLinks([]); }); };
  useEffect(loadLinks,[uid]);
  const loadAspsps=function(){ if(aspsps!==null||loadingA) return; setLoadingA(true); cloud.bankAspsps("ES").then(function(rows){ setAspsps(rows||[]); }).catch(function(e){ setAspsps([]); showToast("⚠ "+((e&&e.message)||e)); }).finally(function(){ setLoadingA(false); }); };
  const openPicker=function(){ setPicking(true); loadAspsps(); };
  const connect=function(name,country){ if(!cloud.enabled()||!uid){ showToast(t("bp_need_login")); return; } setBusy(name); showToast(t("bank_connecting")); set(function(s){ return Object.assign({},s,{hasBankLink:true}); }); cloud.bankConnect(name, country||"ES").then(function(d){ location.href=d.url; }).catch(function(e){ setBusy(""); showToast("⚠ "+t("bank_error")+": "+((e&&e.message)||e)); }); };
  const refresh=function(){ if(!onBankSync){ return; } setBusy("__sync"); Promise.resolve(onBankSync()).finally(function(){ setBusy(""); loadLinks(); }); };
  // Quitar banco (revoca en EB + borra la fila). Reversible: reaparece el picker para reconectar.
  // Purga al momento sus cuentas sincronizadas (obAccounts) del patrimonio: antes se quedaban
  // sumando hasta el siguiente bank-sync (feedback 2026-07-10). Las cuentas MANUALES no se tocan.
  const remove=function(name){ setBusy(name); cloud.bankDisconnect(name).then(function(){ setConfirming(""); showToast(tf("bp_removed",{bank:bankLabel(name)}));
    set(function(s){
      const ob=(s.obAccounts||[]).filter(function(o){ return String(o.aspsp||"").toLowerCase()!==String(name||"").toLowerCase(); });
      if(ob.length===(s.obAccounts||[]).length) return s;
      return Object.assign({},s,{obAccounts:ob});
    });
    loadLinks(); }).catch(function(e){ showToast("⚠ "+((e&&e.message)||e)); }).finally(function(){ setBusy(""); }); };

  const fmtD=function(x){ try{ return new Date(x).toLocaleDateString(); }catch(e){ return String(x); } };
  const fmtDT=function(x){ try{ return new Date(x).toLocaleString(); }catch(e){ return String(x); } };
  const bankLabel=function(nm){ const e=entFromAspsp(nm); return e?entOf(e).label:nm; };
  const connected={}; (links||[]).forEach(function(l){ connected[(l.aspsp_name||"").toLowerCase()]=l; });
  const ql=q.trim().toLowerCase();
  const shown=(aspsps||[]).filter(function(a){ return !ql || (a.name||"").toLowerCase().indexOf(ql)>=0; });

  const wrap={position:"fixed",inset:0,zIndex:95,overflowY:"auto",background:"var(--bg)",color:"var(--text)",padding:"calc(var(--safe-top) + 14px) 18px calc(var(--safe-bottom) + 28px)",fontFamily:"'Manrope',sans-serif"};
  const inner={maxWidth:480,margin:"0 auto"};
  const back={background:"none",border:"none",color:"var(--mint)",fontSize:14,fontWeight:700,cursor:"pointer",padding:"6px 0",marginBottom:4};
  const pill=function(txt,col){ return React.createElement("span",{style:{fontSize:11,fontWeight:800,color:col,background:col+"1f",borderRadius:20,padding:"3px 9px",whiteSpace:"nowrap"}}, txt); };
  const mb={flex:"1 1 auto",minWidth:0,background:"var(--sur)",border:"1px solid var(--line-soft)",color:"var(--text)",borderRadius:12,padding:"10px 12px",fontSize:13,fontWeight:700,cursor:"pointer"};
  const bigBtn={width:"100%",padding:"14px",borderRadius:14,border:"none",background:"linear-gradient(160deg,var(--mint-hi),var(--mint))",color:"var(--on-mint)",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:8};
  const inp={width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid var(--line-soft)",background:"var(--sur)",color:"var(--text)",fontSize:16,boxSizing:"border-box"};

  const logoBox=function(a){
    const ent=entFromAspsp(a.name);
    if(a.logo) return React.createElement("img",{src:a.logo,alt:"",style:{width:36,height:36,borderRadius:9,objectFit:"contain",background:"#fff",flexShrink:0},onError:function(e){ e.target.style.display="none"; }});
    return React.createElement(Mono,{ent:ent||"",size:36});
  };

  // ---- vista PICKER (elegir banco de la lista real) ----
  if(picking){
    return React.createElement("div",{style:wrap}, React.createElement("div",{style:inner},
      React.createElement("button",{style:back,onClick:function(){ setPicking(false); setQ(""); }}, "‹ "+t("bp_back")),
      React.createElement("div",{className:"serif",style:{fontSize:24,margin:"4px 0 4px",fontWeight:560}}, t("bp_pick_title")),
      React.createElement("div",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.5,marginBottom:12}}, t("bp_pick_sub")),
      React.createElement("input",{style:inp,placeholder:t("bp_search"),value:q,onChange:function(e){ setQ(e.target.value); },autoFocus:true}),
      loadingA && React.createElement("div",{style:{color:"var(--muted)",fontSize:13,padding:"18px 2px"}}, t("bp_loading")),
      (!loadingA && aspsps!==null && shown.length===0) && React.createElement("div",{style:{color:"var(--muted)",fontSize:13,padding:"18px 2px"}}, t("bp_noresults")),
      React.createElement("div",{style:{marginTop:12}},
        shown.slice(0,80).map(function(a){
          const isC=!!connected[(a.name||"").toLowerCase()];
          return React.createElement("button",{key:a.name+a.country,disabled:!!busy,onClick:function(){ connect(a.name,a.country); },
            className:"v4-mov",
            style:{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"12px 14px",borderRadius:16,border:"1px solid var(--line-soft)",background:"var(--sur)",marginBottom:8,cursor:busy?"default":"pointer",opacity:busy&&busy!==a.name?0.5:1,textAlign:"left"}},
            logoBox(a),
            React.createElement("div",{style:{flex:1,minWidth:0}},
              React.createElement("div",{className:"nm"}, a.name),
              isC? React.createElement("div",{className:"meta",style:{color:"var(--mint)"}}, "✓ "+t("bp_already")) : (a.beta? React.createElement("div",{className:"meta"}, "beta") : null)),
            React.createElement("span",{style:{color:"var(--muted-2)",fontWeight:800,fontSize:18}}, busy===a.name?"…":"›")
          );
        })
      )
    ));
  }

  // ---- vista PRINCIPAL (mis bancos conectados) ----
  return React.createElement("div",{className:"v4-banks",style:wrap}, React.createElement("div",{style:inner},
    React.createElement("button",{style:back,onClick:onClose}, "‹ "+t("bp_close")),
    React.createElement("div",{className:"serif",style:{fontSize:26,fontWeight:560,margin:"2px 0 4px"}}, t("bp_title")),
    React.createElement("div",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.5,marginBottom:14}}, t("bp_intro")),
    links===null && React.createElement("div",{style:{color:"var(--muted)",fontSize:13}}, "…"),
    links!==null && links.length===0 && React.createElement(React.Fragment,null,
      React.createElement("div",{style:{textAlign:"center",color:"var(--muted)",fontSize:13.5,padding:"18px 8px"}}, t("bp_empty"))
    ),
    (links||[]).map(function(l){
      const ent=entFromAspsp(l.aspsp_name);
      const vu=l.valid_until?new Date(l.valid_until).getTime():0;
      const soon=vu && (vu-Date.now()<14*86400000);
      const noAcct = l.status==='error';
      const sp = l.status==='active' ? (soon? pill(t("bp_st_soon"),"#E2A05F") : pill(t("bp_st_active"),"var(--mint)"))
               : l.status==='pending' ? pill(t("bp_st_pending"),"#E2A05F")
               : noAcct ? pill(t("bp_st_noacct"),"#E2A05F")
               : pill(t("bp_st_expired"),"var(--coral)");
      return React.createElement("div",{key:l.aspsp_name,style:{marginBottom:6}},
        React.createElement("div",{className:"v4-mov",style:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:16,border:"1px solid var(--line-soft)",background:"var(--sur)"}},
          React.createElement(Mono,{ent:ent||"",size:40}),
          React.createElement("div",{style:{flex:1,minWidth:0}},
            React.createElement("div",{className:"nm"}, bankLabel(l.aspsp_name), (Array.isArray(l.accounts)&&l.accounts.length>1)?React.createElement("span",{style:{marginLeft:7,fontSize:11,fontWeight:700,color:"var(--mint)"}}, tf("bp_naccts",{n:l.accounts.length})):null),
            React.createElement("div",{className:"meta"}, l.last_sync?tf("bank_updated",{x:fmtDT(l.last_sync)}):t("bank_neversync")),
            l.valid_until?React.createElement("div",{className:"meta",style:{color:soon?"var(--coral)":undefined}}, tf("bank_consent",{x:fmtD(l.valid_until)})):null),
          sp),
        noAcct && React.createElement("div",{style:{fontSize:12,lineHeight:1.5,color:"#E2A05F",margin:"8px 2px 4px"}}, "⚠ "+t("bp_noacct_help")),
        (confirming===l.aspsp_name
          ? React.createElement("div",{className:"bk-actions",style:{marginTop:8}},
              React.createElement("span",{style:{fontSize:12.5,color:"var(--muted)",flex:"1 1 100%"}}, tf("bp_remove_q",{bank:bankLabel(l.aspsp_name)})),
              React.createElement("button",{style:Object.assign({},mb,{color:"var(--coral)",borderColor:"var(--coral)",opacity:busy?0.6:1}),disabled:!!busy,onClick:function(){ remove(l.aspsp_name); }}, busy===l.aspsp_name?t("bp_removing"):t("bp_remove_yes")),
              React.createElement("button",{style:mb,disabled:!!busy,onClick:function(){ setConfirming(""); }}, t("bp_remove_no")))
          : React.createElement("div",{className:"bk-actions",style:{marginTop:8}},
              React.createElement("button",{style:Object.assign({},mb,{opacity:busy?0.6:1}),disabled:!!busy,onClick:refresh}, busy==="__sync"?t("bp_syncing"):t("bank_refresh")),
              React.createElement("button",{style:Object.assign({},mb,{opacity:busy?0.6:1}),disabled:!!busy,onClick:function(){ connect(l.aspsp_name, l.aspsp_country||"ES"); }}, noAcct?t("bp_retry_link"):t("bank_reconnect")),
              React.createElement("button",{style:Object.assign({},mb,{opacity:busy?0.6:1,color:"var(--muted)",flex:"0 0 auto"}),disabled:!!busy,onClick:function(){ setConfirming(l.aspsp_name); }}, t("bp_remove"))))
      );
    }),
    React.createElement("button",{style:bigBtn,onClick:openPicker}, "+ "+t("bp_add")),
    (function(){
      const active=(links||[]).filter(function(l){ return l.status==='active'||l.status==='pending'; });
      if(!active.length) return null;
      const ents=[]; active.forEach(function(l){ const e=entFromAspsp(l.aspsp_name); if(e&&ents.indexOf(e)<0) ents.push(e); });
      if(!ents.length) return null;
      const cur=expenseBankEnts(state);
      const onEnt=function(ent){ return cur.indexOf(ent)>=0; };
      const toggleEnt=function(ent){
        set(function(s){
          const base=expenseBankEnts(s).slice();
          const i=base.indexOf(ent);
          if(i>=0){ if(base.length===1) return s; base.splice(i,1); }
          else base.push(ent);
          return Object.assign({},s,{settings:Object.assign({},s.settings,{expenseBanks:base})});
        });
      };
      return React.createElement("div",{style:{marginTop:18}},
        React.createElement("div",{className:"v4-section-h"}, React.createElement("span",null, t("bp_expbanks"))),
        React.createElement("div",{style:{fontSize:12,color:"var(--muted)",lineHeight:1.45,marginBottom:10}}, t("bp_expbanks_hint")),
        React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
          ents.map(function(ent){
            const on=onEnt(ent);
            return React.createElement("button",{key:ent,type:"button",className:"v4-chip"+(on?" on":""),onClick:function(){ toggleEnt(ent); }},
              (on?"✓ ":"")+entOf(ent).label);
          })
        )
      );
    })(),
    ((links||[]).some(function(l){ return l.status==='active'; })) && React.createElement("button",{style:{width:"100%",padding:"12px",borderRadius:14,border:"1px solid var(--line-soft)",background:"var(--sur)",color:"var(--text)",fontWeight:700,fontSize:13.5,cursor:"pointer",marginTop:12},onClick:function(){ setHistOpen(true); }}, t("bp_hist_btn")),
    histOpen && ReactDOM.createPortal(React.createElement(BankHistoryImport,{
      state:state,set:set,showToast:showToast,onClose:function(){ setHistOpen(false); },
      linkEnts:(function(){
        const ents=[];
        (links||[]).forEach(function(l){
          if(!(l&&(l.status==="active"||l.status==="pending"))) return;
          const e=entFromAspsp(l.aspsp_name||l.aspsp); if(e&&ents.indexOf(e)<0) ents.push(e);
        });
        return ents.length?ents:null;
      })()
    }), document.body),
    React.createElement("div",{style:{height:1,background:"var(--line-soft)",margin:"22px 0 8px"}}),
    React.createElement("div",{className:"bk-sec"}, t("bp_brokers")),
    React.createElement(TRSync,{state:state,set:set,totals:totals}),
    React.createElement(MyInvestorSync,{state:state,set:set}),
    React.createElement(BrokerImport,{state:state,set:set,fetchPrices:fetchPrices}),
    React.createElement("div",{className:"bk-ver"}, "v"+(CONFIG.APP_VERSION||"?")),
    // (bp_apk_hint fuera 2026-07-18: párrafo de circunstancias ya resueltas — menos letra aquí)
    React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",marginTop:6,lineHeight:1.5}}, t("bp_foot"))
  ));
}

/* Página «Actividad» del admin (petición 2026-07-11): antes era un acordeón dentro de Ajustes y
   con los errores acumulándose el cajón se hacía gigante; ahora es una pantalla propia (patrón
   BankPanel) con filtro «solo errores». Sin traducir a propósito: consola privada del admin. */
function ActivityPanel({events, onReload, onClose}){
  const [flt,setFlt]=useState("all");   // all | error | feedback
  useBackClose(true, onClose);   // gesto atrás del móvil: cierra esta pantalla
  const wrap={position:"fixed",inset:0,zIndex:96,overflowY:"auto",background:"var(--bg)",color:"var(--text)",padding:"calc(var(--safe-top) + 18px) 18px calc(var(--safe-bottom) + 28px)",fontFamily:"'Manrope',sans-serif"};
  const inner={maxWidth:480,margin:"0 auto"};
  const back={background:"none",border:"none",color:"var(--blue)",fontSize:15,fontWeight:700,cursor:"pointer",padding:"6px 0",marginBottom:6};
  const chip=function(on){ return {background:on?"var(--mint)":"var(--surface-2)",color:on?"#06120C":"var(--text)",border:on?"none":"1px solid var(--line)",borderRadius:20,padding:"6px 13px",fontSize:12.5,fontWeight:700,cursor:"pointer"}; };
  const nErr=(events||[]).filter(function(ev){ return ev.kind==="error"; }).length;
  const nFb=(events||[]).filter(function(ev){ return ev.kind==="feedback"; }).length;
  const list=(events||[]).filter(function(ev){ return flt==="all" || ev.kind===flt; });
  return React.createElement("div",{style:wrap}, React.createElement("div",{style:inner},
    React.createElement("button",{style:back,onClick:onClose}, "‹ Ajustes"),
    React.createElement("div",{className:"serif",style:{fontSize:25,margin:"2px 0 2px"}}, "👁 Actividad"),
    React.createElement("div",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.5,marginBottom:12}},
      events===null ? "Cargando…" : ((events||[]).length+" eventos · "+nErr+" error(es) · solo tú ves esto")),
    React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}},
      React.createElement("button",{style:chip(flt==="all"),onClick:function(){ setFlt("all"); }},"Todo"),
      React.createElement("button",{style:chip(flt==="error"),onClick:function(){ setFlt("error"); }},"🐞 Solo errores"+(nErr?" ("+nErr+")":"")),
      React.createElement("button",{style:chip(flt==="feedback"),onClick:function(){ setFlt("feedback"); }},"💬 Sugerencias"+(nFb?" ("+nFb+")":""))),
    events!==null && list.length===0 && React.createElement("div",{style:{fontSize:13,color:"var(--muted)",padding:"14px 0"}},
      flt==="error" ? "Sin errores en los últimos eventos. 🎉" : flt==="feedback" ? "Sin sugerencias todavía (llegan desde el popup de Novedades)." : "Sin eventos todavía (los pings/errores de los usuarios aparecerán aquí)."),
    list.map(function(ev,i){
      const d=new Date(ev.created_at);
      const when=d.toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
      const bd=ev.kind==="error"?"var(--coral)":ev.kind==="feedback"?"var(--blue)":"var(--line)";
      const ic=ev.kind==="error"?"🐞 ":ev.kind==="feedback"?"💬 ":"👋 ";
      return React.createElement("div",{key:i,style:{padding:"10px 12px",borderRadius:12,border:"1px solid "+bd,background:"var(--surface)",marginBottom:8,fontSize:12,lineHeight:1.5}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",gap:8}},
          React.createElement("span",{style:{fontWeight:800}},ic+(ev.email||"¿?")),
          React.createElement("span",{style:{color:"var(--muted-2)",flex:"0 0 auto"}},when)),
        ev.kind==="error" && React.createElement("div",{style:{color:"var(--coral)",overflowWrap:"anywhere"}},ev.message),
        ev.kind==="feedback" && React.createElement("div",{style:{overflowWrap:"anywhere"}},ev.message),
        ev.kind!=="ping" && ev.detail && React.createElement("div",{style:{color:"var(--muted-2)",fontSize:10.5,overflowWrap:"anywhere"}},ev.detail),
        React.createElement("div",{style:{color:"var(--muted-2)",fontSize:10.5}},"v"+(ev.app_version||"?")+" · "+(ev.platform||"?"))
      );
    }),
    React.createElement("button",{style:{width:"100%",padding:"12px",borderRadius:12,border:"1px solid var(--line)",background:"var(--surface-2)",color:"var(--text)",fontWeight:700,fontSize:14,marginTop:8,cursor:"pointer"},onClick:onReload},"↻ Recargar")
  ));
}

/* Privacidad DENTRO de la app (2026-07-17): antes era window.open("privacy.html","_blank"), que en
   el móvil abría una ventana sin safe-area (el título quedaba bajo el notch, «muy arriba») y de la
   que «costaba tirar para atrás». Ahora es un panel con cabecera, gesto atrás y el mismo diseño que
   el resto — mismo patrón que ActivityPanel. El contenido va en i18n (pv_*), en los tres idiomas. */
function PrivacyPanel({onClose}){
  useBackClose(true, onClose);   // gesto atrás del móvil: cierra esta pantalla
  const wrap={position:"fixed",inset:0,zIndex:96,overflowY:"auto",background:"var(--bg)",color:"var(--text)",padding:"calc(var(--safe-top) + 18px) 18px calc(var(--safe-bottom) + 32px)",fontFamily:"'Manrope',sans-serif"};
  const inner={maxWidth:560,margin:"0 auto"};
  const back={background:"none",border:"none",color:"var(--blue)",fontSize:15,fontWeight:700,cursor:"pointer",padding:"6px 0",marginBottom:6};
  const card={background:"var(--sur)",border:"1px solid var(--line-soft)",borderRadius:18,padding:"6px 16px 14px",marginTop:14,boxShadow:"var(--shadow)"};
  const h2={fontSize:14.5,fontWeight:800,color:"var(--mint)",margin:"16px 0 8px",letterSpacing:.2};
  const pS={fontSize:14,lineHeight:1.6,color:"var(--text)",margin:0};
  const sec=function(h, body){
    return React.createElement("div",{style:card},
      React.createElement("div",{style:Object.assign({},h2,{marginTop:8})}, h),
      Array.isArray(body)
        ? React.createElement("ul",{style:{margin:0,paddingLeft:"1.15em"}}, body.map(function(x,i){ return React.createElement("li",{key:i,style:{fontSize:14,lineHeight:1.6,marginBottom:6}}, x); }))
        : React.createElement("p",{style:pS}, body)
    );
  };
  return React.createElement("div",{style:wrap}, React.createElement("div",{style:inner},
    React.createElement("button",{style:back,onClick:onClose}, "‹ "+t("st_back_settings")),
    React.createElement("div",{className:"serif",style:{fontSize:25,margin:"2px 0 4px"}}, "🔒 "+t("pv_title")),
    React.createElement("div",{style:{color:"var(--muted)",fontSize:12.5,marginBottom:4}}, t("pv_updated")),
    sec(t("pv_s1_h"), t("pv_s1")),
    sec(t("pv_s2_h"), t("pv_s2")),
    sec(t("pv_s3_h"), t("pv_s3")),
    sec(t("pv_s4_h"), t("pv_s4"))
  ));
}

/* Hogar y compartido DENTRO de Ajustes (2026-07-18): con la nav v4 de 4 tabs, la pestaña
   «Compartido» (hogar + grupos de gastos) se quedó sin sitio y era inalcanzable. Mismo patrón
   de pantalla propia que ActivityPanel/PrivacyPanel. */
function SharedPanel({state, set, uid, totals, showToast, meEmail, onClose}){
  useBackClose(true, onClose);
  const wrap={position:"fixed",inset:0,zIndex:96,overflowY:"auto",background:"var(--bg)",color:"var(--text)",padding:"calc(var(--safe-top) + 18px) 18px calc(var(--safe-bottom) + 28px)",fontFamily:"'Manrope',sans-serif"};
  const inner={maxWidth:480,margin:"0 auto"};
  const back={background:"none",border:"none",color:"var(--blue)",fontSize:15,fontWeight:700,cursor:"pointer",padding:"6px 0",marginBottom:6};
  return React.createElement("div",{style:wrap}, React.createElement("div",{style:inner},
    React.createElement("button",{style:back,onClick:onClose}, "‹ "+t("v4_back")),
    React.createElement("div",{className:"serif",style:{fontSize:25,margin:"2px 0 10px"}}, "🏠 "+t("st_shared")),
    React.createElement(Shared,{state:state,set:set,uid:uid,totals:totals,showToast:showToast,meEmail:meEmail})
  ));
}

/* Sugerencias con pantalla propia (2026-07-18): antes la caja vivía dentro del popup de
   Novedades y quedaba enterrada entre versiones. Novedades queda solo como historial. */
function FeedbackPanel({state, set, showToast, onClose}){
  useBackClose(true, onClose);
  const [fb,setFb]=useState("");
  const [sending,setSending]=useState(false);
  const notes=(state&&state.verNotes)||[];
  const sendFb=function(){
    const txt=fb.trim(); if(!txt||sending) return;
    // El apunte se guarda SIEMPRE en el estado (sincroniza y se ve abajo); el envío a
    // app_events es aparte y avisa si no pudo (sin perder nada).
    const note={id:uid(), v:CONFIG.APP_VERSION, text:txt, date:new Date().toISOString()};
    set(function(s){ return Object.assign({},s,{verNotes:[note].concat(s.verNotes||[])}); });
    setSending(true);
    Promise.resolve().then(function(){ return cloud.feedback(txt); })
      .then(function(){ showToast(t("wn_fb_sent")); })
      .catch(function(){ showToast(t("wn_fb_offline")); })
      .then(function(){ setSending(false); });
    setFb("");
  };
  const delNote=function(id){ set(function(s){ return Object.assign({},s,{verNotes:(s.verNotes||[]).filter(function(n){ return n.id!==id; })}); }); };
  const wrap={position:"fixed",inset:0,zIndex:96,overflowY:"auto",background:"var(--bg)",color:"var(--text)",padding:"calc(var(--safe-top) + 18px) 18px calc(var(--safe-bottom) + 28px)",fontFamily:"'Manrope',sans-serif"};
  const inner={maxWidth:480,margin:"0 auto"};
  const back={background:"none",border:"none",color:"var(--blue)",fontSize:15,fontWeight:700,cursor:"pointer",padding:"6px 0",marginBottom:6};
  const inp={width:"100%",minHeight:96,padding:"10px 12px",borderRadius:12,border:"1px solid var(--line)",background:"var(--bg-2)",color:"var(--text)",fontSize:14,fontFamily:"'Manrope',sans-serif",boxSizing:"border-box",resize:"vertical"};
  return React.createElement("div",{style:wrap}, React.createElement("div",{style:inner},
    React.createElement("button",{style:back,onClick:onClose}, "‹ "+t("st_back_settings")),
    React.createElement("div",{className:"serif",style:{fontSize:25,margin:"2px 0 4px"}}, t("wn_fb_title")),
    React.createElement("div",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.5,marginBottom:12}}, t("wn_fb_hint")),
    React.createElement("textarea",{style:inp,placeholder:t("wn_fb_ph"),value:fb,onChange:function(e){ setFb(e.target.value); }}),
    React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:10},disabled:!fb.trim()||sending,onClick:sendFb}, sending?"…":("💬 "+t("wn_fb_send"))),
    notes.length>0 && React.createElement("div",{style:{marginTop:16}},
      React.createElement("div",{style:{fontWeight:700,fontSize:12,color:"var(--muted)",marginBottom:6}}, t("wn_yours")),
      notes.map(function(n){ return React.createElement("div",{key:n.id,style:{display:"flex",gap:8,alignItems:"flex-start",padding:"7px 0",borderTop:"1px solid var(--line)",fontSize:12,lineHeight:1.5}},
        React.createElement("div",{style:{flex:1,overflowWrap:"anywhere"}}, React.createElement("span",{style:{color:"var(--muted-2)"}},"v"+n.v+" · "+new Date(n.date).toLocaleDateString(loc(),{day:"2-digit",month:"2-digit"})+" — "), n.text),
        React.createElement("button",{className:"ex-del",title:"🗑",onClick:function(){ delNote(n.id); }},"🗑")); })
    )
  ));
}

/* ============================================================
   ✨ NOVEDADES — popup al actualizar + histórico + sugerencias
   ============================================================
   El CONTENIDO de las notas va solo en castellano a propósito (release notes para el
   círculo actual); el marco del panel sí está traducido (wn_*). Al publicar una versión:
   añadir su entrada AL PRINCIPIO del array, en cristiano y sin jerga. */
var RELEASE_NOTES=[
  {v:"4.6.2", d:"20 jul 2026", t:"Arreglos: tabs con letra pequeña + «gasto diario» en cada banco", items:[
    "📱 Con la letra en «Pequeña» la barra de abajo se quedaba flotando más arriba de la cuenta: ya vuelve a estar pegada abajo (y de paso queda perfecta también en Grande/Enorme).",
    "🛒 «Gasto diario» con varios bancos ahora está DONDE tiene que estar: en Cartera → editar cuentas, un botón «En gasto diario» en cada banco (con su iniciales), y puedes marcar los que quieras. Los marcados salen con un 🛒 en la lista. Ya no está escondido en una sección aparte.",
    "🔄 El widget vuelve a empujar sus datos cada vez que abres la app, no solo cuando cambian — para que MIUI/HyperOS no se quede con la cifra vieja. (Si aún así no se actualiza: quítalo del escritorio y vuelve a añadirlo.)",
  ]},
  {v:"4.6.1", d:"18 jul 2026", t:"Ajustes del lote: letra pequeña, Hogar fuera de Ajustes, animaciones con más chispa", items:[
    "🔡 En Accesibilidad ahora hay también «Pequeña» (además de Normal/Grande/Enorme).",
    "🏠 «Hogar y gastos compartidos» sale de Ajustes y vive en Cartera, abajo del todo — es una funcionalidad de la app, no un ajuste.",
    "🪙 Los «bancos de gasto diario» (marcar varios para el mismo presupuesto) se ven y se editan también en Cartera → editar cuentas, no solo en Ajustes → Dinero.",
    "✨ Las temáticas de temporada tienen ahora más vidilla estilo Revolut: 3 capas de profundidad (parallax), caída orgánica con giro y balanceo, un halo de color que respira arriba y el botón + con pulso. (Se apaga con «Reducir animaciones».)",
    "🔌 MyInvestor y el widget: el código nuevo ya está, pero el captcha necesita una pieza nativa que aún no puedo montar por actualización web, y el widget necesita que el APK que lo lleva esté bien instalado. Sigo con ello.",
  ]},
  {v:"4.6.0", d:"18 jul 2026", t:"Temáticas, accesibilidad, metas con teclado propio y más monedas", items:[
    "🎯 Al aportar a una meta ya no salta el teclado del móvil (que rompía la estética): ahora abre una hoja con teclado numérico propio, como el botón +, y eliges de qué banco lo aportas.",
    "🎉 Temáticas de temporada en Ajustes → Apariencia: Mundial (España), Halloween, Navidad, Verano, Invierno y Pascua. Cada una re-tinta el botón + y deja caer un detalle animado (nieve, hojas, balón…). Se apaga con «Reducir animaciones» o eligiendo «Ninguna».",
    "♿ Nueva sección Accesibilidad: tamaño de letra en 3 niveles (Normal/Grande/Enorme) que ahora escala TODA la app —incluidos los diálogos y hojas, que antes se quedaban pequeños y descuadrados—, «Reducir animaciones» y «Más contraste».",
    "💱 Muchas más monedas (yen, dólar canadiense/australiano, yuan, coronas, złoty, real, rupia…) y una comparativa rápida «1 € = …» con los tipos del BCE.",
    "🪙 Ahora puedes marcar VARIOS bancos como gasto diario (Ajustes → Dinero): si en un viaje usas Trade Republic y Revolut, las compras de ambos cuentan en el mismo presupuesto.",
    "📱 El widget de inicio ya no enseña solo lo gastado: añade «Puedes gastar X €» — lo que te puedes permitir sin pasarte ni quedarte en rojo. (Necesita el APK nuevo para que llegue al escritorio.)",
    "💼 En Cartera se guarda tu selección de patrimonio (líquido/inversiones/bienes) aunque cierres la app, y la zona de inversiones entra con una animación suave.",
    "🎛️ Ajustes abre siempre con todas las secciones encogidas y con un orden más lógico: Apariencia → Accesibilidad → Para empezar → Dinero → Conexiones → App → Avanzado.",
    "🧾 «Gestionar recibos» y «Herramientas de inversión» ahora combinan con la estética nueva (tarjetas, inputs y enlaces al mismo estilo que el resto).",
    "🌬️ Los ocultamientos (barra inferior, plegar tarjetas) son más suaves, sin cortes secos, tanto al esconder como al aparecer.",
    "🔌 MyInvestor: seguimos preparando el terreno para el captcha (el envío del token ya viaja en la petición). Resolverlo del todo necesita una pantalla nativa nueva; mientras tanto, el aviso sigue explicándolo en cristiano.",
  ]},
  {v:"4.5.1", d:"18 jul 2026", t:"Primera vez que abres Ajustes/perfil: ya se ve el contenido", items:[
    "✨ La primera vez que tiras despacio hacia Ajustes o el perfil ya no sale el panel negro vacío: el contenido se prepara en segundo plano y está listo al arrastrar.",
    "👆 Al bajar el perfil, Resumen se queda quieto (sin scroll a la vez) — eso quitaba fluidez cuando pelean los dos gestos.",
  ]},
  {v:"4.5.0", d:"18 jul 2026", t:"Histórico del banco: a Gastos, Recibos o Ingresos", items:[
    "🏦 Al importar histórico ya salen también los ingresos (nómina, bizums…). En cada movimiento eliges si va a Gastos, a Recibos (fijo mensual con su día) o a Ingresos — así no tienes que teclear la luz a mano si ya está en el banco.",
    "🛒 Al sincronizar un banco marcado en «También apuntar gastos de tarjeta», las compras con tarjeta del mes siguen entrando solas en Gastos (se ven en Todos y filtrando por ese banco) y cuentan para el presupuesto. El rol «gasto diario» sigue siendo uno (TR); el resto son bancos extra de tarjeta.",
  ]},
  {v:"4.4.3", d:"18 jul 2026", t:"Gesto fluido Y con Resumen visible detrás", items:[
    "✨ Al abrir Ajustes o el perfil ya se ve otra vez Inicio detrás (adiós al fondo negro cutre de la 4.4.2), sin volver a los tirones: el truco es no re-pintar el shell en cada milímetro, no ocultarlo.",
  ]},
  {v:"4.4.2", d:"18 jul 2026", t:"Gestos fluidos de verdad + sin cargos vacíos", items:[
    "✨ Al abrir Ajustes o el perfil tirando despacio, Resumen se «congela» un momento: ya no se re-pinta el gráfico en cada milímetro (el tirón de antes).",
    "🏠 Si no hay próximos cargos este mes, esa sección desaparece del todo en Inicio (antes quedaba el hueco vacío).",
  ]},
  {v:"4.4.1", d:"18 jul 2026", t:"Ajustes y perfil sin tirones al arrastrar lento", items:[
    "✨ Si abres Ajustes o el perfil tirando despacio con el dedo, ya no se pone a «cámara lenta» (antes el móvil re-pintaba toda la pantalla en cada milímetro).",
    "🧾 El velo del perfil sigue ahí; el desenfoque fino entra al soltar, que es cuando se nota y no cuesta frames.",
  ]},
  {v:"4.4.0", d:"18 jul 2026", t:"Reconectar un banco en UN toque y avisos con la app cerrada (APK 29)", items:[
    "🔓 Si un banco pierde el permiso, ahora te enteras DONDE miras el saldo: banner en Cartera con botón «Reconectar CaixaBank» que te lleva directo a autorizar — sin bucear por Ajustes. Y si Trade Republic se desconecta, su banner abre la pantalla de reconexión con el teléfono ya puesto (y te aclara que es AQUÍ, no en la app de TR 😉).",
    "🛎 Recibos con la app CERRADA: la app deja programado en Android el calendario del mes y el móvil avisa solo la víspera de cada recibo y cuota. Necesita el APK 4.4.0 (te lo ofrece sola al abrir; instálalo una vez).",
    "📊 Los avisos de presupuesto de los gastos que entran con la app cerrada (notis de TR) ahora también saltan al 50% y al 95% (antes solo al 80% y al pasarte). Esto va por servidor: funciona ya, sin APK nuevo.",
  ]},
  {v:"4.3.0", d:"18 jul 2026", t:"Avisos que valen dinero, deudas con fecha de fin y alegrías en Inicio", items:[
    "🔔 La app ahora te avisa sola: al cruzar el 50%, 80%, 95% y 100% del presupuesto del mes (una vez por umbral), y la VÍSPERA de cada recibo y cuota («mañana se cobran X €») — porque el banco no avisa. Los recibos gordos siguen avisando además con 2-3 días.",
    "📅 La hipoteca y los préstamos sin plazo ya no están «muertos»: ahora ponen «a este ritmo acabas ~febrero 2049» calculado con tu cuota. Amortiza y verás la fecha acercarse.",
    "🎉 Cuando a una financiación le queda LA ÚLTIMA cuota, te lo celebra en Inicio: «¡última cuota este mes! Después, X €/mes libres para ti».",
    "👇 El sheet «Más…» de períodos en Gastos (mes pasado, 3 meses, rango…) ya se cierra tirando hacia abajo y con el gesto atrás — era el único que no.",
    "📊 El informe ahora te dice DÓNDE queda: toast + notificación con el nombre del fichero (carpeta Descargas).",
    "⚙️ Las secciones de Ajustes se despliegan con animación suave (se acabó el corte seco).",
    "🔌 MyInvestor: el «Captcha required» ahora se explica en cristiano (es su anti-bot; esperar y reintentar desde casa) y la app se presenta con versión más nueva ante su API — la palanca documentada contra el captcha. Si con esto sigue, el siguiente paso es resolver el captcha de verdad (necesita trabajo nativo).",
  ]},
  {v:"4.2.0", d:"18 jul 2026", t:"Compras a plazos simuladas, banco en cada apunte y la ronda de arreglos que pediste", items:[
    "📅 «¿Me lo puedo permitir?» ahora también A PLAZOS: pones meses y entrada y te dice la cuota, cómo suben tus fijos, si te cabe cada mes con tu nómina… y con un botón creas la deuda directamente (aparece en Plan → Deudas y descuenta del líquido sola).",
    "🏦 Al apuntar un gasto a mano (el + o editando uno) puedes elegir de qué banco sale. Se recuerda hasta reinstalando la app.",
    "↻ El «Sincronizar» de Cartera ahora también actualiza Trade Republic y MyInvestor (si están conectados), no solo los bancos de Open Banking.",
    "🏠 Arreglado el error al crear un hogar («row-level security policy»): a la base de datos le faltaba un permiso. Hay que pegar la migración 0015 en Supabase (docs/HOGAR.md) — la app ahora además te lo dice en cristiano.",
    "⚙️ Entrar en Ajustes ya no hace ese efecto raro e incómodo: ahora es un deslizamiento limpio, sin desenfoques.",
    "🔀 «Ver más» y «Ver plan» desde Inicio te dejan al PRINCIPIO de Gastos/Metas (antes aterrizabas a mitad de pantalla).",
    "📅 El cartelito de «Mi ciclo» ya no choca con los filtros de abajo.",
    "🖊 Editar los Bienes en Cartera ya no parte los nombres palabra a palabra (la casilla del importe iba sin estilo).",
    "🧹 Textos de bancos en Ajustes a dieta: menos párrafos, mismo contenido.",
    "⚡ Menos micro-tirones usando la app: el guardado local ahora va en segundo plano (y se vuelca siempre al salir).",
  ]},
  {v:"4.1.0", d:"18 jul 2026", t:"Cartera a tu gusto, bancos que no caducan solos y Ajustes puestos al día", items:[
    "🏦 Los bancos ya NO se sincronizan solos al abrir la app (eso les olía a robot y te caducaban la conexión cada dos por tres). Ahora sincronizas tú con el botón «↻ Sincronizar bancos» en Cartera, cuando quieras.",
    "📊 El gráfico de Cartera es tuyo: toca Liquidez, Inversiones o Bienes en la leyenda para marcarlos/desmarcarlos y ver, por ejemplo, líquido + inversiones a secas. Todo marcado = tu patrimonio de siempre.",
    "✏️ Vuelve el editar de verdad en Cartera: nombre y rol (Recibos / Gasto diario / Todo) de cada cuenta — el rol se había quedado sin sitio con el rediseño —, los bienes otra vez editables, y en inversiones un «Editar a mano» pequeñito al pie.",
    "🔒 En las cuentas conectadas al banco solo editas el nombre: el saldo lo trae el banco solo (editarlo a mano era engañarse).",
    "🏠 Hogar y gastos compartidos han vuelto: estaban implementados pero el rediseño los dejó sin puerta. Ahora en Ajustes → Conexiones → «Hogar y gastos compartidos».",
    "🎯 Al scrollear las metas en Inicio ya no se te escapa la pestaña, y los dos «Ver plan ›» te llevan al sitio correcto (cargos → Recibos, metas → Metas).",
    "⬇️ La barra de abajo, al esconderse, deja ver el contenido (antes quedaba un bloque vacío) y anima con la misma curva que el resto.",
    "⚙️ Ajustes: botones a tamaño humano, animación suave por secciones, huella y cerrar sesión otra vez a mano, sugerencias con su propio botón, más monedas (£ y CHF), y fuera lo deprecado.",
    "📸 El informe del mes ya no «no hace nada»: si el menú de compartir falla, la imagen se descarga igualmente.",
  ]},
  {v:"4.0.15", d:"17 jul 2026", t:"Bancos que aguantan, oro con su %, barra que se esconde y Ajustes más guapos", items:[
    "🏦 Open Banking ya no se cae «cada dos por tres»: un fallo pasajero del banco (rate-limit, un 403/404 suelto) ya NO te desconecta ni te pide reconectar. Solo se marca «reconéctate» cuando el permiso caducó de verdad.",
    "🥇 Materias primas de Revolut: al importar el CSV puedes escribir lo que te costó en € y por fin ves si el oro/plata sube o baja (el precio ya se actualizaba solo; faltaba el coste, que Revolut no manda en ese extracto).",
    "⬇️ La barra de abajo se esconde al bajar y vuelve al subir o al cambiar de pestaña (como Revolut), con la misma animación suave de siempre.",
    "🔒 Privacidad: ahora se abre DENTRO de la app, con su botón de volver — se acabó la ventana que quedaba pegada arriba y de la que costaba salir.",
    "⚙️ Ajustes: repaso de arriba abajo, quitando restos antiguos y dejándolo más limpio.",
  ]},
  {v:"4.0.14", d:"17 jul 2026", t:"Editar gasto: categorías sin cambiar de pestaña", items:[
    "🧾 Al modificar un gasto, al deslizar las categorías ya no se mueve la app de detrás (igual que en el + y en los filtros de Gastos).",
  ]},
  {v:"4.0.13", d:"17 jul 2026", t:"Perfil se cierra tirando abajo + fondo al apuntar", items:[
    "👤 En el perfil, desliza de arriba hacia abajo y se encoge otra vez al avatar (la misma animación, hacia atrás).",
    "🧾 Al pulsar + o editar un gasto desde cualquier pestaña, se ve la pantalla de detrás (como ya pasaba en Resumen).",
  ]},
  {v:"4.0.12", d:"17 jul 2026", t:"MyInvestor sin captcha", items:[
    "🔌 Conectar MyInvestor ahora hace el login desde TU móvil (como la app oficial): el dichoso reCAPTCHA saltaba porque el login salía de un servidor de Amazon. Desde tu IP de casa casi nunca aparece.",
    "☁️ Todo lo demás sigue igual: la sesión se guarda cifrada en la nube y las posiciones se refrescan solas. Funciona ya con el APK que tienes (te llega por OTA).",
    "🧪 El gesto del perfil (abrir arrastrando hacia abajo, cerrar hacia arriba) queda cubierto por test automático."
  ]},
  {v:"4.0.11", d:"17 jul 2026", t:"El perfil baja como en Revolut + TR sin dramas", items:[
    "👤 El perfil ahora nace del avatar y crece hasta llenar la pantalla mientras el fondo se desenfoca — como en Revolut, también tirando hacia abajo desde Inicio con el dedo.",
    "🏦 Trade Republic: si la sesión caduca de verdad, la app te lleva directa a reconectar con el teléfono ya puesto (PIN + código y listo). Ya no hay que pulsar «Desconectar».",
    "📱 APK 4.0.11 (versionCode 28): la sesión de TR se guarda en más momentos (también al salir de la app) para que no «caduque» sola cada dos por tres."
  ]},
  {v:"4.0.10", d:"17 jul 2026", t:"La app nueva llega sola a todos", items:[
    "📱 Si hay APK nueva, al abrir Mi Cartera se lanza el instalador (tú, tu padre y tu pareja). Solo confirma «Instalar» en Android.",
    "🔔 La notificación de «app nueva» ya abre el instalador de verdad (antes se confundía con el update web)."
  ]},
  {v:"4.0.9", d:"17 jul 2026", t:"Verde más vivo + APK 4.0.9 alineado", items:[
    "🌿 El tema verde vuelve a verse más cálido (menos seco/oscuro). Las fichas llevan un velo verdoso suave, no negro.",
    "📱 APK 4.0.9 (versionCode 27): Trade Republic ya no se desconecta solo por un sync fallido al abrir. Instálalo una vez; el resto sigue por OTA."
  ]},
  {v:"4.0.8", d:"17 jul 2026", t:"Tutorial al avatar, fichas sin negro y bancos claros", items:[
    "🎓 El tutorial ahora encierra el círculo del avatar (antes medía a medias del swipe y el foco salía vacío).",
    "🧾 Al editar un gasto o pulsar +, se ve la app detrás de verdad: sin fondo negro ni scale raro.",
    "👤 Perfil: capa de atenuado aparte (sin achicar la app), botón ✕ y animación más suave.",
    "🏦 Brókers con tarjetas marcadas (TR / MI / CSV) y la versión abajo — así ves si ya tienes el update.",
    "🔌 Trade Republic ya no se sincroniza solo al abrir (eso te deslogueaba con el APK viejo). Sync a mano. El arreglo nativo sigue necesitando APK 4.0.7+."
  ]},
  {v:"4.0.7", d:"17 jul 2026", t:"Novedades suaves, perfil natural, Pádel y fichas sin negro", items:[
    "✨ Tras un update, Novedades entra con animación suave (sin el salto de antes).",
    "👤 Perfil: abrir y cerrar más naturales (cierra tirando hacia arriba, como entró); sin fondo negro raro.",
    "🧾 En editar gasto y en +, se ve la app detrás con un velo suave; al tirar abajo cierra más rápido.",
    "🎾 Nueva categoría Pádel (🎾): Playtomic y pádel ya no van a Ocio/cine. Un «restaurante de pádel» sigue en Bares.",
    "🏦 Brókers en tarjetas planas; Trade Republic no se marca desconectado por un sync fallido (hace falta el APK 4.0.7).",
    "🔌 MyInvestor: el captcha lo pone su anti-bot — espera un rato y reintenta; el device_id se reutiliza para pedirlo menos."
  ]},
  {v:"4.0.6", d:"17 jul 2026", t:"Perfil más fino, Gastos ordenados y bancos claros", items:[
    "👤 Perfil: tipografía compacta, animación más suave, tirar abajo para salir; casillas de editar al tamaño del texto guardado.",
    "🧾 En Gastos: nombre, debajo la categoría y abajo fecha · banco (como Mapfre).",
    "🏦 Bancos: brókers en tarjetas planas (sin acordeones) y sync suave de TR/MI al abrir sin pedir captcha a ciegas.",
    "🔌 MyInvestor reutiliza el device_id de la nube y prueba un sync suave si estaba «caducado»."
  ]},
  {v:"4.0.5", d:"17 jul 2026", t:"Perfil al tirar abajo, fichas sin velo y bancos que no se desconectan solos", items:[
    "👤 En Inicio, tira hacia abajo (o el avatar) y baja tu perfil al estilo Revolut: datos personales, patrimonio y perfil inversor, editables.",
    "🧾 Las fichas de gasto y Apuntar ya no ponen el fondo negro; al cerrarlas no hay el parpadeo de antes.",
    "🏦 Mis bancos más limpio, al estilo del resto de la app.",
    "🔌 Trade Republic y MyInvestor ya no se desconectan solos al abrir la app (ni MyInvestor te pide captcha por un 403 de anti-bot).",
    "📱 Para el arreglo nativo de Trade Republic hace falta el APK 4.0.5."
  ]},
  {v:"4.0.4", d:"17 jul 2026", t:"Tutorial nuevo, fichas más suaves y Plan compacto", items:[
    "🎓 Tutorial actualizado al rediseño: Inicio, Gastos, +, Plan, Cartera y Ajustes.",
    "👆 En Gastos, scrollear categorías/bancos ya no hace el amago de cambiar de pestaña.",
    "🧾 Tirar hacia abajo para cerrar (+ y editar gasto) es más suave, al estilo del swipe entre tabs; en editar gasto vale en toda la ficha.",
    "✨ Ficha de editar gasto más clara: importe grande, comercio, categoría y tipo gasto/ingreso.",
    "📅 En Plan, Pendiente y Ya pagado vuelven a mostrar 3 y «Ver más».",
    "💼 En Cartera, fuera el número verde al lado de inversiones y la tarjeta de redondeo."
  ]},
  {v:"4.0.3", d:"17 jul 2026", t:"Ajustes ordenados y aviso de update con la app cerrada", items:[
    "🔔 Si hay actualización, el móvil te avisa aunque no tengas la app abierta (hace falta instalar el APK nuevo una vez).",
    "👈 En Inicio, Ajustes se abre deslizando desde casi toda la pantalla (no solo el borde).",
    "⚙️ Ajustes agrupado por secciones (apariencia, dinero, conexiones…); Actividad (admin) al final y fuera el botón de Sentry.",
    "💶 En Gastos, céntimos y € del balance van en el mismo blanco que el entero.",
    "🧾 Ficha de gasto y Apuntar más compactos; tira hacia abajo desde cualquier sitio de la hoja.",
    "📅 En Plan, «Ya pagado» lista todo lo del mes (incluidos ingresos y transferencias ya hechos).",
    "💼 Herramientas de inversión sin brókers duplicados, sin editar a mano ni precios USD.",
    "👆 En Gastos, si las categorías están al inicio, deslizar cambia de pestaña; al volver, los chips vuelven al principio."
  ]},
  {v:"4.0.2", d:"17 jul 2026", t:"Ajustes con swipe, balance claro y más categorías", items:[
    "👈 Ajustes se abre de verdad deslizando de izquierda a derecha (el panel ya estaba listo para el gesto).",
    "💶 El balance de Gastos va en blanco, sin el menos, y con el € al lado.",
    "🧾 Al editar un gasto, las etiquetas de fecha/banco quedan centradas y el fondo ya no se mueve al pasar categorías.",
    "🍿 Nueva categoría Cine (Kinepolis…) y más palabras clave para salud, Claude, Google Play…",
    "💼 Inversiones con el mismo diseño que tus cuentas; el resto (precios, redondeo…) en «Herramientas de inversión».",
    "👆 Cambio entre pestañas más suave, al estilo Trade Republic.",
    "📱 Status bar y barra de abajo al color de la app (APK nuevo)."
  ]},
  {v:"4.0.1", d:"17 jul 2026", t:"Pulido del rediseño: gestos, fichas y números que cuadran", items:[
    "👈 Ajustes se abre deslizando desde el borde (como Revolut) y se cierra tirando a la izquierda; el avatar sigue valiendo.",
    "🏠 En Inicio, «Próximos cargos» ya no enseña recibos que ya pagaste este mes.",
    "💶 En Gastos, el resumen cuenta también los ingresos (y el ajuste de Ajustes vuelve a cambiar la vista).",
    "🧾 Fichas de gasto: fecha y banco con margen, fecha legible al editar, y tira hacia abajo para cerrar (también el +).",
    "📅 En Plan › Recibos, «Gestionar» abre fijos y herramientas; «Ya pagado» enseña 3 y el resto con Ver más.",
    "💼 Cartera más limpia: brókers desplegables sin botones ni auto-precios de más.",
    "📱 Status bar del móvil al color de la app (hace falta actualizar el APK nativo)."
  ]},
  {v:"4.0.0", d:"17 jul 2026", t:"Rediseño completo: más claro, más rápido, más tuyo", items:[
    "🏠 Nueva navegación: Inicio, Gastos, botón + para apuntar, Plan y Cartera.",
    "✨ Inicio responde «¿cómo voy?» con patrimonio, presupuesto en humano y próximos cargos.",
    "➕ El botón verde del centro abre el teclado para apuntar un gasto o ingreso al momento.",
    "📅 Plan junta recibos, deudas y metas con cards claras (lo pendiente, lo que debes, lo ahorrado).",
    "💼 Cartera muestra patrimonio, cuentas, redondeo e inversiones sin pantallas de más.",
    "🧾 En Gastos, toca un movimiento para editarlo en una ficha (categoría, tarjeta, borrar).",
    "💶 Toca el presupuesto en Inicio para cambiarlo con −/+ (pasos de 50 €).",
    "👋 Onboarding en 3 pasos: claim, demo de gastos y presupuesto con −/+.",
    "⚙️ Ajustes desde el avatar: perfil, temas en círculos, modo sencillo y conexiones."
  ]},
  {v:"3.113.3", d:"16 jul 2026", t:"Arranque más ligero y desliz entre pestañas más limpio", items:[
    "⚡ Al abrir la app (sobre todo tras vaciar recientes) se carga menos «por detrás» antes de pintar Resumen.",
    "👆 Al deslizar a Gastos el contenido se prepara mientras mueves el dedo, no al soltar.",
    "⚙️ El menú de Ajustes ya no se construye entero hasta que lo abres la primera vez.",
    "🎬 La pantalla de «Cargando…» se desvanece un pelín más suave al terminar de abrir."
  ]},
  {v:"3.113.2", d:"16 jul 2026", t:"Sin parpadeos al cambiar de pestaña y updates más ágiles", items:[
    "🏦 Al ir de Resumen a Gastos (y al revés) ya no «parpadean» los bancos ni el contenido.",
    "⚡ Arranque: Gastos no se monta en segundo plano a lo loco; solo cuando lo tocas.",
    "⬇️ Si hay versión nueva, el aviso sale antes (mientras descarga) y, si ya estaba lista, te avisa al abrir si aún no te había avisado.",
    "🛡️ El botón de «error de prueba» de Sentry en Ajustes solo lo ves tú (como Actividad); el resto de la casa no."
  ]},
  {v:"3.113.1", d:"16 jul 2026", t:"Más comercios reconocidos en Gastos", items:[
    "🏛️ Nueva categoría «Impuestos y multas» para cosas como Gencat, AEAT, DGT, ayuntamientos o sanciones.",
    "🧠 El detector de categorías reconoce más comercios reales sin llenar de botones el filtro: mejor diccionario, misma pantalla simple.",
    "✅ Se han añadido pruebas para que no se rompan casos raros como Zooplus, Booking o papelerías."
  ]},
  {v:"3.113.0", d:"16 jul 2026", t:"Arranque más suave, divisas y categorías inteligentes", items:[
    "⚡ Menos tirón al abrir la app y pasar a Gastos la primera vez (sobre todo tras vaciar las apps en Android).",
    "💱 Inversiones y cuentas en USD/GBP/CHF se pasan a € con tipos del BCE; si editas el coste invertido, queda anclado en euros.",
    "✨ En un gasto «Otros» puedes pedir sugerencia de categoría (palabras clave; IA opcional si está configurada en el servidor).",
    "🛡️ Sentry activo en la versión publicada: en Ajustes puedes enviar un error de prueba."
  ]},
  {v:"3.112.0", d:"16 jul 2026", t:"Tutorial claro y filtro por banco en Gastos", items:[
    "🎓 Tutorial y trucos de Gastos/Fijos/Patrimonio más claros: qué va en cada sitio, nómina/Bizum como Ingreso, y dónde marcar varios bancos.",
    "🏦 En Gastos puedes filtrar por banco (Caixa, Trade Republic, a mano…). Cada movimiento enseña de qué banco es.",
    "💡 Los trucos de esas pestañas vuelven a salir una vez para que no te los pierdas."
  ]},
  {v:"3.111.0", d:"16 jul 2026", t:"Varios bancos en Gastos y roles más claros", items:[
    "🛒 ¿Gastos o Fijos? Los trucos de cada pestaña y los roles en Patrimonio explican en cristiano: recibos/cuotas van a Fijos; supermercado y bares a Gastos.",
    "🏦 Varios bancos de gasto: en Ajustes → Bancos marcas «También apuntar gastos de tarjeta de…» (Caixa, Sabadell…). El presupuesto del día a día sigue en una sola cuenta.",
    "🔄 El banco se actualiza más a menudo (al volver a la app y cada ~hora y media), no solo cada muchas horas.",
    "✅ En Fijos, los cargos nuevos del banco se confirman con «Confirmar y apuntar» — menos tecleo.",
    "📱 App Android (alpha22): si Caixa/Sabadell te avisan con una noti, se piden los movimientos al banco (sin leer el importe de la noti)."
  ]},
  {v:"3.110.0", d:"16 jul 2026", t:"Fin de mes en paz, Hogar completo y tutorial arreglado", items:[
    "😌 Fin de mes en paz: en el Resumen ves cuánto puedes gastar al día y si vas demasiado rápido.",
    "📊 Presupuesto por categoría con barritas (Editar → super=200, ocio=80…).",
    "🏠 Hogar Fase 2: al publicar tu vista se suman gastos por categoría y fijos del hogar (solo lectura).",
    "🔔 Aviso de recibos gordos 1–3 días antes (app Android).",
    "🛟 Tutorial: ya no se queda pillado en los interrogantes «?»."
  ]},
  {v:"3.109.0", d:"15 jul 2026", t:"Hogar compartido e informe del mes", items:[
    "🏠 Hogar compartido (Fase 1): crea un hogar, invita con código de 6 letras y ve el patrimonio fusionado — cada uno publica SU vista, sin mezclar datos.",
    "📊 El día 1 de cada mes te ofrece el informe automático (imagen para WhatsApp). También en Ajustes → Personalización.",
    "⚡ Cambio de pestaña más fluido (pre-carga + animación optimizada)."
  ]},
  {v:"3.108.0", d:"15 jul 2026", t:"Más rápida, más sólida, lista para crecer", items:[
    "⚡ Arranque más fluido: las pestañas que no ves aún no cargan su contenido hasta que las visitas (menos tirones en móviles modestos).",
    "🧩 Código modular en src/ (13 módulos): más fácil de mantener y escalar sin partir el despliegue.",
    "🛡️ Sentry opcional para crashes en producción; Playwright E2E + tests de borrado de cuenta."
  ]},
  {v:"3.107.0", d:"15 jul 2026", t:"Actualizaciones que avisan solas", items:[
    "🔔 Cuando hay una versión nueva lista, te llega una notificación al móvil (tú y quien use la app en su cuenta).",
    "✨ El botón «Nueva versión · toca para actualizar» vuelve a aparecer en cuanto el bundle está descargado — también si cierras y abres la app.",
    "🔄 La app busca updates al arrancar, al volver a primer plano y cada 30 minutos con la app abierta."
  ]},
  {v:"3.106.0", d:"15 jul 2026", t:"Documentación y tests de lo que ya teníamos", items:[
    "👥 Multi-usuario en ingest: cada persona con su token en Ajustes → notificaciones TR (no hace falta JWT en el lector Android).",
    "🚗 Financiación coche: entrada + cuotas + pago final + asesor «¿Cuándo amortizar?» — ya estaba; ahora con tests automáticos.",
    "📋 Nueva tarjeta «Sin cotización automática» en Inversiones: guía para fondos MyInvestor y posiciones sin ticker en TR."
  ]},
  {v:"3.105.0", d:"15 jul 2026", t:"Dashboard de inversiones más completo", items:[
    "📈 El gráfico de evolución muestra valor y coste aportado (línea discontinua) y el cambio % del periodo.",
    "🔄 El histórico se actualiza al refrescar precios o editar posiciones, no solo al abrir la app.",
    "📊 La tarjeta de evolución aparece desde el primer día; al segundo ya ves la tendencia."
  ]},
  {v:"3.104.0", d:"15 jul 2026", t:"Onboarding completo para usuarios nuevos", items:[
    "👋 Si es tu primera vez, un asistente de 4 pasos te guía: presupuesto, cuentas y (opcional) una deuda o inversión. Empiezas con la cartera vacía, sin datos de ejemplo.",
    "📋 En el Resumen verás «Primeros pasos» hasta que lo cierres: un acceso rápido a Ajustes para conectar bancos o activar el apunte de Trade Republic.",
    "☁️ Si ya tenías cartera en la nube e inicias sesión en otro móvil, no te vuelve a pasar el asistente."
  ]},
  {v:"3.103.0", d:"15 jul 2026", t:"Deudas que bajan solas y más tests de fiabilidad", items:[
    "📉 Las cuotas de tus deudas (hipoteca, coche, préstamos…) ahora restan del líquido del banco automáticamente, igual que los gastos fijos. Si no pones día de cargo, se asume el día 1.",
    "📊 El saldo pendiente de cada deuda sigue bajando mes a mes sin que tengas que tocarlo a mano.",
    "🔐 Si acabas de activar el cifrado de tokens en Supabase, la próxima sincronización con MyInvestor re-cifra los enlaces antiguos sola.",
    "✅ Más tests automáticos: motor de deudas, conciliación con el banco y saldos de Open Banking."
  ]},
  {v:"3.102.0", d:"15 jul 2026", t:"Más seguridad y control de tu cuenta", items:[
    "🔐 Los tokens de sesión de MyInvestor y del banco se guardan cifrados en el servidor. Tus contraseñas nunca se almacenan — solo los tokens que devuelve el banco al conectar.",
    "👤 Puedes leer la política de privacidad y borrar tu cuenta desde Ajustes → Tu cuenta. El borrado pide tu contraseña y elimina todos tus datos de la nube.",
    "📱 Si editas en dos móviles a la vez, la app detecta el conflicto y recarga la versión más reciente de la nube en lugar de pisarla sin avisar."
  ]},
  {v:"3.101.0", d:"15 jul 2026", t:"Más fiabilidad por detrás: tests automáticos y datos más seguros", items:[
    "🛡️ El repositorio ya no lleva datos financieros personales: la semilla del código es sintética y solo sirve para migraciones técnicas. Tus datos reales siguen en tu cuenta y en tu móvil, como siempre.",
    "✅ Antes de cada despliegue se ejecutan tests automáticos: comprueban que el código no tiene errores de sintaxis y que los cálculos clave (round-up, importadores Revolut, clasificación de gastos TR) siguen cuadrando.",
    "🏷️ Las categorías de los gastos que entran por notificación de Trade Republic ahora coinciden mejor con las de la app (panadería, parking, peluquería… ya no se van a parar a sitios raros)."
  ]},
  {v:"3.100.0", d:"15 jul 2026", t:"Tu oro de Revolut ya entra, y se acabaron los cuadros grises de Android", items:[
    "🥇 ¡Revolut ya trae tu oro y tu plata! Nunca fue un fallo de lectura: Revolut los guarda en un extracto APARTE («Materias primas»), no en el de acciones, así que el importador ni los veía. Ahora puedes subir los dos extractos a la vez y se fusionan solos. Tu oro pasa a tener onzas de verdad y precio en vivo, en lugar de un número que mantenías a mano.",
    "🧭 Si te equivocas de fichero, ahora te digo cuál es: el «Extracto de Pérdidas y Ganancias» solo trae lo que YA vendiste, no lo que tienes (y ojo, que Revolut le pone un nombre engañoso a uno de ellos). Antes solo salía «no he podido leer el CSV» y a adivinar.",
    "💬 Los cuadros de «Amortizar», «Aportar a una meta» o «Vender parte» ya son de la app: mismos colores, misma letra y botones en español. Antes se asomaba el cuadro gris de Android con «CANCEL / OK» y desentonaba muchísimo. De regalo, ahora traen atajos (100 €, 250 €, «Todo») y te recuerdan cuánto llevas pendiente. ¡Gracias por el aviso! 💚"
  ]},
  {v:"3.99.0", d:"15 jul 2026", t:"Trade Republic ya aguanta en frío, brókers que se actualizan solos y menos avisos", items:[
    "🏆 ¡Arreglado el fallo de Trade Republic al abrir la app en frío! Llevaba meses pidiendo el 2FA una y otra vez. No era el control anti-bot como creíamos: Android se cargaba la sesión al cerrar la app del todo. Ahora se guarda a mano y sobrevive. (Si pasas varios días sin entrar, sí tendrás que reconectar: eso lo decide Trade Republic.)",
    "🔄 Trade Republic y MyInvestor se actualizan SOLOS al abrir la app, sin darle a «Sincronizar». Va en silencio y con cabeza: refresca lo que ya tienes mapeado y como mucho cada media hora. Lo nuevo lo sigues revisando tú en su tarjeta.",
    "🔕 Fuera dos avisos pesados: el del saldo del banco (que saltaba en cada apertura) y el de errores. El saldo ya lo ves en Patrimonio, y ahora solo te avisa si lo pides tú.",
    "🏦 «Gestionar mis bancos» a dieta: se queda con lo básico — actualizar saldo, reconectar y quitar. Clasificar un banco (recibos / gasto diario / todo) sigue estando en Patrimonio → Editar."
  ]},
  {v:"3.98.0", d:"13 jul 2026", t:"Revolut cuadrado: fuera duplicados y precios en vivo de verdad", items:[
    "🧹 Los duplicados fantasma de Revolut (esos «NVDA 0,00 € · −100%» al lado de tu NVIDIA de verdad) se van solos al abrir la app: eran restos del importador antiguo.",
    "💹 Al aplicar un extracto de Revolut, el valor de cada posición también se recalcula (antes solo se tocaban participaciones y coste, y el % salía disparatado: un Broadcom a −39% que en Revolut estaba a −6%). Y nada más aplicar, los precios se actualizan en vivo solos.",
    "📈 «Precios USD» ahora cotiza cualquier ticker de tu cartera (antes estaba clavado a 6 valores fijos) y también el oro (XAU).",
    "🗑️ Ya puedes borrar una posición a mano: «Editar a mano» → 🗑 Borrar. Antes los cadáveres se quedaban en la lista para siempre."
  ]},
  {v:"3.97.0", d:"13 jul 2026", t:"Importar Revolut arreglado, asesor de amortización y Ajustes con buscador", items:[
    "💹 El importador de Revolut ya lee bien los números: entiende importes con coma española («88,94 €»), ventas sin cantidad, y no resucita posiciones que ya vendiste. Además, por defecto NO crea posiciones nuevas — tú decides qué se toca, y cada posición enseña sus compras/ventas para poder cuadrarla con la app de Revolut.",
    "💡 Nuevo en Deudas: el asesor «¿Cuándo amortizar?». Ponle el interés a la deuda, di cuánto amortizarías y te dice cuántas cuotas te quitas, cuánto ahorras en intereses y si te compensa frente a tu efectivo remunerado.",
    "⚙️ Ajustes reorganizado: secciones plegadas y buscador arriba («tema», «banco», «copia»…). Se acabó el scroll kilométrico.",
    "🎓 Mini-tutoriales por pestaña: la primera vez que entras en cada una te cuenta sus trucos (p.ej. el lápiz ✎ para editar un gasto). Los relees cuando quieras con el botoncito «💡 ¿Cómo va esto?».",
    "📈 La sesión de MyInvestor ahora se mantiene viva sola (el servidor la renueva cada 10 minutos). Si aún así caduca, la app te lo canta y recuerda tu usuario — la contraseña nunca se guarda.",
    "💇 Categoría nueva: Peluquería (cortes, uñas y estética ya no caen en «Salud»)."
  ]},
  {v:"3.96.0", d:"12 jul 2026", t:"Conectar MyInvestor, importar Revolut y las vistas de Gastos con nombres claros", items:[
    "📈 Conectar MyInvestor (beta): en Ajustes → Gestionar mis bancos. Metes usuario y contraseña (puede pedir un SMS) y trae tus fondos indexados. Tu contraseña NO se guarda, solo la sesión.",
    "💹 Importar Revolut por CSV (beta): junto a Trade Republic, con un paso a paso para exportar el extracto desde la app de Revolut. Re-ancla tus acciones/ETF. Se procesa en tu móvil, no se sube nada.",
    "🧮 Las dos vistas del total de Gastos ahora se llaman «Gastos e ingresos» y «Balance» (antes «Desglosado» y «Lo que te queda»), comparten el mismo diseño y ninguna enseña ya el «−»."
  ]},
  {v:"3.95.1", d:"12 jul 2026", t:"Retoque: el «−» que se colaba en «Lo que te queda»", items:[
    "En la vista «Lo que te queda» de Gastos, cuando te pasabas de gasto seguía saliendo un «−» delante del número. Ya no: el color rojo o verde te dice solo si ahorras o te pasas, igual que en el resto de la app."
  ]},
  {v:"3.95.0", d:"12 jul 2026", t:"Novedades a la vista, sugerencias sin salir de la app y gastos sin «−»", items:[
    "🎉 Este popup: a partir de ahora, cada actualización te cuenta qué trae. Se abre solo una vez por versión.",
    "📜 Histórico en Ajustes → «✨ Novedades y sugerencias»: relee las novedades de cualquier versión cuando quieras.",
    "💬 Caja de sugerencias aquí mismo: apunta errores o ideas en el momento — quedan en «Tus apuntes» y le llegan a Juanjo con tu versión.",
    "Los gastos ya no llevan el signo «−» delante (quedaba feo); los ingresos conservan su «+».",
    "✨ En la app Android vuelve el botoncito de arriba «Nueva versión · toca para actualizar»: sale cuando la actualización está descargada y lista (antes se instalaba en silencio al reabrir la app)."
  ]},
  {v:"3.94.0", d:"11 jul 2026", t:"Ahorro editable, dos vistas de Gastos y secciones a tu gusto", items:[
    "La tarjeta «¿A dónde va tu ahorro?» del Resumen ya se puede editar: importes, nombres, banco, borrar y añadir aportaciones.",
    "El total de Gastos tiene dos vistas (Ajustes → Personalización): «Desglosado» o «Lo que te queda» (ingresos − gastos, un solo número verde/rojo).",
    "Botón «⇅ Ordenar secciones» al pie de Fijos, Patrimonio, Deudas, Inversiones y Metas: ordena las tarjetas como quieras.",
    "La pantalla «Actividad» (admin) ahora va aparte, con filtro de solo errores.",
    "Si un banco conectado no trae ninguna cuenta utilizable, ahora avisa con pasos claros (antes se quedaba mudo)."
  ]},
  {v:"3.93.0", d:"11 jul 2026", t:"Editar el saldo de una deuda ya no resetea las cuotas", items:[
    "Corregir el saldo pendiente de una deuda con plazo respetaba mal las cuotas: volvía a «Quedan 4/4» aunque llevaras 3 pagadas. Arreglado: el contador y el % amortizado se mantienen."
  ]},
  {v:"3.92.0", d:"11 jul 2026", t:"Deudas más completas", items:[
    "Añadir una deuda incompleta ahora avisa de qué falta (antes fallaba en silencio y parecía que el botón no iba).",
    "Botón «💸 Amortizar» en cada deuda: pagas anticipado, baja el pendiente y se acorta el plazo manteniendo la cuota.",
    "Campo «Cuotas ya pagadas» al crear una deuda que ya estaba empezada: el pendiente y el «Quedan n/tot» salen bien desde el primer día."
  ]},
  {v:"3.91.0", d:"11 jul 2026", t:"Total de Gastos legible, cuentas del banco con rol y filtro «Mi ciclo»", items:[
    "El total de Gastos con ingresos ya no engaña: gastos por un lado y «💰 +ingresos · Balance» por otro (verde si ahorras).",
    "Las cuentas conectadas por banco (Revolut, CaixaBank…) pueden tener rol — Recibos / Gasto diario / Todo — para domiciliarles gastos fijos.",
    "Filtro «Mi ciclo» en Gastos: de tu último cobro a hoy. El Balance de ese filtro es tu ahorro real del ciclo, aunque la nómina no caiga en día fijo.",
    "Categoría nueva 🥖 Panadería (los cruasanes ya no son «Bares»)."
  ]},
  {v:"3.90.0", d:"11 jul 2026", t:"Gastos de TR por persona, bancos que no se esfuman y más", items:[
    "Cada persona apunta sus gastos de Trade Republic en SU cuenta: interruptor «Apuntar aquí mis gastos de TR» en Ajustes → Notificaciones.",
    "Un banco con el permiso caducado ya no desaparece del Patrimonio: se queda con aviso «caducado» hasta que lo reconectes.",
    "Alta manual de Gastos con fecha (para apuntar cosas de hace días), filtro 💰 Ingreso, y las suscripciones detectadas ofrecen «pasar a Gastos fijos».",
    "«Buscar actualización» en Ajustes aplica la versión nueva al momento."
  ]}
];
/* Panel de Novedades. Se usa desde App (popup automático al estrenar versión) y desde
   Ajustes (histórico). Portal a body: sobrevive al transform del cajón de Ajustes. */
function WhatsNew({onClose, showToast, set, state}){
  useBackClose(true, onClose);
  const [openV,setOpenV]=useState(RELEASE_NOTES.length?RELEASE_NOTES[0].v:null);
  // (La caja de sugerencias se mudó a Ajustes → «Enviar sugerencia» el 2026-07-18: aquí
  // quedaba enterrada bajo el historial de versiones. Este popup es solo el historial.)
  const card=function(cur){ return {padding:"12px 14px",borderRadius:14,border:"1px solid "+(cur?"var(--mint)":"var(--line)"),background:"var(--surface)",marginBottom:10}; };
  return ReactDOM.createPortal(React.createElement("div",{className:"wn-panel"}, React.createElement("div",{className:"wn-inner"},
    React.createElement("div",{className:"serif",style:{fontSize:25,margin:"2px 0 2px"}}, "✨ "+t("wn_title")),
    React.createElement("div",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.5,marginBottom:14}}, t("wn_sub")),
    RELEASE_NOTES.map(function(r){
      const open=openV===r.v, cur=r.v===CONFIG.APP_VERSION;
      return React.createElement("div",{key:r.v,style:card(cur)},
        React.createElement("button",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,width:"100%",background:"none",border:"none",color:"var(--text)",padding:0,cursor:"pointer",textAlign:"left"},onClick:function(){ setOpenV(open?null:r.v); }},
          React.createElement("span",{style:{fontWeight:800,fontSize:14}},"v"+r.v+(cur?" · "+t("wn_current")+" ✓":"")),
          React.createElement("span",{style:{color:"var(--muted-2)",fontSize:11.5,flex:"0 0 auto"}},r.d+(open?" ▴":" ▾"))),
        React.createElement("div",{style:{fontWeight:700,fontSize:13,margin:"5px 0 "+(open?"7px":"0"),color:cur?"var(--mint)":"var(--muted)"}},r.t),
        open && r.items.map(function(it,j){ return React.createElement("div",{key:j,style:{fontSize:12.5,lineHeight:1.55,color:"var(--text)",margin:"0 0 7px",paddingLeft:14,textIndent:-14}},"• "+it); })
      );
    }),
    React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},onClick:onClose}, t("wn_close"))
  )), document.body);
}

/* Contenido del cajón de Ajustes (el cajón deslizante lo gestiona App). */
function SettingsPanel({state, set, onClose, showToast, uid, onBankSync, onTour, totals, fetchPrices, goBanks}){
  const [budget,setBudget]=useState(String(state.budget||0));
  const [expand,setExpand]=useState(null);   // fila-acordeón abierta: "lang" | "gview" | "tabs" | null
  const [newsOpen,setNewsOpen]=useState(false);   // histórico de Novedades (WhatsNew reabierto a mano)
  const [privOpen,setPrivOpen]=useState(false);    // política de privacidad DENTRO de la app (no _blank)
  const [sharedOpen,setSharedOpen]=useState(false);// Hogar + gastos compartidos (sin tab propia en v4)
  const [fbOpen,setFbOpen]=useState(false);        // sugerencias (mudadas fuera de Novedades, 2026-07-18)
  const [bioOn,setBioOn]=useState(bio.enabled());  // candado con huella (volvió a Ajustes, 2026-07-18)
  const toggleBio=function(){
    if(bioOn){ bio.disable(); setBioOn(false); showToast(t("au_bio_dis")); return; }
    bio.enable(uid, meEmail).then(function(){ setBioOn(true); showToast(t("au_bio_en")); })
      .catch(function(e){ showToast("✕ "+((e&&e.message)||e)); });
  };
  const doSignOut=function(){
    askConfirm({ title:t("au_signout"), ok:t("au_signout"), danger:true }).then(function(yes){
      if(!yes) return;
      cloud.signOut().then(function(){ showToast(t("au_signedout")); onClose(); });
    });
  };
  const fileRef=useRef(null);
  // Telemetría: el panel «Actividad» SOLO existe para el admin (gate por email de la sesión;
  // la RLS de app_events lo re-valida en servidor — sin sesión de admin no devuelve filas).
  const [meEmail,setMeEmail]=useState(null);
  const [isAdmin,setIsAdmin]=useState(false);
  useEffect(function(){
    if(!cloud.enabled()){ return; }
    cloud.session().then(function(s){ setMeEmail((s&&s.user&&s.user.email)||null); }).catch(function(){});
    cloud.fetchProfile().then(function(p){ setIsAdmin(!!(p&&p.is_admin)); }).catch(function(){});
  },[uid]);
  // «Buscar actualización» a mano (feedback 2026-07-10: «no me sale ningún botón para actualizar
  // manualmente»): consulta apk.json (APK) y version.json (web) al momento, sin esperar al arranque.
  const checkUpdates=function(){
    const nat=natPlugin();
    if(!nat||!nat.appInfo) return;
    const done=function(okMsg){
      if(okMsg) showToast(okMsg);
    };
    Promise.resolve(window._mcCheckApkUpdate?window._mcCheckApkUpdate({manual:true, showToast:showToast}):false)
      .then(function(apkDone){
        if(apkDone) return;
        if(window._mcCheckOtaUpdates){
          return window._mcCheckOtaUpdates({manual:true, showToast:showToast}).then(function(otaDone){
            if(otaDone) return;
            return Promise.resolve(nat.appInfo()).then(function(info){
              done(t("st_up_ok")+" · web v"+CONFIG.APP_VERSION+(info&&info.versionName?" · app "+info.versionName:""));
            });
          });
        }
        done(t("st_up_ok")+" · web v"+CONFIG.APP_VERSION);
      });
  };
  const [events,setEvents]=useState(null);
  const [actOpen,setActOpen]=useState(false);   // pantalla «Actividad» (antes acordeón: crecía sin fin)
  const loadEvents=function(){
    cloud.adminEvents(200).then(function(rows){
      setEvents(rows||[]);
      try{ localStorage.setItem("_evSeen", String(Date.now())); }catch(e){}   // el aviso de "errores nuevos" se resetea
      // feedback visible: sin esto, recargar con los mismos datos parecía "no hacer nada" (2026-07-11)
      const nErr=(rows||[]).filter(function(r){ return r.kind==="error"; }).length;
      showToast("↻ "+(rows||[]).length+" eventos · "+nErr+" error(es)");
    }).catch(function(e){ setEvents([]); showToast("⚠ "+((e&&e.message)||e)); });
  };
  // ¿El lector de gastos TR tiene acceso a notificaciones? (se pierde al reinstalar la app).
  // Se re-chequea al volver a la app (visibilitychange): al activar el permiso y volver, el aviso se quita solo.
  const [notifOk,setNotifOk]=useState(true);
  useEffect(function(){
    const check=function(){
      const nat=natPlugin();
      if(nat&&nat.notifAccess){ try{ nat.notifAccess().then(function(r){ setNotifOk(!(r&&r.granted===false)); }).catch(function(){}); }catch(e){} }
    };
    check();
    document.addEventListener("visibilitychange",check);
    return function(){ document.removeEventListener("visibilitychange",check); };
  },[]);
  // --- Banco (Open Banking) ---
  const [bankLinks,setBankLinks]=useState(null);   // null = cargando, [] = ninguno (resumen)
  const [bankBusy,setBankBusy]=useState(false);
  const [trConn,setTrConn]=useState(false);        // TR también cuenta como banco conectado (feedback 2026-07-10)
  useEffect(function(){ const b=trBridge(); if(!b||!b.status) return; Promise.resolve(b.status()).then(function(r){ setTrConn(!!(r&&r.connected)); }).catch(function(){}); },[uid]);
  const [manageBanks,setManageBanks]=useState(false);   // abre la sección "Mis bancos"
  useBackClose(manageBanks, function(){ setManageBanks(false); });   // gesto atrás: cierra "Mis bancos"
  // Banner «Reconectar TR» de Cartera (evento mc-open-banks → App abre Ajustes + goBanks):
  // aterriza DIRECTO en Mis bancos, donde el formulario de TR ya trae el teléfono puesto.
  useEffect(function(){ if(goBanks) setManageBanks(true); },[goBanks]);
  useEffect(function(){
    if(!cloud.enabled()){ setBankLinks([]); return; }
    cloud.bankLinks().then(function(rows){
      setBankLinks(rows||[]);
      if((rows||[]).some(function(r){ return r.status==='active'||r.status==='pending'; })){
        set(function(s){ return s.hasBankLink?s:Object.assign({},s,{hasBankLink:true}); });
      }
    }).catch(function(){ setBankLinks([]); });
  },[uid]);
  const connectBank=function(){
    setBankBusy(true); showToast(t("bank_connecting"));
    cloud.bankConnect("Banco de Sabadell").then(function(d){
      set(function(s){ return Object.assign({},s,{hasBankLink:true}); });
      location.href=d.url;   // → login del banco (SCA); vuelve a la app con ?bank=ok
    }).catch(function(e){ setBankBusy(false); showToast("⚠ "+t("bank_error")+": "+((e&&e.message)||e)); });
  };
  const refreshBank=function(){ if(!onBankSync) return; setBankBusy(true); Promise.resolve(onBankSync()).finally(function(){ setBankBusy(false); cloud.bankLinks().then(function(r){ setBankLinks(r||[]); }).catch(function(){}); }); };
  // Estilos de los pocos controles con input propio (presupuesto). Los demás usan el sistema
  // de filas .set-row/.swx. (lbl/btnGhost/link se quitaron en 2026-07-17: estaban muertos.)
  // Inputs se quedan en 16px (menos = zoom automático del móvil al enfocar); los botones sí
  // bajan de tamaño para no parecer listones (feedback 2026-07-18).
  const inp={width:"100%",padding:"10px 13px",borderRadius:"12px",border:"1px solid var(--line)",background:"var(--bg-2)",color:"var(--text)",fontSize:"16px",boxSizing:"border-box"};
  const btn={width:"100%",padding:"10px 12px",borderRadius:"12px",border:"none",background:"var(--mint)",color:"#06120C",fontWeight:700,fontSize:"14px",marginTop:"10px",cursor:"pointer"};
  const saveNums=function(){
    const b=parseFloat(String(budget).replace(',','.'))||0;
    set(function(s){ return Object.assign({},s,{budget:b}); });
    showToast(t("st_budget_saved"));
  };
  const doExport=function(){
    try{
      // El estado React manda: localStorage puede ir ~400 ms por detrás (persistencia debounced 2026-07-18)
      const data=JSON.stringify(state||store.get("micartera_v3"),null,2);
      const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));
      const a=document.createElement("a");
      a.href=url; a.download="mi-cartera-"+new Date().toISOString().slice(0,10)+".json"; a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); },1000);
      showToast(t("st_backup_dl"));
    }catch(e){ showToast("✕ "+((e&&e.message)||e)); }
  };
  const doImport=function(ev){
    const f=ev.target.files&&ev.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=function(){
      // el try SOLO cubre el parseo: si envolviera también el confirm (ahora asíncrono), un
      // fallo al restaurar se tragaría por el catch de «archivo inválido» y engañaría.
      let obj=null;
      try{
        obj=JSON.parse(r.result);
        if(!obj || !obj.accounts) throw new Error(t("st_badfile"));
      }catch(e){ showToast("✕ "+((e&&e.message)||e)); return; }
      askConfirm({ title:t("st_confirm_import"), sub:t("st_confirm_import_sub"), ok:t("st_confirm_import_ok"), danger:true })
        .then(function(yes){
          if(!yes) return;
          store.set("micartera_v3",obj); set(function(){ return obj; });
          showToast(t("st_imported")); onClose();
        });
    };
    r.readAsText(f);
  };
  // --- Rediseño Claude Design (2026-07-10): tarjetas con filas agrupadas (.set-card/.set-row),
  // valores a la derecha, acordeones para las opciones y switches iOS (.sw). El contenido y la
  // lógica son los mismos de siempre; solo cambia la presentación.
  const setS=function(patch){ set(function(s){ return Object.assign({},s,{settings:Object.assign({},s.settings,patch)}); }); };
  const toggleExp=function(k){ setExpand(expand===k?null:k); };
  const row=function(k,icon,label,value,onClick,right){
    return React.createElement("button",{key:k,className:"set-row",onClick:onClick},
      React.createElement("span",{className:"sr-ic"},icon),
      React.createElement("span",{className:"sr-lb"},label),
      value!=null && React.createElement("span",{className:"sr-val"},value),
      right!==undefined ? right : React.createElement("span",{className:"sr-chev"+(expand===k?" open":"")},"›")
    );
  };
  const sw=function(on){ return React.createElement("span",{className:"swx"+(on?" on":"")}); };
  const curLang=(state.settings&&state.settings.lang)||"es";
  const curTheme=(state.settings&&state.settings.theme)||"green";
  const curCur=(state.settings&&state.settings.currency)||"EUR";
  const curSeason=(state.settings&&state.settings.season)||"none";
  const curTextSize=textSizeOf(state);
  const simOn=!!(state.settings&&state.settings.simpleMode);
  const [curCompare,setCurCompare]=useState(false);   // acordeón «comparar monedas» (Dinero)
  const segBtn=function(on){ return Object.assign({},btn,{flex:"1 1 30%",marginTop:0,background:on?"var(--mint)":"var(--surface-2)",color:on?"#06120C":"var(--text)",border:on?"none":"1px solid var(--line)"}); };
  // ── Secciones colapsables + buscador (feedback 2026-07-13: «Ajustes se está haciendo
  // kilométrico»). Cada tarjeta es ahora un grupo plegado (estado en localStorage); el
  // buscador filtra grupos por título y palabras clave y los abre de golpe. ──
  const [q,setQ]=useState("");
  const normQ=function(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); };
  const [grps,setGrps]=useState({});
  // Al abrir la app TODAS las secciones arrancan encogidas (petición 2026-07-18): ya no se
  // recuerda el estado abierto entre sesiones — solo dentro de la sesión actual (grps en memoria).
  const isOpen=function(id){ const v=grps[id]; return v!=null ? v : false; };
  const toggleGrp=function(id){ const v=!isOpen(id); setGrps(function(g){ const n=Object.assign({},g); n[id]=v; return n; }); };
  let grpMatches=0;   // cuántos grupos pasan el filtro del buscador (para el «sin resultados»)
  const grp=function(id,icon,title,keywords,val){
    const kids=Array.prototype.slice.call(arguments,5);
    const nq=normQ(q).trim();
    if(nq && normQ(title+" "+(keywords||"")).indexOf(nq)<0) return null;
    grpMatches++;
    const open=nq!==""?true:isOpen(id);
    // Despliegue ANIMADO con el patrón .collapsible (grid-rows): montar/desmontar en seco se
    // sentía «robótico» (feedback 2026-07-18). El contenido queda siempre montado (solo Ajustes,
    // coste asumible) y la altura transiciona suave en ambos sentidos.
    return React.createElement("div",{className:"set-card"},
      React.createElement("button",{className:"set-row",onClick:function(){ toggleGrp(id); }},
        React.createElement("span",{className:"sr-ic"},icon),
        React.createElement("span",{className:"sr-lb",style:{fontWeight:800}},title),
        val!=null && React.createElement("span",{className:"sr-val"},val),
        React.createElement("span",{className:"sr-chev"+(open?" open":"")},"›")),
      React.createElement("div",{className:"collapsible"+(open?" open":"")},
        React.createElement("div",null, React.createElement.apply(null,[React.Fragment,null].concat(kids)))
      )
    );
  };
  return React.createElement(React.Fragment,null,
    React.createElement("div",{className:"v4-set-profile"},
      React.createElement("div",{className:"v4-set-av"}, (meEmail||"MC").slice(0,2).toUpperCase()),
      React.createElement("div",{style:{minWidth:0,flex:1}},
        React.createElement("div",{style:{fontWeight:800,fontSize:16}}, meEmail?meEmail.split("@")[0]:"Mi Cartera"),
        React.createElement("div",{style:{fontSize:12.5,color:"var(--muted)",marginTop:2}}, meEmail||t("v4_set_profile_local")),
        React.createElement("div",{style:{fontSize:12,color:"var(--mint)",marginTop:4,fontWeight:700}}, uid?t("v4_set_profile_sync"):t("v4_set_profile_local"))
      )
    ),
    React.createElement("input",{style:Object.assign({},inp,{marginTop:12}),placeholder:t("st_search_ph"),value:q,onChange:function(e){ setQ(e.target.value); }}),

    React.createElement("div",{className:"v4-set-sec"}, t("v4_set_appear")),
    grp("general","🎨",t("v4_set_appear"),"idioma language tema theme color temática temporada mundial halloween navidad verano invierno apariencia look",null,
      React.createElement("div",{className:"v4-theme-row","aria-label":t("theme")},
        THEMES.map(function(th){
          return React.createElement("button",{key:th[0],type:"button",title:t("th_"+th[0]),
            className:"v4-theme-sw"+(curTheme===th[0]?" on":""),
            style:{background:th[2]},
            onClick:function(){ applyTheme(th[0]); setS({theme:th[0]}); }});
        })
      ),
      // Temáticas de temporada (Mundial/Halloween/Navidad…): color de acento + animación ambiental.
      row("season","🎉",t("st_theme_season"),t("th_"+(curSeason==="none"?"none":curSeason)),function(){ toggleExp("season"); }),
      expand==="season" && React.createElement("div",{className:"set-exp"},
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}},
          SEASONS.map(function(se){
            return React.createElement("button",{key:se[0],onClick:function(){ applySeason(se[0]); setS({season:se[0]}); },style:segBtn(curSeason===se[0])}, se[1]+" "+t("th_"+se[0]));
          })),
        React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.5,margin:"8px 2px 0"}}, t("st_theme_season_hint"))),
      row("lang","🌐",t("language"),(LANGS.find(function(L){return L[0]===curLang;})||LANGS[0])[1],function(){ toggleExp("lang"); }),
      expand==="lang" && React.createElement("div",{className:"set-exp"},
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}},
          LANGS.map(function(L){
            return React.createElement("button",{key:L[0],onClick:function(){ CURLANG=L[0]; setS({lang:L[0]}); },style:segBtn(curLang===L[0])}, L[1]);
          })))
    ),

    // ACCESIBILIDAD (justo debajo de Apariencia): tamaño de letra, reducir animaciones, contraste.
    React.createElement("div",{className:"v4-set-sec"}, t("v4_set_a11y")),
    grp("a11y","♿",t("v4_set_a11y"),"accesibilidad letra grande tamaño texto contraste animaciones reduce motion accessibility",t("ts_"+curTextSize),
      React.createElement("div",{style:{padding:"6px 14px 4px"}},
        React.createElement("div",{style:{fontSize:13,fontWeight:700,marginBottom:6}}, t("st_textsize")),
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          [["small","ts_small"],["normal","ts_normal"],["big","ts_big"],["huge","ts_huge"]].map(function(ts){
            return React.createElement("button",{key:ts[0],onClick:function(){ applyTextSize(ts[0]); setS({textSize:ts[0]}); },style:Object.assign({},segBtn(curTextSize===ts[0]),{flex:"1 1 40%"})}, t(ts[1]));
          })),
        React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.5,marginTop:6}}, t("st_textsize_hint"))
      ),
      (function(){ const on=!!(state.settings&&state.settings.reduceMotion);
        return React.createElement(React.Fragment,null,
          row("redmo",on?"🐢":"🎞️",t("st_reduce_motion"),null,function(){ applyReduceMotion(!on); setS({reduceMotion:!on}); }, sw(on)),
          React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 10px"}}, t("st_reduce_motion_hint"))); })(),
      (function(){ const on=!!(state.settings&&state.settings.hiContrast);
        return React.createElement(React.Fragment,null,
          row("hicon",on?"🌗":"🌓",t("st_contrast"),null,function(){ applyContrast(!on); setS({hiContrast:!on}); }, sw(on)),
          React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 10px"}}, t("st_contrast_hint"))); })()
    ),

    // «Para empezar» reubicado justo bajo Apariencia/Accesibilidad (petición 2026-07-18).
    React.createElement("div",{className:"v4-set-sec"}, t("v4_set_easy")),
    grp("easy","🍃",t("v4_set_easy"),"modo sencillo simple mode tutorial tour empezar fácil easy start",null,
      row("simple","🍃",t("st_simple_lbl"),null,function(){
        const sim=!simOn;
        setS({simpleMode:sim, tabHidden: sim?ADVANCED_TABS.slice():[], dashHidden: sim?SIMPLE_DASH_HIDDEN.slice():[]});
      }, sw(simOn)),
      React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",padding:"0 14px 10px"}}, t("st_mode_hint")),
      onTour && row("tour","🎓",t("v4_set_tour"),null,onTour)
    ),

    React.createElement("div",{className:"v4-set-sec"}, t("v4_set_money")),
    grp("budget","💶",t("budget_month"),"presupuesto budget moneda divisa currency euro dolar",eur0(state.budget||0),
      React.createElement("div",{style:{padding:"8px 14px 14px"}},
        React.createElement("input",{style:inp,type:"number",inputMode:"decimal",value:budget,onChange:function(e){ setBudget(e.target.value); }}),
        React.createElement("button",{style:btn,onClick:saveNums},t("save"))
      ),
      // Acordeón con TODAS las divisas del FX del BCE (ampliado 2026-07-18: «más monedas»).
      row("cur","💱",t("currency"),t("cur_"+curCur.toLowerCase()),function(){ toggleExp("cur"); }),
      expand==="cur" && React.createElement("div",{className:"set-exp"},
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}},
          CUR_LIST.map(function(c){
            return React.createElement("button",{key:c,onClick:function(){ setS({currency:c}); showToast(t("cur_"+c.toLowerCase())); },style:Object.assign({},segBtn(curCur===c),{flex:"1 1 44%"})}, t("cur_"+c.toLowerCase()));
          }))),
      // Comparativa: 1 € al cambio en cada moneda (tipos BCE ya guardados en fxRates).
      row("curcmp","📊",t("st_cur_compare"),null,function(){ setCurCompare(!curCompare); }),
      curCompare && React.createElement("div",{className:"set-exp"},
        (function(){
          const tbl=fxTableOf(state);   // c → (1 c = tbl[c] €)
          const rows=CUR_LIST.filter(function(c){ return c!=="EUR"; }).map(function(c){
            const per=tbl[c]>0 ? (1/tbl[c]) : null;   // 1 € = per c
            return React.createElement("div",{key:c,style:{display:"flex",justifyContent:"space-between",padding:"7px 2px",borderBottom:"1px solid var(--line-soft)",fontSize:13.5}},
              React.createElement("span",{style:{color:"var(--muted)"}}, "1 € ="),
              React.createElement("span",{className:"num",style:{fontWeight:700}}, per!=null ? (NF.format(per)+" "+(CUR_SYM[c]||c)) : "—"));
          });
          return React.createElement("div",{style:{marginTop:6}},
            rows,
            React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.5,marginTop:8}}, t("st_cur_compare_hint")));
        })()),
      // VARIOS bancos de gasto diario (petición 2026-07-18: TR + Revolut en un viaje, mismo
      // presupuesto). Lista TODAS tus cuentas (no solo las de Open Banking): al marcar un banco,
      // sus compras cuentan en el presupuesto y aparecen en Gastos. El saldo de gasto sigue
      // saliendo de la cuenta «diario» principal; esto solo decide QUÉ compras se contabilizan.
      row("expbanks","🪙",t("st_expense_banks"),null,function(){ toggleExp("expbanks"); }),
      expand==="expbanks" && React.createElement("div",{className:"set-exp"},
        (function(){
          const ents=[]; (state.accounts||[]).forEach(function(a){ if(a&&a.ent&&ents.indexOf(a.ent)<0) ents.push(a.ent); });
          if(!ents.length) return React.createElement("div",{style:{fontSize:12,color:"var(--muted-2)",marginTop:8}}, t("st_expense_banks_none"));
          const cur=expenseBankEnts(state);
          const toggleEnt=function(ent){
            set(function(s){
              const base=expenseBankEnts(s).slice();
              const i=base.indexOf(ent);
              if(i>=0){ if(base.length===1) return s; base.splice(i,1); }   // no dejar 0 marcados
              else base.push(ent);
              return Object.assign({},s,{settings:Object.assign({},s.settings,{expenseBanks:base})});
            });
          };
          return React.createElement(React.Fragment,null,
            React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}},
              ents.map(function(ent){
                const on=cur.indexOf(ent)>=0;
                return React.createElement("button",{key:ent,type:"button",className:"v4-chip"+(on?" on":""),onClick:function(){ toggleEnt(ent); }},
                  (on?"✓ ":"")+entOf(ent).label);
              })),
            React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.5,marginTop:8}}, t("st_expense_banks_hint")));
        })()),
      (function(){
        const gm=(state.settings&&state.settings.gTotalMode)||"split";
        return React.createElement(React.Fragment,null,
          row("gview","🧮",t("st_gview"),t(gm==="net"?"st_gview_net":"st_gview_split"),function(){ toggleExp("gview"); }),
          expand==="gview" && React.createElement("div",{className:"set-exp"},
            [["split","st_gview_split","st_gview_split_d"],["net","st_gview_net","st_gview_net_d"]].map(function(op){
              return React.createElement("div",{key:op[0],style:{marginTop:8}},
                React.createElement("button",{onClick:function(){ setS({gTotalMode:op[0]}); },style:segBtn(gm===op[0])}, (gm===op[0]?"✓ ":"")+t(op[1])),
                React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.5,margin:"5px 2px 0"}}, t(op[2]))
              );
            })
          )
        );
      })()
    ),

    React.createElement("div",{className:"v4-set-sec"}, t("v4_set_conn")),
    cloud.enabled() && (function(){
      const links=bankLinks;
      const nActive=(links||[]).filter(function(r){ return r.status==='active'; }).length + (trConn?1:0);
      const nDead=(links||[]).filter(function(r){ return r.status==='expired'||r.status==='error'; }).length;
      const summary = links===null ? "…"
        : nActive>0 ? (tf("bp_summary_n",{n:nActive}) + (nDead?" · "+tf("bp_summary_exp",{n:nDead}):""))
        : nDead>0 ? tf("bp_summary_exp",{n:nDead})
        : ((links||[]).some(function(r){return r.status==='pending';}) ? t("bank_pending") : t("bp_summary_none"));
      return grp("banks","🏦",t("bank_section"),"banco bancos bank conectar caixabank revolut sabadell trade republic myinvestor broker open banking sincronizar",summary,
        row("banks","🏦",t("bp_manage"),null,function(){ setManageBanks(true); })
      );
    })(),
    manageBanks && ReactDOM.createPortal(React.createElement(BankPanel,{state:state,set:set,showToast:showToast,uid:uid,onBankSync:onBankSync,totals:totals,onLinks:setBankLinks,fetchPrices:fetchPrices,onClose:function(){ setManageBanks(false); const b=trBridge(); if(b&&b.status){ Promise.resolve(b.status()).then(function(r){ setTrConn(!!(r&&r.connected)); }).catch(function(){}); } }}), document.body),
    // (Hogar y gastos compartidos se movió FUERA de Ajustes 2026-07-18: es una funcionalidad de
    //  la app, no un ajuste. Ahora se abre desde Cartera → «Hogar y gastos compartidos».)
    !notifOk && React.createElement("div",{className:"alarmbox",style:{marginTop:14}},
      t("na_body"),
      React.createElement("button",{style:Object.assign({},btn,{marginTop:10}),onClick:function(){ const nat=natPlugin(); if(nat&&nat.openNotifAccess){ try{ nat.openNotifAccess().catch(function(){}); }catch(e){} } }},t("na_fix")),
      React.createElement("div",{style:{fontSize:11.5,lineHeight:1.5,marginTop:10,opacity:.85}}, "🔓 "+t("na_restricted"))
    ),
    (function(){
      const nat=natPlugin();
      if(!nat || !nat.setNotifPrefs) return null;
      const on=!(state.settings&&state.settings.trNotifyConfirm===false);
      const bankSyncOn=!(state.settings&&state.settings.bankSyncOnNotif===false);
      const ingOn=!!(state.settings&&state.settings.trIngest);
      const toggleIng=function(){
        if(!ingOn){
          try{ if(nat.ensureNotifPerm) nat.ensureNotifPerm().catch(function(){}); }catch(e){}
          let tok=(state.settings&&state.settings.ingestToken);
          if(!tok){
            const rnd=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random();
            tok=String(rnd).replace(/-/g,"")+Math.random().toString(36).slice(2,10);
          }
          cloud.setIngestToken(tok).then(function(){
            const url=CONFIG.SUPABASE_URL+"/functions/v1/ingest?token="+encodeURIComponent(tok);
            try{ if(nat.setIngestUrl) return nat.setIngestUrl({url:url}); }catch(e){}
          }).then(function(){
            setS({trIngest:true, ingestToken:tok}); showToast(t("st_tring_on"));
          }).catch(function(e){ showToast("✕ "+((e&&e.message)||e)); });
        } else {
          try{ if(nat.setIngestUrl) nat.setIngestUrl({url:""}).catch(function(){}); }catch(e){}
          cloud.clearIngestToken();
          setS({trIngest:false}); showToast(t("st_tring_off"));
        }
      };
      const aiOn=!!(state.settings&&state.settings.aiCat);
      return grp("notifs","🔔",t("st_notifs"),"notificaciones notifications apunte automatico gastos trade republic avisos banco sync caixabank sabadell ia ai categoria",null,
        row("tring",ingOn?"🟢":"⚪",t("st_tring"),null,toggleIng, sw(ingOn)),
        React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 12px"}}, t("st_tring_hint")),
        row("trnotif",on?"🔔":"🔕",t("st_trnotif"),null,function(){ setS({trNotifyConfirm:!on}); }, sw(on)),
        React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 12px"}}, t("st_trnotif_hint")),
        row("banksync",bankSyncOn?"🏦":"🔕",t("st_banksync_notif"),null,function(){ setS({bankSyncOnNotif:!bankSyncOn}); }, sw(bankSyncOn)),
        React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 12px"}}, t("st_banksync_notif_hint")),
        row("aicat",aiOn?"✨":"⚪",t("st_aicat"),null,function(){ setS({aiCat:!aiOn}); }, sw(aiOn)),
        React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 12px"}}, t("st_aicat_hint"))
      );
    })(),

    React.createElement("div",{className:"v4-set-sec"}, t("v4_set_app")),
    grp("news","✨",t("st_news"),"novedades news version sugerencias feedback historial whatsnew","v"+CONFIG.APP_VERSION,
      row("news","✨",t("st_news_row"),null,function(){ setNewsOpen(true); }),
      row("fb","💬",t("st_feedback"),null,function(){ setFbOpen(true); })
    ),
    newsOpen && React.createElement(WhatsNew,{onClose:function(){ setNewsOpen(false); },showToast:showToast,set:set,state:state}),
    fbOpen && ReactDOM.createPortal(React.createElement(FeedbackPanel,{state:state,set:set,showToast:showToast,onClose:function(){ setFbOpen(false); }}), document.body),
    natPlugin() && grp("updates","⬇️",t("st_updates"),"actualizar update version apk buscar widget",null,
      row("upd","⬇️",t("st_update"),"v"+CONFIG.APP_VERSION,checkUpdates),
      React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 12px"}}, t("st_widget_hint"))
    ),
    grp("backup","🗄️",t("backup"),"copia seguridad backup exportar importar json restaurar",null,
      row("exp","⬇️",t("do_export").replace("⬇️ ",""),null,doExport),
      row("imp","⬆️",t("do_import").replace("⬆️ ",""),null,function(){ fileRef.current&&fileRef.current.click(); })
    ),
    cloud.enabled() && uid && grp("account","👤",t("st_account"),"cuenta privacidad borrar delete privacy huella biometria fingerprint cerrar sesion logout salir",null,
      meEmail && React.createElement("div",{style:{padding:"0 16px 10px",fontSize:12.5,color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, meEmail),
      // Huella y cerrar sesión volvieron aquí (2026-07-18): con el rediseño solo existían
      // dentro del AuthPanel, al que ya no se llegaba estando logueado.
      bio.supported()
        ? row("biolock","🔐",(bioOn?t("au_bio_off"):t("au_bio_on")).replace(/^[^ ]+ /,""),null,toggleBio, sw(bioOn))
        : React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 10px"}}, t("au_nobio")),
      row("signout","🚪",t("au_signout"),null,doSignOut),
      row("priv","🔒",t("st_privacy"),null,function(){ setPrivOpen(true); }),
      row("delacc","🗑️",t("st_delete_acc"),null,function(){
        askConfirm({ title:t("st_delete_acc"), sub:t("st_delete_acc_sub"), ok:t("st_delete_acc_ok"), danger:true })
          .then(function(ok){
            if(!ok) return;
            askText({ title:t("st_delete_acc_pwd"), sub:t("st_delete_acc_pwd_sub"), ph:"••••••••", ok:t("st_delete_acc_ok"), secret:true })
              .then(function(pwd){
                if(pwd==null) return;
                cloud.deleteAccount(String(pwd)).then(function(){
                  showToast(t("st_delete_acc_done"));
                  onClose();
                }).catch(function(e){ showToast("✕ "+((e&&e.message)||e)); });
              });
          });
      })
    ),

    React.createElement("div",{className:"v4-set-sec"}, t("v4_set_adv")),
    grp("custom","🎛️",t("v4_set_adv"),"avanzado advanced pestañas tabs vista gastos bloques blocks informe report customise",null,
      // («Personalizar widgets del Resumen» se retiró el 2026-07-18: era del Dashboard v3.)
      row("tabs","✎",t("et_tabs").replace("✎ ",""),null,function(){ toggleExp("tabs"); }),
      expand==="tabs" && React.createElement("div",{className:"set-exp"},(function(){
        const order=tabOrderOf(state);
        const hidden=TABS.map(function(tb){return tb.id;}).filter(function(id){ return order.indexOf(id)<0; });
        const moveTab=function(id,dir){ set(function(s){ const o=tabOrderOf(s); const i=o.indexOf(id), j=i+dir; if(i<0||j<0||j>=o.length) return s; const n=o.slice(); n[i]=o[j]; n[j]=id; return Object.assign({},s,{settings:Object.assign({},s.settings,{tabOrder:n})}); }); };
        const hideTab=function(id){ if(id==="dash") return; set(function(s){ const hid=tabHiddenOf(s); const nh=hid.indexOf(id)<0?hid.concat([id]):hid; const ord=tabOrderOf(s).filter(function(x){return x!==id;}); return Object.assign({},s,{settings:Object.assign({},s.settings,{tabHidden:nh, tabOrder:ord})}); }); showToast(t("tb_removed")); };
        const showTab=function(id){ set(function(s){ const hid=tabHiddenOf(s).filter(function(x){return x!==id;}); const ord=tabOrderOf(s).concat([id]); return Object.assign({},s,{settings:Object.assign({},s.settings,{tabHidden:hid, tabOrder:ord})}); }); };
        const rowBtn={width:34,height:34,borderRadius:9,background:"var(--surface-2)",border:"1px solid var(--line)",color:"var(--muted)",fontSize:13,cursor:"pointer",flex:"0 0 auto"};
        return React.createElement("div",{style:{marginTop:8}},
          React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.5,marginBottom:10}}, t("et_intro")),
          order.map(function(id,i){
            const tb=TABS.find(function(x){return x.id===id;}); if(!tb) return null;
            const fixed=(id==="dash");
            return React.createElement("div",{key:id,style:{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",borderRadius:11,background:"var(--surface-2)",border:"1px solid var(--line)",marginBottom:7}},
              React.createElement("span",{style:{color:"var(--muted)",display:"flex"}}, React.createElement(tb.icon,{width:16,height:16})),
              React.createElement("span",{style:{flex:1,fontWeight:700,fontSize:14,color:"var(--text)"}}, t("tab_"+id)),
              React.createElement("button",{disabled:i===0,onClick:function(){ moveTab(id,-1); },style:Object.assign({},rowBtn,{opacity:i===0?0.35:1})}, "▲"),
              React.createElement("button",{disabled:i===order.length-1,onClick:function(){ moveTab(id,1); },style:Object.assign({},rowBtn,{opacity:i===order.length-1?0.35:1})}, "▼"),
              fixed
                ? React.createElement("span",{style:{fontSize:10.5,color:"var(--muted-2)",width:34,textAlign:"center",flex:"0 0 auto"}}, t("et_fixed"))
                : React.createElement("button",{onClick:function(){ hideTab(id); },style:Object.assign({},rowBtn,{color:"var(--coral)",borderColor:"var(--coral)"})}, "✕")
            );
          }),
          hidden.length>0 && React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",margin:"12px 2px 6px"}}, t("et_hidden")),
          hidden.map(function(id){
            const tb=TABS.find(function(x){return x.id===id;}); if(!tb) return null;
            return React.createElement("button",{key:id,onClick:function(){ showTab(id); },style:{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 11px",borderRadius:11,background:"var(--surface-2)",border:"1px dashed var(--line)",color:"var(--text)",fontWeight:700,fontSize:14,marginBottom:7,cursor:"pointer"}},
              React.createElement("span",{style:{color:"var(--mint)",fontSize:16,fontWeight:800}}, "+"),
              React.createElement("span",{style:{color:"var(--muted)",display:"flex"}}, React.createElement(tb.icon,{width:16,height:16})),
              React.createElement("span",null, t("tab_"+id)));
          })
        );
      })()),
      (function(){
        const on=!!(state.settings&&state.settings.blocksEdit);
        return row("blocks","🧩",t("st_blocks"),null,function(){ setS({blocksEdit:!on}); }, sw(on));
      })(),
      React.createElement("div",{style:{fontSize:11.5,color:"var(--muted-2)",lineHeight:1.45,padding:"0 14px 10px"}}, t("st_blocks_hint")),
      totals && row("report","📸",t("rp_btn").replace(/^[^ ]+ /,""),null,function(){ shareMonthReport(state, totals, showToast); })
    ),

    // Admin al FINAL (fuera del flujo diario). Sentry de prueba quitado: no aporta en móvil.
    isAdmin && React.createElement(React.Fragment,null,
      React.createElement("div",{className:"v4-set-sec"}, "Dev"),
      React.createElement("div",{className:"set-card",style:{borderColor:"var(--blue)"}},
        React.createElement("div",{className:"sc-title"},"👁 Actividad"),
        row("act","📡","Quién usa la app y sus errores",events?String(events.length):null,function(){ setActOpen(true); if(events===null) loadEvents(); })
      )
    ),
    actOpen && ReactDOM.createPortal(React.createElement(ActivityPanel,{events:events,onReload:loadEvents,onClose:function(){ setActOpen(false); }}), document.body),
    privOpen && ReactDOM.createPortal(React.createElement(PrivacyPanel,{onClose:function(){ setPrivOpen(false); }}), document.body),

    React.createElement("input",{ref:fileRef,type:"file",accept:"application/json,.json",style:{display:"none"},onChange:doImport}),
    (function(){ const nq=normQ(q).trim(); return (nq&&grpMatches===0)?React.createElement("div",{className:"hint",style:{marginTop:14,textAlign:"center"}},t("st_search_none")):null; })(),
    React.createElement("div",{style:{textAlign:"center",color:"#5E7468",fontSize:"12px",marginTop:"22px"}},"Mi Cartera · v"+CONFIG.APP_VERSION)
  );

}

/* ============================================================
   ONBOARDING — bienvenida para usuarios nuevos (arranque vacío)
   ============================================================ */
/* Onboarding v4 (SPEC §8): 3 pasos claros — claim, demo gastos, presupuesto con stepper.
   Saltar marca onboarded con presupuesto por defecto; cuentas/deudas se añaden luego en Cartera/Plan. */
function Onboarding({set, onCloud, onSignup}){
  const [step,setStep]=useState(0);
  const [budget,setBudget]=useState(700);
  const wrap={position:"fixed",inset:0,zIndex:90,overflowY:"auto",background:"var(--bg)",color:"var(--text)",padding:"calc(var(--safe-top) + 20px) 22px calc(var(--safe-bottom) + 28px)",fontFamily:"'Manrope',sans-serif"};
  const inner={maxWidth:480,margin:"0 auto",position:"relative"};
  const finish=function(b){
    const bud=Math.max(100, Math.round(b||budget)||700);
    try{ localStorage.setItem("_seenVersion",CONFIG.APP_VERSION); }catch(e){}
    set(function(s){
      return Object.assign({},s,{
        budget:bud, monthStartNet:0, history:[0],
        onboarded:true, setupHint:true, tourSeen:false,
      });
    });
  };
  const skip=function(){ finish(budget); };
  const dots=React.createElement("div",{className:"v4-ob-dots"},
    [0,1,2].map(function(i){ return React.createElement("span",{key:i,className:i===step?"on":""}); }));
  const skipBtn=React.createElement("button",{type:"button",className:"v4-ob-skip",onClick:skip},t("v4_ob_skip"));
  const cta={width:"100%",padding:"16px",borderRadius:"16px",border:"none",background:"linear-gradient(160deg,var(--mint-hi),var(--mint))",color:"var(--on-mint)",fontWeight:800,fontSize:"15.5px",cursor:"pointer",marginTop:22,boxShadow:"0 14px 28px -10px rgba(95,208,138,.45)"};

  if(step===0) return React.createElement("div",{style:wrap},React.createElement("div",{style:inner},
    skipBtn,
    React.createElement("div",{className:"v4-ob-logo"},React.createElement(I.logo,{width:36,height:36})),
    React.createElement("h1",{className:"serif v4-ob-title"},t("v4_ob_title1")),
    React.createElement("p",{className:"v4-ob-sub"},t("v4_ob_sub1")),
    onCloud && React.createElement("button",{type:"button",className:"btn btn-ghost btn-block",style:{marginTop:18},onClick:onCloud},t("ob_haveacc")),
    onSignup && React.createElement("button",{type:"button",className:"btn btn-ghost btn-block",style:{marginTop:8},onClick:onSignup},t("ob_signup")),
    React.createElement("button",{style:cta,onClick:function(){ setStep(1); }},t("ob2_go")+" →"),
    dots
  ));

  if(step===1) return React.createElement("div",{style:wrap},React.createElement("div",{style:inner},
    skipBtn,
    React.createElement("h1",{className:"serif v4-ob-title"},t("v4_ob_title2")),
    React.createElement("p",{className:"v4-ob-sub"},t("v4_ob_sub2")),
    React.createElement("div",{className:"v4-mov rise",style:{animationDelay:".12s",marginTop:22}},
      React.createElement("div",{className:"tile",style:{background:"rgba(95,208,138,.12)"}},"🛒"),
      React.createElement("div",{className:"nm"},React.createElement("div",null,t("v4_ob_demo1")),React.createElement("div",{className:"meta"},"Hoy")),
      React.createElement("div",{className:"am num"},"42,18 €")
    ),
    React.createElement("div",{className:"v4-mov rise",style:{animationDelay:".22s"}},
      React.createElement("div",{className:"tile",style:{background:"rgba(226,192,95,.12)"}},"☕"),
      React.createElement("div",{className:"nm"},React.createElement("div",null,t("v4_ob_demo2")),React.createElement("div",{className:"meta"},"Ayer")),
      React.createElement("div",{className:"am num"},"2,40 €")
    ),
    React.createElement("button",{style:cta,onClick:function(){ setStep(2); }},t("ob2_next")+" →"),
    dots
  ));

  return React.createElement("div",{style:wrap},React.createElement("div",{style:inner},
    skipBtn,
    React.createElement("h1",{className:"serif v4-ob-title",style:{fontSize:28}},t("ob2_budget_t")),
    React.createElement("p",{className:"v4-ob-sub"},t("ob2_budget_d")),
    React.createElement("div",{className:"v4-ob-stepper"},
      React.createElement("button",{type:"button","aria-label":"−",onClick:function(){ setBudget(function(b){ return Math.max(100,b-50); }); }},"−"),
      React.createElement("div",{className:"serif num"}, eur0(budget)),
      React.createElement("button",{type:"button","aria-label":"+",onClick:function(){ setBudget(function(b){ return b+50; }); }},"+")
    ),
    React.createElement("button",{style:cta,onClick:function(){ finish(budget); }},tf("v4_ob_start",{x:budget})),
    dots
  ));
}

/* ============================================================
   TAB: COMPARTIDO — gastos compartidos por grupos/eventos (crucero con la pareja).
   Quién paga, cómo se reparte, y quién debe a quién. Sirve de "sobre" del evento.
   ============================================================ */
// Balances de un grupo: neto por persona (+ le deben / − debe) y liquidación mínima (quién paga a quién).
function sharedBalances(g){
  const people=(g&&g.people)||[];
  const bal={}; people.forEach(function(p){ bal[p]=0; });
  ((g&&g.expenses)||[]).forEach(function(e){
    const amt=e.amount||0; if(!amt) return;
    const parts=(e.parts&&e.parts.length)?e.parts:people; if(!parts.length) return;
    const share=amt/parts.length;
    bal[e.payer]=(bal[e.payer]||0)+amt;
    parts.forEach(function(p){ bal[p]=(bal[p]||0)-share; });
  });
  Object.keys(bal).forEach(function(k){ bal[k]=+bal[k].toFixed(2); });
  const cred=[], deb=[];
  Object.keys(bal).forEach(function(k){ if(bal[k]>0.005)cred.push({name:k,amt:bal[k]}); else if(bal[k]<-0.005)deb.push({name:k,amt:-bal[k]}); });
  cred.sort(function(a,b){return b.amt-a.amt;}); deb.sort(function(a,b){return b.amt-a.amt;});
  const settle=[]; let i=0,j=0;
  while(i<deb.length&&j<cred.length){ const pay=Math.min(deb[i].amt,cred[j].amt); settle.push({from:deb[i].name,to:cred[j].name,amount:+pay.toFixed(2)}); deb[i].amt-=pay; cred[j].amt-=pay; if(deb[i].amt<0.005)i++; if(cred[j].amt<0.005)j++; }
  return {bal:bal, settle:settle, total:+(((g&&g.expenses)||[]).reduce(function(a,e){return a+(e.amount||0);},0)).toFixed(2)};
}

// uid:userId — renombrado al destructurar (2026-07-18): el prop (id del USUARIO) sombreaba al
// generador global uid() y crear un grupo/gasto compartido reventaba con «uid is not a function».
function Shared({state, set, uid:userId, totals, showToast, meEmail}){
  const groups=state.shared||[];
  const [openId,setOpenId]=useState(null);
  const [addingG,setAddingG]=useState(false);
  const [gForm,setGForm]=useState({name:"",emoji:"🧳",p1:"Yo",p2:""});
  const [addingE,setAddingE]=useState(false);
  const [eForm,setEForm]=useState({desc:"",amount:"",payer:"",parts:[]});
  const [newPerson,setNewPerson]=useState("");
  const SH_EMOJIS=["🧳","🛳️","🏖️","🏠","🎉","🍽️","🚗","⛷️","🎟️","👫"];

  const upd=function(id,fn){ set(function(s){ return Object.assign({},s,{shared:(s.shared||[]).map(function(g){ return g.id===id?fn(g):g; })}); }); };
  const addGroup=function(){
    const ppl=[gForm.p1||"Yo"]; if(gForm.p2&&gForm.p2.trim()) ppl.push(gForm.p2.trim());
    const g={id:uid(),name:gForm.name||t("sh_newdefault"),emoji:gForm.emoji||"🧳",people:ppl,expenses:[]};
    set(function(s){ return Object.assign({},s,{shared:(s.shared||[]).concat([g])}); });
    setGForm({name:"",emoji:"🧳",p1:"Yo",p2:""}); setAddingG(false); setOpenId(g.id);
  };
  const delGroup=function(id){
    askConfirm({ title:t("sh_delgroup_q"), ok:t("sh_delgroup"), danger:true }).then(function(yes){
      if(!yes) return;
      set(function(s){ return Object.assign({},s,{shared:(s.shared||[]).filter(function(g){return g.id!==id;})}); }); setOpenId(null);
    });
  };
  const addPerson=function(g){ const nm=(newPerson||"").trim(); if(!nm||g.people.indexOf(nm)>=0) return; upd(g.id,function(x){ return Object.assign({},x,{people:x.people.concat([nm])}); }); setNewPerson(""); };
  const startAddE=function(g){ setEForm({desc:"",amount:"",payer:g.people[0]||"",parts:g.people.slice()}); setAddingE(true); };
  const addExpense=function(g){
    const amt=parseFloat(String(eForm.amount).replace(',','.'))||0; if(amt<=0) return;
    const parts=(eForm.parts&&eForm.parts.length)?eForm.parts:g.people.slice();
    const ex={id:uid(),desc:eForm.desc||t("sh_exp"),amount:+amt.toFixed(2),payer:eForm.payer||g.people[0],parts:parts,date:new Date().toISOString()};
    upd(g.id,function(x){ return Object.assign({},x,{expenses:[ex].concat(x.expenses||[])}); });
    setAddingE(false);
  };
  const delExpense=function(g,eid){ upd(g.id,function(x){ return Object.assign({},x,{expenses:(x.expenses||[]).filter(function(e){return e.id!==eid;})}); }); };
  const toggleParts=function(p){ setEForm(function(f){ const has=f.parts.indexOf(p)>=0; return Object.assign({},f,{parts:has?f.parts.filter(function(x){return x!==p;}):f.parts.concat([p])}); }); };

  const open=groups.find(function(g){return g.id===openId;});

  if(open){
    const bb=sharedBalances(open);
    return React.createElement("div",null,
      React.createElement("button",{className:"sh-back",onClick:function(){ setOpenId(null); setAddingE(false); }},"‹ "+t("sh_back")),
      React.createElement("div",{className:"total-bar"},
        React.createElement("div",null,React.createElement("div",{className:"tl"}, open.emoji+" "+open.name),React.createElement("div",{className:"tn num"},eur(bb.total))),
        React.createElement("div",{className:"cnt"}, open.people.length+" "+t("sh_people"))
      ),
      // Balances / quién debe a quién
      React.createElement("div",{className:"card",style:{padding:"14px 16px"}},
        React.createElement("div",{className:"gm-sec-h"}, t("sh_balances")),
        bb.settle.length===0
          ? React.createElement("div",{className:"hint"}, t("sh_settled"))
          : bb.settle.map(function(st,i){ return React.createElement("div",{key:i,className:"sh-settle"},
              React.createElement("span",null, React.createElement("b",null,st.from), " → ", React.createElement("b",null,st.to)),
              React.createElement("span",{className:"num sh-owe"}, eur(st.amount))); })
      ),
      // Personas
      React.createElement("div",{className:"card",style:{padding:"14px 16px",marginTop:12}},
        React.createElement("div",{className:"gm-sec-h"}, t("sh_people_h")),
        React.createElement("div",{className:"sh-people"}, open.people.map(function(p){ return React.createElement("span",{key:p,className:"sh-chip"}, p+" · "+eur0(bb.bal[p]||0)); })),
        React.createElement("div",{className:"af-row",style:{marginTop:8}},
          React.createElement("input",{className:"af-in",placeholder:t("sh_addperson_ph"),value:newPerson,onChange:function(e){ setNewPerson(e.target.value); }}),
          React.createElement("button",{className:"btn btn-ghost",style:{flex:"0 0 auto"},onClick:function(){ addPerson(open); }},"+"))
      ),
      // Gastos del grupo
      React.createElement("div",{className:"card",style:{padding:"14px 16px",marginTop:12}},
        React.createElement("div",{className:"gm-sec-h"}, t("sh_expenses")),
        (open.expenses||[]).length===0 && React.createElement("div",{className:"hint"}, t("sh_noexp")),
        (open.expenses||[]).map(function(e){ return React.createElement("div",{key:e.id,className:"sh-exp"},
          React.createElement("div",{className:"sh-exp-mid"},
            React.createElement("div",{className:"sh-exp-desc"}, e.desc),
            React.createElement("div",{className:"sh-exp-meta"}, tf("sh_paidby",{who:e.payer})+" · "+((e.parts&&e.parts.length)||open.people.length)+" "+t("sh_people"))),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
            React.createElement("span",{className:"num",style:{fontWeight:700}}, eur(e.amount)),
            React.createElement("button",{className:"ex-del",onClick:function(){ delExpense(open,e.id); }},"✕"))
        ); }),
        addingE
          ? React.createElement("div",{className:"add-form",style:{marginTop:10}},
              React.createElement("input",{className:"af-in",placeholder:t("sh_exp_ph"),value:eForm.desc,onChange:function(e){ setEForm(Object.assign({},eForm,{desc:e.target.value})); }}),
              React.createElement("div",{className:"af-row"},
                React.createElement("input",{className:"af-in num",inputMode:"decimal",placeholder:"0,00 €",value:eForm.amount,onChange:function(e){ setEForm(Object.assign({},eForm,{amount:e.target.value})); }}),
                React.createElement("select",{className:"af-in",value:eForm.payer,onChange:function(e){ setEForm(Object.assign({},eForm,{payer:e.target.value})); }}, open.people.map(function(p){ return React.createElement("option",{key:p,value:p},p); }))),
              React.createElement("div",{className:"mlabel",style:{textAlign:"left",margin:"8px 0 4px"}}, t("sh_split")),
              React.createElement("div",{className:"sh-parts"}, open.people.map(function(p){ const on=eForm.parts.indexOf(p)>=0; return React.createElement("button",{key:p,type:"button",className:"sh-part"+(on?" on":""),onClick:function(){ toggleParts(p); }}, p); })),
              React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:10},onClick:function(){ addExpense(open); }}, t("sh_addexp")),
              React.createElement("button",{className:"btn btn-ghost btn-block",onClick:function(){ setAddingE(false); }}, t("sh_cancel")))
          : React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:10},onClick:function(){ startAddE(open); }}, "+ "+t("sh_addexp"))
      ),
      React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:12,color:"#E2705F"},onClick:function(){ delGroup(open.id); }}, t("sh_delgroup"))
    );
  }

  // Vista de lista de grupos
  return React.createElement("div",null,
    React.createElement(HogarSection,{state:state,totals:totals,uid:userId,showToast:showToast,meEmail:meEmail}),
    React.createElement("div",{className:"gm-sec-h",style:{margin:"8px 0 10px"}}, t("sh_groups_title")),
    groups.length===0 && !addingG && React.createElement("div",{className:"empty"},
      React.createElement("div",{className:"ttl"}, t("sh_empty_t")), t("sh_empty_d")),
    groups.map(function(g){ const bb=sharedBalances(g); return React.createElement("div",{key:g.id,className:"card sh-card",onClick:function(){ setOpenId(g.id); }},
      React.createElement("span",{className:"sh-emoji"}, g.emoji||"🧳"),
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{className:"sh-name"}, g.name),
        React.createElement("div",{className:"sh-sub"}, eur(bb.total)+" · "+g.people.length+" "+t("sh_people")+(bb.settle.length?(" · "+tf("sh_pending",{n:bb.settle.length})):" · "+t("sh_settled_short")))),
      React.createElement("span",{className:"sh-arrow"}, "›")
    ); }),
    addingG
      ? React.createElement("div",{className:"add-form",style:{marginTop:12}},
          React.createElement("input",{className:"af-in",placeholder:t("sh_name_ph"),value:gForm.name,onChange:function(e){ setGForm(Object.assign({},gForm,{name:e.target.value})); }}),
          React.createElement("div",{className:"emoji-pick",style:{marginTop:8}}, SH_EMOJIS.map(function(em){ return React.createElement("button",{key:em,type:"button",className:(gForm.emoji===em?"on":""),onClick:function(){ setGForm(Object.assign({},gForm,{emoji:em})); }}, em); })),
          React.createElement("div",{className:"af-row",style:{marginTop:8}},
            React.createElement("input",{className:"af-in",placeholder:t("sh_you"),value:gForm.p1,onChange:function(e){ setGForm(Object.assign({},gForm,{p1:e.target.value})); }}),
            React.createElement("input",{className:"af-in",placeholder:t("sh_other_ph"),value:gForm.p2,onChange:function(e){ setGForm(Object.assign({},gForm,{p2:e.target.value})); }})),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:10},onClick:addGroup}, t("sh_create")),
          React.createElement("button",{className:"btn btn-ghost btn-block",onClick:function(){ setAddingG(false); }}, t("sh_cancel")))
      : React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:12},onClick:function(){ setAddingG(true); }}, React.createElement(I.plus,{width:16,height:16}), t("sh_newgroup"))
  );
}

/* Airbag: si cualquier render revienta, en vez de pantalla en blanco muestra
   una pantalla de recuperación con BACKUP descargable (lee localStorage directo,
   independiente del estado roto) + recargar. Dinero real ⇒ nunca dejar al usuario tirado. */
class ErrorBoundary extends React.Component{
  constructor(props){ super(props); this.state={err:null}; }
  static getDerivedStateFromError(err){ return {err:err}; }
  componentDidCatch(err,info){
    try{ console.error("App crash:",err,info); }catch(e){}
    // telemetría solo-admin: el crash viaja a app_events para poder ayudar en remoto
    try{ cloud.logEvent('error','CRASH: '+((err&&err.message)||String(err)), ((err&&err.stack)||'')+(info&&info.componentStack?'\n'+info.componentStack.slice(0,600):'')); }catch(e){}
    mcCaptureError(err, {componentStack: info&&info.componentStack});
  }
  render(){
    if(!this.state.err) return this.props.children;
    const wrap={position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:13,padding:24,textAlign:"center",background:"#0B1410",color:"#E8F0EB",fontFamily:"Manrope,sans-serif",zIndex:9999};
    const btn={padding:"13px 22px",borderRadius:14,border:"none",background:"#5FD08A",color:"#06120C",fontWeight:800,fontSize:15,cursor:"pointer"};
    const btn2=Object.assign({},btn,{background:"transparent",border:"1px solid #2a3a31",color:"#E8F0EB"});
    const dl=function(){ try{ const data=JSON.stringify(store.get("micartera_v3")||{},null,2); const url=URL.createObjectURL(new Blob([data],{type:"application/json"})); const a=document.createElement("a"); a.href=url; a.download="mi-cartera-backup-"+new Date().toISOString().slice(0,10)+".json"; a.click(); setTimeout(function(){URL.revokeObjectURL(url);},1000); }catch(e){ alert("Export error: "+e); } };
    return React.createElement("div",{style:wrap},
      React.createElement("div",{style:{fontSize:46}},"🛟"),
      React.createElement("div",{style:{fontWeight:800,fontSize:21,fontFamily:"Fraunces,serif"}}, t("eb_title")),
      React.createElement("div",{style:{color:"#9fb3a8",fontSize:14,maxWidth:340,lineHeight:1.5}}, t("eb_msg")),
      React.createElement("button",{style:btn,onClick:dl}, t("eb_export")),
      React.createElement("button",{style:btn2,onClick:function(){ try{ location.reload(); }catch(e){} }}, t("eb_reload")),
      React.createElement("div",{style:{color:"#5a6b62",fontSize:11,maxWidth:340,marginTop:6,wordBreak:"break-word"}}, String((this.state.err&&this.state.err.message)||this.state.err||""))
    );
  }
}

