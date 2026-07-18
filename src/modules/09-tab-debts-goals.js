/* ============================================================
   TAB: DEUDAS
   ============================================================ */
/* ASESOR DE AMORTIZACIÓN (#11) — «¿cuándo amortizar?»
   El interés (TAE) es opcional por deuda (d.apr, se edita aquí mismo): con él la tarjeta
   estima intereses ahorrados, el coste de esperar y compara contra el efectivo remunerado
   (interestApr de las cuentas, p.ej. TR). Sin él, al menos simula cuántas cuotas te quitas.
   Los números usan el modelo lineal de la app (ver debtBalance): son una estimación honesta,
   no la liquidación exacta del banco. */
function AmortAdvisor({state, set, onAmort}){
  const debts=(state.debts||[]).filter(function(d){ return debtBalance(d)>0.005; });
  const [selId,setSelId]=useState(null);
  const [amtStr,setAmtStr]=useState("500");
  if(!debts.length) return null;
  const d=debts.find(function(x){ return x.id===selId; })||debts[0];
  const bal=debtBalance(d);
  const apr=d.apr!=null?d.apr:null;
  const setApr=function(v){ set(function(s){ return Object.assign({},s,{debts:s.debts.map(function(x){ return x.id===d.id?Object.assign({},x,{apr:v}):x; })}); }); };
  const amt=Math.min(Math.max(0,parseFloat(String(amtStr).replace(',','.'))||0), bal);
  const am=debtAmort(d), leftNow=debtLeft(d);
  const nb=+(bal-amt).toFixed(2);
  let leftNew=null, cut=null;
  if(d.months!=null && am>0){
    const viaM=Math.max(0, nb-(d.balloon||0));
    leftNew=viaM>0?Math.ceil(viaM/am):((d.balloon>0&&nb>0.005)?1:0);
    cut=Math.max(0,(leftNow||0)-leftNew);
  }
  const inMonths=function(k){ const dt=new Date(); dt.setDate(1); dt.setMonth(dt.getMonth()+k); return monthLong(dt.getMonth())+" "+dt.getFullYear(); };
  const r=(apr||0)/1200;
  // ahorro ≈ el importe deja de «deber» durante lo que queda de vida del préstamo + la cola que se corta
  const savedTerm=(apr>0&&leftNew!=null)?(amt*r*leftNew+(amt/2)*r*(cut||0)):null;
  const savedYr=(apr>0&&leftNew==null)?amt*(apr/100):null;
  const waitCost=(apr>0)?bal*r:null;
  const cashApr=(state.accounts||[]).reduce(function(mx,a){ return Math.max(mx,a.interestApr||0); },0);
  const ranked=debts.filter(function(x){ return x.apr>0; }).sort(function(a,b){ return b.apr-a.apr; });
  const res=function(txt,color){ return React.createElement("div",{className:"hint",style:{marginTop:6,color:color||"var(--text)",lineHeight:1.5}}, txt); };
  return React.createElement(CollapsibleCard,{title:"💡 "+t("da_title"),sub:t("da_sub"),dot:"#E2C05F",defaultOpen:false,storageKey:"debt_advisor"},
    debts.length>1 && React.createElement("select",{className:"af-in",style:{marginBottom:8},value:d.id,onChange:function(e){ setSelId(e.target.value); }},
      debts.map(function(x){ return React.createElement("option",{key:x.id,value:x.id}, x.name+" · "+eur0(debtBalance(x))); })),
    React.createElement("div",{className:"row",style:{marginTop:0}},
      React.createElement("span",{className:"muted"},t("da_rate")),
      React.createElement("input",{className:"af-in num",style:{width:96,textAlign:"right",padding:"7px 9px"},inputMode:"decimal",placeholder:"—",value:apr!=null?apr:"",onChange:function(e){ const v=String(e.target.value).trim(); setApr(v===""?null:(parseFloat(v.replace(',','.'))||0)); }})),
    apr==null && React.createElement("div",{className:"hint",style:{marginTop:4}}, t("da_rate_hint")),
    React.createElement("div",{className:"row",style:{marginTop:6}},
      React.createElement("span",{className:"muted"},t("da_amount")),
      React.createElement("input",{className:"af-in num",style:{width:96,textAlign:"right",padding:"7px 9px"},inputMode:"decimal",value:amtStr,onChange:function(e){ setAmtStr(e.target.value); }})),
    React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}},
      [100,250,500,1000].filter(function(v){ return v<=bal; }).map(function(v){
        return React.createElement("button",{key:v,className:"chip",onClick:function(){ setAmtStr(String(v)); }}, eur0(v)); })),
    amt>0 && React.createElement("div",{style:{marginTop:10,padding:"10px 12px",borderRadius:12,background:"var(--surface-2)",border:"1px solid var(--line)"}},
      cut!=null && (cut>0 ? res("📆 "+tf("da_cut",{n:cut,d:inMonths(leftNew),d0:inMonths(leftNow)})) : res("📆 "+t("da_nocut"))),
      savedTerm!=null && savedTerm>=0.5 && res("💶 "+tf("da_saved",{x:eur(savedTerm)}),"var(--mint)"),
      savedYr!=null && savedYr>=0.5 && res("💶 "+tf("da_saved_yr",{x:eur(savedYr)}),"var(--mint)"),
      waitCost!=null && waitCost>=0.5 && res("⏳ "+tf("da_wait",{x:eur(waitCost)})),
      apr===0 && res("🧊 "+tf("da_rate0",{p:cashApr>0?tf("da_rate0_cash",{b:cashApr}):""})),
      apr>0 && cashApr>0 && (apr>=cashApr
        ? res("✅ "+tf("da_beats_cash",{a:apr,b:cashApr}))
        : res("⚖️ "+tf("da_under_cash",{a:apr,b:cashApr}))),
      ranked.length>1 && res(tf("da_first",{name:ranked[0].name,p:ranked[0].apr}))
    ),
    amt>0 && React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:10},onClick:function(){
      askConfirm({ title:tf("da_apply_q",{x:eur0(amt),name:d.name}), sub:t("da_apply_sub"), ok:"💸 "+t("db_amortize") })
        .then(function(yes){ if(yes) onAmort(d, amt); });
    }}, tf("da_apply",{x:eur0(amt)})),
    React.createElement("div",{className:"hint",style:{marginTop:8,fontSize:11.5}}, t("da_est"))
  );
}
function Debts({state, set, showToast}){
  // editar el saldo re-ancla la proyección para que siga desde ahí. Sin plazo: se re-ancla asOf.
  // Con plazo: asOf NO se toca (re-anclarlo resetearía debtPaidCount y el «Quedan n/tot» volvería
  // al plazo completo); en su lugar se ajusta value para que el pendiente sea lo tecleado y se
  // recalculan las cuotas que quedan con la misma amortización (como amortize()).
  const ed=useEditable(state.debts,it=>set(s=>Object.assign({},s,{debts:it})), { display:d=>Math.round(debtBalance(d)*100)/100, extra:(d,typed)=>{
    const am=debtAmort(d);
    if(d.months==null || !(am>0)) return {asOf:ymNow()};
    const paid=debtPaidCount(d);
    const viaM=Math.max(0,typed-(d.balloon||0));
    const left=viaM>0?Math.ceil(viaM/am):((d.balloon>0&&typed>0.005)?1:0);
    return { value:+(typed+am*paid).toFixed(2), months:paid+left };
  } });
  const [adding,setAdding]=useState(false);
  const [form,setForm]=useState({name:"",value:"",monthly:"",months:"",day:"",account:"sabadell",down:"",balloon:"",paid:""});
  const banks=(function(){ const b=[]; (state.accounts||[]).forEach(a=>{ if(b.indexOf(a.ent)<0) b.push(a.ent); }); ["sabadell","trade_republic","familia"].forEach(x=>{ if(b.indexOf(x)<0) b.push(x); }); return b; })();
  const total=state.debts.reduce((a,d)=>a+debtBalance(d),0);
  const monthly=state.debts.reduce((a,d)=>a+(debtActive(d)?(d.monthly||0):0),0);
  const addDebt=()=>{
    const v=parseFloat(String(form.value).replace(',','.'))||0;
    const months=parseInt(form.months,10)||0;
    const balloon=parseFloat(String(form.balloon).replace(',','.'))||0;
    const down=parseFloat(String(form.down).replace(',','.'))||0;
    const paid=parseInt(form.paid,10)||0;
    const viaMonthly=Math.max(0, v-balloon);                 // lo que cubren las cuotas (el resto = pago final)
    let m=parseFloat(String(form.monthly).replace(',','.'))||0;
    if(v<=0){ showToast(t("db_err_amount")); return; }
    if(m<=0 && months<=0){ showToast(t("db_err_quota")); return; }
    if(paid>0 && months>0 && paid>=months){ showToast(t("db_err_paid")); return; }
    if(months>0 && m<=0) m=+(viaMonthly/months).toFixed(2);  // 0%: cuota = (financiado − pago final) / plazo
    const it={id:uid(),ent:"familia",name:form.name||t("db_newdebt"),value:v,original:v,monthly:m,asOf:ymNow(),account:form.account||"sabadell",note:t("db_addedmanual")};
    const day=cleanDay(form.day); it.day=day||1;   // día 1 por defecto → entra en el motor de líquido
    if(months>0){ it.months=months; it.amort=+(viaMonthly/months).toFixed(2); }   // amortiza principal lineal; el pago final limpia el resto
    if(balloon>0) it.balloon=balloon;
    if(down>0) it.downPayment=down;
    // deuda ya empezada: retrasa el ancla tantos meses como cuotas pagadas para que
    // debtPaidCount()===paid hoy (compensa el +1 que suma si la cuota de este mes ya pasó)
    if(paid>0){ let anchor=ymNow()-paid; if(months>0 && it.day!=null && it.day<=new Date().getDate()) anchor+=1; it.asOf=anchor; }
    set(s=>Object.assign({},s,{debts:s.debts.concat([it])}));
    setForm({name:"",value:"",monthly:"",months:"",day:"",account:"sabadell",down:"",balloon:"",paid:""}); setAdding(false);
    showToast(t("db_added"));
  };
  const delDebt=(id)=> set(s=>Object.assign({},s,{debts:s.debts.filter(d=>d.id!==id)}));
  // amortización anticipada: baja el pendiente y acorta el plazo (misma cuota, menos meses).
  // doAmort es la operación; amortize solo pregunta el importe. El asesor (#11) llama a doAmort.
  const doAmort=(d,rawAmt)=>{
    const bal=debtBalance(d);
    const amt=Math.min(rawAmt||0, bal);
    if(amt<=0) return;
    const nb=+(bal-amt).toFixed(2);
    set(s=>Object.assign({},s,{debts:s.debts.map(x=>{
      if(x.id!==d.id) return x;
      const o=Object.assign({},x,{value:+(x.value-amt).toFixed(2)});   // el ancla no se toca: el pendiente baja justo lo amortizado
      if(nb<=0.005){ if(x.months!=null) o.months=debtPaidCount(x); delete o.balloon; }
      else if(x.months!=null){ const am=debtAmort(x); if(am>0){ const viaM=Math.max(0,nb-(x.balloon||0)); o.months=debtPaidCount(x)+(viaM>0?Math.ceil(viaM/am):(x.balloon>0?1:0)); } }
      return o;
    })}));
    showToast(nb<=0.005?t("db_amortize_full"):tf("db_amortized",{x:eur(amt),y:eur(nb)}));
  };
  const amortize=(d)=>{
    const bal=debtBalance(d);
    askText({ title:tf("db_amortize_prompt",{name:d.name}), sub:tf("db_amortize_sub",{x:eur(bal)}),
      ph:"0,00 €", ok:"💸 "+t("db_amortize"),
      // atajos: los importes redondos que quepan + «todo» para liquidarla de un toque
      chips:[100,250,500].filter(function(v){ return v<bal; }).map(function(v){ return {v:v,label:eur0(v)}; })
        .concat([{v:+bal.toFixed(2), label:tf("ask_all",{x:eur0(bal)})}])
    }).then(function(raw){
      if(raw==null) return;
      doAmort(d, parseFloat(String(raw).replace(',','.'))||0);
    });
  };
  const debtEmoji=function(d){
    const n=String(d.name||"").toLowerCase();
    if(/coche|auto|car|seat|bmw/.test(n)) return "🚗";
    if(/casa|hipo|piso|mort/.test(n)) return "🏠";
    if(/móvil|movil|phone|móvil|iphone/.test(n)) return "📱";
    if(/estudio|máster|master|uni/.test(n)) return "🎓";
    return "💳";
  };
  const endsLabel=function(d){
    const left=debtLeft(d);
    if(left!=null){
      const dt=new Date(); dt.setDate(1); dt.setMonth(dt.getMonth()+left);
      return tf("v4_debts_ends",{d:monthLong(dt.getMonth())+" "+dt.getFullYear()});
    }
    // Sin plazo (hipoteca/préstamo a mano de las primeras versiones): antes no salía NADA y la
    // tarjeta parecía «muerta» (feedback 2026-07-18). Se estima con el ritmo de amortización
    // actual — por eso lleva «~»: una amortización anticipada o cambio de cuota la mueve.
    const am=debtAmort(d), bal=debtBalance(d);
    if(!(am>0) || !(bal>0.005)) return null;
    const k=Math.ceil(bal/am);
    const dt=new Date(); dt.setDate(1); dt.setMonth(dt.getMonth()+k);
    return tf("v4_debts_ends_est",{d:monthLong(dt.getMonth())+" "+dt.getFullYear()});
  };
  return React.createElement("div",null,
    React.createElement("div",{className:"v4-card v4-card-hero rise"},
      React.createElement("div",{className:"v4-micro"},t("v4_debts_hero")),
      React.createElement("div",{className:"serif num",style:{fontSize:40,fontWeight:550,letterSpacing:"-1px",lineHeight:1.05,marginTop:6,color:"var(--coral)"}},eur(total)),
      React.createElement("div",{style:{marginTop:12,fontSize:13.5,color:"var(--muted)",lineHeight:1.45}},tf("v4_debts_sub",{x:eur0(monthly)}))
    ),
    state.debts.map(function(d){
      const bal=debtBalance(d);
      const paid=Math.max(0,(d.original||bal)-bal);
      const pct=Math.min(100,(paid/(d.original||1))*100);
      const left=debtLeft(d);
      const day=debtChargeDay(d);
      return React.createElement("div",{className:"v4-debt-card rise",key:d.id},
        React.createElement("div",{className:"v4-debt-top"},
          React.createElement("span",{className:"v4-debt-emoji"},debtEmoji(d)),
          React.createElement("div",{style:{flex:1,minWidth:0}},
            React.createElement("div",{className:"v4-debt-name"},d.name),
            React.createElement("div",{className:"v4-debt-sub"},
              [d.monthly?tf("db_quota",{x:eur0(d.monthly)}):null, day?tf("fj_day_n",{d:day}):null, left!=null?tf("db_left",{n:left,tot:d.months||left,x:eur0(d.monthly||0)}):null].filter(Boolean).join(" · ")
            )
          ),
          ed.editing
            ? React.createElement("input",{className:"editv num",value:ed.draft[d.id],inputMode:"decimal",onChange:function(e){const v=e.target.value;ed.setDraft(function(dr){return Object.assign({},dr,{[d.id]:v});});}})
            : React.createElement("div",{className:"v4-debt-bal serif num"},eur(bal))
        ),
        React.createElement("div",{className:"v4-debt-bar"},React.createElement("i",{style:{width:pct+"%"}})),
        React.createElement("div",{className:"v4-debt-foot"},
          React.createElement("span",null,tf("db_paidoff",{x:eur0(paid),p:Math.round(pct)})),
          endsLabel(d) && React.createElement("span",null," · "+endsLabel(d))
        ),
        (d.balloon>0||d.downPayment>0) && React.createElement("div",{className:"v4-debt-sub",style:{marginTop:6,color:"var(--tan)"}},
          d.balloon>0?tf("db_balloon_line",{x:eur0(d.balloon)}):"",
          d.downPayment>0?(d.balloon>0?" · ":"")+tf("db_down_line",{x:eur0(d.downPayment)}):""),
        !ed.editing && bal>0.005 && React.createElement("button",{className:"v4-debt-amort",onClick:function(){ amortize(d); }},t("v4_amort_now")),
        ed.editing && React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:10,color:"var(--coral)"},onClick:function(){ delDebt(d.id); }},t("db_delete"))
      );
    }),
    React.createElement("button",{className:"btn btn-block "+(ed.editing?"btn-primary":"btn-ghost"),style:{marginTop:8},onClick:function(){ ed.editing?ed.save():ed.start(); }}, ed.editing?t("db_savechanges"):t("db_editbalances")),
    React.createElement("div",{className:"v4-tip"},
      React.createElement(AmortAdvisor,{state:state,set:set,onAmort:doAmort})
    ),
    adding
      ? React.createElement("div",{className:"add-form",style:{marginTop:12}},
          React.createElement("input",{className:"af-in",placeholder:t("db_concept"),value:form.name,onChange:function(e){ setForm(Object.assign({},form,{name:e.target.value})); }}),
          React.createElement("div",{className:"af-row"},
            React.createElement("input",{className:"af-in num",placeholder:t("db_amount"),inputMode:"decimal",value:form.value,onChange:function(e){ setForm(Object.assign({},form,{value:e.target.value})); }}),
            React.createElement("input",{className:"af-in num",placeholder:t("db_quota_ph"),inputMode:"decimal",value:form.monthly,onChange:function(e){ setForm(Object.assign({},form,{monthly:e.target.value})); }})
          ),
          React.createElement("div",{className:"af-row"},
            React.createElement("input",{className:"af-in num",placeholder:t("db_months_ph"),inputMode:"numeric",value:form.months,onChange:function(e){ setForm(Object.assign({},form,{months:e.target.value})); }}),
            React.createElement("input",{className:"af-in num",placeholder:t("db_day_ph"),inputMode:"numeric",style:{maxWidth:80},value:form.day,onChange:function(e){ setForm(Object.assign({},form,{day:e.target.value})); }}),
            React.createElement("select",{className:"af-in",value:form.account,onChange:function(e){ setForm(Object.assign({},form,{account:e.target.value})); }}, banks.map(function(b){ return React.createElement("option",{key:b,value:b},entOf(b).label); }))
          ),
          React.createElement("div",{className:"af-row"},
            React.createElement("input",{className:"af-in num",placeholder:t("db_down_ph"),inputMode:"decimal",value:form.down,onChange:function(e){ setForm(Object.assign({},form,{down:e.target.value})); }}),
            React.createElement("input",{className:"af-in num",placeholder:t("db_balloon_ph"),inputMode:"decimal",value:form.balloon,onChange:function(e){ setForm(Object.assign({},form,{balloon:e.target.value})); }})
          ),
          React.createElement("input",{className:"af-in num",placeholder:t("db_paid_ph"),inputMode:"numeric",value:form.paid,onChange:function(e){ setForm(Object.assign({},form,{paid:e.target.value})); }}),
          React.createElement("div",{className:"hint",style:{fontSize:11,marginTop:2}},t("db_paid_hint")),
          React.createElement("div",{className:"hint",style:{fontSize:11,marginTop:2}},t("db_financing_hint")),
          React.createElement("div",{className:"hint",style:{fontSize:11,marginTop:2}},t("db_balloon_hint")),
          React.createElement("button",{className:"btn btn-primary btn-block",onClick:addDebt},t("db_add"))
        )
      : React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:10},onClick:function(){ setAdding(true); }},React.createElement(I.plus,{width:16,height:16}),t("db_add")),
    React.createElement("div",{className:"hint",style:{padding:"10px 4px 0"}},t("db_hint"))
  );
}

