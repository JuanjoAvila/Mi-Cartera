/* ============================================================
   TAB: GASTOS
   ============================================================ */
const DATE_PRESETS=[
  {id:"month",label:"Este mes"},{id:"cycle",label:"Mi ciclo"},{id:"last",label:"Mes pasado"},
  {id:"3m",label:"Últimos 3 meses"},{id:"all",label:"Todo"},{id:"custom",label:"Rango…"},
];
// «Mi ciclo» (petición pareja 2026-07-11): su nómina no cae en día fijo (23, 24…), así que el mes
// natural le descuadra el ahorro. El ciclo se ancla al ÚLTIMO COBRO REAL apuntado: el ingreso
// más reciente ≥200 € de los últimos 45 días (los bizums pequeños no cuentan). Sin cobro → mes.
function lastPaydayOf(expenses){
  const cut=Date.now()-45*86400000;
  const cands=(expenses||[]).filter(function(e){ return e.amount<=-200 && parseDate(e.date).getTime()>=cut; })
    .sort(function(a,b){ return parseDate(b.date)-parseDate(a.date); });
  if(!cands[0]) return null;
  const d=parseDate(cands[0].date);
  return { start:new Date(d.getFullYear(),d.getMonth(),d.getDate()), inc:cands[0] };   // desde las 00:00 del día del cobro
}
function inPreset(d,preset,range,cycleStart){
  const now=new Date();
  if(preset==="month") return d>=startOfMonth();
  if(preset==="cycle") return d>=(cycleStart||startOfMonth());
  if(preset==="last"){ const s=startOfMonth(new Date(now.getFullYear(),now.getMonth()-1,1)); const e=startOfMonth(); return d>=s&&d<e; }
  if(preset==="3m"){ return d>=new Date(now.getFullYear(),now.getMonth()-2,1); }
  if(preset==="all") return true;
  if(preset==="custom"){ let ok=true; if(range.from) ok=ok&&d>=new Date(range.from); if(range.to){ const tt=new Date(range.to); tt.setHours(23,59,59); ok=ok&&d<=tt; } return ok; }
  return true;
}
function Expenses({state, set, onSync, syncing, syncStatus, showToast, stopSwipe, focusExp, clearFocus, active}){
  const [preset,setPreset]=useState("month");
  const [range,setRange]=useState({from:"",to:""});
  const [sel,setSel]=useState([]);   // categorías seleccionadas; [] = todas
  const [bankSel,setBankSel]=useState([]); // ents o "_manual"; [] = todos los bancos
  const [q,setQ]=useState("");        // búsqueda por texto (comercio/categoría)
  const [morePeriods,setMorePeriods]=useState(false);
  const [visible,setVisible]=useState(CONFIG.PAGE_SIZE);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({merchant:"",amount:"",category:"super",income:false,noCard:false,date:""});
  const [catEdit,setCatEdit]=useState(null);   // id del gasto al que estás cambiando la categoría
  const [aiBusy,setAiBusy]=useState(false);
  // Trabajo pesado (suscripciones) solo la 1ª vez que Gastos está activo. NO resetear al
  // salir: si no, los chips de banco parpadean al ir Resumen↔Gastos (feedback 2026-07-16).
  const [heavyOk,setHeavyOk]=useState(false);
  useEffect(function(){
    if(!active||heavyOk) return;
    var cancelled=false;
    mcScheduleIdle(function(){ if(!cancelled) setHeavyOk(true); }, 40);
    return function(){ cancelled=true; };
  },[active,heavyOk]);
  const expensesDef=useDeferredValue(state.expenses);
  const sentinelRef=useRef(null);
  const keyOfE=function(e){ return String(e.date).slice(0,10)+"|"+e.amount+"|"+(e.merchant||""); };
  const delExpense=function(e){
    set(function(s){ return Object.assign({},s,{ expenses:s.expenses.filter(function(x){ return x.id!==e.id; }), deleted:(s.deleted||[]).concat([keyOfE(e)]) }); });
    if(cloud.enabled()) cloud.deleteExpense(e).catch(function(){});
    showToast(t("g_deleted"));
  };
  // Recategorizar un gasto a mano: actualiza ESTE, recuerda el comercio (catOverrides) para los
  // futuros y arregla otros gastos del mismo comercio que estuvieran en "Otros".
  const setCat=function(ex,newCat){
    const mkey=catKey(ex.merchant);
    set(function(s){
      const ov=Object.assign({}, s.catOverrides||{}); if(mkey) ov[mkey]=newCat;
      USER_OVERRIDES=Object.assign({},ov);
      const exps=s.expenses.map(function(e){
        if(e.id===ex.id) return Object.assign({},e,{category:newCat});
        if(mkey && catKey(e.merchant)===mkey && e.category==="otros") return Object.assign({},e,{category:newCat});
        return e;
      });
      return Object.assign({},s,{expenses:exps,catOverrides:ov});
    });
    setCatEdit(null);
    const cc=CATEGORIES.concat([INGRESO_CAT]).find(function(x){ return x.id===newCat; });
    if(showToast) showToast(tf("v4_moved_cat",{cat:(cc?cc.icon+" ":"")+catName(newCat)}));
  };
  // Marca/desmarca un gasto como "no tarjeta" (bizum/transferencia) para que no cuente el round-up TR.
  const setCardFlag=function(ex,noCard){
    set(function(s){ return Object.assign({},s,{expenses:s.expenses.map(function(e){ return e.id===ex.id?Object.assign({},e,{noCard:noCard?true:undefined}):e; })}); });
    if(cloud.enabled()) cloud.setExpenseNoCard(ex,noCard).catch(function(){});   // durable en la tabla
  };
  // EDITAR un gasto (comercio / importe / gasto↔ingreso): para corregir lo que la ingesta parsea
  // mal (financiación Cofidis que notifica el TOTAL pero TR solo cobra la cuota, bizums antiguos
  // que entraron como gasto…). En la nube la clave es fecha|importe|comercio → se hace tombstone
  // de la fila vieja (deleted + deleteExpense) y se inserta la corregida, o el pull la resucitaría.
  const [editExp,setEditExp]=useState(null);   // {id, merchant, amount, income} — usado por el sheet de detalle
  const [detailId,setDetailId]=useState(null);     // id del gasto abierto en sheet (SPEC §14)
  // PUNTO 5: al tocar la noti de un gasto, App pasa focusExp ({amount,merchant}) → abrimos la ficha
  // del gasto que casa (mismo importe y comercio parecido, el más reciente; si no, el último gasto).
  useEffect(function(){
    if(!focusExp) return;
    const cands=(state.expenses||[]).filter(function(e){
      if(Math.abs(Math.abs(e.amount)-focusExp.amount)>0.005) return false;
      if(focusExp.merchant){ const m=(e.merchant||"").toLowerCase(), fm=focusExp.merchant.toLowerCase(); if(m.indexOf(fm.slice(0,Math.min(6,fm.length)))<0 && fm.indexOf(m)<0) return false; }
      return true;
    }).sort(function(a,b){ return parseDate(b.date)-parseDate(a.date); });
    if(cands[0]){
      setDetailId(cands[0].id); setEditExp({id:cands[0].id, merchant:cands[0].merchant||"", amount:String(Math.abs(cands[0].amount)).replace('.',','), income:cands[0].amount<0});
      if(clearFocus) clearFocus();
      return;
    }
    // Sin match todavía: lo normal es que el gasto de la noti AÚN esté bajando de la nube
    // (App ya lanzó syncCloudExpenses) → esperamos a que lleguen gastos nuevos (dep state.expenses
    // re-ejecuta) en vez de abrir "el último" a ciegas (abría la ficha EQUIVOCADA — feedback
    // pareja 2026-07-10, punto 8). Si en 12s no aparece, abrimos el más reciente como antes.
    const tm=setTimeout(function(){
      const e=(state.expenses||[]).slice().sort(function(a,b){ return parseDate(b.date)-parseDate(a.date); })[0];
      if(e){ setDetailId(e.id); setEditExp({id:e.id, merchant:e.merchant||"", amount:String(Math.abs(e.amount)).replace('.',','), income:e.amount<0}); }
      if(clearFocus) clearFocus();
    }, 12000);
    return function(){ clearTimeout(tm); };
  },[focusExp, state.expenses]);
  const saveEdit=function(orig){
    const amt=parseFloat(String(editExp.amount).replace(',','.'))||0;
    if(amt<=0){ showToast(t("g_invalid")); return; }
    const signed=editExp.income? -amt : amt;
    const merch=(editExp.merchant||"").trim()||orig.merchant;
    if(signed===orig.amount && merch===(orig.merchant||"")){ setEditExp(null); return; }   // sin cambios
    const cat = editExp.income ? "ingreso" : (orig.category==="ingreso" ? autoCategory(merch) : orig.category);
    const upd=Object.assign({},orig,{merchant:merch, amount:signed, category:cat});
    if(editExp.income) upd.noCard=true;   // un ingreso nunca alimenta el round-up
    set(function(s){ return Object.assign({},s,{
      expenses:s.expenses.map(function(x){ return x.id===orig.id?upd:x; }),
      deleted:(s.deleted||[]).concat([keyOfE(orig)])
    }); });
    if(cloud.enabled()){ cloud.deleteExpense(orig).catch(function(){}); cloud.addExpense(upd).catch(function(){}); }
    setEditExp(null); showToast(t("g_edited"));
  };

  const cycle=useMemo(()=>lastPaydayOf(expensesDef),[expensesDef]);
  // Bancos presentes en el período (o configurados como gasto) → chips de filtro.
  // "_manual" = apuntados a mano / sin banco conocido (no mezclar con OB).
  // Chips de banco: baratos y SIEMPRE visibles (no dependen de heavyOk → sin flash).
  const bankOpts=useMemo(function(){
    const seen={}; const order=[];
    const add=function(k){ if(!k||seen[k]) return; seen[k]=1; order.push(k); };
    expenseBankEnts(state).forEach(add);
    (state.accounts||[]).forEach(function(a){ if(a&&a.ent) add(a.ent); });
    let hasManual=false;
    (expensesDef||[]).forEach(function(e){
      if(!inPreset(parseDate(e.date),preset,range,cycle&&cycle.start)) return;
      const b=expenseBankOf(e); if(b) add(b); else hasManual=true;
    });
    if(hasManual) order.push("_manual");
    return order;
  },[expensesDef,state.accounts,state.settings,preset,range,cycle]);
  const filtered=useMemo(()=>{ const needle=q.trim().toLowerCase(); return (expensesDef||[])
    .filter(e=>inPreset(parseDate(e.date),preset,range,cycle&&cycle.start))
    .filter(e=> sel.length===0 || sel.indexOf(e.category)!==-1)
    .filter(function(e){
      if(bankSel.length===0) return true;
      const b=expenseBankOf(e)||"_manual";
      return bankSel.indexOf(b)!==-1;
    })
    .filter(e=> !needle || (e.merchant||"").toLowerCase().indexOf(needle)!==-1 || catName(e.category).toLowerCase().indexOf(needle)!==-1)
    .sort((a,b)=>parseDate(b.date)-parseDate(a.date));
  },[expensesDef,preset,range,sel,bankSel,q,cycle]);

  // La cabecera es siempre el mes natural: los filtros sirven para explorar, pero no deben hacer
  // que el presupuesto parezca cambiar al mirar otro período o una categoría.
  const monthSummary=useMemo(function(){
    const now=new Date(), start=startOfMonth(now);
    let spent=0, income=0;
    (state.expenses||[]).forEach(function(e){
      const d=parseDate(e.date); if(!(d>=start)) return;
      if(e.amount>0) spent+=e.amount;
      else if(e.amount<0) income+=Math.abs(e.amount);
    });
    const budget=typeof state.budget==="number" && state.budget>0 ? state.budget : null;
    const mode=(state.settings&&state.settings.gTotalMode)||"split";
    const balance=income-spent; // positivo = te queda / negativo = gastaste de más
    return {
      spent:spent, income:income, balance:balance, mode:mode,
      budget:budget,
      remaining:budget==null?null:(mode==="net"?budget-spent+income:budget-spent),
      day:now.getDate(),
      last:new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),
      month:monthLong(now.getMonth())
    };
  },[state.expenses,state.budget,state.settings&&state.settings.gTotalMode]);
  const subs=useMemo(function(){ return heavyOk?detectSubscriptions(expensesDef):[]; },[heavyOk,expensesDef]);
  const suggestAi=function(ex){
    if(!cloud.enabled()||!ex||aiBusy) return;
    if(!(state.settings&&state.settings.aiCat)){ showToast(t("ai_cat_off")); return; }
    setAiBusy(true);
    cloud.suggestCategory(ex.merchant||"").then(function(res){
      const cat=res&&res.category;
      if(!cat||cat==="otros"||!CAT[cat]){ showToast(t("ai_cat_none")); return; }
      setCat(ex,cat);
      showToast(tf("ai_cat_ok",{c:catName(cat)}));
    }).catch(function(e){ showToast("⚠ "+((e&&e.message)||e)); }).finally(function(){ setAiBusy(false); });
  };
  useEffect(()=>{ setVisible(CONFIG.PAGE_SIZE); },[preset,range,sel,bankSel,q]);
  useEffect(()=>{
    const el=sentinelRef.current; if(!el) return;
    const io=new IntersectionObserver(es=>{ if(es[0].isIntersecting) setVisible(v=> v<filtered.length?v+CONFIG.PAGE_SIZE:v); },{rootMargin:"120px"});
    io.observe(el); return ()=>io.disconnect();
  },[filtered.length]);

  const shown=filtered.slice(0,visible);
  const groups=[]; let last=null;
  shown.forEach(function(e){
    const d=parseDate(e.date), k=dayKey(d);
    if(k!==last){
      const today=dayKey(new Date()), yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
      const label=k===today?t("g_today"):k===dayKey(yesterday)?t("g_yesterday"):d.toLocaleDateString(loc(),{weekday:"long",day:"numeric",month:"short"});
      groups.push({sep:label}); last=k;
    }
    groups.push({e:e,d:d});
  });

  const addExpense=()=>{
    const amt=parseFloat(String(form.amount).replace(',','.'))||0;
    if(amt<=0){ showToast(t("g_invalid")); return; }
    const signed=form.income? -amt : amt;   // ingreso = negativo (resta del gasto del mes)
    // Fecha elegible (petición 2026-07-11: una transferencia de hace días no podía apuntarse en su
    // día). Vacía = ahora; con fecha = ese día a las 12:00 local (evita bailes de zona horaria).
    const when=form.date? new Date(form.date+"T12:00:00") : new Date();
    const ex={ id:uid(), date:(isNaN(when.getTime())?new Date():when).toISOString(), merchant:form.merchant||(form.income?"Ingreso":"Gasto"), amount:signed, category:form.income?"ingreso":form.category, source:"manual" };
    if(form.income) ex.noCard=true;                   // un ingreso nunca alimenta el round-up (igual que al editar)
    else if(form.noCard) ex.noCard=true;              // bizum/transfer: no cuenta round-up
    // Gasto a mano: etiqueta el banco de gasto diario si hay uno (filtro por banco; 2026-07-16)
    if(!form.income){ const daily=(state.accounts||[]).find(function(a){ return accDaily(a); }); if(daily&&daily.ent) ex.ent=daily.ent; }
    set(s=>Object.assign({},s,{expenses:[ex].concat(s.expenses)}));
    if(cloud.enabled()) cloud.addExpense(ex).catch(function(){});   // lo guarda también en la BD
    // Avisos al apuntar (notificaciones "de andar por casa", las push reales llegarán con el APK):
    // pasarse del presupuesto > cruzar el 80% > gasto tocho (≥15% del presupuesto). Si no, el toast normal.
    let msg = form.income ? t("g_saved_i") : t("g_saved_g");
    let isAlert=false;
    if(!form.income && (state.budget||0)>0){
      const bud=state.budget;
      const before=(state.expenses||[]).filter(e=>parseDate(e.date)>=startOfMonth()).reduce((a,e)=>a+e.amount,0);
      const after=before+amt;
      if(before<=bud && after>bud){ msg=tf("al_over",{x:eur0(after),b:eur0(bud)}); isAlert=true; }
      else if(before<bud*0.8 && after>=bud*0.8 && after<=bud){ msg=tf("al_80",{p:Math.round(after/bud*100)}); isAlert=true; }
      else if(amt>=bud*0.15 && amt>=50){ msg=tf("al_big",{x:eur0(amt)}); isAlert=true; }
    }
    // En la app Android los avisos también salen como notificación de verdad (quedan en la bandeja).
    if(isAlert){ const nat=natPlugin(); if(nat&&nat.showNotification){ try{ nat.showNotification({title:"Mi Cartera",body:msg}).catch(function(){}); }catch(e){} } }
    setForm({merchant:"",amount:"",category:form.category,income:false,noCard:false,date:""}); setAdding(false); showToast(msg);
  };

  return React.createElement("div",{className:"v4-screen"},
    React.createElement("h1",{className:"v4-title serif"}, t("v4_gastos_title")),
    React.createElement("section",{className:"v4-gastos-summary"},
      React.createElement("div",{className:"v4-gastos-summary-top"},
        React.createElement("div",null,
          React.createElement("div",{className:"v4-gastos-summary-label"},
            monthSummary.mode==="net"
              ? tf("v4_gastos_net_in",{month:monthSummary.month})
              : tf("v4_gastos_spent_in",{month:monthSummary.month})),
          // Importe en blanco, sin signo, € al lado (como el patrimonio). El rojo/menos
          // confundía el «balance» con una alarma (feedback 2026-07-17).
          (function(){
            const amt=monthSummary.mode==="net"?Math.abs(monthSummary.balance):monthSummary.spent;
            const p=eurParts(amt);
            return React.createElement("div",{className:"v4-gastos-summary-amount num"},
              p.ent, React.createElement("span",{className:"cents"},","+p.dec+" "+p.sym));
          })(),
          monthSummary.mode==="net"
            ? React.createElement("div",{className:"v4-gastos-summary-sub"},
                tf("v4_gastos_split_line",{spent:eur(monthSummary.spent),income:eur(monthSummary.income)}))
            : (monthSummary.income>0 && React.createElement("div",{className:"v4-gastos-summary-sub"},
                tf("v4_gastos_inc_line",{x:eur(monthSummary.income),bal:(monthSummary.balance>=0?"+":"−")+eur(Math.abs(monthSummary.balance))})))
        ),
        React.createElement("div",{className:"v4-gastos-summary-budget"},
          React.createElement("div",null,tf("v4_gastos_of",{x:monthSummary.budget==null?"—":eur(monthSummary.budget)})),
          React.createElement("div",{className:"v4-gastos-summary-left"},tf("v4_gastos_left",{x:monthSummary.remaining==null?"—":eur(monthSummary.remaining)}))
        )
      ),
      React.createElement("div",{className:"v4-gastos-progress",role:"progressbar","aria-valuemin":0,"aria-valuemax":monthSummary.budget||0,"aria-valuenow":monthSummary.spent},
        React.createElement("i",{style:{width:monthSummary.budget==null?"0%":Math.min(100,monthSummary.spent/monthSummary.budget*100)+"%"}})
      ),
      React.createElement("div",{className:"v4-gastos-progress-marks"},
        React.createElement("span","1 "+monthSummary.month),
        React.createElement("span",tf("v4_gastos_today_mark",{d:monthSummary.day})),
        React.createElement("span",monthSummary.last+" "+monthSummary.month)
      )
    ),
    React.createElement("div",{className:"filters"},
      React.createElement("div",{className:"v4-periods"},
        DATE_PRESETS.slice(0,2).map(function(p){ return React.createElement("button",{key:p.id,className:"v4-period-btn"+(preset===p.id?" on":""),onClick:function(){ setPreset(p.id); setMorePeriods(false); }},t("g_"+p.id)); }),
        React.createElement("button",{className:"v4-period-btn"+(morePeriods||DATE_PRESETS.slice(2).some(function(p){ return p.id===preset; })?" on":""),onClick:function(){ setMorePeriods(!morePeriods); }},t("v4_period_more"))
      ),
      React.createElement("div",Object.assign({className:"searchbar"},stopSwipe),
        React.createElement("span",{className:"searchbar-ic"},"🔍"),
        React.createElement("input",{className:"searchbar-in",type:"search",placeholder:t("g_search"),value:q,onChange:e=>setQ(e.target.value)}),
        q && React.createElement("button",{className:"searchbar-x",onClick:()=>setQ(""),title:"×"},"✕")
      ),
      // «Mi ciclo»: enseña QUÉ cobro ancla el ciclo (si el detectado no es el bueno, se corrige
      // apuntando la nómina real como ingreso, o usando Rango…).
      preset==="cycle" && React.createElement("div",{className:"v4-cycle-box"},
        cycle
          ? React.createElement(React.Fragment,null,
              React.createElement("strong",null,"📅 "+t("g_cycle")),
              tf("g_cycle_from",{d:cycle.start.toLocaleDateString(loc(),{day:'2-digit',month:'2-digit'}), x:"+"+eur0(Math.abs(cycle.inc.amount))+((cycle.inc.merchant&&cycle.inc.merchant!=="Ingreso")?" · "+cycle.inc.merchant:"")}))
          : React.createElement(React.Fragment,null,
              React.createElement("strong",null,t("g_cycle_none_t")),
              t("g_cycle_none"))
      ),
      preset==="custom" && React.createElement("div",Object.assign({className:"range"},stopSwipe),
        React.createElement("input",{type:"date",value:range.from,onChange:e=>setRange(Object.assign({},range,{from:e.target.value}))}),
        React.createElement("span",null,"→"),
        React.createElement("input",{type:"date",value:range.to,onChange:e=>setRange(Object.assign({},range,{to:e.target.value}))})
      ),
      React.createElement("div",Object.assign({className:"v4-chips"},stopSwipe),
        React.createElement("button",{className:"v4-chip"+(sel.length===0?" on":""),onClick:()=>setSel([])},t("g_allcats")),
        // "Ingreso" no vive en CATEGORIES (es la categoría especial de importes negativos) pero
        // también se filtra (petición 2026-07-11: no había forma de ver solo los ingresos).
        CATEGORIES.concat([INGRESO_CAT]).map(c=>React.createElement("button",{key:c.id,className:"v4-chip"+(sel.indexOf(c.id)!==-1?" on":""),onClick:()=>setSel(function(prev){ const has=prev.indexOf(c.id)!==-1; return has?prev.filter(function(x){return x!==c.id;}):prev.concat([c.id]); })},c.icon+" "+catName(c.id).split(" ")[0]))
      ),
      // Filtro por banco (varios bancos de tarjeta OB + TR + a mano) — sin mezclar Fijos aquí.
      bankOpts.length>1 && React.createElement("div",Object.assign({className:"v4-chips"},stopSwipe),
        React.createElement("button",{className:"v4-chip"+(bankSel.length===0?" on":""),onClick:function(){ setBankSel([]); }},t("g_allbanks")),
        bankOpts.map(function(b){
          const on=bankSel.indexOf(b)!==-1;
          const lbl=b==="_manual"?t("g_bank_manual"):entOf(b).label;
          return React.createElement("button",{key:b,className:"v4-chip"+(on?" on":""),onClick:function(){ setBankSel(function(prev){ const has=prev.indexOf(b)!==-1; return has?prev.filter(function(x){return x!==b;}):prev.concat([b]); }); }},lbl);
        })
      )
    ),
    React.createElement("div",{className:"action-row"},
      React.createElement("button",{className:"btn btn-ghost",onClick:onSync,disabled:syncing}, syncing?React.createElement(React.Fragment,null,React.createElement("span",{className:"spin"}),t("g_syncing")):React.createElement(React.Fragment,null,React.createElement(I.sync,{width:16,height:16}),t("g_sync")))
    ),
    React.createElement("div",{className:"sync-note"},
      React.createElement("span",{className:"sync-dot "+(syncStatus.type||"idle")}),
      syncStatus.msg || (state.lastSync?tf("g_lastsync",{d:new Date(state.lastSync).toLocaleString(loc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}):t("g_nosync"))
    ),
/* Alta de gasto/ingreso: FAB Apuntar (SPEC §7). */
    (function(){
      // SPEC §4: suscripciones solo si hay novedad (activas aún no pasadas a Fijos).
      const novel=(subs||[]).filter(function(sp){
        if(!sp.active) return false;
        return !(state.fixed||[]).some(function(f){ return catKey(f.name)===sp.key; });
      });
      if(!novel.length) return null;
      return React.createElement("div",{style:{marginTop:14}}, React.createElement(CollapsibleCard,{title:t("sub_title")+" · "+novel.length,sub:tf("sub_sub",{n:novel.length,y:eur0(novel.reduce(function(a,s){return a+(s.active?s.yearly:0);},0))}),dot:"#C9A6F0",defaultOpen:true,storageKey:"g_subs_novel",help:t("h_subs")},
        novel.map(function(sp){ const c=catOf(sp.cat);
          const toFixed=function(){
            const lastE=(state.expenses||[]).filter(function(e){ return catKey(e.merchant)===sp.key && e.amount>0; }).sort(function(a,b){ return parseDate(b.date)-parseDate(a.date); })[0];
            const acc=(state.accounts||[]).find(function(a){ return accRole(a)==="fijos"; })||(state.accounts||[]).find(function(a){ return accRole(a)==="ambos"; });
            const it={ id:uid(), name:sp.name, amount:sp.amount, freq:"mes", account:(acc&&acc.ent)||"sabadell" };
            const dd=lastE? parseDate(lastE.date).getDate() : null; if(dd>=1&&dd<=31) it.day=dd;
            set(function(s){ return Object.assign({},s,{fixed:(s.fixed||[]).concat([it])}); });
            showToast(tf("sub_tofixed_done",{n:sp.name,b:entOf((acc&&acc.ent)||"sabadell").label}));
          };
          return React.createElement("div",{key:sp.key,className:"sub-row"},
          React.createElement("div",{className:"sub-ic",style:{borderColor:c.color+"55",color:c.color}}, c.icon),
          React.createElement("div",{className:"sub-mid"},
            React.createElement("div",{className:"sub-name"}, sp.name),
            React.createElement("div",{className:"sub-meta"}, tf("sub_months",{n:sp.months})+" · "+tf("sub_peryear",{y:eur0(sp.yearly)})),
            React.createElement("button",{className:"chip",style:{marginTop:5,fontSize:11.5,padding:"3px 10px"},onClick:toFixed}, "→ "+t("sub_tofixed"))),
          React.createElement("div",{className:"sub-amt num"}, eur(sp.amount)+t("sub_permonth"))
        ); }),
        React.createElement("div",{className:"hint",style:{marginTop:8}}, t("sub_hint"))
      ));
    })(),
    React.createElement("div",{className:"v4-gastos-list",style:{marginTop:14}},
      React.createElement("div",{className:"v4-gastos-list-body"},
        shown.length===0
          ? React.createElement("div",{className:"empty"},React.createElement("div",{className:"ttl"},t("g_empty_t")),t("g_empty_d"))
          : groups.map(function(g,i){ return g.sep
              ? React.createElement("div",{className:"day-sep",key:"s"+i},g.sep)
              : (function(){ const c=catOf(g.e.category); const isIncome=g.e.amount<0;
                  return React.createElement("button",{type:"button",key:g.e.id||i,className:"v4-mov",
                    onClick:function(){
                      setDetailId(g.e.id);
                      setEditExp({id:g.e.id, merchant:g.e.merchant||"", amount:String(Math.abs(g.e.amount)).replace('.',','), income:g.e.amount<0});
                      setCatEdit(null);
                    }},
                    React.createElement("div",{className:"tile",style:{borderColor:c.color+"55",color:c.color,background:c.color+"18"}},c.icon),
                    React.createElement("div",{className:"nm"},
                      React.createElement("div",null,g.e.merchant||"—"),
                      React.createElement("div",{className:"meta"},
                        React.createElement("span",{style:{color:c.color}},catName(g.e.category)),
                        React.createElement("span",{className:"sep"},"·"),
                        React.createElement("span",null,g.d.toLocaleDateString(loc(),{day:'2-digit',month:'2-digit'})),
                        (function(){ const bk=expenseBankOf(g.e); return bk?React.createElement(React.Fragment,null,
                          React.createElement("span",{className:"sep"},"·"),
                          React.createElement("span",{style:{color:"var(--muted-2)"}},entOf(bk).mono)
                        ):null; })()
                      )
                    ),
                    React.createElement("div",{className:"am num"+(isIncome?" pos":"")}, (isIncome?"+":"")+eur(Math.abs(g.e.amount)))
                  );
                })(); }),
        visible<filtered.length && React.createElement("div",{className:"sentinel",ref:sentinelRef},t("g_loadmore"))
      )
    ),
    morePeriods && ReactDOM.createPortal(
      React.createElement("div",{className:"v4-sheet-back",onClick:function(){ setMorePeriods(false); }},
        React.createElement("div",{className:"v4-sheet",onClick:function(e){ e.stopPropagation(); }},
          React.createElement("div",{className:"v4-sheet-handle"}),
          React.createElement("div",{className:"serif",style:{fontSize:22,fontWeight:550,marginBottom:14}}, t("v4_period_more")),
          DATE_PRESETS.slice(2).map(function(p){
            return React.createElement("button",{key:p.id,type:"button",className:"v4-sheet-row"+(preset===p.id?" on":""),onClick:function(){ setPreset(p.id); setMorePeriods(false); }}, t("g_"+p.id));
          })
        )
      ), document.body),
    detailId && React.createElement(ExpenseDetailSheet,{
      exp:(state.expenses||[]).find(function(e){ return e.id===detailId; }),
      editExp:editExp, setEditExp:setEditExp,
      onClose:function(){ setDetailId(null); setEditExp(null); },
      setCat:setCat, setCardFlag:setCardFlag, delExpense:delExpense, saveEdit:saveEdit,
      showToast:showToast, aiBusy:aiBusy, suggestAi:suggestAi, state:state
    })
  );
}

