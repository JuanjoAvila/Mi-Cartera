/* ============================================================
   v4 — Plan (Recibos/Deudas/Metas), Cartera, Sheet Apuntar
   Spec: docs/design/handoff/SPEC-v4.md §5–7
   ============================================================ */

function PlanTab({state, set, totals, showToast, simple, gotoSeg, clearGoto}){
  const [seg,setSeg]=useState("recibos");
  const [manageOpen,setManageOpen]=useState(false);
  // Modo sencillo: solo Recibos (spec §2).
  const segs=simple
    ? [{id:"recibos",lab:t("v4_plan_recibos")}]
    : [{id:"recibos",lab:t("v4_plan_recibos")},{id:"deudas",lab:t("v4_plan_deudas")},{id:"metas",lab:t("v4_plan_metas")}];
  useEffect(function(){ if(simple && seg!=="recibos") setSeg("recibos"); },[simple,seg]);
  // «Ver plan» desde Inicio fuerza el segmento (recibos/metas): sin esto quedaba el último
  // que usaste (p.ej. Deudas) y el link engañaba (feedback 2026-07-18). gotoSeg lleva ts para
  // re-disparar aunque pidas dos veces el mismo segmento.
  useEffect(function(){
    if(!gotoSeg||!gotoSeg.id) return;
    setSeg(simple?"recibos":gotoSeg.id);
    if(clearGoto) clearGoto();
  },[gotoSeg&&gotoSeg.ts]);
  return React.createElement("div",{className:"v4-screen"},
    React.createElement("h1",{className:"v4-title serif"}, t("v4_plan_title")),
    React.createElement("div",{className:"v4-seg",role:"tablist"},
      segs.map(function(s){
        return React.createElement("button",{key:s.id,role:"tab","aria-selected":seg===s.id,
          className:"v4-seg-btn"+(seg===s.id?" on":""),onClick:function(){ setSeg(s.id); }}, s.lab);
      })
    ),
    seg==="recibos" && React.createElement(PlanBills,{state:state,set:set,totals:totals,manageOpen:manageOpen,setManageOpen:setManageOpen}),
    seg==="deudas" && React.createElement(Debts,{state:state,set:set,showToast:showToast}),
    seg==="metas" && React.createElement(Goals,{state:state,set:set,totals:totals,showToast:showToast})
  );
}

/* Recibos prioriza lo que todavía saldrá de la cuenta este mes. Fijos (edición completa,
   simulador, conciliación…) vive SOLO dentro de la hoja «Gestionar» — mezclarlo aquí abajo
   duplicaba próximos cargos y desglose de banco que ya se ven arriba (feedback 2026-07-17). */