/* ============================================================
   METAS DE AHORRO (#15)
   ============================================================ */
function Goals({state, set, totals, showToast}){
  const tt=totals||{};
  const goals=state.goals||[];
  const gm=gamifOf(state, totals);
  const [adding,setAdding]=useState(false);
  const [editing,setEditing]=useState(false);
  const [drafts,setDrafts]=useState({});
  const blank={name:"",emoji:"🎯",target:"",saved:"",deadline:"",monthly:""};
  const [form,setForm]=useState(blank);

  const addGoal=function(){
    const tg=parseFloat(String(form.target).replace(',','.'))||0; if(tg<=0) return;
    const sv=parseFloat(String(form.saved).replace(',','.'))||0;
    const mo=parseFloat(String(form.monthly).replace(',','.'))||0;
    const done=sv>=tg;
    const g={id:uid(),name:form.name||t("gl_newdefault"),emoji:form.emoji||"🎯",target:tg,saved:sv,deadline:form.deadline||null,monthly:mo>0?mo:null,color:"#5FD08A",createdAt:new Date().toISOString(),done:done,doneAt:done?new Date().toISOString():null};
    set(function(s){ return Object.assign({},s,{goals:(s.goals||[]).concat([g])}); });
    setForm(blank); setAdding(false);
  };
  const contribute=function(g){
    askText({ title:tf("gl_contribute_prompt",{name:g.name}), sub:t("gl_contribute_sub"), ph:"0,00 €",
      ok:t("gl_contribute"), chips:[25,50,100,250].map(function(v){ return {v:v,label:eur0(v)}; })
    }).then(function(raw){ if(raw!=null) addToGoal(g, parseFloat(String(raw).replace(',','.'))); });
  };
  const addToGoal=function(g,amt){
    if(!amt) return;
    set(function(s){ return Object.assign({},s,{goals:(s.goals||[]).map(function(x){
      if(x.id!==g.id) return x;
      const ns=Math.max(0,(x.saved||0)+amt);
      const becameDone=!x.done && ns>=x.target;
      if(becameDone){ celebrate(); if(showToast) showToast(tf("gl_celebrate",{name:x.name})); }
      return Object.assign({},x,{saved:ns,done:ns>=x.target,doneAt:(ns>=x.target&&!x.doneAt)?new Date().toISOString():x.doneAt});
    })}); });
  };
  const delGoal=function(id){ set(function(s){ return Object.assign({},s,{goals:(s.goals||[]).filter(function(g){return g.id!==id;})}); }); if(goals.length<=1) setEditing(false); };
  const startEdit=function(){ const d={}; goals.forEach(function(g){ d[g.id]={name:g.name,emoji:g.emoji||"🎯",target:String(g.target),saved:String(g.saved),deadline:g.deadline||"",monthly:g.monthly!=null?String(g.monthly):""}; }); setDrafts(d); setEditing(true); };
  const setD=function(id,k,v){ setDrafts(function(dr){ const n=Object.assign({},dr); n[id]=Object.assign({},n[id],{[k]:v}); return n; }); };
  const saveEdit=function(){
    set(function(s){ return Object.assign({},s,{goals:(s.goals||[]).map(function(g){
      const d=drafts[g.id]; if(!d) return g;
      const tg=parseFloat(String(d.target).replace(',','.'))||g.target;
      const svN=parseFloat(String(d.saved).replace(',','.'));
      const sv=isNaN(svN)?g.saved:Math.max(0,svN);
      const moN=parseFloat(String(d.monthly).replace(',','.'));
      const mo=(isNaN(moN)||moN<=0)?null:moN;
      const done=sv>=tg;
      return Object.assign({},g,{name:d.name||g.name,emoji:d.emoji||g.emoji,target:tg,saved:sv,deadline:d.deadline||null,monthly:mo,done:done,doneAt:done?(g.doneAt||new Date().toISOString()):null});
    })}); });
    setEditing(false);
  };

  const totalSaved=goals.reduce(function(a,g){return a+(g.saved||0);},0);
  const totalTarget=goals.reduce(function(a,g){return a+(g.target||0);},0);

  const emojiPicker=function(cur,onPick){
    return React.createElement("div",{className:"emoji-pick"}, GOAL_EMOJIS.map(function(e){
      return React.createElement("button",{key:e,type:"button",className:(cur===e?"on":""),onClick:function(){ onPick(e); }}, e);
    }));
  };

  return React.createElement("div",null,
    React.createElement("div",{className:"v4-card v4-card-hero rise"},
      React.createElement("div",{className:"v4-micro"},t("v4_goals_hero")),
      React.createElement("div",{className:"serif num",style:{fontSize:40,fontWeight:550,letterSpacing:"-1px",lineHeight:1.05,marginTop:6,color:"var(--mint)"}},eur(totalSaved)),
      totalTarget>0 && React.createElement("div",{style:{marginTop:10,fontSize:13.5,color:"var(--muted)"}},tf("gl_total_sub",{x:eur0(totalTarget)}))
    ),
    goals.length===0 && !adding && React.createElement("div",{className:"empty"},
      React.createElement("div",{className:"ttl"},t("gl_empty_t")), t("gl_empty_d")),

    goals.map(function(g){
      const pct=goalPct(g); const eta=goalEta(g, tt.ahorroMensual||0); const ed=editing&&drafts[g.id];
      return React.createElement("div",{className:"v4-goal-card rise",key:g.id},
        React.createElement("div",{className:"v4-debt-top"},
          React.createElement("span",{className:"v4-debt-emoji"}, ed?ed.emoji:(g.emoji||"🎯")),
          React.createElement("div",{style:{flex:1,minWidth:0}},
            ed
              ? React.createElement("input",{className:"af-in",value:ed.name,onChange:function(e){ setD(g.id,"name",e.target.value); }})
              : React.createElement("div",{className:"v4-debt-name"}, g.name, g.done && React.createElement("span",{className:"goal-medal"}," "+t("gl_done_badge"))),
            !ed && React.createElement("div",{className:"v4-debt-sub"}, eur0(g.saved||0)+" "+t("gl_of")+" "+eur0(g.target||0))
          ),
          !ed && React.createElement("div",{className:"serif num",style:{fontSize:22,fontWeight:550,color:"var(--mint)"}}, Math.round(pct)+"%")
        ),
        React.createElement("div",{className:"v4-goal-bar"},React.createElement("i",{style:{width:pct+"%",background:g.done?"linear-gradient(90deg,#F2C14E,#F2C14E)":"linear-gradient(90deg,var(--mint),var(--mint-hi))"}})),
        ed
          ? React.createElement(React.Fragment,null,
              React.createElement("div",{className:"af-row",style:{marginTop:10}},
                React.createElement("input",{className:"af-in num",placeholder:t("gl_saved_ph"),inputMode:"decimal",value:ed.saved,onChange:function(e){ setD(g.id,"saved",e.target.value); }}),
                React.createElement("input",{className:"af-in num",placeholder:t("gl_target_ph"),inputMode:"decimal",value:ed.target,onChange:function(e){ setD(g.id,"target",e.target.value); }})
              ),
              React.createElement("input",{className:"af-in",type:"month",style:{marginTop:8},value:ed.deadline,onChange:function(e){ setD(g.id,"deadline",e.target.value); }}),
              React.createElement("input",{className:"af-in num",style:{marginTop:8},placeholder:t("gl_monthly_ph"),inputMode:"decimal",value:ed.monthly,onChange:function(e){ setD(g.id,"monthly",e.target.value); }}),
              React.createElement("div",{style:{marginTop:8}}, emojiPicker(ed.emoji,function(e){ setD(g.id,"emoji",e); })),
              React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:10,color:"var(--coral)"},onClick:function(){ delGoal(g.id); }},t("gl_delete"))
            )
          : React.createElement(React.Fragment,null,
              React.createElement("div",{className:"goal-eta "+eta.cls,style:{marginTop:8}}, eta.text),
              !g.done && React.createElement("button",{className:"v4-goal-cta",onClick:function(){ contribute(g); }}, t("gl_contribute"))
            )
      );
    }),

    goals.length>0 && React.createElement("button",{className:"btn btn-block "+(editing?"btn-primary":"btn-ghost"),style:{marginTop:4},onClick:function(){ editing?saveEdit():startEdit(); }}, editing?t("gl_save"):t("gl_edit")),

    adding
      ? React.createElement("div",{className:"add-form",style:{marginTop:12}},
          React.createElement("input",{className:"af-in",placeholder:t("gl_name_ph"),value:form.name,onChange:function(e){ setForm(Object.assign({},form,{name:e.target.value})); }}),
          emojiPicker(form.emoji,function(e){ setForm(Object.assign({},form,{emoji:e})); }),
          React.createElement("div",{className:"af-row"},
            React.createElement("input",{className:"af-in num",placeholder:t("gl_target_ph"),inputMode:"decimal",value:form.target,onChange:function(e){ setForm(Object.assign({},form,{target:e.target.value})); }}),
            React.createElement("input",{className:"af-in num",placeholder:t("gl_saved_ph"),inputMode:"decimal",value:form.saved,onChange:function(e){ setForm(Object.assign({},form,{saved:e.target.value})); }})
          ),
          React.createElement("label",{className:"goal-dl-lbl"},t("gl_deadline")),
          React.createElement("input",{className:"af-in",type:"month",value:form.deadline,onChange:function(e){ setForm(Object.assign({},form,{deadline:e.target.value})); }}),
          React.createElement("input",{className:"af-in num",placeholder:t("gl_monthly_ph"),inputMode:"decimal",value:form.monthly,onChange:function(e){ setForm(Object.assign({},form,{monthly:e.target.value})); }}),
          React.createElement("button",{className:"btn btn-primary btn-block",onClick:addGoal},t("gl_create")),
          React.createElement("button",{className:"btn btn-ghost btn-block",onClick:function(){ setAdding(false); setForm(blank); }},t("gl_cancel"))
        )
      : (!editing || goals.length===0) && React.createElement("button",{className:"v4-ghost-add",onClick:function(){ setAdding(true); }},t("v4_goal_new"))
  );
}