/* Sheet detalle/edición de un movimiento (SPEC §14). Cambios al momento; borrar pide confirmación. */
function ExpenseDetailSheet({exp, editExp, setEditExp, onClose, setCat, setCardFlag, delExpense, saveEdit, showToast, aiBusy, suggestAi, state}){
  useBackClose(!!exp, onClose);
  const swipe=useSheetSwipe(!!exp, onClose);
  if(!exp || !editExp) return null;
  const c=catOf(exp.category);
  const isIncome=exp.amount<0;
  const bk=expenseBankOf(exp);
  const auto=exp.source && exp.source!=="manual";
  const d=parseDate(exp.date);
  const dateLbl=d&&!isNaN(d.getTime())
    ? d.toLocaleDateString(loc(),{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
    : "—";
  const closeSave=function(){ saveEdit(exp); onClose(); };
  const doDel=function(){
    askConfirm({ title:tf("v4_exp_del_q",{name:(exp.merchant||"—")+" · "+eur(Math.abs(exp.amount))}), sub:t("v4_exp_del_sub"), ok:t("v4_exp_del"), danger:true })
      .then(function(yes){ if(!yes) return; delExpense(exp); onClose(); });
  };
  return ReactDOM.createPortal(
    React.createElement("div",{className:"v4-sheet-back",onClick:onClose},
      React.createElement("div",Object.assign({className:"v4-sheet",style:{maxHeight:"88dvh"},ref:swipe.sheetRef,onClick:function(e){ e.stopPropagation(); }}, swipe.sheetTouch),
        React.createElement("div",{className:"v4-sheet-handle"}),
        React.createElement("div",{className:"v4-exp-head"},
          React.createElement("div",{className:"tile",style:{width:54,height:54,fontSize:26,borderRadius:16,border:"1px solid "+c.color+"55",color:c.color,background:c.color+"18",display:"grid",placeItems:"center"}}, c.icon),
          React.createElement("div",{style:{flex:1,minWidth:0}},
            React.createElement("input",{className:"v4-input",style:{marginBottom:6,fontWeight:700},value:editExp.merchant,onChange:function(e){ const v=e.target.value; setEditExp(function(p){ return Object.assign({},p,{merchant:v}); }); },onBlur:closeSave}),
            React.createElement("input",{className:"v4-input num",style:{fontFamily:"'Fraunces',Georgia,serif",fontSize:28,fontWeight:550,textAlign:"center"},inputMode:"decimal",value:editExp.amount,onChange:function(e){ const v=e.target.value; setEditExp(function(p){ return Object.assign({},p,{amount:v}); }); },onBlur:closeSave})
          )
        ),
        React.createElement("div",{className:"v4-chips meta-chips wrap",
          onTouchStart:function(e){ e.stopPropagation(); }, onTouchMove:function(e){ e.stopPropagation(); }},
          React.createElement("span",{className:"v4-chip"}, dateLbl),
          bk && React.createElement("span",{className:"v4-chip"}, entOf(bk).label),
          React.createElement("span",{className:"v4-chip"}, auto?t("v4_exp_auto"):t("v4_exp_manual"))
        ),
        !isIncome && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"v4-micro",style:{marginBottom:8}}, t("g_changecat")),
          React.createElement("div",{className:"v4-chips",
            onTouchStart:function(e){ e.stopPropagation(); }, onTouchMove:function(e){ e.stopPropagation(); }},
            CATEGORIES.map(function(cc){
              return React.createElement("button",{key:cc.id,type:"button",className:"v4-chip"+(cc.id===exp.category?" on":""),onClick:function(){ setCat(exp,cc.id); }}, cc.icon+" "+catName(cc.id));
            })
          ),
          React.createElement("button",{type:"button",className:"cardflag"+(exp.noCard?" off":""),style:{marginTop:12},onClick:function(){ setCardFlag(exp,!exp.noCard); }}, exp.noCard?("🔄 "+t("g_nocard")):("💳 "+t("g_card"))),
          exp.category==="otros" && cloud.enabled() && React.createElement("button",{type:"button",className:"btn btn-ghost btn-block",style:{marginTop:8},disabled:aiBusy,onClick:function(){ suggestAi(exp); }}, aiBusy?t("ai_cat_busy"):t("ai_cat_btn"))
        ),
        React.createElement("button",{type:"button",className:"cardflag"+(editExp.income?"":" off"),style:{marginTop:12},onClick:function(){ setEditExp(function(p){ return Object.assign({},p,{income:!p.income}); }); setTimeout(function(){ /* se guarda al blur/cerrar */ },0); }}, editExp.income?("💰 "+t("g_ingreso")):("💸 "+t("g_gasto"))),
        React.createElement("button",{type:"button",className:"btn btn-primary btn-block",style:{marginTop:14},onClick:closeSave}, t("fj_save")),
        React.createElement("button",{type:"button",className:"v4-danger",onClick:doDel}, "🗑 "+t("v4_exp_del"))
      )
    ), document.body);
}

