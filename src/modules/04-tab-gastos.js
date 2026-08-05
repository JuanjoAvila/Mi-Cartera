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
  const cands=(expenses||[]).filter(function(e){ return e.amount<=-200 && dateMs(e.date)>=cut; })
    .sort(function(a,b){ return dateMs(b.date)-dateMs(a.date); });
  if(!cands[0]) return null;
  const d=parseDate(cands[0].date);
  return { start:new Date(d.getFullYear(),d.getMonth(),d.getDate()), inc:cands[0] };   // desde las 00:00 del día del cobro
}
/* Límites del período EN MILISEGUNDOS, calculados UNA vez. Antes `inPreset` se llamaba por gasto y
   se construía dentro tres o cuatro `new Date()` (startOfMonth, el mes pasado…): con un histórico
   de miles de movimientos eran decenas de miles de objetos Date por render, y era buena parte del
   lag que crecía con el uso (feedback 2026-07-24). Devuelve {from,to} con Infinity de comodín. */
function presetBoundsMs(preset,range,cycleStart){
  const now=new Date();
  if(preset==="month") return {from:startOfMonth().getTime(), to:Infinity};
  if(preset==="cycle") return {from:(cycleStart||startOfMonth()).getTime(), to:Infinity};
  if(preset==="last") return {from:startOfMonth(new Date(now.getFullYear(),now.getMonth()-1,1)).getTime(), to:startOfMonth().getTime()-1};
  if(preset==="3m") return {from:new Date(now.getFullYear(),now.getMonth()-2,1).getTime(), to:Infinity};
  if(preset==="custom"){
    let from=-Infinity, to=Infinity;
    if(range&&range.from){ const f=new Date(range.from); if(!isNaN(f.getTime())) from=f.getTime(); }
    if(range&&range.to){ const tt=new Date(range.to); if(!isNaN(tt.getTime())){ tt.setHours(23,59,59,999); to=tt.getTime(); } }
    return {from:from, to:to};
  }
  return {from:-Infinity, to:Infinity};   // "all" y cualquier preset desconocido
}
function inBounds(ms,b){ return ms>=b.from && ms<=b.to; }
// Fila de una suscripción detectada. Importe EDITABLE antes de «pasar a Fijos» (petición
// 2026-08-03: recibos que se repiten cada mes pero varían de importe —luz, gas— para no dejarlos
// con el de este mes y tener que corregirlo a mano el que viene) + botón para descartarla del
// todo cuando no es una suscripción de verdad (ej. gasolina: se repite, pero nunca va a ser un
// importe fijo). Componente propio porque cada fila necesita su PROPIO estado de edición —dentro
// de un .map() no se pueden usar hooks por elemento.
function SubRow({sp, state, set, showToast}){
  const c=catOf(sp.cat);
  const [amt,setAmt]=useState(String(sp.amount).replace(".",","));
  const toFixed=function(){
    const useAmt=parseFloat(String(amt).replace(",",'.'))||sp.amount;
    const lastE=(state.expenses||[]).filter(function(e){ return catKey(e.merchant)===sp.key && e.amount>0; }).sort(function(a,b){ return dateMs(b.date)-dateMs(a.date); })[0];
    const acc=(state.accounts||[]).find(function(a){ return accRole(a)==="fijos"; })||(state.accounts||[]).find(function(a){ return accRole(a)==="ambos"; });
    const it={ id:uid(), name:sp.name, amount:useAmt, freq:"mes", account:(acc&&acc.ent)||"sabadell" };
    const dd=lastE? parseDate(lastE.date).getDate() : null; if(dd>=1&&dd<=31) it.day=dd;
    set(function(s){ return Object.assign({},s,{fixed:(s.fixed||[]).concat([it])}); });
    showToast(tf("sub_tofixed_done",{n:sp.name,b:entOf((acc&&acc.ent)||"sabadell").label}));
  };
  const dismiss=function(){
    set(function(s){ return Object.assign({},s,{subsDismissed:(s.subsDismissed||[]).concat([sp.key])}); });
    showToast(t("sub_dismissed_ok"));
  };
  return React.createElement("div",{className:"sub-row"},
    React.createElement("div",{className:"sub-ic",style:{borderColor:c.color+"55",color:c.color}}, c.icon),
    React.createElement("div",{className:"sub-mid"},
      React.createElement("div",{className:"sub-name"}, sp.name),
      React.createElement("div",{className:"sub-meta"}, tf("sub_months",{n:sp.months})+" · "+tf("sub_peryear",{y:eur0(sp.yearly)})),
      React.createElement("div",{style:{display:"flex",gap:6,marginTop:5,alignItems:"center"}},
        React.createElement("button",{className:"chip",style:{fontSize:11.5,padding:"3px 10px"},onClick:toFixed}, "→ "+t("sub_tofixed")),
        React.createElement("button",{className:"chip",style:{fontSize:11.5,padding:"3px 10px"},onClick:dismiss,title:t("sub_dismiss")}, "✕ "+t("sub_dismiss"))
      )
    ),
    React.createElement("div",{className:"sub-amt num",style:{display:"flex",alignItems:"baseline",gap:2}},
      React.createElement("input",{type:"text",inputMode:"decimal",value:amt,onChange:function(e){ setAmt(e.target.value); },
        style:{width:52,textAlign:"right",background:"transparent",border:"none",borderBottom:"1px dashed var(--bd)",color:"inherit",font:"inherit"}}),
      " €"+t("sub_permonth")
    )
  );
}
function Expenses({state, set, onSync, syncing, syncStatus, showToast, stopSwipe, cancelSwipe, focusExp, clearFocus, forceAllTs}){
  const [preset,setPreset]=useState("month");
  // Tras importar una hoja: salta a "Todo" — lo importado suele traer fechas fuera del mes en
  // curso, y "Este mes" las tapaba en silencio (feedback 2026-08-01).
  useEffect(function(){ if(forceAllTs) setPreset("all"); },[forceAllTs]);
  const [range,setRange]=useState({from:"",to:""});
  const [sel,setSel]=useState([]);   // categorías seleccionadas; [] = todas
  // Por defecto, el banco de gasto diario (petición 2026-08-03: «que por defecto esté marcado el
  // banco de gasto diario, no un filtro de Todo» — así el que tenga un banco puesto ve solo lo
  // suyo nada más entrar, en vez de todo mezclado). Sin banco diario configurado, [] = todos.
  // Solo se calcula UNA vez al montar (igual que heavyOk): si luego cambia el banco diario no
  // reordena el filtro que el usuario ya esté usando.
  const [bankSel,setBankSel]=useState(function(){
    const daily=(state.accounts||[]).find(function(a){ return accDaily(a); });
    return daily&&daily.ent ? [daily.ent] : [];
  }); // ents o "_manual"; [] = todos los bancos
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
  const heavyOkRef=useRef(false);
  const catChipsRef=useRef(null), bankChipsRef=useRef(null);
  const chipDrag=useRef({sx:0,sy:0,capturing:false});
  const heavyIdleGen=useRef(0);
  // Chips: cualquier horizontal cancela el gesto de tabs (sin «amago»). El swipe de tabs
  // se hace en el listado, no encima de categorías/bancos (feedback 2026-07-17).
  const chipSwipe=function(ref){
    return {
      onTouchStart:function(e){
        if(!(e.touches&&e.touches[0])) return;
        chipDrag.current={sx:e.touches[0].clientX,sy:e.touches[0].clientY,capturing:false};
      },
      onTouchMove:function(e){
        if(!ref.current||!(e.touches&&e.touches[0])) return;
        const dx=e.touches[0].clientX-chipDrag.current.sx, dy=e.touches[0].clientY-chipDrag.current.sy;
        if(Math.abs(dx)<6 && Math.abs(dy)<6) return;
        if(Math.abs(dy)>=Math.abs(dx)*1.15) return;
        chipDrag.current.capturing=true;
        if(cancelSwipe) cancelSwipe();
        e.stopPropagation();
      },
      onTouchEnd:function(e){
        if(chipDrag.current.capturing) e.stopPropagation();
        chipDrag.current.capturing=false;
      }
    };
  };
  // Lo caro de Gastos (detectar suscripciones y pintar su tarjeta) esperaba a que la pestaña
  // estuviera ACTIVA, así que se pagaba AL LLEGAR: en la cola del gesto de deslizar. Medido con
  // la CPU estrangulada x6 y trazado con `Tracing` (2026-07-26): la primera entrada en Gastos
  // costaba una tarea de ~67 ms, de los cuales **59,7 ms eran un Layout completo** (1.196
  // objetos, `partialLayout:false`) — el de las ~50 etiquetas que aparecen de golpe al ponerse
  // `heavyOk` en true. Y se pagaba igual llegando por gesto que tocando la barra de abajo, así
  // que no era el gesto: era esto.
  //
  // Es el mismo error que tenía el montaje de las pestañas, y se arregla igual: el coste no se
  // puede evitar, pero sí ELEGIR CUÁNDO se paga. Ahora se adelanta a un hueco libre aunque la
  // pestaña no esté activa (a esas alturas ya está montada y no hay ningún dedo en la pantalla).
  // El tope generoso —4 s frente a 40 ms— es lo que impide que se cuele a la fuerza en mitad del
  // arranque, que sigue siendo el momento más ocupado; con la pestaña activa manda la prisa.
  //
  // ⚠ Y el aviso de «eres la activa» NO PUEDE ser una prop (2026-07-27 noche). Con `active` en
  // props, CADA entrada a Gastos reconstruía Expenses entero encima del carrusel — y eso era
  // justo su «Deudas→Gastos lagazo / Deudas→Cartera fluido»: hacia Cartera el memo de Gastos no
  // se tocaba; hacia Gastos sí. El expediente ya lo había medido («dejar active fijo quita la
  // asimetría») y lo descartó mal: se puede enterarse sin re-render vía `mcOnGastosActive`.
  useEffect(function(){ heavyOkRef.current=heavyOk; },[heavyOk]);
  useEffect(function(){
    var chipGen=0;
    var unsub=mcOnGastosActive(function(active){
      // Chips: idle + solo si hay scroll que resetear (escribir scrollLeft en caliente costó
      // 276 ms — ver comentario histórico en el CHANGELOG de la 4.12.0).
      var cg=++chipGen;
      mcScheduleIdle(function(){
        if(cg!==chipGen) return;
        var c=catChipsRef.current, b=bankChipsRef.current;
        if(c&&c.scrollLeft) c.scrollLeft=0;
        if(b&&b.scrollLeft) b.scrollLeft=0;
      }, 300);
      if(heavyOkRef.current) return;
      var gen=++heavyIdleGen.current;
      mcScheduleIdle(function(){
        if(gen!==heavyIdleGen.current || heavyOkRef.current) return;
        setHeavyOk(true);
      }, active?40:4000);
    });
    return function(){ chipGen++; heavyIdleGen.current++; unsub(); };
  },[]);
  const expensesDef=useDeferredValue(state.expenses);
  const keyOfE=function(e){ return String(e.date).slice(0,10)+"|"+e.amount+"|"+(e.merchant||""); };
  const delExpense=function(e){
    set(function(s){ return Object.assign({},s,{ expenses:s.expenses.filter(function(x){ return x.id!==e.id; }), deleted:pushDeleted(s.deleted, keyOfE(e)) }); });
    if(cloud.enabled()) cloud.deleteExpense(e).catch(function(){});
    showToast(t("g_deleted"));
  };
  // Recategorizar un gasto a mano: actualiza ESTE, recuerda el comercio (catOverrides) para los
  // futuros y arregla otros gastos del mismo comercio que estuvieran en "Otros".
  const setCat=function(ex,newCat){
    const mkey=catKey(ex.merchant);
    // "Movimiento" es el hueco que deja un banco que no manda NINGÚN dato (Trade Republic por
    // Open Banking, ver `mapTransaction` en enablebanking.ts) — no es un comercio de verdad, así
    // que ni se aprende como override (contaminaría CUALQUIER futuro gasto sin datos, de cualquier
    // banco) ni dispara el "recategoriza también los del mismo comercio en Otros" (bug 2026-08-04:
    // eso convertía TODOS los movimientos sin datos en Inversión de un solo toque, cada uno con su
    // propia compra de participaciones).
    // Y "Inversión" NUNCA se aprende como override, venga de donde venga el comercio: es un destino
    // del dinero, no un tipo de tienda (ver el blindaje gemelo en `autoCategory`, 00-core.js).
    const learnable = mkey && ex.merchant!=="Movimiento" && !CAT_NEUTRAS[newCat];
    set(function(s){
      const ov=Object.assign({}, s.catOverrides||{}); if(learnable) ov[mkey]=newCat;
      USER_OVERRIDES=Object.assign({},ov);
      // El cashback/round-up ENTRA al efectivo y días después SALE hacia el fondo: dos apuntes del
      // banco para un solo movimiento de dinero. Al marcar la salida como Inversión, su entrada
      // gemela va con ella — si no, sigue contando como ingreso del mes (2026-08-04, queja suya:
      // «me lo detecta duplicado en inversiones y luego como ingreso al principio del mes»).
      const twinIdx = newCat==="inversion" ? findCashbackTwin(s.expenses, ex) : -1;
      const twinId = twinIdx>=0 ? s.expenses[twinIdx].id : null;
      // Marcar a mano un round-up/cashback como "Inversión" (o deshacerlo) compra/vende de verdad
      // participaciones en el fondo enlazado de esa cuenta — mismo importe real del banco, ver
      // `applyInvestBuy`/`reverseInvestBuy` en 08-motor-bank.js (2026-08-03).
      let invState=s;
      const exps=s.expenses.map(function(e){
        const isTarget=e.id===ex.id;
        const isTwin=!!twinId && e.id===twinId;
        const isSibling=!isTarget && !isTwin && learnable && catKey(e.merchant)===mkey && e.category==="otros";
        if(!isTarget && !isTwin && !isSibling) return e;
        const wasInv=e.category==="inversion", willBeInv=newCat==="inversion";
        const upd=Object.assign({},e,{category:newCat});
        // El gemelo solo cambia de categoría: el dinero ya lo compra su pareja, comprarlo dos veces
        // duplicaría las participaciones del fondo.
        if(isTwin) return upd;
        if(!wasInv && willBeInv){
          const ib=applyInvestBuy(invState, e.ent, Math.abs(e.amount));
          if(ib){ invState=ib.state; upd.investInvId=ib.invId; upd.investShares=ib.shares; upd.investCInv=ib.cInv; upd.investAmountEur=ib.amountEur; }
        } else if(wasInv && !willBeInv && e.investInvId){
          invState=reverseInvestBuy(invState, e.investInvId, e.investShares, e.investCInv, e.investAmountEur);
          delete upd.investInvId; delete upd.investShares; delete upd.investCInv; delete upd.investAmountEur;
        }
        return upd;
      });
      // Durable en la tabla: sin esto el siguiente pull —que reemplaza los gastos de la nube con
      // lo que hay en `expenses`— devolvía la categoría vieja (2026-08-04).
      if(cloud.enabled()){
        cloud.setExpenseCat(ex,newCat).catch(function(){});
        if(twinId){ const tw=s.expenses.find(function(e){ return e.id===twinId; }); if(tw) cloud.setExpenseCat(tw,newCat).catch(function(){}); }
      }
      return Object.assign({},invState,{expenses:exps,catOverrides:ov});
    });
    setCatEdit(null);
    const cc=CATEGORIES.concat([INGRESO_CAT,INVERSION_CAT,TRASPASO_CAT]).find(function(x){ return x.id===newCat; });
    if(showToast) showToast(tf("v4_moved_cat",{cat:(cc?cc.icon+" ":"")+catName(newCat)}));
  };
  // Marca/desmarca un gasto como "no tarjeta" (bizum/transferencia) para que no cuente el round-up TR.
  const setCardFlag=function(ex,noCard){
    set(function(s){ return Object.assign({},s,{expenses:s.expenses.map(function(e){ return e.id===ex.id?Object.assign({},e,{noCard:noCard?true:undefined}):e; })}); });
    if(cloud.enabled()) cloud.setExpenseNoCard(ex,noCard).catch(function(){});   // durable en la tabla
  };
  // Cambia el BANCO de un gasto manual (petición 2026-07-18). Solo manuales: los de OB/TR ya
  // vienen con su banco real y cambiárselo sería mentirse.
  const setBank=function(ex,b){
    set(function(s){ return Object.assign({},s,{expenses:s.expenses.map(function(e){ return e.id===ex.id?Object.assign({},e,{ent:b||undefined}):e; })}); });
    if(cloud.enabled()) cloud.setExpenseBank(ex,b).catch(function(){});   // durable (source manual:banco)
  };
  // Guarda el CONCEPTO escrito a mano (2026-07-24). `noteEdited` blinda el texto: el siguiente
  // sync del banco rellena conceptos vacíos, pero nunca pisa lo que ha escrito el usuario.
  // Vacío = se borra la nota, y también queda marcado (si no, el banco la volvería a poner).
  const saveNote=function(ex, note){
    const raw=String(note||"").trim().slice(0,160);
    if(raw===String(ex.note||"").trim()) return;   // sin cambios: ni set ni viaje a la nube
    set(function(s){ return Object.assign({},s,{expenses:s.expenses.map(function(e){
      return e.id===ex.id ? Object.assign({},e,{note:raw||undefined, noteEdited:true}) : e;
    })}); });
    if(cloud.enabled()) cloud.setExpenseNote(ex,raw).catch(function(){});
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
    }).sort(function(a,b){ return dateMs(b.date)-dateMs(a.date); });
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
      const e=(state.expenses||[]).slice().sort(function(a,b){ return dateMs(b.date)-dateMs(a.date); })[0];
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
      deleted:pushDeleted(s.deleted, keyOfE(orig))
    }); });
    if(cloud.enabled()){ cloud.deleteExpense(orig).catch(function(){}); cloud.addExpense(upd).catch(function(){}); }
    setEditExp(null); showToast(t("g_edited"));
  };

  const cycle=useMemo(()=>lastPaydayOf(expensesDef),[expensesDef]);
  // Bancos presentes en el período (o configurados como gasto) → chips de filtro.
  // "_manual" = apuntados a mano / sin banco conocido (no mezclar con OB).
  // Chips de banco: baratos y SIEMPRE visibles (no dependen de heavyOk → sin flash).
  // `todayKey` en las dependencias a propósito: los límites de «Este mes» / «Últimos 3 meses» se
  // calculan con la fecha de HOY, y la app se queda abierta días en el móvil. Sin esto, cruzar la
  // medianoche (o el cambio de mes) dejaría el filtro anclado al día en que se abrió y «Este mes»
  // enseñaría el mes pasado. Antes no pasaba porque el cálculo se rehacía en cada render.
  const todayKey=new Date().toDateString();
  const bounds=useMemo(function(){ return presetBoundsMs(preset,range,cycle&&cycle.start); },[preset,range,cycle,todayKey]);
  const dailyEnt=useMemo(function(){ const d=(state.accounts||[]).find(function(a){ return accDaily(a); }); return d&&d.ent||null; },[state.accounts]);
  const bankOpts=useMemo(function(){
    const seen={}; const order=[];
    const add=function(k){ if(!k||seen[k]) return; seen[k]=1; order.push(k); };
    expenseBankEnts(state).forEach(add);
    (state.accounts||[]).forEach(function(a){ if(a&&a.ent) add(a.ent); });
    let hasManual=false;
    (expensesDef||[]).forEach(function(e){
      if(!inBounds(dateMs(e.date),bounds)) return;
      const b=expenseBankOf(e); if(b) add(b); else hasManual=true;
    });
    if(hasManual) order.push("_manual");
    return order;
  },[expensesDef,state.accounts,state.settings,bounds]);
  // UNA sola pasada en vez de cuatro `.filter()` encadenados: cada eslabón construía un array
  // intermedio del tamaño del histórico y volvía a recorrerlo entero (2026-07-24).
  const filtered=useMemo(()=>{
    const needle=q.trim().toLowerCase();
    const catSet=sel.length? new Set(sel) : null;         // indexOf en cada gasto era O(n·m)
    const bankSet=bankSel.length? new Set(bankSel) : null;
    const out=[];
    const src=expensesDef||[];
    for(let i=0;i<src.length;i++){
      const e=src[i];
      if(!inBounds(dateMs(e.date),bounds)) continue;
      if(catSet && !catSet.has(e.category)) continue;
      if(bankSet && !bankSet.has(expenseBankOf(e)||"_manual")) continue;
      if(needle){
        // El concepto también se busca: si tu padre busca «alquiler» tiene que salir el bizum
        // cuyo mensaje lo dice, aunque el título sea solo el nombre de la persona (2026-07-24).
        const hay=(e.merchant||"").toLowerCase().indexOf(needle)!==-1
          || String(e.note||"").toLowerCase().indexOf(needle)!==-1
          || catName(e.category).toLowerCase().indexOf(needle)!==-1;
        if(!hay) continue;
      }
      out.push(e);
    }
    return out.sort((a,b)=>dateMs(b.date)-dateMs(a.date));
  },[expensesDef,bounds,sel,bankSel,q]);

  // La cabecera es siempre el mes natural: los filtros sirven para explorar, pero no deben hacer
  // que el presupuesto parezca cambiar al mirar otro período o una categoría.
  // Cifras = `monthBudgetStats` (misma fuente que Resumen y el widget).
  const monthSummary=useMemo(function(){
    const now=new Date();
    const bs=monthBudgetStats(state);
    return {
      spent:bs.spent, income:bs.income, balance:bs.balance, mode:bs.mode,
      budget:bs.budget, reserved:bs.reserved, remaining:bs.remaining,
      day:now.getDate(),
      last:new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),
      month:monthLong(now.getMonth())
    };
  },[state.expenses,state.budget,state.reservaLog,state.settings&&state.settings.gTotalMode]);
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
  /* LA PAGINACIÓN DE LA LISTA — sus fallos, y el de 2026-07-27.
     1. «Cuando bajas hacia abajo RAPIDÍSIMO deslizando se para cada cierto tiempo.» El centinela
        se vigilaba con `rootMargin:120px`, o sea que la tanda siguiente no se pedía hasta tenerlo
        casi encima, y llegaban de 12 en 12: en un desliz rápido te comes el final de la lista
        antes de que dé tiempo a pintar la siguiente. Con 600 px / +24 aún se notaba el tope
        (feedback 2026-07-27: «hasta cierto gasto se bloquea y al milisegundo puedo seguir»).
        Ahora se pide con 2.000 px de antelación y de 60 en 60 (la PRIMERA tanda sigue siendo
        de 12, que es lo que se pinta al entrar y lo que vigila el presupuesto de rendimiento).
     2. «Cuando le doy otra vez a "Este mes" sale lo de la foto y no carga nada aun esperando un
        rato.» Éste era un fallo de verdad y llevaba escondido desde siempre: el observador se
        creaba en un efecto atado a `filtered.length`, pero el centinela SOLO EXISTE mientras
        `visible<filtered.length`. Al llegar al final de la lista se desmonta, y el observador se
        quedaba mirando un nodo huérfano; si algo lo volvía a montar sin que cambiara
        `filtered.length` —volver a pulsar el filtro que ya estaba puesto resetea `visible` a 12
        con la misma lista— nadie lo vigilaba: «Cargando más…» ahí clavado para siempre.
        Ahora el observador se ata al nodo con una callback ref, así que se rehace exactamente
        cuando el centinela nace o muere, pasen lo que pasen las dependencias del efecto. */
  const filtLen=useRef(0); filtLen.current=filtered.length;   // el observador vive fuera del render: sin esto cerraría sobre una longitud vieja
  const ioRef=useRef(null);
  const sentinelRefCb=useCallback(function(el){
    if(ioRef.current){ ioRef.current.disconnect(); ioRef.current=null; }
    if(!el) return;
    const io=new IntersectionObserver(function(es){
      if(es[0].isIntersecting) setVisible(function(v){ return v<filtLen.current ? v+CONFIG.PAGE_SIZE*5 : v; });
    },{rootMargin:"2000px"});
    io.observe(el); ioRef.current=io;
  },[]);
  useEffect(function(){ return function(){ if(ioRef.current) ioRef.current.disconnect(); }; },[]);

  // Abrir la ficha de un movimiento. useCallback = referencia ESTABLE: si cambiara en cada render,
  // el React.memo de MovRow no serviría para nada y volveríamos al problema de siempre.
  const openDetail=useCallback(function(e){
    setDetailId(e.id);
    setEditExp({id:e.id, merchant:e.merchant||"", amount:String(Math.abs(e.amount)).replace('.',','), income:e.amount<0, note:e.note||""});
    setCatEdit(null);
  },[]);
  // Invalida las filas memoizadas cuando cambia el idioma o la moneda de visualización (las leen
  // de globales que React.memo no ve).
  const l10nKey=CURLANG+"|"+DISP.sym;

  const shown=filtered.slice(0,visible);
  /* A LA FILA SE LE PASA EL NÚMERO, NO EL `Date` (2026-07-27, y esto llevaba roto desde siempre).
     `parseDate` cachea los MILISEGUNDOS pero devuelve `new Date(ms)`: un objeto NUEVO en cada
     llamada. Como la fecha viajaba a `MovRow` como prop, la comparación superficial de
     `React.memo` fallaba SIEMPRE por esa prop —da igual que el gasto sea idéntico—, así que
     cualquier re-render de Gastos repintaba las doce filas. Se cuidó que `onOpen` fuera estable
     (ahí al lado está el comentario) y la fecha se coló por debajo.
     Se vio saliendo de Deudas hacia Gastos: el perfilador ponía `MovRow` como la función más cara
     de la app en ese gesto. Con un número, la comparación acierta y la fila solo se rehace cuando
     cambia de verdad; el `Date` se construye DENTRO, que es donde se usa para formatear. */
  const groups=[]; let last=null;
  shown.forEach(function(e){
    const ms=dateMs(e.date), d=new Date(ms), k=dayKey(d);
    if(k!==last){
      const today=dayKey(new Date()), yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
      const label=k===today?t("g_today"):k===dayKey(yesterday)?t("g_yesterday"):d.toLocaleDateString(loc(),{weekday:"long",day:"numeric",month:"short"});
      groups.push({sep:label}); last=k;
    }
    groups.push({e:e,ms:ms});
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
      const monthStartMs=startOfMonth().getTime();
      const before=(state.expenses||[]).filter(e=>dateMs(e.date)>=monthStartMs).reduce((a,e)=>a+e.amount,0);
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
        React.createElement("div",{className:"v4-gastos-summary-main"},
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
          // Dos filas (etiqueta | importe) en vez de una sola frase «Gastos X · ingresos Y»:
          // con ¥/₺ y letra pequeña la frase se partía a mitad y solapaba el presupuesto
          // (feedback 2026-08-05 tras multidivisa).
          (function(){
            const pair=function(lbl, amt){
              return React.createElement("div",{className:"v4-gastos-summary-pair"},
                React.createElement("span",{className:"lbl"}, lbl),
                React.createElement("span",{className:"amt num"}, amt));
            };
            if(monthSummary.mode==="net"){
              return React.createElement("div",{className:"v4-gastos-summary-sub"},
                pair(t("v4_gastos_lbl_spent"), eur(monthSummary.spent)),
                pair(t("v4_gastos_lbl_income"), eur(monthSummary.income)));
            }
            if(!(monthSummary.income>0)) return null;
            return React.createElement("div",{className:"v4-gastos-summary-sub"},
              pair(t("v4_gastos_lbl_income"), eur(monthSummary.income)),
              pair(t("v4_gastos_lbl_balance"),
                (monthSummary.balance>=0?"+":"−")+eur(Math.abs(monthSummary.balance))));
          })()
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
      React.createElement("div",Object.assign({className:"v4-chips",ref:catChipsRef},chipSwipe(catChipsRef)),
        React.createElement("button",{className:"v4-chip"+(sel.length===0?" on":""),onClick:()=>setSel([])},t("g_allcats")),
        // "Ingreso" no vive en CATEGORIES (es la categoría especial de importes negativos) pero
        // también se filtra (petición 2026-07-11: no había forma de ver solo los ingresos).
        CATEGORIES.concat([INGRESO_CAT,INVERSION_CAT,TRASPASO_CAT]).map(c=>React.createElement("button",{key:c.id,className:"v4-chip"+(sel.indexOf(c.id)!==-1?" on":""),onClick:()=>setSel(function(prev){ const has=prev.indexOf(c.id)!==-1; return has?prev.filter(function(x){return x!==c.id;}):prev.concat([c.id]); })},c.icon+" "+catName(c.id).split(" ")[0]))
      ),
      // Filtro por banco (varios bancos de tarjeta OB + TR + a mano) — sin mezclar Fijos aquí.
      bankOpts.length>1 && React.createElement("div",Object.assign({className:"v4-chips",ref:bankChipsRef},chipSwipe(bankChipsRef)),
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
      // SPEC §4: suscripciones solo si hay novedad (activas, aún no pasadas a Fijos, ni descartadas
      // a mano — petición 2026-08-03: poder quitar una detección que no es una suscripción de
      // verdad, ej. la gasolina, que se repite pero nunca va a tener un importe fijo).
      const dismissed=state.subsDismissed||[];
      const novel=(subs||[]).filter(function(sp){
        if(!sp.active) return false;
        if(dismissed.indexOf(sp.key)!==-1) return false;
        return !(state.fixed||[]).some(function(f){ return catKey(f.name)===sp.key; });
      });
      if(!novel.length) return null;
      return React.createElement("div",{style:{marginTop:14}}, React.createElement(CollapsibleCard,{title:t("sub_title")+" · "+novel.length,sub:tf("sub_sub",{n:novel.length,y:eur0(novel.reduce(function(a,s){return a+(s.active?s.yearly:0);},0))}),dot:"#C9A6F0",defaultOpen:true,storageKey:"g_subs_novel",help:t("h_subs")},
        novel.map(function(sp){ return React.createElement(SubRow,{key:sp.key,sp:sp,state:state,set:set,showToast:showToast}); }),
        React.createElement("div",{className:"hint",style:{marginTop:8}}, t("sub_hint"))
      ));
    })(),
    React.createElement("div",{className:"v4-gastos-list",style:{marginTop:14}},
      React.createElement("div",{className:"v4-gastos-list-body"},
        shown.length===0
          ? (function(){
              // "No hay gastos aquí · cambia el filtro" asustaba a principio de mes/ciclo, cuando
              // lo normal es no haber gastado nada todavía: no falta nada, no hay que "cambiar
              // el filtro" (feedback 2026-08-01). Solo si hay histórico real en OTRO período y
              // no hay ningún filtro activo (búsqueda/categoría/banco) es "vacío por normal";
              // si además hay un filtro puesto, el mensaje de siempre sigue siendo el correcto.
              // bankSel==[dailyEnt] cuenta como "sin filtro": es la preselección automática
              // (2026-08-03), no algo que el usuario haya elegido a mano.
              const bankSelIsDefault=bankSel.length===0 || (dailyEnt && bankSel.length===1 && bankSel[0]===dailyEnt);
              const sinFiltros=!q.trim() && !sel.length && bankSelIsDefault;
              const hayHistorico=(expensesDef||[]).length>0;
              const esVacioNormal=sinFiltros && hayHistorico && (preset==="month"||preset==="cycle");
              return React.createElement("div",{className:"empty"},
                React.createElement("div",{className:"ttl"}, esVacioNormal?t("g_empty_period_t"):t("g_empty_t")),
                esVacioNormal?t("g_empty_period_d"):t("g_empty_d"));
            })()
          : groups.map(function(g,i){ return g.sep
              ? React.createElement("div",{className:"day-sep",key:"s"+i},g.sep)
              : React.createElement(MovRow,{key:g.e.id||i, e:g.e, ms:g.ms, onOpen:openDetail, l10n:l10nKey,
                  countsBudget:expenseCountsBudget(g.e, state)}); }),
        visible<filtered.length && React.createElement("div",{className:"sentinel",ref:sentinelRefCb},t("g_loadmore"))
      )
    ),
    React.createElement(PeriodMoreSheet,{open:morePeriods,onClose:function(){ setMorePeriods(false); },preset:preset,setPreset:setPreset}),
    detailId && React.createElement(ExpenseDetailSheet,{
      exp:(state.expenses||[]).find(function(e){ return e.id===detailId; }),
      editExp:editExp, setEditExp:setEditExp,
      onClose:function(){ setDetailId(null); setEditExp(null); },
      setCat:setCat, setCardFlag:setCardFlag, setBank:setBank, delExpense:delExpense, saveEdit:saveEdit, saveNote:saveNote,
      showToast:showToast, aiBusy:aiBusy, suggestAi:suggestAi, state:state
    })
  );
}

