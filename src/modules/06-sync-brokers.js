/* ============================================================
   SINCRONIZACIÓN MYINVESTOR (beta) — API no oficial.
   ============================================================
   v4.0.12: el LOGIN se hace DESDE EL MÓVIL cuando se puede (CapacitorHttp, petición nativa
   sin CORS) — el reCAPTCHA condicional (SECURITY_001) salta casi siempre desde la IP de
   datacenter de Supabase y casi nunca desde la IP residencial del usuario, que es la misma
   vía que la app oficial. Los tokens resultantes se suben a la Edge (que los VALIDA contra
   la API antes de guardar) y sync/keepalive siguen en la nube como siempre. En web (sin
   nativo) o con APK viejo sin CapacitorHttp se cae a la vía Edge de antes. La contraseña
   NUNCA se guarda en ningún caso. Trae fondos indexados / fondos / acciones. */
function miNativeHttp(){
  try{
    const cap=window.Capacitor;
    if(!(cap&&cap.isNativePlatform&&cap.isNativePlatform())) return null;
    const p=cap.Plugins&&cap.Plugins.CapacitorHttp;
    return (p&&typeof p.request==="function")?p:null;
  }catch(e){ return null; }
}
function miDeviceLogin(http, loginBody, devId){
  // Mismas cabeceras que _shared/myinvestor.ts (la API valida x-device-id y x-myinvestor-app).
  // Origin/Referer aquí SÍ se pueden fijar: la petición sale en nativo, no la limita el navegador.
  return Promise.resolve(http.request({
    url:"https://api.myinvestor.es/login/api/v2/auth/token",
    method:"POST",
    headers:{ "Content-Type":"application/json", "Accept":"application/json",
      "Referer":"https://api.myinvestor.es", "Origin":"https://api.myinvestor.es",
      "x-device-id":devId, "x-myinvestor-app":"version=3.125.0,platform=web" },
    data:loginBody
  })).then(function(res){
    const st=res?res.status:0; let j=res?res.data:null;
    if(typeof j==="string"){ try{ j=JSON.parse(j); }catch(e){ j={}; } }
    j=j||{};
    const d=(j.payload&&j.payload.data)||{};
    if(st===202) return { ok:true, otp:true, otpId:d.otpId||null, signatureRequestId:d.signatureRequestId||null };
    if(st===403&&j.status&&j.status.code==="SECURITY_001") return { ok:false, recaptcha:true, error:(j.status.message||"") };
    if(st===200||st===201){
      if(!d.accessToken) return { ok:false, error:"login sin token" };
      return { ok:true, tokens:{ accessToken:d.accessToken, refreshToken:d.refreshToken||null, refreshExpiresIn:Number(d.refreshExpiresIn||0) } };
    }
    return { ok:false, status:st, error:(j.status&&j.status.message)||d.message||("login HTTP "+st) };
  });
}
function MyInvestorSync({state, set}){
  const [step,setStep]=useState("idle");     // idle | otp | connected | preview
  // usuario recordado (NUNCA la contraseña): reconectar tras una caducidad = solo contraseña+OTP
  const [cid,setCid]=useState(function(){ try{ return localStorage.getItem("_miCid")||""; }catch(e){ return ""; } });
  const [expired,setExpired]=useState(false);
  const [pass,setPass]=useState("");
  const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const [otpInfo,setOtpInfo]=useState(null);
  const [positions,setPositions]=useState(null);
  const [map,setMap]=useState({});
  const [doneN,setDoneN]=useState(null);
  const [noSession,setNoSession]=useState(false);
  const devRef=useRef(null);
  const deviceId=function(){
    // Mismo deviceId siempre (antes UUID nuevo → MyInvestor veía «otro móvil» y pedía captcha).
    if(devRef.current) return devRef.current;
    try{
      let d=localStorage.getItem("_miDeviceId");
      if(!d){ d=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():("mi-"+Date.now()+"-"+Math.random().toString(36).slice(2)); localStorage.setItem("_miDeviceId",d); }
      devRef.current=d; return d;
    }catch(e){ devRef.current="mi-"+Date.now(); return devRef.current; }
  };
  const adoptDeviceId=function(id){
    if(!id) return;
    try{ localStorage.setItem("_miDeviceId", String(id)); }catch(e){}
    devRef.current=String(id);
  };
  useEffect(function(){
    if(!cloud.enabled()){ setNoSession(true); return; }
    cloud.session().then(function(se){
      if(!se){ setNoSession(true); return; }
      cloud.myinvestorStatus().then(function(r){
        if(r&&r.device_id) adoptDeviceId(r.device_id);
        if(r&&r.status==="active"){ setStep("connected"); return; }
        // «expired» a veces era un falso positivo (403 anti-bot). Probamos sync suave:
        // si el token sigue vivo, reactivamos sin login ni captcha (feedback 2026-07-17).
        if(r&&r.status==="expired"){
          setExpired(true);
          cloud.myinvestorSync().then(function(res){
            if(res&&res.ok){ setExpired(false); setStep("connected"); }
          }).catch(function(){});
          return;
        }
      }).catch(function(){});
    }).catch(function(){ setNoSession(true); });
  },[]);
  const fail=function(r){ setBusy(false); const m=(r&&(r.error||r.message))||t("mi_err"); setErr(m); try{ cloud.logEvent('error','MI: '+m); }catch(e){} };
  // Éxito del login en el móvil → subir tokens (la Edge los valida contra la API antes de guardar).
  const storeTokens=function(tk){
    return cloud.myinvestorStore({ deviceId:deviceId(), accessToken:tk.accessToken, refreshToken:tk.refreshToken, refreshExpiresIn:tk.refreshExpiresIn }).then(function(r){
      setBusy(false);
      if(r&&r.connected){ try{ localStorage.setItem("_miCid",cid.trim()); }catch(e){} setExpired(false); setPass(""); setCode(""); setStep("connected"); doSync(); return; }
      fail(r);
    }).catch(fail);
  };
  const connectViaEdge=function(){
    cloud.myinvestorConnect({ customerId:cid.trim(), password:pass, deviceId:deviceId() }).then(function(r){
      setBusy(false);
      if(!r){ fail(r); return; }
      if(r.recaptcha){
        // No hay WebView para resolver captcha: pedir paciencia y NO spamear reintentos.
        setErr(r.error||t("mi_recaptcha"));
        return;
      }
      if(r.otp){ setOtpInfo({otpId:r.otpId, signatureRequestId:r.signatureRequestId}); setStep("otp"); return; }
      if(r.connected){ try{ localStorage.setItem("_miCid",cid.trim()); }catch(e){} setExpired(false); setStep("connected"); doSync(); return; }
      fail(r);
    }).catch(fail);
  };
  const doConnect=function(){
    if(!cid.trim()||!pass) return; setBusy(true); setErr("");
    const http=miNativeHttp();
    if(http){
      miDeviceLogin(http,{ customerId:cid.trim(), password:pass },deviceId()).then(function(r){
        if(r&&r.tokens){ storeTokens(r.tokens); return; }
        setBusy(false);
        if(r&&r.otp){ setOtpInfo({otpId:r.otpId, signatureRequestId:r.signatureRequestId}); setStep("otp"); return; }
        if(r&&r.recaptcha){
          // reCAPTCHA TAMBIÉN desde IP residencial: rarísimo — se apunta para saberlo de verdad.
          setErr(r.error||t("mi_recaptcha")); try{ cloud.logEvent('error','MI: recaptcha desde el móvil'); }catch(e){}
          return;
        }
        fail(r);
      }).catch(function(){ connectViaEdge(); });   // CapacitorHttp no disponible/peta → vía Edge de siempre
      return;
    }
    connectViaEdge();
  };
  const otpViaEdge=function(){
    cloud.myinvestorConnect({ customerId:cid.trim(), password:pass, deviceId:deviceId(), otpId:otpInfo.otpId, signatureRequestId:otpInfo.signatureRequestId, code:code.trim() }).then(function(r){
      setBusy(false);
      if(r&&r.connected){ try{ localStorage.setItem("_miCid",cid.trim()); }catch(e){} setExpired(false); setPass(""); setCode(""); setStep("connected"); doSync(); return; }
      fail(r);
    }).catch(fail);
  };
  const doOtp=function(){
    if(code.trim().length<4||!otpInfo) return; setBusy(true); setErr("");
    const http=miNativeHttp();
    if(http){
      // El OTP debe validarse por la MISMA vía que pidió el login (mismo x-device-id e IP).
      miDeviceLogin(http,{ customerId:cid.trim(), password:pass, otpId:otpInfo.otpId, signatureRequestId:otpInfo.signatureRequestId, code:code.trim() },deviceId()).then(function(r){
        if(r&&r.tokens){ storeTokens(r.tokens); return; }
        setBusy(false); fail(r);
      }).catch(function(){ otpViaEdge(); });
      return;
    }
    otpViaEdge();
  };
  const doSync=function(){
    setBusy(true); setErr(""); setDoneN(null);
    cloud.myinvestorSync().then(function(r){
      setBusy(false);
      // softFail = anti-bot/403: sesión sigue; no pedir OTP/captcha (feedback 2026-07-17).
      if(r&&r.softFail){ fail(r); return; }
      if(r&&r.authExpired){ setStep("idle"); setExpired(true); fail(r); return; }
      if(!r||!r.ok||!Array.isArray(r.positions)){ fail(r); return; }
      const m={};
      r.positions.forEach(function(po){ const k=po.isin||po.name; const sug=brokerSuggest({isin:po.isin,name:po.name}, state.investments); m[k]=sug||"__new"; });
      setPositions(r.positions); setMap(m); setStep("preview");
    }).catch(fail);
  };
  const keyOf=function(p){ return p.isin||p.name; };
  const mappedN=positions?positions.filter(function(p){ return map[keyOf(p)]; }).length:0;
  const apply=function(){
    const pos=positions;
    set(function(s){
      let inv=(s.investments||[]).map(function(i){
        const po=pos.find(function(p){ return map[keyOf(p)]===i.id; });
        if(!po) return i;
        const patch={ shares:po.shares };
        if(po.cost!=null) patch.cost=po.cost;
        if(po.value!=null) patch.value=po.value;      // MI da valor en la divisa del fondo (normalmente €)
        if(po.isin&&!i.isin) patch.isin=po.isin;
        return Object.assign({},i,patch);
      });
      const created=pos.filter(function(p){ return map[keyOf(p)]==="__new"; }).map(function(po){
        return { id:uid(), ent:"myinvestor", name:po.name, isin:po.isin||null, shares:po.shares, value:po.value!=null?po.value:0, cost:po.cost!=null?po.cost:(po.value||0), cur:po.cur||"EUR" };
      });
      if(created.length) inv=inv.concat(created);
      return Object.assign({},s,{investments:inv});
    });
    setDoneN(mappedN); setPositions(null); setStep("connected");
  };
  const disconnect=function(){ cloud.myinvestorDisconnect(); try{ localStorage.removeItem("_miCid"); }catch(e){} setExpired(false); setStep("idle"); setPositions(null); setCid(""); setPass(""); setOtpInfo(null); };
  const inpStyle={marginTop:8};
  // UI plana v4 (sin CollapsibleCard pesada) — feedback 2026-07-17 redesing bancos.
  const body=noSession
    ? React.createElement("div",{className:"alarmbox",style:{marginTop:0}},t("mi_need_login"))
    : React.createElement(React.Fragment,null,
        step==="idle" && React.createElement(React.Fragment,null,
          expired && React.createElement("div",{className:"alarmbox",style:{marginTop:0}},t("mi_expired")),
          React.createElement("input",{className:"af-in",style:inpStyle,placeholder:t("mi_user_ph"),autoComplete:"off",value:cid,onChange:function(e){ setCid(e.target.value); }}),
          React.createElement("input",{className:"af-in",style:inpStyle,type:"password",placeholder:t("mi_pass_ph"),autoComplete:"off",value:pass,onChange:function(e){ setPass(e.target.value); }}),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},disabled:busy||!cid.trim()||!pass,onClick:doConnect}, busy?t("mi_connecting"):t("mi_connect")),
          React.createElement("div",{className:"hint",style:{marginTop:8}},t("mi_nostore"))
        ),
        step==="otp" && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"hint",style:{marginTop:0}},t("mi_otp_intro")),
          React.createElement("input",{className:"af-in num",style:Object.assign({},inpStyle,{letterSpacing:"0.3em",textAlign:"center",fontSize:20}),type:"tel",inputMode:"numeric",maxLength:8,placeholder:t("mi_otp_ph"),value:code,onChange:function(e){ setCode(e.target.value.replace(/[^0-9]/g,"")); }}),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},disabled:busy||code.trim().length<4,onClick:doOtp}, busy?t("mi_verifying"):t("mi_verify"))
        ),
        step==="connected" && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"hint",style:{marginTop:0,color:"var(--mint)",fontWeight:700}},t("mi_connected")),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:10},disabled:busy,onClick:doSync}, busy?t("mi_syncing"):t("mi_sync")),
          React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:8},onClick:disconnect},t("mi_disconnect"))
        ),
        step==="preview" && positions && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"hint",style:{marginTop:6}}, tf("mi_preview",{n:positions.length})),
          positions.map(function(po){
            return React.createElement("div",{key:keyOf(po),className:"row",style:{alignItems:"flex-start",flexDirection:"column",gap:6}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",width:"100%",gap:10}},
                React.createElement("div",{style:{minWidth:0}},
                  React.createElement("div",{className:"rname"},po.name),
                  React.createElement("div",{className:"rsub"},(po.isin||"")+(po.cur&&po.cur!=="EUR"?(" · "+po.cur):""))),
                React.createElement("div",{className:"rval num"}, (po.shares!=null?po.shares:"")+" "+t("bi_shares"),
                  React.createElement("div",{className:"rsub"},eur(po.value!=null?po.value:0)))),
              React.createElement("select",{className:"af-in",value:map[keyOf(po)]||"",onChange:function(e){ const v=e.target.value; setMap(function(m){ const n=Object.assign({},m); n[keyOf(po)]=v; return n; }); }},
                React.createElement("option",{value:""},t("bi_notouch")),
                React.createElement("option",{value:"__new"},t("tr_createnew")),
                (state.investments||[]).map(function(i){ return React.createElement("option",{key:i.id,value:i.id}, i.name+(i.cur==="USD"?" ($)":"")); })
              )
            );
          }),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},disabled:mappedN===0,onClick:apply},tf("mi_apply",{n:mappedN})),
          React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:8},onClick:function(){ setStep("connected"); setPositions(null); }},t("fj_cancel"))
        ),
        doneN!=null && step==="connected" && React.createElement("div",{className:"hint",style:{color:"var(--mint)",fontWeight:700,marginTop:8}},tf("mi_done",{n:doneN})),
        err && React.createElement("div",{className:"alarmbox",style:{marginTop:10}}, err)
      );
  return React.createElement("div",{className:"bk-card bk-mi"},
    React.createElement("div",{className:"bk-brand"},
      React.createElement("div",{className:"bk-logo",style:{background:"#C9A0E022",color:"#C9A0E0"}}, "MI"),
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{className:"ttl",style:{fontWeight:800,fontSize:16}}, t("mi_title")),
        React.createElement("div",{className:"sub",style:{fontSize:12.5,color:"var(--muted)",fontWeight:600}}, t("mi_sub"))
      ),
      step==="connected" ? React.createElement("span",{style:{fontSize:11,fontWeight:800,color:"var(--mint)"}}, "✓") : null
    ),
    React.createElement("div",{className:"hint",style:{marginTop:0,marginBottom:8}},t("mi_hint")),
    body
  );
}