function PlanBills({state, set, totals, manageOpen, setManageOpen}){
  const [paidExpanded,setPaidExpanded]=useState(false);
  const [pendExpanded,setPendExpanded]=useState(false);
  const month=totals.curMonth, year=totals.curYear, today=totals.today;
  const charges=[];
  (state.fixed||[]).forEach(function(e){
    const amount=occAmountIn(e,month);
    if(occursIn(e,month) && amount>0) charges.push({
      id:"fixed_"+e.id, name:e.name, amount:amount, day:dayIn(e,month), bank:accOf(e),
      paid:isPaidIn(e,month,today), sub:t("fj_fixed_tag")
    });
  });
  (state.debts||[]).forEach(function(d){
    if(!debtActive(d)) return;
    const bank=d.account||"sabadell", day=debtChargeDay(d), paid=isDebtPaidThisMonth(d,today);
    if((d.monthly||0)>0) charges.push({id:"debt_"+d.id,name:d.name,amount:d.monthly,day:day,bank:bank,paid:paid,sub:t("fj_debt_tag")});
    const balloon=debtBalloonIn(d,year,month);
    if(balloon>0) charges.push({id:"balloon_"+d.id,name:d.name+" "+t("db_balloon_tag"),amount:balloon,day:day,bank:bank,paid:paid,sub:t("fj_debt_tag")});
  });
  // Nómina y transferencias del mes (como en Gestionar): lo que ya entró/salió cuenta en «Ya pagado».
  (state.flows||[]).forEach(function(f){
    if(!flowOccursIn(f,month,year)) return;
    const day=flowDay(f,year,month);
    const paid=day!=null && day<=today;
    const amt=+(f.amount||0);
    if(!(amt>0)) return;
    if(f.kind==="income"){
      charges.push({id:"flow_"+f.id,name:f.name||t("fj_income"),amount:-amt,day:day,bank:f.to||"sabadell",paid:paid,sub:t("fj_income_tag"),income:true});
    } else if(f.kind==="transfer"){
      charges.push({id:"flow_"+f.id,name:f.name||t("fj_transfer"),amount:amt,day:day,bank:f.from||"sabadell",paid:paid,sub:t("fj_transfer_tag")});
    }
  });
  charges.sort(function(a,b){ return ((a.day||99)-(b.day||99)) || (Math.abs(b.amount)-Math.abs(a.amount)); });
  const pending=charges.filter(function(x){ return !x.paid; });
  // Lista completa (sin agrupar ni «Ver más»): en Gestionar salía todo y aquí faltaban ingresos/traspasos.
  const paid=charges.filter(function(x){ return x.paid; });
  const pendingTotal=pending.reduce(function(sum,x){ return sum+(x.income?0:Math.abs(x.amount)); },0);
  const paidTotal=paid.reduce(function(sum,x){ return sum+(x.income?0:Math.abs(x.amount)); },0);
  const fixedAccount=(state.accounts||[]).find(function(a){ return accFixed(a); });
  const projected=fixedAccount && totals.projectedByBank && totals.projectedByBank[fixedAccount.ent];
  const liquidity=typeof projected==="number" ? tf("v4_plan_liq",{amount:eur0(projected),bank:entOf(fixedAccount.ent).label}) : "—";
  const row=function(x){
    const income=!!x.income || (x.amount<0);
    const amt=Math.abs(x.amount);
    return React.createElement("div",{className:"v4-charge"+(x.paid?" v4-paid":""),key:x.id},
      React.createElement("div",{className:"dt"},
        React.createElement("div",{className:"d"}, x.day||"—"),
        React.createElement("div",{className:"m"}, monthShort(month-1))
      ),
      React.createElement("div",{className:"nm"},
        React.createElement("div",null, x.paid?"✓ "+x.name:x.name),
        React.createElement("div",{className:"sub"}, x.sub+(x.bank?" · "+entOf(x.bank).label:""))
      ),
      React.createElement("div",{className:"am"+(income?" pos":"")}, (income?"+":"")+eur(amt))
    );
  };
  return React.createElement(React.Fragment,null,
    React.createElement("div",{className:"v4-card v4-card-hero rise"},
      React.createElement("div",{className:"v4-micro"}, tf("v4_plan_left",{month:monthLong(month-1)})),
      React.createElement("div",{className:"serif num",style:{fontSize:40,fontWeight:550,letterSpacing:"-1px",lineHeight:1.05,marginTop:6}}, eur(pendingTotal)),
      React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",marginTop:14,fontSize:13.5,color:"var(--muted)"}},
        React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:"var(--mint)",flex:"0 0 auto"}}),
        liquidity
      )
    ),
    React.createElement("div",{className:"v4-section"},
      React.createElement("div",{className:"v4-section-h"},
        React.createElement("span",null,t("v4_pendiente")),
        React.createElement("button",{className:"link",onClick:function(){ setManageOpen(true); }},t("v4_gestionar"))
      ),
      (pendExpanded?pending:pending.slice(0,3)).map(row),
      pending.length>3 && React.createElement("button",{className:"v4-link-mini",onClick:function(){ setPendExpanded(function(v){ return !v; }); }},
        pendExpanded ? t("v4_ver_menos") : tf("v4_ver_mas",{n:pending.length-3}))
    ),
    React.createElement("div",{className:"v4-section"},
      React.createElement("div",{className:"v4-section-h"},t("v4_ya_pagado")+" · "+eur(paidTotal)),
      (paidExpanded?paid:paid.slice(0,3)).map(row),
      paid.length>3 && React.createElement("button",{className:"v4-link-mini",onClick:function(){ setPaidExpanded(function(v){ return !v; }); }},
        paidExpanded ? t("v4_ver_menos") : tf("v4_ver_mas",{n:paid.length-3}))
    ),
    React.createElement(BillsManageSheet,{open:manageOpen,onClose:function(){ setManageOpen(false); },state:state,set:set,totals:totals})
  );
}

/* Hoja «Gestionar»: aquí vive Fijos entero (servicios, cuotas, flujos, puntuales, simulador,
   conciliación…). Antes se «dumpeaba» tal cual debajo de Recibos y mezclaba edición con la
   vista diaria — ahora solo aparece si el usuario pide gestionar (feedback 2026-07-17). */
