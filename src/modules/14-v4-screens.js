/* ============================================================
   v4 — Plan (Recibos/Deudas/Metas), Cartera, Sheet Apuntar
   Spec: docs/design/handoff/SPEC-v4.md §5–7
   ============================================================ */

function PlanTab({state, set, totals, showToast, simple}){
  const [seg,setSeg]=useState("recibos");
  const [manageOpen,setManageOpen]=useState(false);
  // Modo sencillo: solo Recibos (spec §2).
  const segs=simple
    ? [{id:"recibos",lab:t("v4_plan_recibos")}]
    : [{id:"recibos",lab:t("v4_plan_recibos")},{id:"deudas",lab:t("v4_plan_deudas")},{id:"metas",lab:t("v4_plan_metas")}];
  useEffect(function(){ if(simple && seg!=="recibos") setSeg("recibos"); },[simple,seg]);
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
  charges.sort(function(a,b){ return ((a.day||99)-(b.day||99)) || (b.amount-a.amount); });
  const pending=charges.filter(function(x){ return !x.paid; });
  const paidAll=charges.filter(function(x){ return x.paid; });
  // Agrupa recibos pequeños ya pagados en una sola fila (SPEC §5) para no llenar la lista.
  const paidBig=[], paidSmall=[];
  paidAll.forEach(function(x){ if((x.amount||0)<35 && paidAll.length>=3) paidSmall.push(x); else paidBig.push(x); });
  if(paidSmall.length<2){ paidBig.push.apply(paidBig,paidSmall); paidSmall.length=0; }
  const paid=paidBig.slice();
  if(paidSmall.length){
    const sum=paidSmall.reduce(function(a,x){ return a+x.amount; },0);
    const names=paidSmall.slice(0,3).map(function(x){ return x.name; }).join(", ");
    paid.push({id:"_grp_paid",name:tf("v4_paid_group",{names:names,n:paidSmall.length}),amount:sum,day:null,bank:"",paid:true,sub:"",grouped:true});
  }
  const pendingTotal=pending.reduce(function(sum,x){ return sum+x.amount; },0);
  const paidTotal=paidAll.reduce(function(sum,x){ return sum+x.amount; },0);
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
      pending.map(row)
    ),
    React.createElement("div",{className:"v4-section"},
      React.createElement("div",{className:"v4-section-h"},t("v4_ya_pagado")+" · "+eur(paidTotal)),
      (paidExpanded?paid:paid.slice(0,3)).map(row),
      // más de 3 pagados: se pliegan para no llenar la pantalla de recibos ya resueltos (feedback 2026-07-17)
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
        React.createElement(Fijos,{state:state,set:set,totals:totals})
      )
    ), document.body);
}

function CarteraTab({state, set, totals, fetchPrices, pricing, simple}){
  const [invTools,setInvTools]=useState(false);
  const liq=totals.liquid||0, inv=totals.invested||0, goods=totals.assetsTotal||0;
  const sum=Math.max(0.01, liq+inv+goods);
  const wLiq=(liq/sum)*100, wInv=(inv/sum)*100, wGoods=(goods/sum)*100;
  const p=eurParts(totals.netWorth);
  const ru=+(totals.roundupThisMonth||0)+(totals.savebackThisMonth||0);
  return React.createElement("div",{className:"v4-screen"},
    React.createElement("h1",{className:"v4-title serif"}, t("v4_cartera_title")),
    React.createElement("div",{className:"v4-card v4-card-hero rise",style:{animationDelay:".05s"}},
      React.createElement("div",{className:"v4-micro"}, t(simple?"v4_money_total":"d_networth")),
      React.createElement("div",{className:"serif num",style:{fontSize:40,fontWeight:550,letterSpacing:"-1px",lineHeight:1.05,marginTop:6}},
        p.ent, React.createElement("span",{style:{fontSize:22,color:"var(--muted)"}},","+p.dec+" "+p.sym)),
      React.createElement("div",{className:"v4-stackbar",style:{marginTop:16}},
        React.createElement("i",{style:{flex:wLiq,background:"var(--mint)"}}),
        React.createElement("i",{style:{flex:wInv,background:"var(--blue)"}}),
        React.createElement("i",{style:{flex:wGoods,background:"var(--cream)"}})
      ),
      React.createElement("div",{className:"v4-legend"},
        React.createElement("span",null, React.createElement("b",{style:{background:"var(--mint)"}}), t("d_liquid")+" "+eur0(liq)),
        React.createElement("span",null, React.createElement("b",{style:{background:"var(--blue)"}}), t("d_invest")+" "+eur0(inv)),
        React.createElement("span",null, React.createElement("b",{style:{background:"var(--cream)"}}), t("d_goods")+" "+eur0(goods))
      ),
      React.createElement("div",{style:{marginTop:12,fontSize:13,color:"var(--muted)"}},
        t("v4_debts_foot_a"),
        React.createElement("span",{style:{color:"var(--coral)",fontWeight:700}}, " "+eur0(-(totals.debtTotal||0))+" "),
        t("v4_debts_foot_b"))
    ),
    React.createElement("div",{className:"v4-sec-h"}, t("v4_cuentas")),
    React.createElement(Wealth,{state:state,set:set,totals:totals,v4Embed:true}),
    ru>0.005 && React.createElement("div",{className:"v4-roundup"},
      (function(){
        const parts=t("v4_roundup_card").split("{x}");
        if(parts.length<2) return tf("v4_roundup_card",{x:eur(ru)});
        return React.createElement(React.Fragment,null, parts[0], React.createElement("strong",null,eur(ru)), parts[1]);
      })()
    ),
    !simple && React.createElement(React.Fragment,null,
      React.createElement("div",{className:"v4-sec-h",style:{display:"flex",justifyContent:"space-between",alignItems:"baseline"}},
        React.createElement("span",null, t("v4_inversiones")),
        React.createElement("span",{className:"num",style:{color:"var(--mint)",fontWeight:800,fontSize:13.5}},
          (totals.investedCost>0?(totals.invested-totals.investedCost>=0?"+":"")+eur0(totals.invested-totals.investedCost):"—"))
      ),
      React.createElement(Investments,{state:state,set:set,fetchPrices:fetchPrices,pricing:pricing,v4Embed:true}),
      React.createElement("button",{type:"button",className:"v4-link-mini",style:{marginTop:10},onClick:function(){ setInvTools(true); }}, t("v4_inv_tools")+" ›"),
      React.createElement(InvToolsSheet,{open:invTools,onClose:function(){ setInvTools(false); },state:state,set:set,fetchPrices:fetchPrices,pricing:pricing})
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
        React.createElement(Investments,{state:state,set:set,fetchPrices:fetchPrices,pricing:pricing,v4Embed:false})
      )
    ), document.body);
}

/* Sheet FAB «Apuntar» — teclado propio, gasto/ingreso (SPEC §7). */
function ApuntarSheet({open, onClose, state, set, showToast, goGastos}){
  const [kind,setKind]=useState("gasto"); // gasto | ingreso
  const [raw,setRaw]=useState("");
  const [note,setNote]=useState("");
  const [cat,setCat]=useState("super");
  useEffect(function(){
    if(open){ setKind("gasto"); setRaw(""); setNote(""); setCat("super"); }
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