/* Pantalla "Logros" (rediseño 1a): la gamificación (nivel + retos + medallas) vive aquí, FUERA de
   "Metas". El Resumen resume racha+nivel en un titular; el detalle (medallas/retos) vive en esta pantalla. */
function Achievements({state, totals}){
  const gm=gamifOf(state, totals);
  return React.createElement("div",null,
    /* ---------- NIVEL ---------- */
    React.createElement("div",{className:"card gm-level",style:{marginTop:4,padding:"15px 16px"}},
      React.createElement("div",{className:"gm-lvl-top"},
        React.createElement("span",{className:"gm-lvl-ic"}, GM_ICONS[gm.lvl]),
        React.createElement("div",{style:{flex:1,minWidth:0}},
          React.createElement("div",{className:"gm-lvl-name"}, "Nv "+(gm.lvl+1)+" · "+t("gm_lvl_"+gm.lvl)),
          React.createElement("div",{className:"gm-lvl-sub num"}, t("gm_score")+": "+eur0(gm.savedScore))),
        React.createElement("span",{className:"gm-lvl-badge"}, t("gm_level"))
      ),
      React.createElement("div",{className:"bar",style:{marginTop:10}},React.createElement("i",{style:{width:gm.lvlProg+"%",background:"linear-gradient(90deg,#C9A6F0,#7FB5E8)"}})),
      React.createElement("div",{className:"gm-lvl-next"}, gm.nextMin!=null ? tf("gm_next",{x:eur0(Math.max(0,gm.nextMin-gm.savedScore)),n:gm.lvl+2}) : t("gm_maxlvl"))
    ),

    /* ---------- RETOS DEL MES ---------- */
    React.createElement("div",{className:"card",style:{marginTop:12,padding:"15px 16px"}},
      React.createElement("div",{className:"gm-sec-h"}, t("gm_retos")),
      (function(){ const r=gm.budgetReto; const over=r.budget>0&&r.margin<0;
        return React.createElement("div",{className:"gm-reto"},
          React.createElement("div",{className:"gm-reto-top"},
            React.createElement("span",{className:"gm-reto-name"}, "🎯 "+t("gm_reto_budget")),
            React.createElement("span",{className:"gm-reto-pct num"+(over?" over":"")}, eur0(r.spent)+" / "+eur0(r.budget))),
          React.createElement("div",{className:"bar"},React.createElement("i",{style:{width:Math.min(100,r.pct)+"%",background: over?"linear-gradient(90deg,#E2705F,#E2705F)":"linear-gradient(90deg,var(--mint),var(--mint-bright))"}})),
          React.createElement("div",{className:"gm-reto-sub"+(over?" warn":" ok")}, r.budget<=0 ? "—" : (over?tf("gm_reto_budget_over",{x:eur0(-r.margin)}):tf("gm_reto_budget_ok",{x:eur0(r.margin)})))
        ); })(),
      (function(){ const r=gm.ruReto;
        return React.createElement("div",{className:"gm-reto",style:{marginTop:12}},
          React.createElement("div",{className:"gm-reto-top"},
            React.createElement("span",{className:"gm-reto-name"}, "🪙 "+t("gm_reto_roundup")),
            React.createElement("span",{className:"gm-reto-pct num"}, r.done?t("gm_reto_done"):(Math.round(r.pct)+"%"))),
          React.createElement("div",{className:"bar"},React.createElement("i",{style:{width:Math.min(100,r.pct)+"%",background:r.done?"linear-gradient(90deg,#F2C14E,#F2C14E)":"linear-gradient(90deg,#E6C36A,#F2C14E)"}})),
          React.createElement("div",{className:"gm-reto-sub ok"}, tf("gm_reto_roundup_sub",{x:eur(r.cur),y:eur0(r.goal)}))
        ); })()
    ),

    /* ---------- LOGROS ---------- */
    React.createElement("div",{className:"card",style:{marginTop:12,padding:"15px 16px"}},
      React.createElement("div",{className:"gm-sec-h"}, t("gm_logros")),
      React.createElement("div",{className:"gm-streak"+(gm.streak.current>0?" on":"")},
        gm.streak.current>=2 ? tf("gm_streak",{n:gm.streak.current}) : (gm.streak.current===1?t("gm_streak_1"):t("gm_streak_none")),
        gm.streak.best>gm.streak.current && React.createElement("span",{className:"gm-streak-best"}, " · "+tf("gm_streak_best",{n:gm.streak.best}))
      ),
      React.createElement("div",{className:"gm-badges"}, gm.badges.map(function(b){
        return React.createElement("div",{key:b.id,className:"gm-badge"+(b.unlocked?" on":""),title:b.unlocked?t("gm_b_"+b.id):t("gm_locked")},
          React.createElement("span",{className:"gm-badge-ic"}, b.unlocked?"🏅":"🔒"),
          React.createElement("span",{className:"gm-badge-lbl"}, t("gm_b_"+b.id))
        );
      }))
    )
  );
}