function BillsManageSheet({open, onClose, state, set, totals}){
  useBackClose(!!open, onClose);
  const swipe=useSheetSwipe(!!open, onClose);
  if(!open) return null;
  return ReactDOM.createPortal(
    React.createElement("div",{className:"v4-sheet-back",onClick:onClose},
      React.createElement("div",Object.assign({className:"v4-sheet",style:{maxHeight:"90dvh"},ref:swipe.sheetRef,onClick:function(e){ e.stopPropagation(); }}, swipe.sheetTouch),
        React.createElement("div",{className:"v4-sheet-handle"}),
        React.createElement("div",{className:"v4-section-h"},
          React.createElement("span",{className:"serif",style:{fontSize:19,fontWeight:600}}, t("v4_gestionar")),
          React.createElement("button",{className:"link","aria-label":t("au_close"),onClick:onClose},"✕")
        ),
        React.createElement("p",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.45,margin:"0 0 12px"}}, t("v4_gestionar_h")),
        React.createElement("div",{className:"v4-embed-legacy"}, React.createElement(Fijos,{state:state,set:set,totals:totals}))
      )
    ), document.body);
}

function CarteraTab({state, set, totals, fetchPrices, pricing, simple, onBankSync, onReconnectBank}){
  const [invTools,setInvTools]=useState(false);
  // TR desconectado (y el usuario SÍ lo tuvo conectado alguna vez → mc_tr_phone guardado):
  // banner con botón que abre Mis bancos directamente. UX padre 2026-07-18: al ver el saldo
  // descuadrado se fue a la app de Trade Republic — el arreglo debe estar donde está el problema.
  const [trDead,setTrDead]=useState(false);
  useEffect(function(){
    const b=(typeof trBridge==="function")?trBridge():null;
    if(!b||!b.status) return;
    if(!(typeof trPhoneSaved==="function"&&trPhoneSaved())) return;
    Promise.resolve(b.status()).then(function(r){ setTrDead(!(r&&r.connected)); }).catch(function(){});
  },[]);
  // Qué compone el gráfico del hero: liquidez / inversiones / bienes, multiseleccionables
  // (petición 2026-07-18: «quiero ver inversiones + líquido, por ejemplo»). Todo ON por defecto.
  // Se PERSISTE en settings.carteraParts (petición 2026-07-18: «que se guarde tu elección aunque
  // cierres la app»): al arrancar se lee de ahí, y cada toque escribe el estado (sincroniza como todo).
  const savedParts=(state.settings&&state.settings.carteraParts)||null;
  const [selParts,setSelParts]=useState(savedParts||{liq:true,inv:true,goods:true});
  const [bankBusy,setBankBusy]=useState(false);
  const togglePart=function(k){
    setSelParts(function(p){
      const n=Object.assign({},p,{[k]:!p[k]});
      if(!n.liq&&!n.inv&&!n.goods) return p;   // dejar 0 marcados = gráfico vacío sin sentido
      set(function(s){ return Object.assign({},s,{settings:Object.assign({},s.settings,{carteraParts:n})}); });
      return n;
    });
  };
  const liq=totals.liquid||0, inv=totals.invested||0, goods=totals.assetsTotal||0;
  const parts=[
    {k:"liq",  v:liq,   color:"var(--mint)",  lab:t("d_liquid")},
    {k:"inv",  v:inv,   color:"var(--blue)",  lab:t("d_invest")},
    {k:"goods",v:goods, color:"var(--cream)", lab:t("d_goods")},
  ];
  const active=parts.filter(function(x){ return selParts[x.k]; });
  const allOn=active.length===3;
  const sum=Math.max(0.01, active.reduce(function(a,x){ return a+x.v; },0));
  // Con todo marcado el hero sigue siendo el patrimonio neto (deudas descontadas, como siempre);
  // con selección parcial enseña la suma de lo marcado (sin deudas — no aplican a un subconjunto).
  const p=eurParts(allOn ? totals.netWorth : active.reduce(function(a,x){ return a+x.v; },0));
  const heroLab=allOn ? t(simple?"v4_money_total":"d_networth")
    : t("v4_sel_partial")+" · "+active.map(function(x){ return x.lab; }).join(" + ");
  const doBankSync=function(){
    if(!onBankSync||bankBusy) return;
    setBankBusy(true);
    Promise.resolve(onBankSync()).finally(function(){ setBankBusy(false); });
  };
  return React.createElement("div",{className:"v4-screen"},
    React.createElement("h1",{className:"v4-title serif"}, t("v4_cartera_title")),
    React.createElement("div",{className:"v4-card v4-card-hero rise",style:{animationDelay:".05s"}},
      React.createElement("div",{className:"v4-micro"}, heroLab),
      React.createElement("div",{className:"serif num",style:{fontSize:40,fontWeight:550,letterSpacing:"-1px",lineHeight:1.05,marginTop:6}},
        p.ent, React.createElement("span",{style:{fontSize:22,color:"var(--muted)"}},","+p.dec+" "+p.sym)),
      React.createElement("div",{className:"v4-stackbar",style:{marginTop:16}},
        active.map(function(x){
          return React.createElement("i",{key:x.k,style:{flex:Math.max(0.02,(x.v/sum)*100),background:x.color}});
        })
      ),
      React.createElement("div",{className:"v4-legend"},
        parts.map(function(x){
          const on=!!selParts[x.k];
          return React.createElement("button",{key:x.k,type:"button",className:"v4-legend-btn"+(on?"":" off"),
            "aria-pressed":on,onClick:function(){ togglePart(x.k); }},
            React.createElement("b",{style:{background:x.color}}), x.lab+" "+eur0(x.v));
        })
      ),
      allOn && React.createElement("div",{style:{marginTop:12,fontSize:13,color:"var(--muted)"}},
        t("v4_debts_foot_a"),
        React.createElement("span",{style:{color:"var(--coral)",fontWeight:700}}, " "+eur0(-(totals.debtTotal||0))+" "),
        t("v4_debts_foot_b"))
    ),
    // Banners de reconexión: el arreglo a UN toque, en la pantalla donde se VE el problema.
    (state.bankIssues||[]).map(function(is){
      const lbl=is.ent?entOf(is.ent).label:(is.aspsp||"🏦");
      return React.createElement("div",{key:"bi_"+is.aspsp,className:"v4-card",style:{marginTop:10,padding:"14px 16px",border:"1px solid rgba(226,112,95,.45)",background:"rgba(226,112,95,.08)"}},
        React.createElement("div",{style:{fontWeight:800,fontSize:14.5,lineHeight:1.4}}, tf("bk_issue",{bank:lbl})),
        React.createElement("div",{style:{fontSize:12.5,color:"var(--muted)",marginTop:3,lineHeight:1.45}}, t("bk_issue_sub")),
        onReconnectBank && React.createElement("button",{type:"button",className:"v4-cta",style:{marginTop:10,height:46},onClick:function(){ onReconnectBank(is.aspsp); }}, tf("bk_issue_cta",{bank:lbl}))
      );
    }),
    trDead && React.createElement("div",{className:"v4-card",style:{marginTop:10,padding:"14px 16px",border:"1px solid rgba(226,112,95,.45)",background:"rgba(226,112,95,.08)"}},
      React.createElement("div",{style:{fontWeight:800,fontSize:14.5,lineHeight:1.4}}, t("bk_tr_dead")),
      React.createElement("div",{style:{fontSize:12.5,color:"var(--muted)",marginTop:3,lineHeight:1.45}}, t("bk_tr_sub")),
      React.createElement("button",{type:"button",className:"v4-cta",style:{marginTop:10,height:46},onClick:function(){ try{ window.dispatchEvent(new CustomEvent("mc-open-banks")); }catch(e){} }}, t("bk_tr_cta"))
    ),
    React.createElement("div",{className:"v4-sec-h",style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
      React.createElement("span",null, t("v4_cuentas")),
      // Sync a demanda: el auto-sync al abrir la app se retiró (los bancos veían «bot» y
      // caducaban la conexión cada dos por tres — feedback 2026-07-18).
      state.hasBankLink && onBankSync && React.createElement("button",{type:"button",className:"v4-link-mini",style:{marginTop:0},
        disabled:bankBusy,onClick:doBankSync}, bankBusy?t("bp_syncing"):("↻ "+t("v4_sync_banks")))
    ),
    React.createElement(Wealth,{state:state,set:set,totals:totals,v4Embed:true}),
    !simple && React.createElement("div",{className:"rise",style:{animationDelay:".12s"}},
      React.createElement("div",{className:"v4-sec-h"}, t("v4_inversiones")),
      React.createElement(Investments,{state:state,set:set,fetchPrices:fetchPrices,pricing:pricing,v4Embed:true}),
      React.createElement("button",{type:"button",className:"v4-link-mini",style:{marginTop:10},onClick:function(){ setInvTools(true); }}, t("v4_inv_tools")+" ›"),
      React.createElement(InvToolsSheet,{open:invTools,onClose:function(){ setInvTools(false); },state:state,set:set,fetchPrices:fetchPrices,pricing:pricing})
    ),
    // Hogar y gastos compartidos: se mudó aquí desde Ajustes (es una funcionalidad, no un ajuste;
    // y en Cartera encaja porque va de dinero compartido). Abre el panel a nivel de App por evento.
    React.createElement("button",{type:"button",className:"v4-mov",style:{width:"100%",marginTop:18,cursor:"pointer",textAlign:"left"},
      onClick:function(){ try{ window.dispatchEvent(new CustomEvent("mc-open-shared")); }catch(e){} }},
      React.createElement("div",{className:"tile",style:{fontSize:22}}, "🏠"),
      React.createElement("div",{className:"nm"},
        React.createElement("div",null, t("st_shared")),
        React.createElement("div",{className:"meta"}, t("v4_shared_sub"))
      ),
      React.createElement("div",{style:{color:"var(--muted-2)",fontSize:20}}, "›")
    )
  );
}

function InvToolsSheet({open, onClose, state, set, fetchPrices, pricing}){
  useBackClose(!!open, onClose);
  const swipe=useSheetSwipe(!!open, onClose);
  if(!open) return null;
  return ReactDOM.createPortal(
    React.createElement("div",{className:"v4-sheet-back",onClick:onClose},
      React.createElement("div",Object.assign({className:"v4-sheet",style:{maxHeight:"92dvh"},ref:swipe.sheetRef,onClick:function(e){ e.stopPropagation(); }}, swipe.sheetTouch),
        React.createElement("div",{className:"v4-sheet-handle"}),
        React.createElement("div",{className:"v4-section-h"},
          React.createElement("span",{className:"serif",style:{fontSize:19,fontWeight:600}}, t("v4_inv_tools")),
          React.createElement("button",{className:"link","aria-label":t("au_close"),onClick:onClose},"✕")
        ),
        React.createElement("p",{style:{color:"var(--muted)",fontSize:13,lineHeight:1.45,margin:"0 0 12px"}}, t("v4_inv_tools_h")),
        // Orden de los bloques de bróker en Cartera (petición 2026-07-21: «poder mover el bloque
        // entero»): vive aquí, en avanzado, para no llenar Cartera de botones. Mismo secOrder
        // que las secciones (pestaña virtual "cartera_brokers" — lo lee Investments v4Embed).
        (function(){
          const names={revolut:"Revolut",trade_republic:"Trade Republic",myinvestor:"MyInvestor"};
          const ids=Object.keys(names).filter(function(e){ return (state.investments||[]).some(function(i){ return i.ent===e; }); });
          if(ids.length<2) return null;
          const order=secOrderOf(state,"cartera_brokers",ids);
          const move=function(id,dir){
            set(function(s){
              const o=secOrderOf(s,"cartera_brokers",ids); const i=o.indexOf(id), j=i+dir;
              if(i<0||j<0||j>=o.length) return s;
              const n=o.slice(); n[i]=o[j]; n[j]=id;
              return Object.assign({},s,{settings:Object.assign({},s.settings,{secOrder:Object.assign({},((s.settings||{}).secOrder)||{},{cartera_brokers:n})})});
            });
          };
          return React.createElement("div",{style:{marginBottom:14}},
            React.createElement("div",{className:"v4-exp-sec"}, t("v4_broker_order")),
            React.createElement("div",{className:"hint",style:{margin:"2px 0 6px"}}, t("v4_broker_order_h")),
            order.map(function(id,idx){
              return React.createElement("div",{key:id,className:"wedit-bar",style:{margin:"6px 0"}},
                React.createElement("span",{className:"wedit-lbl"},names[id]),
                React.createElement("div",{className:"wedit-btns"},
                  React.createElement("button",{disabled:idx===0,onClick:function(){ move(id,-1); }},"↑"),
                  React.createElement("button",{disabled:idx===order.length-1,onClick:function(){ move(id,1); }},"↓")));
            })
          );
        })(),
        React.createElement("div",{className:"v4-embed-legacy"}, React.createElement(Investments,{state:state,set:set,fetchPrices:fetchPrices,pricing:pricing,v4Embed:false,toolsMode:true}))
      )
    ), document.body);
}

/* Sheet FAB «Apuntar» — teclado propio, gasto/ingreso (SPEC §7). */
function ApuntarSheet({open, onClose, state, set, showToast, goGastos}){
  const [kind,setKind]=useState("gasto"); // gasto | ingreso
  const [raw,setRaw]=useState("");
  const [note,setNote]=useState("");
  const [cat,setCat]=useState("super");
  // Banco del apunte (petición 2026-07-18: «poder elegir el banco si apuntas un gasto manual»).
  // Opciones = los bancos de tus cuentas; por defecto la de gasto diario (lo que ya hacía Gastos).
  const [bank,setBank]=useState(null);
  const bankOpts=useMemo(function(){
    const seen={}; const out=[];
    (state.accounts||[]).forEach(function(a){ if(a&&a.ent&&!seen[a.ent]){ seen[a.ent]=1; out.push(a.ent); } });
    return out;
  },[state.accounts]);
  useEffect(function(){
    if(open){
      setKind("gasto"); setRaw(""); setNote(""); setCat("super");
      const daily=(state.accounts||[]).find(function(a){ return accDaily(a); });
      setBank((daily&&daily.ent)||null);
    }
  },[open]);
  useBackClose(!!open, onClose);
  const swipe=useSheetSwipe(!!open, onClose);
  if(!open) return null;
  const tap=function(ch){
    if(ch==="⌫"){ setRaw(function(r){ return r.slice(0,-1); }); return; }
    setRaw(function(r){
      if(ch===","){ if(r.indexOf(",")>=0||r.indexOf(".")>=0) return r; return (r||"0")+","; }
      if(r.replace(",","").length>=7) return r;
      return r==="0"?ch:(r+ch);
    });
  };
  const amt=parseFloat(String(raw).replace(/\./g,"").replace(",","."))||0;
  const save=function(){
    if(!(amt>0)){ showToast(t("v4_apuntar_need")); return; }
    try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}
    const isIn=kind==="ingreso";
    const e={
      id:uid(), date:new Date().toISOString().slice(0,10),
      amount:isIn?-Math.abs(amt):Math.abs(amt),
      merchant:note.trim()||(isIn?t("cat_ingreso"):catName(cat)),
      category:isIn?"ingreso":cat, source:"manual", card:!isIn
    };
    if(bank) e.ent=bank;   // banco elegido → filtro por banco en Gastos (y viaja en source)
    set(function(s){ return Object.assign({},s,{expenses:(s.expenses||[]).concat([e])}); });
    if(cloud.enabled()) cloud.addExpense(e).catch(function(){});
    onClose();
    if(goGastos) goGastos();
    showToast(isIn?t("v4_apuntar_ok_in"):t("v4_apuntar_ok"));
  };
  const keys=["1","2","3","4","5","6","7","8","9",",","0","⌫"];
  const cats=CATEGORIES.filter(function(c){ return c.id!=="otros"; }).concat(CATEGORIES.filter(function(c){ return c.id==="otros"; }));
  return ReactDOM.createPortal(
    React.createElement("div",{className:"v4-sheet-back",onClick:onClose},
      React.createElement("div",Object.assign({className:"v4-sheet",ref:swipe.sheetRef,onClick:function(e){ e.stopPropagation(); }}, swipe.sheetTouch),
        React.createElement("div",{className:"v4-sheet-handle"}),
        React.createElement("div",{className:"v4-toggle"},
          React.createElement("button",{className:kind==="gasto"?"on":"",onClick:function(){ setKind("gasto"); }},"💸 "+t("v4_gasto")),
          React.createElement("button",{className:kind==="ingreso"?"on":"",onClick:function(){ setKind("ingreso"); }},"💰 "+t("v4_ingreso"))
        ),
        React.createElement("div",{className:"v4-apuntar-amt serif num"},
          raw?raw+" €":React.createElement("span",{style:{color:"var(--muted-2)"}},"0 €")),
        React.createElement("input",{className:"v4-input",placeholder:t("v4_apuntar_ph"),value:note,onChange:function(e){ setNote(e.target.value); }}),
        kind==="gasto" && React.createElement("div",{className:"v4-chips"},
          cats.map(function(c){
            return React.createElement("button",{key:c.id,className:"v4-chip"+(cat===c.id?" on":""),onClick:function(){ setCat(c.id); }},
              c.icon+" "+catName(c.id));
          })
        ),
        bankOpts.length>0 && React.createElement("div",{className:"v4-chips"},
          React.createElement("button",{className:"v4-chip"+(bank==null?" on":""),onClick:function(){ setBank(null); }}, t("ap_bank_none")),
          bankOpts.map(function(b){
            return React.createElement("button",{key:b,className:"v4-chip"+(bank===b?" on":""),onClick:function(){ setBank(b); }},
              "🏦 "+entOf(b).label);
          })
        ),
        React.createElement("div",{className:"v4-keys"},
          keys.map(function(k){
            return React.createElement("button",{key:k,type:"button","aria-label":k==="⌫"?"Borrar":k,onClick:function(){ tap(k); }}, k);
          })
        ),
        React.createElement("button",{className:"v4-cta",onClick:save},
          kind==="ingreso"?t("v4_save_in"):t("v4_save_gasto"))
      )
    ), document.body);
}