/* ============================================================
   SINCRONIZACIÓN TRADE REPUBLIC (beta) — un botón, sin exportar nada.
   La conexión REAL la implementa la capa NATIVA de Android (necesita un
   navegador de verdad para el token de AWS WAF del login de TR; una función
   de servidor "pelada" recibe 403). En la web pura el puente no existe y la
   tarjeta muestra el aviso "solo en la app". El re-anclaje reutiliza el
   mapeo por ISIN del importador CSV (brokerSuggest).

   CONTRATO que la capa nativa DEBE cumplir (todo devuelve Promises):
     trBridge().status()                 -> { connected:bool }
     trBridge().login({phone,pin})       -> { ok:bool, processId?, error? }   (dispara el 2FA)
     trBridge().verify({processId,code}) -> { ok:bool, error? }               (guarda la sesión EN EL DISPOSITIVO)
     trBridge().sync()                   -> { ok:bool, positions:[{isin,name,shares,value,cost?}], cash?:number, error? }
     trBridge().logout()                 -> { ok:bool }
   `value`/`cost` en EUR (TR liquida en €). NADA de esto toca la nube de Mi Cartera:
   credenciales y sesión viven solo en el móvil.
   ============================================================ */
function trBridge(){
  try{
    if(typeof window==="undefined") return null;
    const cap=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.TradeRepublic;
    if(cap) return cap;
    if(window.MiCarteraTR) return window.MiCarteraTR;
  }catch(e){}
  return null;
}
// Teléfono del último login OK (solo el teléfono, NUNCA el PIN): tras un 401 real el formulario
// sale ya rellenado y reconectar queda en PIN + código (feedback 2026-07-17).
function trPhoneSaved(){ try{ return localStorage.getItem("mc_tr_phone")||""; }catch(e){ return ""; } }
function TRSync({state, set, totals}){
  const bridge=trBridge();
  const [step,setStep]=useState("idle");      // idle | code | preview | done
  const [phone,setPhone]=useState(trPhoneSaved());
  const [pin,setPin]=useState("");
  const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);
  const [expired,setExpired]=useState(false);   // 401 REAL: enseña el formulario con aviso propio
  const [err,setErr]=useState(false);
  const [errMsg,setErrMsg]=useState("");   // mensaje REAL que devuelve TR (para no depurar a ciegas)
  const [processId,setProcessId]=useState(null);
  const [connected,setConnected]=useState(false);
  const [positions,setPositions]=useState(null);
  const [cash,setCash]=useState(null);
  const [map,setMap]=useState({});
  const [doneN,setDoneN]=useState(null);
  useEffect(function(){
    if(!bridge||!bridge.status) return;
    Promise.resolve(bridge.status()).then(function(r){ if(r&&r.connected) setConnected(true); }).catch(function(){});
  },[]);
  // fail(e): muestra el error REAL de TR si lo hay (r.error), o el genérico. También viaja a
  // app_events: la saga del TR-en-frío se depuraba a ciegas sin ver el error del móvil del otro.
  const fail=function(e){ setBusy(false); setErr(true); const m=(e&&(e.error||e.message))||(typeof e==="string"?e:""); setErrMsg(m);
    try{ cloud.logEvent('error','TR sync: '+(m||'error desconocido')); }catch(x){} };
  // Normaliza el teléfono a formato internacional (TR exige +CC…). Sin prefijo → asume España (+34).
  const normPhone=function(p){
    let s=(p||"").replace(/[\s().-]/g,"");
    if(s.indexOf("+")===0) return s;
    if(s.indexOf("00")===0) return "+"+s.slice(2);
    if(s.length===9) return "+34"+s;            // móvil español típico
    return s.indexOf("+")===0?s:"+"+s;
  };
  const doSync=function(){
    setBusy(true); setErr(false); setErrMsg(""); setStep("idle"); setDoneN(null);
    return Promise.resolve(bridge.sync()).then(function(r){
      setBusy(false);
      if(r&&r.authExpired && !r.softFail && !r.wafBlocked){
        // 401 REAL (no anti-bot): al formulario directamente, con el teléfono ya puesto. Antes se
        // pedía pulsar «Desconectar» — que además borra el snapshot bueno (feedback 2026-07-17).
        setConnected(false); setExpired(true); setStep("idle");
        try{ cloud.logEvent('error','TR sync: sesión caducada de verdad (401 real)'); }catch(x){}
        return;
      }
      if(r&&(r.softFail||r.wafBlocked)){ fail(r); return; }   // anti-bot: sesión sigue, no pedir 2FA
      if(!r||!r.ok||!Array.isArray(r.positions)){ fail(r); return; }
      const m={};
      r.positions.forEach(function(po){
        const sug=brokerSuggest(po, state.investments);
        // Sin cartera previa (usuario nuevo, p.ej. la pareja) el mapeo por defecto es CREAR la
        // posición: antes todo quedaba en "no tocar" y el botón se moría en "Aplicar a 0".
        if(sug) m[po.isin]=sug;
        else if(state.investments.length===0) m[po.isin]="__new";
      });
      setMap(m); setPositions(r.positions); setCash(r.cash!=null?r.cash:null); setStep("preview");
    }).catch(fail);
  };
  const doLogin=function(){
    if(!phone.trim()||!pin.trim()) return;
    setBusy(true); setErr(false); setErrMsg("");
    Promise.resolve(bridge.login({phone:normPhone(phone),pin:pin.trim()})).then(function(r){
      setBusy(false);
      if(!r||!r.ok){ fail(r); return; }
      try{ localStorage.setItem("mc_tr_phone", normPhone(phone)); }catch(e){}
      setProcessId(r.processId||null); setStep("code");
    }).catch(fail);
  };
  const doVerify=function(){
    if(code.trim().length<4) return;
    setBusy(true); setErr(false); setErrMsg("");
    Promise.resolve(bridge.verify({processId:processId,code:code.trim()})).then(function(r){
      if(!r||!r.ok){ fail(r); return; }
      setConnected(true); setExpired(false); setCode(""); doSync();
    }).catch(fail);
  };
  const mappedN=positions?positions.filter(function(p){ return map[p.isin]; }).length:0;
  const apply=function(){
    const pos=positions, trCash=cash;
    set(function(s){
      const next=Object.assign({},s,{investments:s.investments.map(function(i){
        const po=pos.find(function(p){ return map[p.isin]===i.id; });
        if(!po) return i;
        const patch={shares:po.shares, isin:po.isin};
        // dato EN VIVO de TR (€). Si la posición se muestra en $, se convierte con el cambio del BCE.
        if(po.value!=null) patch.value = i.cur==="EUR" ? po.value : fromEurAmt(po.value, i.cur, state);
        if(po.cost!=null)  patch.cost  = i.cur==="EUR" ? po.cost  : fromEurAmt(po.cost,  i.cur, state);
        return Object.assign({},i,patch);
      })});
      // Posiciones mapeadas a "__new" → se CREAN en Inversiones (usuario sin cartera previa).
      const created=pos.filter(function(p){ return map[p.isin]==="__new"; }).map(function(po){
        return { id:uid(), ent:"trade_republic", name:po.name||po.isin, isin:po.isin,
                 shares:po.shares, value:po.value!=null?po.value:0,
                 cost:po.cost!=null?po.cost:(po.value!=null?po.value:0), cur:"EUR" };
      });
      if(created.length) next.investments=next.investments.concat(created);
      // EFECTIVO de TR (availableCash) → re-ancla la cuenta TR para que HOY muestre exactamente
      // ese saldo (misma fórmula que la edición manual de Patrimonio: se despeja la base del mes).
      // Si no existe cuenta TR (usuario nuevo), se crea con ese saldo.
      if(trCash!=null && totals){
        const hasTR=s.accounts.some(function(a){ return a.ent==="trade_republic"; });
        next.accounts = hasTR
          ? s.accounts.map(function(a){
              if(a.ent!=="trade_republic") return a;
              const pn=(totals.paidNetByBank&&totals.paidNetByBank[a.ent])||0;
              const stored = accDaily(a)
                ? trCash-(totals.injTR||0)+(totals.thisMonthSpent||0)+(totals.roundupThisMonth||0)+(totals.monthlyInvestThisMonth||0)-(accRole(a)==="ambos"?pn:0)
                : trCash-pn;
              return Object.assign({},a,{value:+stored.toFixed(2)});
            })
          : s.accounts.concat([{ id:uid(), ent:"trade_republic", name:"Trade Republic", value:+trCash.toFixed(2), note:"" }]);
      }
      return next;
    });
    setDoneN(mappedN); setPositions(null); setStep("done");
  };
  const disconnect=function(){
    if(bridge&&bridge.logout){ Promise.resolve(bridge.logout()).catch(function(){}); }
    setConnected(false); setStep("idle"); setPositions(null); setPhone(""); setPin("");
  };
  const inpStyle={marginTop:8};
  const body=!bridge
    ? React.createElement("div",{className:"alarmbox",style:{marginTop:0}},t("tr_web_only"))
    : React.createElement(React.Fragment,null,
        React.createElement("div",{className:"hint",style:{marginTop:0,marginBottom:10}},t("tr_tos")),
        !connected && step!=="code" && React.createElement(React.Fragment,null,
          expired && React.createElement("div",{className:"alarmbox",style:{marginTop:0,marginBottom:10}},t("tr_expired_re")),
          React.createElement("input",{className:"af-in",style:inpStyle,type:"tel",inputMode:"tel",placeholder:t("tr_phone_ph"),value:phone,onChange:function(e){ setPhone(e.target.value); }}),
          React.createElement("input",{className:"af-in",style:inpStyle,type:"password",inputMode:"numeric",placeholder:t("tr_pin_ph"),value:pin,onChange:function(e){ setPin(e.target.value); }}),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},disabled:busy||!phone.trim()||!pin.trim(),onClick:doLogin}, busy?t("tr_connecting"):t("tr_connect"))
        ),
        step==="code" && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"hint",style:{marginTop:0}},t("tr_code_intro")),
          React.createElement("input",{className:"af-in num",style:Object.assign({},inpStyle,{letterSpacing:"0.3em",textAlign:"center",fontSize:20}),type:"tel",inputMode:"numeric",maxLength:6,placeholder:t("tr_code_ph"),value:code,onChange:function(e){ setCode(e.target.value.replace(/[^0-9]/g,"")); }}),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},disabled:busy||code.trim().length<4,onClick:doVerify}, busy?t("tr_verifying"):t("tr_verify"))
        ),
        connected && step!=="preview" && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"hint",style:{marginTop:0,color:"var(--mint)",fontWeight:700}},t("tr_connected")),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:10},disabled:busy,onClick:doSync}, busy?t("tr_syncing"):t("tr_sync")),
          React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:8},onClick:disconnect},t("tr_disconnect"))
        ),
        step==="preview" && positions && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"hint",style:{marginTop:6}}, tf("tr_preview",{n:positions.length})),
          cash!=null && React.createElement("div",{className:"hint"}, tf("tr_cash",{x:eur(cash)})),
          positions.map(function(po){
            return React.createElement("div",{key:po.isin,className:"row",style:{alignItems:"flex-start",flexDirection:"column",gap:6}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",width:"100%",gap:10}},
                React.createElement("div",{style:{minWidth:0}},
                  React.createElement("div",{className:"rname"},po.name),
                  React.createElement("div",{className:"rsub"},po.isin)
                ),
                React.createElement("div",{className:"rval num"},
                  po.shares+" "+t("bi_shares"),
                  React.createElement("div",{className:"rsub"},eur(po.value!=null?po.value:0))
                )
              ),
              React.createElement("select",{className:"af-in",value:map[po.isin]||"",onChange:function(e){ const v=e.target.value; setMap(function(m){ const n=Object.assign({},m); n[po.isin]=v; return n; }); }},
                React.createElement("option",{value:""},t("bi_notouch")),
                React.createElement("option",{value:"__new"},t("tr_createnew")),
                state.investments.map(function(i){ return React.createElement("option",{key:i.id,value:i.id}, i.name+(i.cur==="USD"?" ($)":"")); })
              )
            );
          }),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},disabled:mappedN===0,onClick:apply},tf("tr_apply",{n:mappedN})),
          React.createElement("div",{className:"hint"},t("tr_apply_hint"))
        ),
        doneN!=null && React.createElement("div",{className:"hint",style:{color:"var(--mint)",fontWeight:700}},tf("tr_done",{n:doneN})),
        err && React.createElement("div",{className:"alarmbox",style:{marginTop:10}}, errMsg? (t("tr_err")+" ("+errMsg+")") : t("tr_err"))
      );
  return React.createElement("div",{className:"bk-card bk-tr"},
    React.createElement("div",{className:"bk-brand"},
      React.createElement("div",{className:"bk-logo",style:{background:"#111",color:"#fff"}}, "TR"),
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{className:"ttl",style:{fontWeight:800,fontSize:16}}, t("tr_title")),
        React.createElement("div",{className:"sub",style:{fontSize:12.5,color:"var(--muted)",fontWeight:600}}, t("tr_sub"))
      ),
      connected ? React.createElement("span",{style:{fontSize:11,fontWeight:800,color:"var(--mint)"}}, "✓") : null
    ),
    React.createElement("div",{className:"hint",style:{marginTop:0,marginBottom:8}},t("tr_hint")),
    body
  );
}