function BudgetSheet({open, budget, onClose, onSave}){
  const [b,setB]=useState(budget||700);
  useEffect(function(){ if(open) setB(Math.max(100, Math.round(budget||700))); },[open,budget]);
  useBackClose(!!open, onClose);
  const swipe=useSheetSwipe(!!open, onClose);
  if(!open) return null;
  return ReactDOM.createPortal(
    React.createElement("div",{className:"v4-sheet-back",onClick:onClose},
      React.createElement("div",Object.assign({className:"v4-sheet",ref:swipe.sheetRef,onClick:function(e){ e.stopPropagation(); }}, swipe.sheetTouch),
        React.createElement("div",{className:"v4-sheet-handle"}),
        React.createElement("div",{className:"serif",style:{fontSize:22,fontWeight:550,marginBottom:8}}, t("v4_budget_sheet")),
        React.createElement("p",{style:{color:"var(--muted)",fontSize:13.5,lineHeight:1.45,margin:"0 0 18px"}}, t("v4_budget_sheet_h")),
        React.createElement("div",{className:"v4-ob-stepper"},
          React.createElement("button",{type:"button","aria-label":"−",onClick:function(){ setB(function(x){ return Math.max(100,x-50); }); }},"−"),
          React.createElement("div",{className:"serif num"}, eur0(b)),
          React.createElement("button",{type:"button","aria-label":"+",onClick:function(){ setB(function(x){ return x+50; }); }},"+")
        ),
        React.createElement("button",{className:"v4-cta",style:{marginTop:18},onClick:function(){ onSave(b); onClose(); }}, t("save"))
      )
    ), document.body);
}
