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
  const [visible,setVisible]=useState(CONFIG.PAGE_SIZE);
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({merchant:"",amount:"",category:"super",income:false,noCard:false,date:""});
  const [catEdit,setCatEdit]=useState(null);   // id del gasto al que estás cambiando la categoría
  const [aiBusy,setAiBusy]=useState(false);
  // Suscripciones y filtros pesados solo con la pestaña enfocada (cold start Android 2026-07-16).
  const [heavyOk,setHeavyOk]=useState(false);
  useEffect(function(){
    if(!active){ setHeavyOk(false); return; }
    var cancelled=false;
    mcScheduleIdle(function(){ if(!cancelled) setHeavyOk(true); }, 80);
    return function(){ cancelled=true; };
  },[active]);
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
  const [editExp,setEditExp]=useState(null);   // {id, merchant, amount, income}
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
      setEditExp({id:cands[0].id, merchant:cands[0].merchant||"", amount:String(Math.abs(cands[0].amount)).replace('.',','), income:cands[0].amount<0});
      if(clearFocus) clearFocus();
      return;
    }
    // Sin match todavía: lo normal es que el gasto de la noti AÚN esté bajando de la nube
    // (App ya lanzó syncCloudExpenses) → esperamos a que lleguen gastos nuevos (dep state.expenses
    // re-ejecuta) en vez de abrir "el último" a ciegas (abría la ficha EQUIVOCADA — feedback
    // pareja 2026-07-10, punto 8). Si en 12s no aparece, abrimos el más reciente como antes.
    const tm=setTimeout(function(){
      const e=(state.expenses||[]).slice().sort(function(a,b){ return parseDate(b.date)-parseDate(a.date); })[0];
      if(e) setEditExp({id:e.id, merchant:e.merchant||"", amount:String(Math.abs(e.amount)).replace('.',','), income:e.amount<0});
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
  const bankOpts=useMemo(function(){
    if(!heavyOk) return [];
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
  },[heavyOk,expensesDef,state.accounts,state.settings,preset,range,cycle]);
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

  // Total con SIGNO CLARO (bug pareja 2026-07-11: con un ingreso en el filtro, el total mostraba
  // «gastos − ingresos» en positivo — ilegible). Desglose: gastos sin signo (2026-07-12: el «−»
  // les parecía feo), y si hay ingresos, línea «+ingresos · Balance» (ingresos − gastos; verde si ahorras).
  const sums=useMemo(()=>{ let g=0,i=0,ng=0,ni=0; filtered.forEach(e=>{ if(e.amount>0){ g+=e.amount; ng++; } else { i-=e.amount; ni++; } }); return {g:g,i:i,ng:ng,ni:ni,bal:i-g}; },[filtered]);
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
  shown.forEach(e=>{ const d=parseDate(e.date); const k=relDay(d); if(k!==last){ groups.push({sep:k}); last=k; } groups.push({e:e,d:d}); });

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

  return React.createElement("div",null,
    React.createElement("div",{className:"filters"},
      React.createElement("div",Object.assign({className:"searchbar"},stopSwipe),
        React.createElement("span",{className:"searchbar-ic"},"🔍"),
        React.createElement("input",{className:"searchbar-in",type:"search",placeholder:t("g_search"),value:q,onChange:e=>setQ(e.target.value)}),
        q && React.createElement("button",{className:"searchbar-x",onClick:()=>setQ(""),title:"×"},"✕")
      ),
      React.createElement("div",Object.assign({className:"chips"},stopSwipe), DATE_PRESETS.map(p=>React.createElement("button",{key:p.id,className:"chip"+(preset===p.id?" active":""),onClick:()=>setPreset(p.id)},t("g_"+p.id)))),
      // «Mi ciclo»: enseña QUÉ cobro ancla el ciclo (si el detectado no es el bueno, se corrige
      // apuntando la nómina real como ingreso, o usando Rango…).
      preset==="cycle" && React.createElement("div",{className:"hint",style:{margin:"2px 2px 0"}},
        cycle
          ? "📅 "+tf("g_cycle_from",{d:cycle.start.toLocaleDateString(loc(),{day:'2-digit',month:'2-digit'}), x:"+"+eur0(Math.abs(cycle.inc.amount))+((cycle.inc.merchant&&cycle.inc.merchant!=="Ingreso")?" · "+cycle.inc.merchant:"")})
          : "💡 "+t("g_cycle_none")
      ),
      preset==="custom" && React.createElement("div",Object.assign({className:"range"},stopSwipe),
        React.createElement("input",{type:"date",value:range.from,onChange:e=>setRange(Object.assign({},range,{from:e.target.value}))}),
        React.createElement("span",null,"→"),
        React.createElement("input",{type:"date",value:range.to,onChange:e=>setRange(Object.assign({},range,{to:e.target.value}))})
      ),
      React.createElement("div",Object.assign({className:"cat-select"},stopSwipe),
        React.createElement("button",{className:"chip"+(sel.length===0?" active":""),onClick:()=>setSel([])},t("g_allcats")),
        // "Ingreso" no vive en CATEGORIES (es la categoría especial de importes negativos) pero
        // también se filtra (petición 2026-07-11: no había forma de ver solo los ingresos).
        CATEGORIES.concat([INGRESO_CAT]).map(c=>React.createElement("button",{key:c.id,className:"chip"+(sel.indexOf(c.id)!==-1?" active":""),onClick:()=>setSel(function(prev){ const has=prev.indexOf(c.id)!==-1; return has?prev.filter(function(x){return x!==c.id;}):prev.concat([c.id]); })},c.icon+" "+catName(c.id).split(" ")[0]))
      ),
      // Filtro por banco (varios bancos de tarjeta OB + TR + a mano) — sin mezclar Fijos aquí.
      bankOpts.length>1 && React.createElement("div",Object.assign({className:"cat-select"},stopSwipe),
        React.createElement("button",{className:"chip"+(bankSel.length===0?" active":""),onClick:function(){ setBankSel([]); }},t("g_allbanks")),
        bankOpts.map(function(b){
          const on=bankSel.indexOf(b)!==-1;
          const lbl=b==="_manual"?t("g_bank_manual"):entOf(b).label;
          return React.createElement("button",{key:b,className:"chip"+(on?" active":""),onClick:function(){ setBankSel(function(prev){ const has=prev.indexOf(b)!==-1; return has?prev.filter(function(x){return x!==b;}):prev.concat([b]); }); }},lbl);
        })
      )
    ),
    React.createElement("div",{className:"total-bar"},
      // Dos vistas del total (petición 2026-07-11, Ajustes › «Total de Gastos»): «desglosado»
      // (gastos arriba, ingresos+balance debajo — el modelo de 3.91) o «lo que te queda» (el
      // modelo antiguo que gustaba: un solo número = ingresos − gastos del filtro).
      // Dos vistas del total de Gastos (Ajustes › «Total de Gastos»). MISMO diseño en ambas
      // (petición 2026-07-12): título + número protagonista + una línea de desglose con los otros
      // dos importes, con idéntico estilo (💸 gastos en gris · 💰 ingresos en verde · Balance en
      // color). Solo cambia QUÉ número manda arriba: «Balance» destaca ingresos−gastos; «Gastos e
      // ingresos» destaca el gasto. Sin «−» en ningún sitio: el color rojo/verde ya lo dice.
      ((state.settings&&state.settings.gTotalMode)==="net")
        ? React.createElement("div",null,
            React.createElement("div",{className:"tl"},t("g_totalnet")),
            React.createElement("div",{className:"tn num",style:{color:sums.bal>=0?"var(--mint)":"var(--coral)"}},(sums.bal>=0?"+":"")+eur(Math.abs(sums.bal))),
            React.createElement("div",{className:"num",style:{fontSize:12.5,marginTop:3}},
              React.createElement("span",{style:{color:"var(--muted)"}},"💸 "+t("g_lbl_spent")+" "+eur(sums.g)),
              sums.ni>0 && React.createElement("span",{style:{color:"var(--mint)"}}," · 💰 "+t("g_lbl_income")+" +"+eur(sums.i))
            )
          )
        : React.createElement("div",null,
            React.createElement("div",{className:"tl"},t("g_totalfilt")),
            React.createElement("div",{className:"tn num"},eur(sums.g)),
            sums.ni>0 && React.createElement("div",{className:"num",style:{fontSize:12.5,marginTop:3}},
              React.createElement("span",{style:{color:"var(--mint)"}},"💰 "+t("g_lbl_income")+" +"+eur(sums.i)),
              React.createElement("span",{style:{color:"var(--muted)"}}," · "+t("g_balance")+" "),
              React.createElement("span",{style:{color:sums.bal>=0?"var(--mint)":"var(--coral)",fontWeight:700}},(sums.bal>=0?"+":"")+eur(Math.abs(sums.bal)))
            )
          ),
      React.createElement("div",{className:"cnt"},
        sums.ng+" "+(sums.ng===1?t("g_n_one"):t("g_n_many")),
        sums.ni>0 && React.createElement("div",null, sums.ni+" "+(sums.ni===1?t("g_inc_one"):t("g_inc_many")))
      )
    ),
    React.createElement("div",{className:"action-row"},
      React.createElement("button",{className:"btn btn-primary",style:{flex:1},onClick:onSync,disabled:syncing}, syncing?React.createElement(React.Fragment,null,React.createElement("span",{className:"spin"}),t("g_syncing")):React.createElement(React.Fragment,null,React.createElement(I.sync,{width:16,height:16}),t("g_sync"))),
      React.createElement("button",{className:"btn btn-ghost",onClick:()=>setAdding(!adding)},React.createElement(I.plus,{width:16,height:16}),t("g_add"))
    ),
    React.createElement("div",{className:"sync-note"},
      React.createElement("span",{className:"sync-dot "+(syncStatus.type||"idle")}),
      syncStatus.msg || (state.lastSync?tf("g_lastsync",{d:new Date(state.lastSync).toLocaleString(loc(),{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}):t("g_nosync"))
    ),
    adding && React.createElement("div",{className:"add-form"},
      React.createElement("div",{className:"af-row"},
        React.createElement("button",{className:"btn "+(!form.income?"btn-primary":"btn-ghost"),style:{flex:1},onClick:()=>setForm(Object.assign({},form,{income:false}))},t("g_gasto")),
        React.createElement("button",{className:"btn "+(form.income?"btn-primary":"btn-ghost"),style:{flex:1},onClick:()=>setForm(Object.assign({},form,{income:true}))},t("g_ingreso"))
      ),
      React.createElement("input",{className:"af-in",placeholder:form.income?t("g_concept_i"):t("g_concept_g"),value:form.merchant,onChange:e=>setForm(Object.assign({},form,{merchant:e.target.value}))}),
      React.createElement("div",{className:"af-row"},
        React.createElement("input",{className:"af-in num",placeholder:"0,00 €",inputMode:"decimal",value:form.amount,onChange:e=>setForm(Object.assign({},form,{amount:e.target.value}))}),
        !form.income && React.createElement("select",{className:"af-in",value:form.category,onChange:e=>setForm(Object.assign({},form,{category:e.target.value}))}, CATEGORIES.map(c=>React.createElement("option",{key:c.id,value:c.id},c.icon+" "+catName(c.id))))
      ),
      // Fecha del movimiento (opcional): sin tocar = hoy. Para apuntar a posteriori un gasto o
      // una transferencia de hace días con su día real (petición 2026-07-11).
      React.createElement("div",{className:"af-row",style:{alignItems:"center"}},
        React.createElement("span",{style:{fontSize:12.5,color:"var(--muted)",whiteSpace:"nowrap"}},"📅 "+t("g_date")),
        React.createElement("input",{className:"af-in",type:"date",max:new Date().toISOString().slice(0,10),value:form.date,onChange:e=>setForm(Object.assign({},form,{date:e.target.value}))})
      ),
      !form.income && React.createElement("button",{type:"button",className:"cardflag"+(form.noCard?" off":""),onClick:()=>setForm(Object.assign({},form,{noCard:!form.noCard}))}, form.noCard?("🔄 "+t("g_nocard")):("💳 "+t("g_card"))),
      React.createElement("button",{className:"btn btn-primary btn-block",onClick:addExpense}, form.income?t("g_addingreso"):t("g_addgasto"))
    ),
    subs.length>0 && React.createElement("div",{style:{marginTop:14}}, React.createElement(CollapsibleCard,{title:t("sub_title"),sub:tf("sub_sub",{n:subs.length,y:eur0(subs.reduce(function(a,s){return a+(s.active?s.yearly:0);},0))}),dot:"#C9A6F0",defaultOpen:false,storageKey:"g_subs",help:t("h_subs")},
      subs.map(function(sp){ const c=catOf(sp.cat);
        // Sugerencia (petición 2026-07-11): una suscripción recurrente pinta más en Gastos FIJOS
        // (presupuesto previsible) que goteando en variables. Un toque la crea allí, con el banco
        // de recibos y el día real del último cargo. Si ya existe un fijo con ese nombre: ✓.
        const inFixed=(state.fixed||[]).some(function(f){ return catKey(f.name)===sp.key; });
        const toFixed=function(){
          const lastE=(state.expenses||[]).filter(function(e){ return catKey(e.merchant)===sp.key && e.amount>0; }).sort(function(a,b){ return parseDate(b.date)-parseDate(a.date); })[0];
          const acc=(state.accounts||[]).find(function(a){ return accRole(a)==="fijos"; })||(state.accounts||[]).find(function(a){ return accRole(a)==="ambos"; });
          const it={ id:uid(), name:sp.name, amount:sp.amount, freq:"mes", account:(acc&&acc.ent)||"sabadell" };
          const dd=lastE? parseDate(lastE.date).getDate() : null; if(dd>=1&&dd<=31) it.day=dd;
          set(function(s){ return Object.assign({},s,{fixed:(s.fixed||[]).concat([it])}); });
          showToast(tf("sub_tofixed_done",{n:sp.name,b:entOf((acc&&acc.ent)||"sabadell").label}));
        };
        return React.createElement("div",{key:sp.key,className:"sub-row"+(sp.active?"":" off")},
        React.createElement("div",{className:"sub-ic",style:{borderColor:c.color+"55",color:c.color}}, c.icon),
        React.createElement("div",{className:"sub-mid"},
          React.createElement("div",{className:"sub-name"}, sp.name, !sp.active && React.createElement("span",{className:"sub-tag"}," "+t("sub_inactive"))),
          React.createElement("div",{className:"sub-meta"}, tf("sub_months",{n:sp.months})+" · "+tf("sub_peryear",{y:eur0(sp.yearly)})),
          sp.active && React.createElement("button",{className:"chip",style:{marginTop:5,fontSize:11.5,padding:"3px 10px",opacity:inFixed?0.7:1},disabled:inFixed,onClick:inFixed?null:toFixed}, inFixed? "✓ "+t("sub_infixed") : "→ "+t("sub_tofixed"))),
        React.createElement("div",{className:"sub-amt num"}, eur(sp.amount)+t("sub_permonth"))
      ); }),
      React.createElement("div",{className:"hint",style:{marginTop:8}}, t("sub_hint"))
    )),
    React.createElement("div",{className:"card",style:{marginTop:14}},
      React.createElement("div",{className:"card-body",style:{paddingTop:6}},
        shown.length===0
          ? React.createElement("div",{className:"empty"},React.createElement("div",{className:"ttl"},t("g_empty_t")),t("g_empty_d"))
          : groups.map((g,i)=> g.sep
              ? React.createElement("div",{className:"day-sep",key:"s"+i},g.sep)
              : (function(){ const c=catOf(g.e.category); const isIncome=g.e.amount<0; const open=catEdit===g.e.id; const ed=editExp&&editExp.id===g.e.id; return React.createElement(React.Fragment,{key:g.e.id||i},
                  React.createElement("div",{className:"ex-row"},
                    React.createElement("button",{className:"ex-ic",style:{borderColor:c.color+"55",color:c.color,cursor:isIncome?"default":"pointer",background:"none"},title:t("g_changecat"),onClick:function(ev){ ev.stopPropagation(); if(!isIncome) setCatEdit(open?null:g.e.id); }},c.icon),
                    React.createElement("div",{className:"ex-mid"},
                      React.createElement("div",{className:"ex-merchant"},g.e.merchant||"—"),
                      React.createElement("div",{className:"ex-meta"},
                        React.createElement("span",{className:"ex-cat",style:{color:c.color}},catName(g.e.category)),
                        React.createElement("span",null,g.d.toLocaleDateString(loc(),{day:'2-digit',month:'2-digit'})),
                        (function(){ const bk=expenseBankOf(g.e); return bk?React.createElement("span",{style:{color:"var(--muted-2)"}}," · "+entOf(bk).mono):null; })()
                      )
                    ),
                    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                      // Sin «−» en gastos (petición 2026-07-12: quedaba feo); el «+» de ingresos se queda.
                      React.createElement("div",{className:"ex-amt num",style: isIncome?{color:"var(--mint)"}:null}, (isIncome?"+":"")+eur(Math.abs(g.e.amount))),
                      React.createElement("button",{className:"ex-del",title:t("g_edit"),onClick:function(ev){ ev.stopPropagation(); setEditExp(ed?null:{id:g.e.id, merchant:g.e.merchant||"", amount:String(Math.abs(g.e.amount)).replace('.',','), income:g.e.amount<0}); setCatEdit(null); }},"✎"),
                      React.createElement("button",{className:"ex-del",title:t("w_hide"),onClick:function(ev){ ev.stopPropagation(); delExpense(g.e); }},"✕")
                    )
                  ),
                  // editor inline: comercio + importe + gasto↔ingreso (corrige parses malos de la ingesta)
                  ed && React.createElement("div",{className:"catpick",style:{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}},
                    React.createElement("input",{className:"af-in",style:{flex:"1 1 130px",minWidth:0},value:editExp.merchant,placeholder:t("g_concept_g"),onChange:function(e2){ const v=e2.target.value; setEditExp(function(p){ return Object.assign({},p,{merchant:v}); }); }}),
                    React.createElement("input",{className:"af-in num",style:{flex:"0 0 92px",textAlign:"right"},inputMode:"decimal",value:editExp.amount,onFocus:function(e2){ e2.target.select(); },onChange:function(e2){ const v=e2.target.value; setEditExp(function(p){ return Object.assign({},p,{amount:v}); }); }}),
                    React.createElement("button",{type:"button",className:"cardflag"+(editExp.income?"":" off"),onClick:function(){ setEditExp(function(p){ return Object.assign({},p,{income:!p.income}); }); }}, editExp.income?("💰 "+t("g_ingreso")):("💸 "+t("g_gasto"))),
                    React.createElement("div",{style:{display:"flex",gap:8,flex:"1 1 100%"}},
                      React.createElement("button",{className:"btn btn-primary",style:{flex:1,padding:"9px"},onClick:function(){ saveEdit(g.e); }},t("fj_save")),
                      React.createElement("button",{className:"btn btn-ghost",style:{flex:1,padding:"9px"},onClick:function(){ setEditExp(null); }},t("fj_cancel"))
                    )
                  ),
                  open && React.createElement(React.Fragment,null,
                    React.createElement("div",{className:"catpick"}, CATEGORIES.map(function(cc){
                      return React.createElement("button",{key:cc.id,type:"button",className:"catpick-b"+(cc.id===g.e.category?" on":""),onClick:function(){ setCat(g.e,cc.id); }}, cc.icon+" "+catName(cc.id).split(" ")[0]);
                    })),
                    g.e.category==="otros" && cloud.enabled() && React.createElement("button",{type:"button",className:"btn btn-ghost btn-block",style:{marginTop:8},disabled:aiBusy,onClick:function(){ suggestAi(g.e); }}, aiBusy?t("ai_cat_busy"):t("ai_cat_btn")),
                    React.createElement("button",{type:"button",className:"cardflag"+(g.e.noCard?" off":""),style:{marginTop:8},onClick:function(){ setCardFlag(g.e,!g.e.noCard); }}, g.e.noCard?("🔄 "+t("g_nocard")):("💳 "+t("g_card")))
                  )
                ); })()
          ),
        visible<filtered.length && React.createElement("div",{className:"sentinel",ref:sentinelRef},t("g_loadmore"))
      )
    )
  );
}