/* ---------- Fila del histórico ----------
   Va en React.memo a propósito. Antes se pintaba en línea dentro de Expenses, así que CUALQUIER
   cambio de estado (un toast, un sync de la nube, teclear en el buscador, el snapshot diario de
   inversiones…) volvía a construir las cientos de filas que hay en pantalla tras un rato haciendo
   scroll — y a más histórico, peor. Es la otra mitad del «se ralentiza cuanto más la uso»
   (feedback 2026-07-24).

   `l10n` (idioma|símbolo de moneda) es un prop a posta: catName/entOf/eur leen globales que memo
   no puede ver, así que sin él cambiar de idioma o de moneda dejaría las filas en el idioma viejo.
   `onOpen` tiene que ser ESTABLE (useCallback) o el memo no sirve de nada. */
const MovRow=React.memo(function MovRow({e, ms, onOpen, countsBudget}){
  // `ms` y no un `Date`: ver el porqué donde se construyen los grupos. El objeto se crea aquí,
  // que es la única línea que lo necesita, y solo cuando la fila se pinta de verdad.
  // `countsBudget` (bool) lo pasa el padre: si se pasara `state` entero, el memo no acertaría nunca.
  const d=new Date(ms);
  const c=catOf(e.category);
  const isIncome=e.amount<0;
  const bk=expenseBankOf(e);
  const note=expenseNote(e);   // concepto del bizum / descripción del banco (2026-07-24)
  const skip=countsBudget===false;
  return React.createElement("button",{type:"button",className:"v4-mov"+(skip?" v4-mov-skip":""),onClick:function(){ onOpen(e); },
      style:skip?{opacity:.72}:null},
    React.createElement("div",{className:"tile",style:{borderColor:c.color+"55",color:c.color,background:c.color+"18"}},c.icon),
    React.createElement("div",{className:"nm"},
      React.createElement("div",{className:"nm-title"}, e.merchant||"—"),
      note && React.createElement("div",{className:"nm-note"}, note),
      React.createElement("div",{className:"nm-cat",style:{color:c.color}}, catName(e.category)),
      React.createElement("div",{className:"meta"},
        React.createElement("span",null,d.toLocaleDateString(loc(),{day:'2-digit',month:'2-digit'})),
        bk?React.createElement(React.Fragment,null,
          React.createElement("span",{className:"sep"},"·"),
          React.createElement("span",null,entOf(bk).label||entOf(bk).mono)
        ):null,
        skip?React.createElement(React.Fragment,null,
          React.createElement("span",{className:"sep"},"·"),
          React.createElement("span",{style:{color:"var(--muted-2)"}}, t("g_no_budget"))
        ):null
      )
    ),
    React.createElement("div",{className:"am num"+(isIncome?" pos":"")+(skip?" muted":"")}, (isIncome?"+":"")+eur(Math.abs(e.amount)))
  );
});