function InvRows({items, st, fmt, editing, showCost, draft, setF, onSell, onDelete}){
  const eurVal=(it)=> invValueEur(it, st);
  const show=fmt||eur;   // moneda local de la tab (fallback a €)
  return items.map(function(it){
    return React.createElement("div",{className:"row",key:it.id},
      React.createElement("div",{className:"rl"},
        React.createElement(Mono,{ent:it.ent,size:38}),
        React.createElement("div",null,
          React.createElement("div",{className:"rname"},it.name),
          React.createElement("div",{className:"rsub"}, entOf(it.ent).label + (it.cur==="USD"?" \u00b7 USD":"")),
          editing && React.createElement("button",{style:{background:"none",border:"none",color:"#9BD0E0",cursor:"pointer",fontSize:11,fontWeight:700,padding:"4px 0 0"},onClick:function(){ onSell(it); }},t("inv_sold_part")),
          editing && React.createElement("button",{style:{background:"none",border:"none",color:"var(--coral)",cursor:"pointer",fontSize:11,fontWeight:700,padding:"4px 0 0",marginLeft:12},onClick:function(){ onDelete(it); }},"🗑 "+t("inv_delete"))
        )
      ),
      editing
        ? React.createElement("div",{className:"editpair"},
            React.createElement("label",null, React.createElement("span",null, t("inv_value")+(it.cur==="USD"?" $":" \u20ac")),
              React.createElement("input",{className:"num",value:(draft[it.id]||{}).value,inputMode:"decimal",onFocus:e=>e.target.select(),onChange:e=>setF(it.id,"value",e.target.value)})),
            showCost && React.createElement("label",null, React.createElement("span",null,t("inv_invested")),
              React.createElement("input",{className:"num",value:(draft[it.id]||{}).cost,inputMode:"decimal",onFocus:e=>e.target.select(),onChange:e=>setF(it.id,"cost",e.target.value)}))
          )
        : React.createElement("div",{className:"rval num"}, show(eurVal(it)),
            (function(){ if(it.cost==null||it.cost<=0) return null; const pl=(it.value-it.cost)/it.cost*100; return React.createElement("div",{className:"rvsub"+(pl<0?" neg":"")}, (pl>=0?"+":"")+pl.toFixed(2)+"%"); })())
    );
  });
}

