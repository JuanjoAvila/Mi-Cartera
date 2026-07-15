/* ============================================================
   TAB: DASHBOARD
   ============================================================ */
// orden efectivo de widgets del Resumen: el guardado + cualquier widget nuevo al final
function dashOrderOf(s, allIds){
  const saved=((s.settings&&s.settings.dashOrder)||[]).filter(function(id){ return allIds.indexOf(id)>=0; });
  return saved.concat(allIds.filter(function(id){ return saved.indexOf(id)<0; }));
}
function Dashboard({state, totals, set}){
  const tt=totals;
  const [editing,setEditing]=useState(false);
  const dismissSetup=function(){ set(function(s){ return Object.assign({},s,{setupHint:false}); }); };
  // Ajustes › "Personalizar widgets del Resumen" (rediseño): App ya saltó al Resumen; aquí
  // encendemos el modo edición al recibir el evento.
  useEffect(function(){
    const h=function(){ setEditing(true); };
    window.addEventListener("mc-dash-edit",h);
    return function(){ window.removeEventListener("mc-dash-edit",h); };
  },[]);
  const [bEdit,setBEdit]=useState(false);
  const [bDraft,setBDraft]=useState("");
  const saveBudget=function(){ const b=parseFloat(String(bDraft).replace(',','.')); if(b>=0) set(function(s){ return Object.assign({},s,{budget:b}); }); setBEdit(false); };
  // --- Aportaciones de ahorro EDITABLES (petición 2026-07-11): los importes de «¿A dónde va tu
  // ahorro?» venían sembrados «a piñón» (500+500+50) y no había forma de tocarlos ni de que un
  // usuario nuevo (la pareja) añadiera los suyos. Editar aquí solo ajusta la cifra de ahorro/mes.
  const [apEdit,setApEdit]=useState(false);
  const [apDrafts,setApDrafts]=useState({});
  const apStart=function(){ const d={}; (state.aportaciones||[]).forEach(function(a){ d[a.id]={name:a.name||"",amount:String(a.amount||0),ent:a.ent||"myinvestor"}; }); setApDrafts(d); setApEdit(true); };
  const apSave=function(){
    set(function(s){ return Object.assign({},s,{aportaciones:(s.aportaciones||[]).map(function(a){
      const d=apDrafts[a.id]; if(!d) return a;
      return Object.assign({},a,{name:d.name||a.name||t("d_saving"),amount:parseFloat(String(d.amount).replace(',','.'))||0,ent:d.ent||a.ent});
    })}); });
    setApEdit(false);
  };
  const apSet=function(id,k,v){ setApDrafts(function(dr){ const n=Object.assign({},dr); n[id]=Object.assign({},n[id],{[k]:v}); return n; }); };
  const apAdd=function(){ const nid=uid(); set(function(s){ return Object.assign({},s,{aportaciones:(s.aportaciones||[]).concat([{id:nid,ent:"myinvestor",name:"",amount:0}])}); }); setApDrafts(function(dr){ const n=Object.assign({},dr); n[nid]={name:"",amount:"",ent:"myinvestor"}; return n; }); };
  const apDel=function(id){ set(function(s){ return Object.assign({},s,{aportaciones:(s.aportaciones||[]).filter(function(a){ return a.id!==id; })}); }); };
  const AP_ENTS=Object.keys(ENT).filter(function(k){ return k!=="familia"; });
  // Rediseño · toque 1: conteo suave del patrimonio. Anima solo cuando el número cambia de verdad
  // (p.ej. tras sincronizar), no al abrir la app ni al cambiar de pestaña. Respeta reduce-motion.
  const [shownNet,setShownNet]=useState(tt.netWorth);
  const netRef=useRef(tt.netWorth), rafRef=useRef(0);
  useEffect(function(){
    const target=tt.netWorth;
    if(Math.abs(target-netRef.current)<0.005) return;
    cancelAnimationFrame(rafRef.current);
    const reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    if(reduce){ netRef.current=target; setShownNet(target); return; }
    const start=netRef.current, t0=performance.now(), dur=1100, ease=function(x){ return 1-Math.pow(1-x,3); };
    netRef.current=target;
    const step=function(now){ const p=Math.min(1,(now-t0)/dur); setShownNet(start+(target-start)*ease(p)); if(p<1) rafRef.current=requestAnimationFrame(step); };
    rafRef.current=requestAnimationFrame(step);
  },[tt.netWorth]);
  useEffect(function(){ return function(){ cancelAnimationFrame(rafRef.current); }; },[]);
  // (2026-07-10: quitado el mantener-pulsado sobre la cifra que la leía en voz alta — feedback:
  // se disparaba sin querer al seleccionar/tocar el importe. words() queda sin uso.)
  const ratio=tt.thisMonthSpent/state.budget;
  const monthName=monthLong(new Date().getMonth());

  const byCat={};
  state.expenses.filter(e=>parseDate(e.date)>=startOfMonth()).forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
  const catList=Object.keys(byCat).map(id=>Object.assign({id:id,v:byCat[id]},catOf(id))).sort((a,b)=>b.v-a.v);
  const top=catList[0];

  // Comparativa "esto vs tu media": gasto por categoría este mes vs media de los meses cerrados.
  const trend=(function(){
    const now=new Date(); const curK=mk(now.getFullYear(),now.getMonth());
    const cm={};   // categoría -> { mesKey: suma }
    state.expenses.forEach(function(e){ if(!(e.amount>0)) return; const c=e.category; const k=mkOf(parseDate(e.date)); (cm[c]=cm[c]||{})[k]=(cm[c][k]||0)+e.amount; });
    const rows=[];
    Object.keys(cm).forEach(function(c){
      const past=Object.keys(cm[c]).filter(function(k){ return k<curK; }).sort().slice(-6);
      if(past.length<2) return;                       // hace falta histórico para comparar
      const avg=past.reduce(function(a,k){return a+cm[c][k];},0)/past.length;
      if(avg<5) return;                               // ignora categorías irrelevantes
      const cur=cm[c][curK]||0;
      rows.push({id:c, cur:cur, avg:avg, pct:(cur-avg)/avg*100, color:catOf(c).color, icon:catOf(c).icon});
    });
    return rows.sort(function(a,b){ return b.pct-a.pct; });   // lo más por encima, arriba
  })();

  const pips=[]; for(let i=0;i<12;i++) pips.push(i<state.streak);

  // ---- Widgets del Resumen (cada uno con su render) ----
  const W=[];
  if(state.setupHint!==false && state.onboarded!==false){
    W.push({id:"setup", label:t("ob_hint_t"), lock:true, el:
      React.createElement("div",{className:"set-card",style:{borderColor:"var(--mint)",marginBottom:12}},
        React.createElement("div",{style:{fontWeight:800,fontSize:14,marginBottom:6}},t("ob_hint_t")),
        React.createElement("div",{style:{fontSize:13,color:"var(--muted)",lineHeight:1.5,marginBottom:12}},t("ob_hint_d")),
        React.createElement("div",{style:{display:"flex",gap:8}},
          React.createElement("button",{className:"btn btn-primary",style:{flex:1,padding:"10px 12px",fontSize:13},onClick:function(){ try{ window.dispatchEvent(new CustomEvent("mc-open-settings")); }catch(e){} }},t("ob_hint_go")),
          React.createElement("button",{className:"btn btn-ghost",style:{flex:1,padding:"10px 12px",fontSize:13},onClick:dismissSetup},t("ob_hint_dismiss"))
        )
      )
    });
  }
  // Rediseño · toque 4: tinte ambiental del hero (mint→ámbar→coral, muy sutil) según cómo va el mes.
  const tintT = state.budget>0 ? Math.max(0,Math.min(1,(ratio-0.6)/0.6)) : 0;
  const heroStyle={ background:"radial-gradient(140% 90% at 50% -20%, rgba("+mixHex("#5FD08A","#E2705F",tintT)+",.16), transparent 60%),linear-gradient(180deg,var(--surface),var(--bg-2))", transition:"background .6s ease" };
  W.push({id:"hero", label:t("d_networth"), lock:true, el:
    React.createElement(React.Fragment,null,
    React.createElement("div",{className:"hero",style:heroStyle},
      React.createElement("div",{className:"hero-label"},t("d_networth")),
      (function(){ const p=eurParts(shownNet); return React.createElement("div",{className:"hero-amount serif num"}, p.ent, React.createElement("span",{className:"cents"},","+p.dec+" "+p.sym)); })(),
      React.createElement("div",{className:"hero-pills"},
        React.createElement("div",{className:"pill "+(tt.delta>=0?"pos":"neg")},
          React.createElement(tt.delta>=0?I.up:I.down,null), (tt.delta>=0?"+":"")+eur(tt.delta)+" · "+(tt.delta>=0?"+":"")+tt.deltaPct.toFixed(1)+"%"),
        React.createElement("div",{className:"pill ghost"},t("d_assets")+" "+eur0(tt.activos)),
        React.createElement("div",{className:"pill ghost"},t("d_debts")+" "+eur0(tt.debtTotal))
      ),
      React.createElement(Sparkline,{data:state.history,current:tt.netWorth})
    )
    )});
  (function(){
    const gs=(state.goals||[]);
    const g=gs.filter(function(x){return !x.done;})[0]||gs[0];
    if(!g) return;
    const pct=goalPct(g); const eta=goalEta(g, tt.ahorroMensual);
    W.push({id:"goal", label:t("wl_goal"), el:
      React.createElement(CollapsibleCard,{title:t("gl_widget_title"),dot:"#5FD08A",storageKey:"d_goal",help:t("h_goalw")},
        React.createElement("div",{className:"goal-top"},
          React.createElement("span",{className:"goal-emoji"}, g.emoji||"🎯"),
          React.createElement("div",{style:{flex:1,minWidth:0}},
            React.createElement("div",{className:"goal-name"}, g.name, g.done && React.createElement("span",{className:"goal-medal"}," "+t("gl_done_badge"))),
            React.createElement("div",{className:"goal-amt num"}, eur0(g.saved||0)+" "+t("gl_of")+" "+eur0(g.target||0))),
          React.createElement("div",{className:"goal-pct num"}, Math.round(pct)+"%")),
        React.createElement("div",{className:"bar"},React.createElement("i",{style:{width:pct+"%",background:g.done?"linear-gradient(90deg,#F2C14E,#F2C14E)":"linear-gradient(90deg,var(--mint),var(--mint-bright))"}})),
        React.createElement("div",{className:"goal-eta "+eta.cls}, eta.text)
      )});
  })();
  W.push({id:"dist", label:t("d_dist"), el:
    React.createElement(CollapsibleCard,{title:t("d_dist"),dot:"#5FD08A",storageKey:"d_dist",help:t("h_dist")},
      React.createElement(StackedBar,{segments:[
        {label:t("d_liquid"),value:tt.liquid,color:"var(--mint)"},
        {label:t("d_invest"),value:tt.invested,color:"var(--blue)"},
        {label:t("d_goods"),value:tt.assetsTotal,color:"var(--cream)"},
      ]})
    )});
  W.push({id:"budget", label:t("wl_budget"), el:
    React.createElement("div",{className:"grid2"},
      React.createElement("div",{className:"metric"},
        React.createElement("div",{className:"mlabel",style:{display:"flex",alignItems:"center",justifyContent:"center",gap:6}},
          t("d_budget")+" · "+monthName,
          React.createElement("button",{className:"pencil-btn",onClick:function(){ setBDraft(String(state.budget||"")); setBEdit(true); }},"✎")),
        bEdit
          ? React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:6,margin:"18px 0"}},
              React.createElement("input",{className:"editv num",style:{width:90,textAlign:"center"},inputMode:"decimal",autoFocus:true,value:bDraft,onChange:function(e){ setBDraft(e.target.value); },onKeyDown:function(e){ if(e.key==="Enter") saveBudget(); }}),
              React.createElement("span",{style:{fontSize:13,color:"var(--muted-2)"}},"€"),
              React.createElement("button",{className:"edit-link save",onClick:saveBudget},"OK"))
          : React.createElement(Ring,{ratio:ratio,spent:tt.thisMonthSpent,budget:state.budget})
      ),
      // Rediseño 1b: racha + nivel fusionados en UN titular de estado (icono + frase), con
      // 2 acentos (mint/coral) + ámbar de aviso. El detalle de nivel/medallas sigue en Metas.
      (function(){
        const streakN=state.streak||0;
        const gm=gamifOf(state, totals);
        let stIcon,stHead,stLine,stColor;
        if(ratio<=0.85){ stIcon="🌱"; stHead=t("st_good_h"); stLine=t("st_good_l"); stColor="var(--mint)"; }
        else if(ratio<=1){ stIcon="👀"; stHead=t("st_tight_h"); stLine=t("st_tight_l"); stColor="var(--tan)"; }
        else { stIcon="🍂"; stHead=t("st_over_h"); stLine=t("st_over_l"); stColor="var(--coral)"; }
        return React.createElement("div",{className:"metric",style:{textAlign:"left"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:11}},
            React.createElement("span",{style:{fontSize:32,lineHeight:1,filter:"drop-shadow(0 4px 10px rgba(95,208,138,.25))"}}, stIcon),
            React.createElement("div",{style:{flex:1,minWidth:0}},
              React.createElement("div",{className:"serif",style:{fontSize:18,fontWeight:600,color:stColor,lineHeight:1.15}}, stHead),
              React.createElement("div",{style:{fontSize:12.5,color:"var(--muted)",marginTop:3,lineHeight:1.4}}, stLine))),
          React.createElement("div",{style:{height:1,background:"var(--line-soft)",margin:"12px 0 10px"}}),
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,fontSize:12,color:"var(--muted-2)"}},
            React.createElement("span",{style:{fontWeight:700,color:streakN>=3?"var(--tan)":"var(--muted-2)"}}, (streakN>=3?"🔥":"✨")+" "+streakN+" "+t("d_months")),
            React.createElement("span",null, "Nv "+(gm.lvl+1)+" · "+t("gm_lvl_"+gm.lvl)))
        );
      })()
    )});
  W.push({id:"culpa", label:t("wl_culpa"), el:
    (function(){ const rem=state.budget-tt.thisMonthSpent; return React.createElement("div",{className:"culpa"+(rem>=0?"":" over")},
      rem>=0
        ? React.createElement(React.Fragment,null, React.createElement("span",{className:"big num"},eur0(rem)), React.createElement("span",null," "+t("d_guilt_ok")))
        : React.createElement(React.Fragment,null, React.createElement("span",null,t("d_guilt_over_a")), React.createElement("span",{className:"big num"},eur0(-rem)), React.createElement("span",null," 😬"))
    ); })() });
  // Rediseño · toque 3: "Resumen del mes" en formato CARTA (Fraunces, tono personal), no otro dashboard.
  W.push({id:"letter", label:t("wl_letter"), el:
    (function(){
      const spent=tt.thisMonthSpent, b=state.budget, rem=b-spent, over=rem<0;
      const topCat = top ? catName(top.id) : null;
      const netUp = tt.delta>=0;
      const openKey = over ? "lt_open_over" : (ratio<=0.85 ? "lt_open_good" : "lt_open_tight");
      let body = t(openKey)+" "+tf("lt_spent",{s:eur0(spent),b:eur0(b)})+(over ? tf("lt_rem_over",{r:eur0(-rem)}) : tf("lt_rem_ok",{r:eur0(rem)}));
      if(topCat) body += tf("lt_top",{cat:topCat});
      body += (netUp ? t("lt_net_up") : t("lt_net_down"));
      return React.createElement("div",{style:{background:"linear-gradient(180deg,#14231a,var(--bg-2))",border:"1px solid var(--line)",borderRadius:20,padding:"20px 20px 18px",boxShadow:"var(--shadow)"}},
        React.createElement("div",{className:"serif",style:{fontSize:20,fontWeight:600,color:"var(--text)",marginBottom:10}}, tf("lt_title",{m:monthName})),
        React.createElement("div",{className:"serif",style:{fontSize:15.5,lineHeight:1.75,color:"#cfe0d4",fontWeight:400}}, body),
        React.createElement("div",{className:"serif",style:{fontStyle:"italic",fontSize:14,color:"var(--mint)",marginTop:14,textAlign:"right"}}, "— Mi Cartera")
      );
    })()});
  W.push({id:"fixedsave", label:t("wl_fixedsave"), el:
    React.createElement("div",{className:"grid2"},
      React.createElement("div",{className:"metric tall"},
        React.createElement("div",{className:"mlabel"},t("d_fixed")),
        React.createElement("div",{className:"metric-big serif num"},eur0(tt.fijosMensual)),
        React.createElement("div",{className:"metric-sub"},tf("d_fixed_sub",{x:eur0(tt.cargosMes)}))
      ),
      React.createElement("div",{className:"metric tall"},
        React.createElement("div",{className:"mlabel"},t("d_saving")),
        React.createElement("div",{className:"metric-big serif num",style:{color:"#5FD08A"}},eur0(tt.ahorroMensual)),
        React.createElement("div",{className:"metric-sub"},t("d_saving_sub"))
      )
    )});
  W.push({id:"savings", label:t("wl_savings"), el:
    React.createElement(CollapsibleCard,{title:t("d_saving_card"),sub:tf("d_saving_card_sub",{x:eur0(tt.ahorroMensual)}),dot:"#5FD08A",defaultOpen:false,storageKey:"d_ahorro",help:t("h_savings"),
      right:React.createElement("button",{className:"edit-link"+(apEdit?" save":""),onClick:function(e){ e.stopPropagation(); apEdit?apSave():apStart(); }},apEdit?t("fj_save"):t("fj_edit"))},
      (state.aportaciones||[]).length===0 && !apEdit && React.createElement("div",{className:"hint"},t("sv_empty")),
      (state.aportaciones||[]).map(function(ap){
        if(apEdit){
          const d=apDrafts[ap.id]||{name:ap.name||"",amount:String(ap.amount||0),ent:ap.ent||"myinvestor"};
          return React.createElement("div",{key:ap.id,style:{padding:"8px 0",borderBottom:"1px solid var(--line-soft)"}},
            React.createElement("div",{className:"af-row"},
              React.createElement("input",{className:"af-in",placeholder:t("sv_name_ph"),value:d.name,onChange:function(e){ apSet(ap.id,"name",e.target.value); }}),
              React.createElement("input",{className:"af-in num",style:{maxWidth:96},placeholder:"0 €",inputMode:"decimal",value:d.amount,onChange:function(e){ apSet(ap.id,"amount",e.target.value); }})
            ),
            React.createElement("div",{className:"edit-extra",style:{marginTop:6}},
              React.createElement("select",{className:"af-in",style:{width:"auto",padding:"6px 9px",fontSize:12.5},value:d.ent,onChange:function(e){ apSet(ap.id,"ent",e.target.value); }},
                AP_ENTS.map(function(k){ return React.createElement("option",{key:k,value:k},entOf(k).label); })),
              React.createElement("button",{className:"ex-del",style:{marginLeft:"auto"},title:"✕",onClick:function(){ apDel(ap.id); }},"🗑")
            )
          );
        }
        return React.createElement("div",{className:"row",key:ap.id},
          React.createElement("div",{className:"rl"},React.createElement(Mono,{ent:ap.ent,size:38}),
            React.createElement("div",null,React.createElement("div",{className:"rname"},ap.name),React.createElement("div",{className:"rsub"},entOf(ap.ent).label))),
          React.createElement("div",{className:"rval num",style:{color:"#5FD08A"}},eur0(ap.amount)+"/mes"));
      }),
      apEdit && React.createElement("button",{className:"btn btn-ghost btn-block",style:{marginTop:10},onClick:apAdd},React.createElement(I.plus,{width:16,height:16}),t("sv_add")),
      apEdit && React.createElement("div",{className:"hint",style:{marginTop:8}},t("sv_edit_hint")),
      React.createElement("div",{className:"subtotal"},React.createElement("span",{className:"muted"},t("d_saving_total")),React.createElement("span",{className:"num"},eur(tt.ahorroMensual)))
    )});
  W.push({id:"culprit", label:t("d_culprit"), el:
    React.createElement(CollapsibleCard,{title:t("d_culprit"),sub:tf("d_culprit_sub",{m:monthName}),dot:top?top.color:"#8FA89A",storageKey:"d_culprit",help:t("h_culprit")},
      catList.length===0
        ? React.createElement("div",{className:"empty"},React.createElement("div",{className:"ttl"},t("d_noexp_t")),t("d_noexp_d"))
        : React.createElement("div",{className:"culprit-row"},
            React.createElement(MiniPie,{slices:catList.map(c=>({value:c.v,color:c.color}))}),
            React.createElement("div",{className:"legend"},
              catList.slice(0,5).map(c=>React.createElement("div",{className:"legend-item",key:c.id},
                React.createElement("span",{className:"sw",style:{background:c.color}}),
                React.createElement("span",{className:"nm"},c.icon+" "+catName(c.id)),
                React.createElement("span",{className:"vl num"},eur0(c.v))
              ))
            )
          ),
      top && React.createElement("div",{className:"hint"},tf("d_culprit_hint",{name:top.name,pct:Math.round(top.v/tt.thisMonthSpent*100)}))
    )});

  W.push({id:"trend", label:t("d_trend"), el:
    React.createElement(CollapsibleCard,{title:t("d_trend"),sub:t("d_trend_sub"),dot:"#7FB5E8",defaultOpen:false,storageKey:"d_trend",help:t("h_trend")},
      trend.length===0
        ? React.createElement("div",{className:"hint"}, t("d_trend_nodata"))
        : React.createElement(React.Fragment,null,
            trend.slice(0,6).map(function(r){ const over=r.pct>=0; return React.createElement("div",{className:"trend-row",key:r.id},
              React.createElement("span",{className:"trend-ic",style:{color:r.color}}, r.icon),
              React.createElement("div",{className:"trend-mid"},
                React.createElement("div",{className:"trend-nm"}, catName(r.id)),
                React.createElement("div",{className:"trend-sub num"}, eur0(r.cur)+" · "+tf("d_trend_avg",{x:eur0(r.avg)}))),
              React.createElement("span",{className:"trend-pct "+(over?"up":"down")}, (over?"▲ +":"▼ ")+Math.round(r.pct)+"%")
            ); }),
            React.createElement("div",{className:"hint",style:{marginTop:6}}, t("d_trend_hint"))
          )
    )});

  // ---- render con orden + visibilidad ----
  const allIds=W.map(function(w){return w.id;});
  const order=dashOrderOf(state, allIds);
  const hidden=(state.settings&&state.settings.dashHidden)||[];
  const wmap={}; W.forEach(function(w){ wmap[w.id]=w; });
  const move=function(id,dir){ set(function(s){ const o=dashOrderOf(s,allIds); const i=o.indexOf(id), j=i+dir; if(j<0||j>=o.length) return s; const n=o.slice(); n[i]=o[j]; n[j]=o[i]; return Object.assign({},s,{settings:Object.assign({},s.settings,{dashOrder:n})}); }); };
  const toggleHide=function(id){ set(function(s){ const h=((s.settings&&s.settings.dashHidden)||[]).slice(); const k=h.indexOf(id); if(k>=0)h.splice(k,1); else h.push(id); return Object.assign({},s,{settings:Object.assign({},s.settings,{dashHidden:h})}); }); };

  // ---- arrastre por MANTENER PULSADO: las demás tarjetas abren hueco con animación + auto-scroll ----
  const visibleOrder=order.filter(function(id){ return hidden.indexOf(id)<0; });
  const [drag,setDrag]=useState(null);     // {id, off, ti}
  const nodeRefs=useRef({}), listRef=useRef(null);
  const pressT=useRef(null), startY=useRef(0), lifted=useRef(false), curId=useRef(null), curTarget=useRef(0);
  const bases=useRef([]), stepR=useRef(0), origIdxR=useRef(0), pageEl=useRef(null), pageTop=useRef(0), startScroll=useRef(0), lastY=useRef(0), scrollDir=useRef(0), rafId=useRef(0);
  const allIdsRef=useRef([]), hiddenRef=useRef([]), visRef=useRef([]);
  allIdsRef.current=allIds; hiddenRef.current=hidden; visRef.current=visibleOrder;
  const H=useRef(null);
  if(!H.current){
    H.current={
      update:function(cy){
        lastY.current=cy;
        const sc=pageEl.current?pageEl.current.scrollTop:0;
        const pcy=cy - pageTop.current + sc;                       // posición del dedo en coords del contenido
        const off=(cy - startY.current) + (sc - startScroll.current);
        let ti=0; bases.current.forEach(function(m){ if(m.id!==curId.current && m.mid < pcy) ti++; });
        curTarget.current=ti;
        // dirección de auto-scroll si el dedo está cerca del borde
        const vh=pageEl.current?pageEl.current.clientHeight:600;
        scrollDir.current = cy < pageTop.current+80 ? -1 : (cy > pageTop.current+vh-80 ? 1 : 0);
        setDrag({id:curId.current, off:off, ti:ti});
      },
      tick:function(){
        if(!lifted.current){ rafId.current=0; return; }
        const p=pageEl.current;
        if(scrollDir.current!==0 && p){
          const max=p.scrollHeight-p.clientHeight;
          const nt=Math.max(0,Math.min(max, p.scrollTop + scrollDir.current*9));
          if(nt!==p.scrollTop){ p.scrollTop=nt; H.current.update(lastY.current); }
        }
        rafId.current=requestAnimationFrame(H.current.tick);
      },
      move:function(e){ if(!lifted.current) return; if(e.cancelable) e.preventDefault(); H.current.update((e.touches&&e.touches[0])?e.touches[0].clientY:e.clientY); },
      end:function(){
        document.removeEventListener('touchmove',H.current.move,{passive:false});
        document.removeEventListener('touchend',H.current.end);
        document.removeEventListener('touchcancel',H.current.end);
        if(rafId.current){ cancelAnimationFrame(rafId.current); rafId.current=0; }
        scrollDir.current=0;
        if(lifted.current && curId.current!=null){
          const id=curId.current, ti=curTarget.current;
          set(function(s){
            const o=dashOrderOf(s, allIdsRef.current);
            const without=o.filter(function(x){ return hiddenRef.current.indexOf(x)<0 && x!==id; });
            without.splice(Math.max(0,Math.min(ti,without.length)),0,id);
            const hid=o.filter(function(x){ return hiddenRef.current.indexOf(x)>=0; });
            return Object.assign({},s,{settings:Object.assign({},s.settings,{dashOrder:without.concat(hid)})});
          });
        }
        lifted.current=false; curId.current=null; setDrag(null);
      }
    };
  }
  const startPress=function(id,e){
    if(editing) return;
    startY.current=e.touches[0].clientY; lifted.current=false; curId.current=id;
    clearTimeout(pressT.current);
    pressT.current=setTimeout(function(){
      lifted.current=true;
      const pg=listRef.current?listRef.current.closest('.page'):null; pageEl.current=pg;
      pageTop.current=pg?pg.getBoundingClientRect().top:0; startScroll.current=pg?pg.scrollTop:0;
      const sc=startScroll.current, pt=pageTop.current;
      const arr=[]; visRef.current.forEach(function(wid){ const n=nodeRefs.current[wid]; if(n){ const r=n.getBoundingClientRect(); const top=r.top-pt+sc; arr.push({id:wid, top:top, bottom:top+r.height, mid:top+r.height/2}); } });
      bases.current=arr;
      let ci=0; arr.forEach(function(m,k){ if(m.id===id) ci=k; }); origIdxR.current=ci; curTarget.current=ci;
      stepR.current = (ci+1<arr.length) ? (arr[ci+1].top-arr[ci].top) : (arr[ci]? (arr[ci].bottom-arr[ci].top+14) : 0);
      if(navigator.vibrate){ try{ navigator.vibrate(12); }catch(_){} }
      document.addEventListener('touchmove',H.current.move,{passive:false});
      document.addEventListener('touchend',H.current.end);
      document.addEventListener('touchcancel',H.current.end);
      setDrag({id:id, off:0, ti:ci});
      rafId.current=requestAnimationFrame(H.current.tick);
    },360);
  };
  const movePress=function(e){ if(lifted.current) return; if(Math.abs(e.touches[0].clientY-startY.current)>10) clearTimeout(pressT.current); };
  const endPress=function(){ if(!lifted.current) clearTimeout(pressT.current); };

  // Resumen del mes pasado: aparece 1×/mes al abrir la app en un mes nuevo (si hay datos del anterior).
  const recap=(function(){
    const now=new Date(); const curK=mk(now.getFullYear(),now.getMonth());
    if((state.monthRecapSeen||"")===curK) return null;
    const lm=new Date(now.getFullYear(),now.getMonth()-1,1); const lmK=mk(lm.getFullYear(),lm.getMonth());
    const sb=spendByMonth(state.expenses); if(sb[lmK]==null) return null;
    const budget=state.budget||0; const spent=+sb[lmK].toFixed(2);
    return {curK:curK, monthName:monthLong(lm.getMonth()), spent:spent, budget:budget, under:budget>0&&spent<=budget, diff:budget>0?Math.abs(+(budget-spent).toFixed(2)):0, subs:detectSubscriptions(state.expenses).filter(function(x){return x.active;}).length};
  })();
  const dismissRecap=function(){ if(recap) set(function(s){ return Object.assign({},s,{monthRecapSeen:recap.curK}); }); };

  return React.createElement("div",{ref:listRef,style:{position:"relative"}},
    recap && React.createElement("div",{className:"recap-card"},
      React.createElement("div",{className:"recap-h"}, tf("recap_title",{m:recap.monthName})),
      React.createElement("div",{className:"recap-stats"},
        React.createElement("div",{className:"recap-stat"}, React.createElement("div",{className:"recap-v num"},eur0(recap.spent)), React.createElement("div",{className:"recap-l"},t("recap_spent"))),
        recap.budget>0 && React.createElement("div",{className:"recap-stat"}, React.createElement("div",{className:"recap-v num "+(recap.under?"good":"bad")},(recap.under?"−":"+")+eur0(recap.diff)), React.createElement("div",{className:"recap-l"},recap.under?t("recap_under"):t("recap_over"))),
        recap.subs>0 && React.createElement("div",{className:"recap-stat"}, React.createElement("div",{className:"recap-v num"},recap.subs), React.createElement("div",{className:"recap-l"},t("recap_subs")))
      ),
      React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:10},onClick:dismissRecap}, t("recap_ok"))
    ),
    // El botón «✎ Personalizar» se quitó del Resumen (2026-07-10): se entra desde Ajustes ›
    // «Personalizar widgets del Resumen». La barra solo aparece EN modo edición, para salir.
    editing && React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,marginBottom:8}},
      React.createElement("span",{style:{fontSize:11,color:"var(--muted-2)"}},t("drag_hint")),
      React.createElement("button",{className:"edit-link save",onClick:function(){ setEditing(false); }}, t("done"))
    ),
    editing
      ? order.map(function(id,idx){
          const w=wmap[id]; if(!w) return null;
          const isHidden=hidden.indexOf(id)>=0;
          return React.createElement("div",{key:id,className:"wedit"+(isHidden?" off":"")},
            React.createElement("div",{className:"wedit-bar"},
              React.createElement("span",{className:"wedit-lbl"}, w.label),
              React.createElement("div",{className:"wedit-btns"},
                React.createElement("button",{disabled:idx===0,onClick:function(){ move(id,-1); }},"↑"),
                React.createElement("button",{disabled:idx===order.length-1,onClick:function(){ move(id,1); }},"↓"),
                w.lock
                  ? React.createElement("span",{className:"wedit-lock"},t("w_fixed"))
                  : React.createElement("button",{className:isHidden?"on":"",onClick:function(){ toggleHide(id); }}, isHidden?t("w_show"):t("w_hide"))
              )
            ),
            React.createElement("div",{className:"wedit-body"}, w.el)
          );
        })
      : visibleOrder.map(function(id,fi){
          const w=wmap[id]; if(!w) return null;
          const isDragging=drag && drag.id===id;
          let st=null;
          if(isDragging){
            st={transform:"translateY("+drag.off+"px) scale(1.03)",zIndex:50,position:"relative",opacity:.97,transition:"none"};
          } else if(drag){
            const oi=origIdxR.current, ti=drag.ti; let sh=0;
            if(ti>oi && fi>oi && fi<=ti) sh=-stepR.current;
            else if(ti<oi && fi>=ti && fi<oi) sh=stepR.current;
            if(sh) st={transform:"translateY("+sh+"px)"};
          }
          return React.createElement("div",{key:id, ref:function(n){ nodeRefs.current[id]=n; },
            onTouchStart:function(e){ startPress(id,e); }, onTouchMove:movePress, onTouchEnd:endPress, onTouchCancel:endPress,
            className:"wdragwrap"+(isDragging?" lifting":""), style:st
          }, w.el);
        })
  );
}