/* Sheet «Más…» de períodos. Antes era un portal pelado SIN useSheetSwipe/useBackClose: era el
   único sheet que no se podía cerrar tirando hacia abajo («el más de la foto» — feedback
   2026-07-18) ni con el gesto atrás. Mismo patrón que BudgetSheet. */
function PeriodMoreSheet({open, onClose, preset, setPreset}){
  useBackClose(!!open, onClose);
  const swipe=useSheetSwipe(!!open, onClose);
  if(!open) return null;
  return ReactDOM.createPortal(
    React.createElement("div",{className:"v4-sheet-back",onClick:onClose},
      React.createElement("div",Object.assign({className:"v4-sheet",ref:swipe.sheetRef,onClick:function(e){ e.stopPropagation(); }}, swipe.sheetTouch),
        React.createElement("div",{className:"v4-sheet-handle"}),
        React.createElement("div",{className:"serif",style:{fontSize:22,fontWeight:550,marginBottom:14}}, t("v4_period_more")),
        DATE_PRESETS.slice(2).map(function(p){
          return React.createElement("button",{key:p.id,type:"button",className:"v4-sheet-row"+(preset===p.id?" on":""),onClick:function(){ setPreset(p.id); onClose(); }}, t("g_"+p.id));
        })
      )
    ), document.body);
}