/* Calculadora de proyección estilo TR/Revolut: slider de aporte + banda de rango. */
function Projection({invested, defMonthly}){
  const [monthly,setMonthly]=useState(Math.max(0,Math.min(3000,Math.round((defMonthly||500)/50)*50)));
  const [rate,setRate]=useState("7");
  const [years,setYears]=useState("20");
  const calc=useMemo(function(){
    const P=monthly;
    const ann=parseFloat(String(rate).replace(',','.'))||0;
    const Y=Math.max(1,Math.min(50,parseInt(years)||1));
    const init=invested||0;
    const serie=function(a){ const r=a/100/12, out=[]; for(let yy=0;yy<=Y;yy++){ const m=yy*12; out.push(init*Math.pow(1+r,m)+(r>0?P*((Math.pow(1+r,m)-1)/r):P*m)); } return out; };
    const mid=serie(ann), opt=serie(ann+2), pes=serie(Math.max(0,ann-2)), ap=[];
    for(let yy=0;yy<=Y;yy++) ap.push(init+P*12*yy);
    return {Y:Y, mid:mid, opt:opt, pes:pes, ap:ap, fv:mid[mid.length-1], aportado:ap[ap.length-1]};
  },[monthly,rate,years,invested]);

  const W=340,H=176, mL=4,mR=46,mT=10,mB=22, N=calc.mid.length, pw=W-mL-mR, ph=H-mT-mB;
  const max=calc.opt[calc.opt.length-1]||1;
  const X=function(i){ return mL+(i/(N-1))*pw; };
  const Yc=function(v){ return mT+ph-(v/max)*ph; };
  const poly=function(arr){ return arr.map(function(v,i){ return X(i)+","+Yc(v); }).join(" "); };
  let bandTop=calc.opt.map(function(v,i){ return X(i)+","+Yc(v); }).join(" L ");
  let bandBot=[]; for(let i=N-1;i>=0;i--) bandBot.push(X(i)+","+Yc(calc.pes[i]));
  const band="M "+bandTop+" L "+bandBot.join(" L ")+" Z";
  const startYear=new Date().getFullYear();
  const kfmt=function(v){ return v>=1000?(Math.round(v/1000)+"K €"):(Math.round(v)+" €"); };
  const ticks=[]; for(let i=1;i<=5;i++) ticks.push(max*i/5);
  const xl=[]; const st=4; for(let i=0;i<=st;i++){ const yi=Math.round(calc.Y/st*i); xl.push({i:yi,t:String(startYear+yi)}); }
  const inp={width:"100%",padding:"9px 8px",borderRadius:"10px",border:"1px solid var(--line-soft)",background:"var(--bg)",color:"var(--text)",fontSize:"15px",boxSizing:"border-box",textAlign:"center"};
  const lbl={fontSize:11,color:"var(--muted-2)",fontWeight:700,marginBottom:3,textAlign:"center"};
  const dot=function(c){ return React.createElement("span",{style:{width:9,height:9,borderRadius:2,background:c,display:"inline-block",marginRight:5}}); };

  return React.createElement("div",null,
    React.createElement("div",{style:{display:"flex",gap:20,marginBottom:10}},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:12,color:"var(--muted)"}}, dot("var(--mint)"),t("pj_projvalue")),
        React.createElement("div",{className:"serif num",style:{fontSize:22}}, eur0(calc.fv))),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:12,color:"var(--muted)"}}, dot("#2f6b4a"),t("pj_contrib")),
        React.createElement("div",{className:"serif num",style:{fontSize:22,color:"var(--muted)"}}, eur0(calc.aportado)))
    ),
    React.createElement("svg",{viewBox:"0 0 "+W+" "+H,style:{width:"100%",height:"auto",display:"block"}},
      ticks.map(function(t,i){ return React.createElement("g",{key:i},
        React.createElement("line",{x1:mL,y1:Yc(t),x2:mL+pw,y2:Yc(t),stroke:"var(--line-soft)",strokeWidth:"1"}),
        React.createElement("text",{x:mL+pw+5,y:Yc(t)+3,fontSize:"9",fill:"var(--muted-2)"}, kfmt(t))); }),
      React.createElement("path",{d:band,fill:"rgba(95,208,138,.13)"}),
      React.createElement("polyline",{points:poly(calc.ap),fill:"none",stroke:"#2f6b4a",strokeWidth:"2"}),
      React.createElement("polyline",{points:poly(calc.mid),fill:"none",stroke:"var(--mint)",strokeWidth:"2.6"}),
      React.createElement("circle",{cx:X(N-1),cy:Yc(calc.fv),r:"3.6",fill:"var(--mint)"}),
      React.createElement("circle",{cx:X(N-1),cy:Yc(calc.aportado),r:"3.6",fill:"#2f6b4a"}),
      xl.map(function(o,i){ return React.createElement("text",{key:i,x:X(o.i),y:H-6,fontSize:"9",fill:"var(--muted-2)",textAnchor:i===0?"start":(i===xl.length-1?"end":"middle")}, o.t); })
    ),
    React.createElement("div",{style:{marginTop:14}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}},
        React.createElement("span",{style:{fontSize:13,color:"var(--muted)",fontWeight:600}},t("pj_monthly")),
        React.createElement("span",{className:"num",style:{fontWeight:700,fontSize:17}}, monthly+" €")),
      React.createElement("input",{type:"range",min:"0",max:"3000",step:"50",value:monthly,onChange:function(e){ setMonthly(parseInt(e.target.value)); },onTouchStart:function(e){e.stopPropagation();},onTouchMove:function(e){e.stopPropagation();},style:{width:"100%",accentColor:"#5FD08A"}})
    ),
    React.createElement("div",{style:{display:"flex",gap:8,marginTop:12}},
      React.createElement("div",{style:{flex:1}},React.createElement("div",{style:lbl},t("pj_rate")),React.createElement("input",{style:inp,inputMode:"decimal",value:rate,onChange:function(e){setRate(e.target.value);}})),
      React.createElement("div",{style:{flex:1}},React.createElement("div",{style:lbl},t("pj_years")),React.createElement("input",{style:inp,inputMode:"numeric",value:years,onChange:function(e){setYears(e.target.value);}}))
    ),
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginTop:12}},
      React.createElement("span",{style:{fontSize:12,color:"var(--muted)"}},tf("pj_gain",{y:calc.Y})),
      React.createElement("span",{style:{fontSize:14,color:"var(--mint)",fontWeight:700}},"+"+eur0(calc.fv-calc.aportado))),
    React.createElement("div",{className:"hint",style:{marginTop:8}},tf("pj_hint",{x:eur0(invested||0)}))
  );
}