/* Perfil personal (pull-down tipo Revolut). Datos en settings.profile — NUNCA PII de ejemplo
   en el repo: placeholders vacíos y el usuario rellena en su móvil (feedback 2026-07-17). */
function profileOf(s){
  const p=((s&&s.settings)||{}).profile||{};
  return {
    handle:p.handle||"", fullName:p.fullName||"", birth:p.birth||"", nationality:p.nationality||"",
    address:p.address||"", phone:p.phone||"", accountPurpose:p.accountPurpose||"",
    taxResidency:p.taxResidency||"", jobStatus:p.jobStatus||"", jobSector:p.jobSector||"",
    jobRole:p.jobRole||"", salaryRange:p.salaryRange||"", wealthSource:p.wealthSource||"",
    netWorthRange:p.netWorthRange||"", investorPurpose:p.investorPurpose||""
  };
}
function ProfilePanel({state, set, onClose, onOpenSettings}){
  const p=profileOf(state);
  const email=(function(){ try{ return window.__mcEmail||""; }catch(e){ return ""; } })();
  const nameGuess=(function(){
    if(p.fullName) return p.fullName;
    if(email&&email.indexOf("@")>0) return email.split("@")[0].replace(/[._]/g," ");
    return "";
  })();
  const initials=(function(){
    const src=nameGuess||"MC";
    const parts=src.trim().split(/\s+/);
    return ((parts[0]||"M").charAt(0)+(parts[1]||parts[0]||"C").charAt(0)).toUpperCase();
  })();
  const handleShow=p.handle ? (p.handle.charAt(0)==="@"?p.handle:("@"+p.handle)) : "@"+(email?email.split("@")[0]:"micartera");
  const patch=function(key,val){
    set(function(s){
      const cur=profileOf(s);
      cur[key]=val;
      return Object.assign({},s,{settings:Object.assign({},s.settings,{profile:cur})});
    });
  };
  const edit=function(key, title, ph){
    askText({ title:title, ph:ph||"", value:p[key]||"", ok:t("ask_ok"), mode:"text", compact:true })
      .then(function(raw){ if(raw==null) return; patch(key, String(raw).trim()); });
  };
  const val=function(v){ return v&&String(v).trim() ? v : null; };
  const row=function(lab, value, onEdit){
    const empty=!val(value);
    return React.createElement("button",{type:"button",className:"profile-row",onClick:onEdit},
      React.createElement("div",{className:"pr-body"},
        React.createElement("div",{className:"pr-lab"}, lab),
        React.createElement("div",{className:"pr-val"+(empty?" empty":"")}, empty?t("pf_add"):value)
      ),
      React.createElement("span",{className:"pr-edit","aria-hidden":"true"}, "✎")
    );
  };
  const jobLines=[p.jobStatus,p.jobSector,p.jobRole,p.salaryRange].filter(function(x){ return val(x); });
  const jobDisplay=jobLines.length ? jobLines.join(" · ") : null;
  return React.createElement(React.Fragment,null,
    React.createElement("div",{className:"profile-pull-h"},
      React.createElement("button",{type:"button",className:"back","aria-label":t("v4_back"),onClick:onClose},"✕"),
      React.createElement("div",{className:"ph-main"},
        React.createElement("h1",null, t("pf_title")),
        React.createElement("button",{type:"button",className:"profile-handle",onClick:function(){ edit("handle", t("pf_handle"), "@usuario"); }},
          handleShow, React.createElement("span",{"aria-hidden":"true"},"✎"))
      ),
      React.createElement("div",{className:"profile-av","aria-hidden":"true"}, initials)
    ),
    React.createElement("div",{className:"profile-sec"}, t("pf_personal")),
    React.createElement("div",{className:"profile-card"},
      row(t("pf_basic"), [val(p.fullName),val(p.birth)].filter(Boolean).join(" · ")||null, function(){
        askText({ title:t("pf_name"), ph:t("pf_name_ph"), value:p.fullName||"", ok:t("ask_ok"), mode:"text", compact:true }).then(function(n){
          if(n==null) return;
          askText({ title:t("pf_birth"), ph:t("pf_birth_ph"), value:p.birth||"", ok:t("ask_ok"), mode:"text", compact:true }).then(function(b){
            if(b==null) return;
            set(function(s){
              const cur=profileOf(s);
              cur.fullName=String(n).trim(); cur.birth=String(b).trim();
              return Object.assign({},s,{settings:Object.assign({},s.settings,{profile:cur})});
            });
          });
        });
      }),
      row(t("pf_nationality"), p.nationality, function(){ edit("nationality", t("pf_nationality"), t("pf_country_ph")); }),
      row(t("pf_address"), p.address, function(){ edit("address", t("pf_address"), t("pf_address_ph")); }),
      row(t("pf_phone"), p.phone, function(){ edit("phone", t("pf_phone"), "+34 …"); }),
      row(t("pf_email"), email||null, function(){
        if(onOpenSettings) onOpenSettings();
      }),
      row(t("pf_account_purpose"), p.accountPurpose, function(){ edit("accountPurpose", t("pf_account_purpose"), t("pf_purpose_ph")); }),
      row(t("pf_tax"), p.taxResidency, function(){ edit("taxResidency", t("pf_tax"), t("pf_country_ph")); })
    ),
    React.createElement("div",{className:"profile-sec"}, t("pf_wealth")),
    React.createElement("div",{className:"profile-card"},
      row(t("pf_job"), jobDisplay, function(){
        askText({ title:t("pf_job_status"), ph:t("pf_job_status_ph"), value:p.jobStatus||"", ok:t("ask_ok"), mode:"text", compact:true }).then(function(a){
          if(a==null) return;
          askText({ title:t("pf_job_sector"), ph:t("pf_job_sector_ph"), value:p.jobSector||"", ok:t("ask_ok"), mode:"text", compact:true }).then(function(b){
            if(b==null) return;
            askText({ title:t("pf_job_role"), ph:t("pf_job_role_ph"), value:p.jobRole||"", ok:t("ask_ok"), mode:"text", compact:true }).then(function(c){
              if(c==null) return;
              askText({ title:t("pf_salary"), ph:t("pf_salary_ph"), value:p.salaryRange||"", ok:t("ask_ok"), mode:"text", compact:true }).then(function(d){
                if(d==null) return;
                set(function(s){
                  const cur=profileOf(s);
                  cur.jobStatus=String(a).trim(); cur.jobSector=String(b).trim();
                  cur.jobRole=String(c).trim(); cur.salaryRange=String(d).trim();
                  return Object.assign({},s,{settings:Object.assign({},s.settings,{profile:cur})});
                });
              });
            });
          });
        });
      }),
      row(t("pf_wealth_src"), p.wealthSource, function(){ edit("wealthSource", t("pf_wealth_src"), t("pf_wealth_src_ph")); }),
      row(t("pf_networth"), p.netWorthRange, function(){ edit("netWorthRange", t("pf_networth"), t("pf_networth_ph")); })
    ),
    React.createElement("div",{className:"profile-sec"}, t("pf_investor")),
    React.createElement("div",{className:"profile-card"},
      row(t("pf_inv_purpose"), p.investorPurpose, function(){ edit("investorPurpose", t("pf_inv_purpose"), t("pf_inv_purpose_ph")); })
    ),
    React.createElement("p",{style:{fontSize:12,color:"var(--muted-2)",lineHeight:1.45,margin:"18px 2px 0"}}, t("pf_hint")),
    onOpenSettings && React.createElement("button",{type:"button",className:"btn btn-ghost btn-block",style:{marginTop:14},onClick:function(){ onClose(); onOpenSettings(); }}, t("pf_to_settings"))
  );
}