/* Sheet detalle/edición de un movimiento. Layout alineado con Apuntar/Cartera (feedback 2026-07-17). */
function ExpenseDetailSheet({exp, editExp, setEditExp, onClose, setCat, setCardFlag, setBank, delExpense, saveEdit, saveNote, showToast, aiBusy, suggestAi, state}){
  useBackClose(!!exp, onClose);
  const swipe=useSheetSwipe(!!exp, onClose);
  if(!exp || !editExp) return null;
  const c=catOf(exp.category);
  const isIncome=exp.amount<0 || !!editExp.income;
  const bk=expenseBankOf(exp);
  const auto=exp.source && exp.source!=="manual";
  const d=parseDate(exp.date);
  const dateLbl=d&&!isNaN(d.getTime())
    ? d.toLocaleDateString(loc(),{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})
    : "—";
  const closeSave=function(){ saveEdit(exp); };   // blur solo guarda; no cierra (cerrar al cambiar cat saltaba de pantalla — feedback 2026-07-17)
  const doSaveClose=function(){ saveEdit(exp); onClose(); };
  const doDel=function(){
    askConfirm({ title:tf("v4_exp_del_q",{name:(exp.merchant||"—")+" · "+eur(Math.abs(exp.amount))}), sub:t("v4_exp_del_sub"), ok:t("v4_exp_del"), danger:true })
      .then(function(yes){ if(!yes) return; delExpense(exp); onClose(); });
  };
  const metaBits=[dateLbl, bk?entOf(bk).label:null, auto?t("v4_exp_auto"):t("v4_exp_manual")].filter(Boolean);
  return ReactDOM.createPortal(
    React.createElement("div",{className:"v4-sheet-back",onClick:onClose},
      React.createElement("div",Object.assign({className:"v4-sheet v4-exp-sheet",style:{maxHeight:"90dvh"},ref:swipe.sheetRef,onClick:function(e){ e.stopPropagation(); }}, swipe.sheetTouch),
        React.createElement("div",{className:"v4-sheet-handle"}),
        React.createElement("div",{className:"v4-exp-hero"},
          React.createElement("div",{className:"v4-exp-ico",style:{borderColor:c.color+"55",color:c.color,background:c.color+"18"}}, c.icon),
          React.createElement("input",{className:"v4-exp-amt num serif",inputMode:"decimal",value:editExp.amount,onChange:function(e){ const v=e.target.value; setEditExp(function(p){ return Object.assign({},p,{amount:v}); }); },onBlur:closeSave,"aria-label":t("v4_exp_amount")}),
          React.createElement("input",{className:"v4-exp-name",value:editExp.merchant,placeholder:t("v4_exp_merchant_ph"),onChange:function(e){ const v=e.target.value; setEditExp(function(p){ return Object.assign({},p,{merchant:v}); }); },onBlur:closeSave}),
          React.createElement("div",{className:"v4-exp-meta"}, metaBits.join(" · "))
        ),
        // CONCEPTO (2026-07-24): lo que trae el banco/el bizum, y editable para poder apuntar lo
        // que sea («comida con los del trabajo»). Se guarda con nota_edit para que el siguiente
        // sync del banco no pise lo que ha escrito el usuario.
        React.createElement("div",{className:"v4-exp-sec",style:{marginTop:14}}, t("v4_exp_note")),
        React.createElement("input",{className:"v4-exp-note-in",value:editExp.note||"",maxLength:160,
          placeholder:t("v4_exp_note_ph"),
          onChange:function(e){ const v=e.target.value; setEditExp(function(p){ return Object.assign({},p,{note:v}); }); },
          onBlur:function(){ saveNote(exp, editExp.note); },"aria-label":t("v4_exp_note")}),
        (exp.note && !exp.noteEdited) && React.createElement("div",{className:"hint",style:{marginTop:5}}, t("v4_exp_note_bank")),
        !isIncome && React.createElement(React.Fragment,null,
          React.createElement("div",{className:"v4-exp-sec"}, t("v4_exp_cat")),
          React.createElement("div",{className:"v4-chips"},
            CATEGORIES.concat([INVERSION_CAT,TRASPASO_CAT]).map(function(cc){
              return React.createElement("button",{key:cc.id,type:"button",className:"v4-chip"+(cc.id===exp.category?" on":""),onClick:function(){ setCat(exp,cc.id); }}, cc.icon+" "+catName(cc.id));
            })
          ),
          React.createElement("button",{type:"button",className:"v4-sheet-row"+(exp.noCard?"":" on"),style:{marginTop:12},onClick:function(){ setCardFlag(exp,!exp.noCard); }},
            exp.noCard?("💸 "+t("v4_exp_not_card")):("💳 "+t("v4_exp_with_card"))),
          // Banco del gasto: SOLO editable en apuntes manuales (los de OB/TR traen su banco real).
          (!auto && setBank) && (function(){
            const seen={}; const opts=[];
            (state.accounts||[]).forEach(function(a){ if(a&&a.ent&&!seen[a.ent]){ seen[a.ent]=1; opts.push(a.ent); } });
            if(!opts.length) return null;
            return React.createElement(React.Fragment,null,
              React.createElement("div",{className:"v4-exp-sec",style:{marginTop:14}}, t("ap_bank")),
              React.createElement("div",{className:"v4-chips"},
                React.createElement("button",{type:"button",className:"v4-chip"+(!bk?" on":""),onClick:function(){ setBank(exp,null); }}, t("ap_bank_none")),
                opts.map(function(b){
                  return React.createElement("button",{key:b,type:"button",className:"v4-chip"+(bk===b?" on":""),onClick:function(){ setBank(exp,b); }}, "🏦 "+entOf(b).label);
                })
              )
            );
          })(),
          exp.category==="otros" && cloud.enabled() && React.createElement("button",{type:"button",className:"btn btn-ghost btn-block",style:{marginTop:8},disabled:aiBusy,onClick:function(){ suggestAi(exp); }}, aiBusy?t("ai_cat_busy"):t("ai_cat_btn"))
        ),
        React.createElement("div",{className:"v4-exp-sec",style:{marginTop:14}}, t("v4_exp_type")),
        React.createElement("div",{className:"v4-toggle"},
          React.createElement("button",{type:"button",className:!editExp.income?"on":"",onClick:function(){ setEditExp(function(p){ return Object.assign({},p,{income:false}); }); }},"💸 "+t("v4_gasto")),
          React.createElement("button",{type:"button",className:editExp.income?"on":"",onClick:function(){ setEditExp(function(p){ return Object.assign({},p,{income:true}); }); }},"💰 "+t("v4_ingreso"))
        ),
        React.createElement("button",{type:"button",className:"v4-cta",style:{marginTop:16},onClick:doSaveClose}, t("fj_save")),
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