function Investments({state, set, fetchPrices, pricing, v4Embed, toolsMode}){
  const fx=state.fx;   // USD→EUR (legacy + display toggle); GBP/CHF van en state.fxRates
  const [editing,setEditing]=useState(false);
  const [showCost,setShowCost]=useState(false);
  const [draft,setDraft]=useState({});
  const [brokerOpen,setBrokerOpen]=useState({});   // qué bróker tiene las posiciones desplegadas (solo v4Embed)
  const didAuto=useRef(false);
  const hasTickers=state.investments.some(function(i){ return i.ticker; });
  const autoOn=state.settings && state.settings.autoPrices;
  // Herramientas: sin lista de brókers duplicada, sin editar a mano / USD / auto-precios / líquido vendido
  // (feedback 2026-07-17). Las acciones solo entran por integración.
  const toolsOnly=!!toolsMode;
  useEffect(function(){
    if(autoOn && hasTickers && !didAuto.current && !toolsOnly && !v4Embed){ didAuto.current=true; fetchPrices(true); }
  },[]);
  const toggleAuto=()=> set(s=>Object.assign({},s,{settings:Object.assign({},s.settings,{autoPrices:!(s.settings&&s.settings.autoPrices)})}));
  // Solo los brókers donde el usuario TIENE posiciones (antes salían los 3 fijos — a un usuario
  // nuevo le aparecía "MyInvestor" sin haberlo conectado nunca; feedback pareja 2026-07-10).
  const groups=[["revolut","Revolut","Trading activo (USD)"],["trade_republic","Trade Republic","ETF + acciones"],["myinvestor","MyInvestor","Indexado largo plazo"]]
    .filter(function(g){ return state.investments.some(function(i){ return i.ent===g[0]; }); });
  const start=()=>{ const d={}; state.investments.forEach(i=>d[i.id]={value:i.value,cost:i.cost}); setDraft(d); setEditing(true); };
  const cancel=()=>{ setEditing(false); setShowCost(false); };
  const save=()=>{
    set(s=>Object.assign({},s,{investments:s.investments.map(i=>{
      const dd=draft[i.id]||{};
      const value=(dd.value!=null&&dd.value!=="")?(parseFloat(String(dd.value).replace(',','.'))||0):i.value;
      const cost=(showCost&&dd.cost!=null&&dd.cost!=="")?(parseFloat(String(dd.cost).replace(',','.'))||i.cost):i.cost;
      const patch={value:value,cost:cost};
      // Al editar el coste, anclamos el € contable al tipo de hoy (no se recalcula al cambiar FX).
      if(showCost&&dd.cost!=null&&dd.cost!==""){
        const newCost=parseFloat(String(dd.cost).replace(',','.'));
        if(isFinite(newCost)&&newCost!==i.cost) patch.costEur=toEurAmt(newCost, i.cur||"EUR", s);
      }
      return Object.assign({},i,patch);
    })}));
    setEditing(false); setShowCost(false);
  };
  const setF=(id,field,v)=> setDraft(d=>Object.assign({},d,{[id]:Object.assign({},d[id],{[field]:v})}));
  // Borrar una posición del todo (duplicados de un import, valores liquidados…). Antes NO se
  // podía desde la UI y los cadáveres se quedaban para siempre (feedback 2026-07-13).
  const onDelete=function(it){
    askConfirm({ title:tf("inv_delete_confirm",{name:it.name}), sub:t("inv_delete_sub"),
      ok:t("inv_delete"), danger:true }).then(function(yes){
      if(!yes) return;
      set(function(s){ return Object.assign({},s,{investments:s.investments.filter(function(i){ return i.id!==it.id; })}); });
    });
  };
  // Venta parcial: reduce valor, coste y participaciones proporcionalmente y registra el líquido vendido.
  const onSell=function(it){
    askText({ title:tf("inv_sell_prompt",{name:it.name}), sub:t("inv_sell_sub"), ph:"%",
      chips:[25,50,75,100].map(function(v){ return {v:v,label:v+" %"}; })
    }).then(function(pStr){ if(pStr!=null) sellPct(it, parseFloat(String(pStr).replace(',','.'))); });
  };
  const sellPct=function(it,pct){
    if(!(pct>0 && pct<=100)){ return; }
    const f=pct/100;
    const realizado=invValueEur(it, state)*f;   // líquido sacado, en €
    set(function(s){
      return Object.assign({},s,{
        investments:s.investments.map(function(i){
          if(i.id!==it.id) return i;
          const o=Object.assign({},i,{ value:+(i.value*(1-f)).toFixed(2), cost:(i.cost!=null?+(i.cost*(1-f)).toFixed(2):i.cost) });
          if(i.shares) o.shares=+(i.shares*(1-f)).toFixed(6);
          if(typeof i.costEur==="number") o.costEur=+(i.costEur*(1-f)).toFixed(2);
          return o;
        }),
        soldCash:+(((s.soldCash||0)+realizado)).toFixed(2)
      });
    });
  };
  const total=state.investments.reduce((a,i)=>a+invValueEur(i, state),0);
  const costTotal=state.investments.reduce((a,i)=>a+invCostEur(i, state),0);
  const plTotal=costTotal>0?(total-costTotal)/costTotal*100:0;
  // Moneda LOCAL de la pestaña Inversiones (no toca el resto de la app). Todo se calcula en €
  // internamente y se convierte a la moneda elegida para mostrar (€ ↔ $ con el cambio del BCE).
  const [invCur,setInvCur]=useState(function(){ return (state.settings&&state.settings.currency)||"EUR"; });
  const dk = invCur==="USD" ? (fx>0?1/fx:1) : 1;
  const dsym = invCur==="USD" ? "$" : "€";
  const f2  = (eurVal)=> NF.format((eurVal||0)*dk)+" "+dsym;
  const f0  = (eurVal)=> NF0.format(Math.round((eurVal||0)*dk))+" "+dsym;
  // valor y coste por bróker (en €) para el desglose de contribuciones
  const byBroker={};
  state.investments.forEach(function(i){ const v=invValueEur(i, state); const c=invCostEur(i, state); const o=byBroker[i.ent]||(byBroker[i.ent]={c:0,v:0}); o.c+=c; o.v+=v; });
  // rendimiento por posición (en €), ordenado de mejor a peor
  const posList=state.investments.map(function(i){ const v=invValueEur(i, state); const c=invCostEur(i, state); return {id:i.id,name:i.name,ent:i.ent,v:v,c:c,gain:v-c,pl:c>0?(v-c)/c*100:0}; }).sort(function(a,b){ return b.gain-a.gain; });
  const maxAbsGain=Math.max.apply(null,posList.map(function(p){return Math.abs(p.gain);}).concat([1]));
  const best=posList[0], worst=posList[posList.length-1];
  const invHist=(state.invHistory||[]);
  const evoChg=invPeriodChange(invHist);
  // Desglose por tipo de activo (clasificación por id conocido, con respaldo por nombre)
  const TYPE_BY_ID={ "0mrszi5":"materias", "7zjaw0y":"etf", "0itlr5k":"fondo" };
  const invType=function(it){ if(TYPE_BY_ID[it.id]) return TYPE_BY_ID[it.id]; if(/oro|xau|materia|plata/i.test(it.name)) return "materias"; if(/etf|all.?world|s&p|amundi/i.test(it.name)) return "etf"; if(/fondo|indexad|fidelity|msci world/i.test(it.name)) return "fondo"; return "acciones"; };
  const byType={acciones:0,etf:0,fondo:0,materias:0};
  state.investments.forEach(function(i){ byType[invType(i)]+=invValueEur(i, state); });
  const typeMeta=[["acciones","var(--mint)"],["etf","var(--blue)"],["fondo","#C9A0E0"],["materias","#E6C36A"]];
  const typeSegs=typeMeta.filter(function(ty){ return byType[ty[0]]>0; }).map(function(ty){ return {label:t("type_"+ty[0])+" · "+(total>0?Math.round(byType[ty[0]]/total*100):0)+"%", value:byType[ty[0]], color:ty[1]}; });

  return React.createElement("div",null,
    !v4Embed && !toolsOnly && React.createElement("div",{className:"total-bar"},
      React.createElement("div",null,
        React.createElement("div",{className:"tl"},t("inv_total")),
        React.createElement("div",{className:"tn num"},f2(total)),
        React.createElement("div",{style:{fontSize:12,fontWeight:700,marginTop:2,color:plTotal>=0?"var(--mint)":"var(--coral)"}},(plTotal>=0?"+":"")+plTotal.toFixed(2)+"% global"),
        React.createElement("div",{className:"curtoggle",style:{marginTop:8}},
          React.createElement("button",{type:"button",className:"curbtn"+(invCur==="EUR"?" on":""),onClick:()=>setInvCur("EUR")},"€"),
          React.createElement("button",{type:"button",className:"curbtn"+(invCur==="USD"?" on":""),onClick:()=>setInvCur("USD")},"$")
        ),
        React.createElement("div",{className:"hint",style:{marginTop:8,maxWidth:260}}, t("fx_multi_hint"))
      ),
      editing
        ? React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
            React.createElement("button",{className:"btn btn-primary",onClick:save},t("inv_save")),
            React.createElement("button",{className:"btn btn-ghost",style:{padding:"8px 12px"},onClick:cancel},t("inv_cancel"))
          )
        : React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
            hasTickers && React.createElement("button",{className:"btn btn-primary",onClick:()=>fetchPrices(false),disabled:pricing}, pricing?React.createElement(React.Fragment,null,React.createElement("span",{className:"spin"}),t("inv_pricing")):React.createElement(React.Fragment,null,React.createElement(I.sync,{width:15,height:15}),t("inv_prices"))),
            React.createElement("button",{className:"btn btn-ghost",style:{padding:"8px 12px"},onClick:start},t("inv_editmanual"))
          )
    ),
    v4Embed && React.createElement("div",{className:"hint",style:{margin:"4px 2px 10px",lineHeight:1.45}}, t("v4_inv_embed_h")),
    !editing && hasTickers && !v4Embed && !toolsOnly && React.createElement("div",{className:"costtoggle",onClick:toggleAuto},
      React.createElement("span",{className:"cbx"+(autoOn?" on":"")}, autoOn?"✓":""),
      React.createElement("span",null,t("inv_autoprices")+(state.lastPriceSync?tf("inv_lastprice",{d:new Date(state.lastPriceSync).toLocaleString(loc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}):""))
    ),
    editing && !toolsOnly && React.createElement("div",{className:"costtoggle",onClick:()=>setShowCost(!showCost)},
      React.createElement("span",{className:"cbx"+(showCost?" on":"")}, showCost?"\u2713":""),
      React.createElement("span",null,t("inv_alsoinvested"))
    ),
    // En Cartera (v4Embed): mismas fichas que «Tus cuentas» (v4-mov). El resto (precios,
    // redondeo, proyección…) vive en la hoja «Herramientas» (feedback 2026-07-17).
    v4Embed && React.createElement("div",{className:"v4-card-list"},
      groups.map(function(g){
        const items=state.investments.filter(function(i){ return i.ent===g[0]; });
        if(items.length===0) return null;
        const sub=items.reduce(function(a,i){ return a+invValueEur(i,state); },0);
        const open=!!brokerOpen[g[0]];
        return React.createElement(React.Fragment,{key:g[0]},
          React.createElement("button",{type:"button",className:"v4-mov",
            onClick:function(){ setBrokerOpen(function(o){ return Object.assign({},o,{[g[0]]:!o[g[0]]}); }); }},
            React.createElement("div",{className:"tile",style:{background:"transparent",border:"none",padding:0}},React.createElement(Mono,{ent:g[0],size:44})),
            React.createElement("div",{className:"nm"},
              React.createElement("div",null,g[1]),
              React.createElement("div",{className:"meta"}, tf("v4_inv_positions",{n:items.length}))
            ),
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
              React.createElement("div",{className:"am num"}, f0(sub)),
              React.createElement(I.chev,{className:"chev"+(open?" open":"")})
            )
          ),
          open && React.createElement("div",{style:{padding:"0 2px 8px"}},
            React.createElement(InvRows,{items:items,st:state,fmt:f2,editing:false,showCost:false,draft:draft,setF:setF,onSell:onSell,onDelete:onDelete}))
        );
      })
    ),
    !v4Embed && React.createElement(OrderableSections,{tab:"inv",state:state,set:set,items:[
      {id:"ru",label:SIMPLEMODE?t("ru_title_simple"):t("ru_title"),el:
    (function(){
      const trAcc=state.accounts.find(function(a){ return a.spendFrom; });
      if(!trAcc) return null;
      const setTr=function(patch){ set(function(s){ return Object.assign({},s,{accounts:s.accounts.map(function(a){ return a.spendFrom?Object.assign({},a,patch):a; })}); }); };
      const setTot=function(v){ set(function(s){ return Object.assign({},s,{trRewardsTotal:v}); }); };
      const numOrNull=function(v){ v=String(v).trim(); return v===""?null:(parseFloat(v.replace(',','.'))||0); };
      const monthExp=(state.expenses||[]).filter(function(e){ return parseDate(e.date)>=startOfMonth(); });
      const mult=trAcc.roundup||0;
      const ruAuto=roundupOf(monthExp, mult), sbAuto=trAcc.saveback?savebackOf(monthExp):0;
      const ru=(trAcc.roundupManual!=null)?trAcc.roundupManual:ruAuto, sb=(trAcc.savebackManual!=null)?trAcc.savebackManual:sbAuto, tot=state.trRewardsTotal||0;
      const iv=state.investments.find(function(i){ return i.id===trAcc.rewardInv; });
      const invName=iv?iv.name:t("ru_pick");
      return React.createElement(CollapsibleCard,{key:"ru",title:SIMPLEMODE?t("ru_title_simple"):t("ru_title"),sub:SIMPLEMODE?t("ru_sub_simple"):(mult>0?tf("ru_sub_on",{m:mult}):t("ru_sub_off")),dot:"#E6C36A",defaultOpen:false,storageKey:"inv_ru",help:t("h_ru")},
        React.createElement("div",{className:"mlabel",style:{textAlign:"left",marginBottom:6}},t("ru_mult")),
        React.createElement("div",{className:"curtoggle",style:{flexWrap:"wrap",justifyContent:"flex-start"}},
          RU_MULTS.map(function(m){ return React.createElement("button",{key:m,type:"button",className:"curbtn"+(mult===m?" on":""),onClick:function(){ setTr({roundup:m}); }}, m===0?t("ru_off"):"×"+m); })),
        React.createElement("div",{className:"mlabel",style:{textAlign:"left",margin:"12px 0 6px"}},t("ru_dest")),
        React.createElement("select",{className:"af-in",value:trAcc.rewardInv||"",onChange:function(e){ setTr({rewardInv:e.target.value}); }},
          React.createElement("option",{value:""},t("ru_pick")),
          state.investments.map(function(i){ return React.createElement("option",{key:i.id,value:i.id}, i.name); })),
        React.createElement("div",{className:"costtoggle",style:{marginTop:12},onClick:function(){ setTr({saveback:!trAcc.saveback}); }},
          React.createElement("span",{className:"cbx"+(trAcc.saveback?" on":"")}, trAcc.saveback?"✓":""),
          React.createElement("span",null,t("ru_saveback"))),
        // Aporte periódico a inversión (plan de ahorro): p.ej. 50€/mes al FTSE. Baja del efectivo TR.
        React.createElement("div",{className:"mlabel",style:{textAlign:"left",margin:"14px 0 6px"}},t("ru_plan")),
        React.createElement("div",{className:"ru-edit"},
          React.createElement("span",{className:"muted"},t("ru_plan_amt")),
          React.createElement("input",{className:"af-in num",style:{width:96,textAlign:"right",padding:"7px 9px"},inputMode:"decimal",placeholder:"0",value:trAcc.monthlyInvest!=null?trAcc.monthlyInvest:"",onChange:function(e){ setTr({monthlyInvest:numOrNull(e.target.value)}); }})),
        (trAcc.monthlyInvest>0) && React.createElement("div",{className:"hint",style:{marginTop:6}}, tf("ru_plan_hint",{x:eur0(trAcc.monthlyInvest),inv:invName})),
        // Interés del efectivo (TR lo abona el día 1): sin esto el saldo se descuadra unos € cada mes
        React.createElement("div",{className:"ru-edit",style:{marginTop:12}},
          React.createElement("span",{className:"muted"},t("ru_interest")),
          React.createElement("input",{className:"af-in num",style:{width:96,textAlign:"right",padding:"7px 9px"},inputMode:"decimal",placeholder:"0",value:trAcc.interestApr!=null?trAcc.interestApr:"",onChange:function(e){ setTr({interestApr:numOrNull(e.target.value)}); }})),
        (trAcc.interestApr>0) && React.createElement("div",{className:"hint",style:{marginTop:6}}, tf("ru_interest_hint",{p:trAcc.interestApr})),
        React.createElement("div",{className:"ru-edit",style:{marginTop:12}},
          React.createElement("span",{className:"muted"},t("ru_month_ru")),
          React.createElement("input",{className:"af-in num",style:{width:96,textAlign:"right",padding:"7px 9px"},inputMode:"decimal",placeholder:eur0(ruAuto),value:trAcc.roundupManual!=null?trAcc.roundupManual:"",onChange:function(e){ setTr({roundupManual:numOrNull(e.target.value)}); }})),
        trAcc.saveback && React.createElement("div",{className:"ru-edit"},
          React.createElement("span",{className:"muted"},t("ru_month_sb")),
          React.createElement("input",{className:"af-in num",style:{width:96,textAlign:"right",padding:"7px 9px"},inputMode:"decimal",placeholder:eur0(sbAuto),value:trAcc.savebackManual!=null?trAcc.savebackManual:"",onChange:function(e){ setTr({savebackManual:numOrNull(e.target.value)}); }})),
        React.createElement("div",{className:"ru-edit"},
          React.createElement("span",{className:"muted"},t("ru_total")),
          React.createElement("input",{className:"af-in num",style:{width:96,textAlign:"right",padding:"7px 9px"},inputMode:"decimal",placeholder:"0",value:tot||"",onChange:function(e){ setTot(parseFloat(String(e.target.value).replace(',','.'))||0); }})),
        React.createElement("div",{className:"hint",style:{marginTop:8}}, SIMPLEMODE?t("ru_hint_simple"):((mult>0||trAcc.saveback?tf("ru_hint",{inv:invName}):t("ru_hint_off"))+" "+t("ru_manual_hint")))
      );
    })()},
      {id:"cvg",label:t("inv_cvg"),el:
    React.createElement(CollapsibleCard,{title:t("inv_cvg"),sub:(plTotal>=0?"+":"")+plTotal.toFixed(1)+"%",dot:"#5FD08A",defaultOpen:false,storageKey:"inv_cvg",help:t("h_cvg")},
      // desglose por bróker, para poder comparar cada uno con su app (p.ej. Revolut en $)
      groups.map(function(g){ const o=byBroker[g[0]]; if(!o||o.v===0) return null; const gain=o.v-o.c; const pl=o.c>0?gain/o.c*100:0;
        return React.createElement("div",{className:"row",key:g[0]},
          React.createElement("div",{className:"rl"},React.createElement(Mono,{ent:g[0],size:34}),
            React.createElement("div",null,React.createElement("div",{className:"rname"},g[1]),React.createElement("div",{className:"rsub"},tf("inv_invested_lbl",{x:f0(o.c)})))),
          React.createElement("div",{className:"rval num"}, f0(o.v),
            React.createElement("div",{className:"rvsub"+(gain<0?" neg":""),style:{color:gain>=0?"var(--mint)":"var(--coral)"}}, (gain>=0?"+":"")+f0(gain)+" ("+(pl>=0?"+":"")+pl.toFixed(1)+"%)")));
      }),
      React.createElement("div",{className:"subtotal"},React.createElement("span",{className:"muted"},t("inv_invested_tot")),React.createElement("span",{className:"num"},f0(costTotal))),
      React.createElement("div",{className:"subtotal"},React.createElement("span",{className:"muted"},t("inv_value_tot")),React.createElement("span",{className:"num",style:{fontWeight:700}},f0(total))),
      React.createElement("div",{className:"subtotal"},React.createElement("span",{className:"muted"},t("inv_gain_lat")),React.createElement("span",{className:"num",style:{fontWeight:700,color:(total-costTotal)>=0?"var(--mint)":"var(--coral)"}},((total-costTotal)>=0?"+":"")+f0(total-costTotal))),
      React.createElement("div",{style:{marginTop:10}}, React.createElement(StackedBar,{segments:[{label:t("inv_contributed"),value:costTotal,color:"#2f6b4a"},{label:t("inv_gain"),value:Math.max(0,total-costTotal),color:"var(--mint)"}]})),
      React.createElement("div",{className:"hint",style:{fontSize:11,marginTop:8}},t("inv_cvg_hint"))
    )},
      {id:"bytype",label:t("inv_bytype"),el:
    React.createElement(CollapsibleCard,{title:t("inv_bytype"),sub:f0(total),dot:"#7FB5E8",defaultOpen:false,storageKey:"inv_tipo",help:t("h_bytype")},
      React.createElement(StackedBar,{segments:typeSegs})
    )},
      {id:"rend",label:t("inv_rend"),el:
    posList.length>0 && React.createElement(CollapsibleCard,{title:t("inv_rend"),sub:best&&worst?tf("inv_best_worst",{best:best.name,worst:worst.name}):"",dot:"#5FD08A",defaultOpen:false,storageKey:"inv_rend",help:t("h_rend")},
      posList.map(function(p){
        const pos=p.gain>=0; const wpct=Math.min(100,Math.abs(p.gain)/maxAbsGain*100);
        return React.createElement("div",{key:p.id,style:{padding:"8px 2px",borderBottom:"1px solid var(--line-soft)"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:9,minWidth:0}},React.createElement(Mono,{ent:p.ent,size:30}),React.createElement("div",{className:"rname",style:{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},p.name)),
            React.createElement("div",{className:"num",style:{textAlign:"right",flex:"0 0 auto"}},
              React.createElement("div",{style:{fontWeight:700,color:pos?"var(--mint)":"var(--coral)"}},(pos?"+":"")+f2(p.gain)),
              React.createElement("div",{style:{fontSize:11,color:"var(--muted-2)"}},(p.pl>=0?"+":"")+p.pl.toFixed(1)+"%"))),
          React.createElement("div",{className:"rendbar"},React.createElement("i",{style:{width:wpct+"%",background:pos?"var(--mint)":"var(--coral)"}}))
        );
      })
    )},
      {id:"evo",label:t("inv_evo"),el:React.createElement(React.Fragment,null,
    invHist.length>=1 && total>0 && React.createElement(CollapsibleCard,{title:t("inv_evo"),sub:evoChg?tf("inv_evo_period",{sign:evoChg.pct>=0?"+":"",pct:Math.abs(evoChg.pct).toFixed(1),days:evoChg.days,x:f2(Math.abs(evoChg.abs))}):t("inv_evo_sub"),dot:"#7FB5E8",defaultOpen:false,storageKey:"inv_evo",help:t("h_evo")},
      invHist.length>=2 ? React.createElement(SparklineInv,{hist:invHist}) : React.createElement("div",{className:"hint",style:{marginBottom:8}},t("inv_evo_today")),
      invHist.length>=2 && React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--muted)",marginTop:6}},
        React.createElement("span",null,new Date(invHist[0].d).toLocaleDateString(loc(),{day:'2-digit',month:'short'})),
        React.createElement("span",{className:"num"}, f2(total))),
      invHist.some(function(h){ return h.c>0; }) && React.createElement("div",{className:"hint",style:{fontSize:11,marginTop:6}},t("inv_evo_cost"))
    ),
    invHist.length<1 && total>0 && React.createElement("div",{className:"hint",style:{padding:"0 4px 6px"}},t("inv_evo_hint"))
    )},
      {id:"brokers",label:t("pt_byBroker"),el:React.createElement(React.Fragment,null,
    groups.map(function(g){
      const items=state.investments.filter(i=>i.ent===g[0]);
      if(items.length===0) return null;
      const sub=items.reduce((a,i)=>a+invValueEur(i, state),0);
      return React.createElement(CollapsibleCard,{key:g[0],title:g[1],sub:f0(sub),dot:entOf(g[0]).color,storageKey:"inv_"+g[0]},
        React.createElement(InvRows,{items:items,st:state,fmt:f2,editing:editing,showCost:showCost,draft:draft,setF:setF,onSell:onSell,onDelete:onDelete})
      );
    }),
    (state.soldCash>0) && React.createElement("div",{className:"costtoggle",style:{justifyContent:"space-between"}},
      React.createElement("span",null,t("inv_sold")),
      React.createElement("span",{className:"num",style:{fontWeight:700,color:"var(--mint)"}}, f0(state.soldCash))
    )
    )},
      {id:"proj",label:t("inv_proj"),el:
    React.createElement(CollapsibleCard,{title:t("inv_proj"),sub:t("inv_proj_sub"),dot:"#5FD08A",defaultOpen:false,storageKey:"inv_proj",help:t("h_proj")},
      React.createElement(Projection,{invested:total, defMonthly: state.aportaciones.reduce(function(a,x){ return a+x.amount; },0)})
    )},
      {id:"manual",label:t("inv_manual_t"),el:
    !editing && React.createElement(CollapsibleCard,{title:t("inv_manual_t"),sub:t("inv_manual_sub"),dot:"#C9A0E0",defaultOpen:false,storageKey:"inv_manual"},
      React.createElement("div",{className:"hint",style:{lineHeight:1.55}},t("inv_manual_body"))
    )}
    ].filter(function(it){
      // Herramientas: sin brókers duplicados ni «editar a mano» (feedback 2026-07-17).
      if(!toolsOnly) return true;
      return it.id!=="brokers" && it.id!=="manual";
    })}),
    !toolsOnly && React.createElement("div",{className:"hint",style:{padding:"0 4px"}}, editing
      ? t("inv_hint_edit")
      : tf("inv_hint_view",{fx:fx}))
  );
}

