/* ============================================================
   ICONOS
   ============================================================ */
const I = {
  // v4 nav: casa / lista / calendario / tendencia (stroke 2.1, ~22 px)
  home:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.1",width:22,height:22},p),React.createElement("path",{d:"M3 10.5L12 3l9 7.5"}),React.createElement("path",{d:"M5 10v10h14V10"}),React.createElement("path",{d:"M10 20v-6h4v6"})),
  calendar:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.1",width:22,height:22},p),React.createElement("rect",{x:3,y:5,width:18,height:16,rx:2}),React.createElement("path",{d:"M3 10h18M8 3v4M16 3v4"})),
  dash:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("path",{d:"M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 17v4h8v-4z"})),
  expense:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.1",width:22,height:22},p),React.createElement("path",{d:"M3 7h18M3 12h18M3 17h12"})),
  invest:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.1",width:22,height:22},p),React.createElement("path",{d:"M3 17l6-6 4 4 7-8M21 7v6M21 7h-6"})),
  wealth:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("path",{d:"M4 21h16M5 21V9l7-5 7 5v12M9 21v-6h6v6"})),
  debt:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("circle",{cx:"12",cy:"12",r:"9"}),React.createElement("path",{d:"M9 9.5a3 3 0 0 1 5.5 1.2c0 2-3 2.3-3 4M12 17h.01"})),
  fixed:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("path",{d:"M17 2l4 4-4 4"}),React.createElement("path",{d:"M3 11V9a4 4 0 0 1 4-4h14"}),React.createElement("path",{d:"M7 22l-4-4 4-4"}),React.createElement("path",{d:"M21 13v2a4 4 0 0 1-4 4H3"})),
  sync:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("path",{d:"M21 12a9 9 0 1 1-2.6-6.4M21 4v4h-4"})),
  plus:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.4"},p),React.createElement("path",{d:"M12 5v14M5 12h14"})),
  chev:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.4",width:"18",height:"18"},p),React.createElement("path",{d:"M6 9l6 6 6-6"})),
  up:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.6",width:"13",height:"13"},p),React.createElement("path",{d:"M12 19V5M5 12l7-7 7 7"})),
  down:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.6",width:"13",height:"13"},p),React.createElement("path",{d:"M12 5v14M5 12l7 7 7-7"})),
  logo:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"#0B1410",strokeWidth:"2.1"},p),React.createElement("path",{d:"M3 8.5A2.5 2.5 0 0 1 5.5 6H19a1 1 0 0 1 1 1v2"}),React.createElement("path",{d:"M3 8.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3.5"}),React.createElement("path",{d:"M16 12.5h4.5v3H16a1.5 1.5 0 0 1 0-3z"})),
  cloud:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("path",{d:"M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.2 9.2 4 4 0 0 0 6.5 19z"})),
  cloudOff:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("path",{d:"M17.5 19a4.5 4.5 0 0 0 1.9-8.58M9 5.2A6 6 0 0 1 18 9.2M6.5 19a4 4 0 0 1-.3-7.8"}),React.createElement("path",{d:"M3 3l18 18"})),
  gear:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2"},p),React.createElement("circle",{cx:12,cy:12,r:3}),React.createElement("path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.05a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.05a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"})),
  goal:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("circle",{cx:12,cy:12,r:9}),React.createElement("circle",{cx:12,cy:12,r:5}),React.createElement("circle",{cx:12,cy:12,r:1.5,fill:"currentColor"})),
  share:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("circle",{cx:18,cy:5,r:3}),React.createElement("circle",{cx:6,cy:12,r:3}),React.createElement("circle",{cx:18,cy:19,r:3}),React.createElement("path",{d:"M8.6 10.6l6.8-4M8.6 13.4l6.8 4"})),
  medal:(p)=>React.createElement("svg",Object.assign({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2.2"},p),React.createElement("path",{d:"M8 3l3 6M16 3l-3 6"}),React.createElement("circle",{cx:12,cy:15,r:6})),
};

/* ============================================================
   COMPONENTES REUTILIZABLES
   ============================================================ */
function Mono({ent, size}){
  const e=entOf(ent); size=size||40;
  return React.createElement("div",{className:"mono",style:{width:size,height:size,background:e.color+"22",color:e.color,borderColor:e.color+"44"}}, e.mono);
}

/* Ayuda contextual: un «?» discreto que explica la tarjeta en cristiano (para no-técnicos). */
function HelpTip({text}){
  const [open,setOpen]=useState(false);
  // El overlay va en un PORTAL a <body>: dentro del track de páginas hay un transform
  // permanente (translateX) que convierte al track en el contenedor de position:fixed,
  // así que sin portal la tarjeta de ayuda aparecía encima de OTRA pestaña (Resumen).
  return React.createElement(React.Fragment,null,
    React.createElement("button",{className:"helpq",onClick:function(e){ e.stopPropagation(); setOpen(true); },"aria-label":"?"},"?"),
    open && ReactDOM.createPortal(
      React.createElement("div",{className:"helpover",onClick:function(e){ e.stopPropagation(); setOpen(false); }},
        React.createElement("div",{className:"helpcard",onClick:function(e){ e.stopPropagation(); }},
          React.createElement("div",{style:{fontSize:14,lineHeight:1.55}},text),
          React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:14},onClick:function(){ setOpen(false); }},t("h_ok"))
        )
      ), document.body)
  );
}

/* ============================================================
   INFORME DEL MES — imagen 1080×1350 (para compartir por WhatsApp/IG) con los
   colores del tema activo. Todo en el dispositivo (canvas → share/descarga).
   ============================================================ */
function shareMonthReport(state, tt){
  try{
    // Paleta FIJA por tema (mismos hex que el CSS). No se lee getComputedStyle: en algunos
    // móviles el "modo oscuro automático" del navegador reescribe/oscurece las variables CSS
    // y el informe salía con textos negros ilegibles. Así los colores son deterministas.
    const PAL={
      green:{ bg:"#0B1410", surface:"#122319", line:"#1f3a2c", text:"#E8F0EA", muted:"#8FA89A", mint:"#5FD08A", coral:"#E2705F" },
      dark: { bg:"#0A0A0C", surface:"#17171B", line:"#2B2B32", text:"#ECECEF", muted:"#9A9AA4", mint:"#5FD08A", coral:"#E2705F" },
      light:{ bg:"#F3F6F3", surface:"#FFFFFF", line:"#DCE4DD", text:"#15201A", muted:"#566A5E", mint:"#2FA866", coral:"#D2563F" },
      blue: { bg:"#0A1320", surface:"#13243B", line:"#213D5C", text:"#E6EEF8", muted:"#93A8C2", mint:"#5FD08A", coral:"#E2705F" }
    };
    const P=PAL[(state.settings&&state.settings.theme)||"green"]||PAL.green;
    const mint=P.mint, text=P.text, muted=P.muted, surface=P.surface, line=P.line, coral=P.coral, bg=P.bg;
    const W=1080,H=1350;
    const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    const g=cv.getContext("2d");
    const round=function(x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
    g.fillStyle=bg; g.fillRect(0,0,W,H);
    const grad=g.createLinearGradient(0,0,0,H*0.5); grad.addColorStop(0,"rgba(95,208,138,.14)"); grad.addColorStop(1,"rgba(0,0,0,0)");
    g.fillStyle=grad; g.fillRect(0,0,W,H*0.5);
    g.textBaseline="top";
    const mes=monthLong(new Date().getMonth())+" "+new Date().getFullYear();
    g.fillStyle=mint;  g.font="800 44px Manrope, sans-serif"; g.fillText("💼 Mi Cartera", 72, 70);
    g.fillStyle=muted; g.font="600 34px Manrope, sans-serif"; g.fillText(mes.charAt(0).toUpperCase()+mes.slice(1), 72, 130);
    // tarjeta: gastado este mes + barra de presupuesto
    g.fillStyle=surface; round(72,210,W-144,330,28); g.fill(); g.strokeStyle=line; g.lineWidth=2; round(72,210,W-144,330,28); g.stroke();
    g.fillStyle=muted; g.font="700 27px Manrope, sans-serif"; g.fillText(t("rp_spent").toUpperCase(), 116, 252);
    g.fillStyle=text;  g.font="700 96px Manrope, sans-serif"; g.fillText(eur0(tt.thisMonthSpent), 112, 300);
    const bud=state.budget||0;
    if(bud>0){
      const ratio=Math.min(1, (tt.thisMonthSpent||0)/bud);
      g.fillStyle="rgba(128,128,128,.18)"; round(116,432,W-232,26,13); g.fill();
      g.fillStyle=ratio<1?mint:coral; round(116,432,Math.max(20,(W-232)*ratio),26,13); g.fill();
      g.fillStyle=muted; g.font="600 28px Manrope, sans-serif"; g.fillText(tf("rp_of_budget",{b:eur0(bud),p:Math.round(ratio*100)}), 116, 480);
    }
    // top 3 categorías del mes
    const byCat={};
    (state.expenses||[]).filter(function(e){ return parseDate(e.date)>=startOfMonth() && e.amount>0; })
      .forEach(function(e){ byCat[e.category||"otros"]=(byCat[e.category||"otros"]||0)+e.amount; });
    const top=Object.keys(byCat).map(function(k){ return [k,byCat[k]]; }).sort(function(a,b){ return b[1]-a[1]; }).slice(0,3);
    let y=610;
    g.fillStyle=text; g.font="800 36px Manrope, sans-serif"; g.fillText(t("rp_top"), 72, y); y+=70;
    const maxV=top.length?top[0][1]:1;
    top.forEach(function(c){
      const cat=catOf(c[0]);
      g.font="600 44px Manrope, sans-serif"; g.fillStyle=text; g.fillText(cat.icon, 72, y-4);
      g.font="700 34px Manrope, sans-serif"; g.fillText(catName(c[0]), 150, y);
      g.textAlign="right"; g.fillText(eur0(c[1]), W-72, y); g.textAlign="left";
      g.fillStyle="rgba(128,128,128,.18)"; round(150,y+48,W-222-72,16,8); g.fill();
      g.fillStyle=cat.color||mint; round(150,y+48,Math.max(14,(W-222-72)*(c[1]/maxV)),16,8); g.fill();
      y+=112;
    });
    if(!top.length){ g.fillStyle=muted; g.font="600 30px Manrope, sans-serif"; g.fillText("—", 72, y); y+=80; }
    // tarjeta: patrimonio + delta del mes
    const py=Math.max(y+30, 1030);
    g.fillStyle=surface; round(72,py,W-144,190,28); g.fill(); g.strokeStyle=line; round(72,py,W-144,190,28); g.stroke();
    g.fillStyle=muted; g.font="700 27px Manrope, sans-serif"; g.fillText(t("rp_networth").toUpperCase(), 116, py+38);
    g.fillStyle=text;  g.font="700 64px Manrope, sans-serif"; g.fillText(eur0(tt.netWorth), 112, py+80);
    const dl=(tt.delta>=0?"+":"")+eur0(tt.delta);
    g.textAlign="right"; g.fillStyle=tt.delta>=0?mint:coral; g.font="700 34px Manrope, sans-serif";
    g.fillText(tf("rp_delta",{x:dl}), W-108, py+95); g.textAlign="left";
    g.fillStyle=muted; g.font="600 26px Manrope, sans-serif"; g.fillText(t("rp_footer")+" · v"+CONFIG.APP_VERSION, 72, H-72);
    cv.toBlob(function(b){
      if(!b) return;
      const fname="mi-cartera-"+new Date().toISOString().slice(0,7)+".png";
      const file=new File([b], fname, {type:"image/png"});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file], title:"Mi Cartera"}).catch(function(){});
      } else {
        const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=fname; a.click();
        setTimeout(function(){ URL.revokeObjectURL(u); },1000);
      }
    },"image/png");
  }catch(e){ try{ alert("Informe: "+((e&&e.message)||e)); }catch(_){} }
}

/* ============================================================
   TOUR GUIADO (coach-marks) — para estrenarse sin saber de apps.
   Ilumina elementos REALES de la pantalla con un foco y una frase llana.
   Sale solo la primera vez (state.tourSeen=false) y desde Ajustes → Ver tutorial.
   ============================================================ */
function Tour({onDone}){
  // tour_8 (helpq): solo el «?» de la pestaña VISIBLE. Con lazy-mount, querySelector(".helpq")
  // pillaba uno de una página vecina fuera de pantalla → foco absurdo y tip inaccesible (2026-07-16).
  const steps=[
    {k:"tour_1", sel:function(){ return document.querySelector(".page-live .hero")||document.querySelector(".hero")||document.querySelector(".page-live")||document.querySelector(".page"); }},
    {k:"tour_2", sel:function(){ const tb=Array.prototype.slice.call(document.querySelectorAll(".tab[data-ti]")); return tb.find(function(b){ return b.textContent.trim()===t("tab_gastos"); })||null; }},
    {k:"tour_3", sel:function(){ const tb=Array.prototype.slice.call(document.querySelectorAll(".tab[data-ti]")); return tb.find(function(b){ return b.textContent.trim()===t("tab_fijos"); })||null; }},
    {k:"tour_6", sel:function(){ return document.querySelector(".tabbar"); }},
    {k:"tour_7", sel:function(){ const tb=Array.prototype.slice.call(document.querySelectorAll(".tab[data-ti]")); return tb.find(function(b){ return b.textContent.trim()===t("tab_patri"); })||null; }},
    {k:"tour_8", sel:function(){ return document.querySelector(".page-live .helpq")||document.querySelector(".page.page-live .helpq"); }},
    {k:"tour_4", sel:function(){ return document.querySelector(".topbar .icon-btn"); }},
    {k:"tour_5", sel:function(){ const b=document.querySelectorAll(".topbar .icon-btn"); return b[1]||b[0]||null; }},
  ];
  const [i,setI]=useState(0);
  const [rect,setRect]=useState(null);
  const inViewport=function(r){
    const H=window.innerHeight||700, W=window.innerWidth||400;
    return r.width>0 && r.height>0 && r.top<H-24 && r.bottom>24 && r.left<W-8 && r.right>8;
  };
  const bringIntoView=function(el){
    try{
      const bar=el.closest&&el.closest(".tabbar");
      if(bar){ const sb=bar.style.scrollBehavior; bar.style.scrollBehavior="auto"; bar.scrollLeft=Math.max(0, el.offsetLeft-(bar.clientWidth/2)+(el.clientWidth/2)); bar.style.scrollBehavior=sb; }
    }catch(_){}
    try{
      const page=el.closest&&el.closest(".page");
      if(page){
        const pr=page.getBoundingClientRect(), er=el.getBoundingClientRect();
        // scroll vertical de la página activa (el «?» suele estar más abajo)
        if(er.top<pr.top+40 || er.bottom>pr.bottom-40){
          page.scrollTop += (er.top - pr.top) - Math.min(120, pr.height*0.25);
        }
      } else if(typeof el.scrollIntoView==="function"){
        el.scrollIntoView({block:"center", inline:"nearest", behavior:"instant"});
      }
    }catch(_){}
  };
  const measure=function(idx){
    for(let j=idx;j<steps.length;j++){
      const el=steps[j].sel();
      if(!el) continue;
      bringIntoView(el);
      const r=el.getBoundingClientRect();
      if(inViewport(r)) return {j:j, r:{x:r.left,y:r.top,w:r.width,h:r.height}};
      // sin viewport usable → saltar este paso (no dejar al usuario atrapado)
    }
    return null;
  };
  useEffect(function(){
    let cancelled=false;
    // doble rAF: deja que el scroll del .page asiente antes de medir
    const run=function(){
      if(cancelled) return;
      const m=measure(i);
      if(!m){ onDone(); return; }
      if(m.j!==i){ setI(m.j); return; }
      setRect(m.r);
    };
    requestAnimationFrame(function(){ requestAnimationFrame(run); });
    const onR=function(){ const mm=measure(i); if(mm&&mm.j===i) setRect(mm.r); };
    window.addEventListener("resize",onR);
    return function(){ cancelled=true; window.removeEventListener("resize",onR); };
  },[i]);
  // Escape / toque fuera del tip = salir (airbag si algo raro)
  useEffect(function(){
    const onKey=function(e){ if(e.key==="Escape") onDone(); };
    window.addEventListener("keydown",onKey);
    return function(){ window.removeEventListener("keydown",onKey); };
  },[onDone]);
  if(!rect) return React.createElement("div",{className:"tour-wrap"},
    React.createElement("div",{className:"tour-tip",style:{bottom:80,left:16,right:16}},
      React.createElement("div",{className:"tour-txt"}, t("tour_skip")),
      React.createElement("button",{className:"btn btn-primary btn-block",onClick:onDone}, t("tour_done"))
    )
  );
  const pad=8;
  const H=window.innerHeight||700;
  const below = rect.y + rect.h/2 < H*0.55;
  // tip siempre DENTRO del viewport (el bug surrealista: tip fuera → no se puede pulsar)
  const tipStyle = below
    ? {top:Math.min(rect.y+rect.h+pad+12, H-180), left:16, right:16}
    : {bottom:Math.max(24, Math.min(H-rect.y+pad+12, H-180)), left:16, right:16};
  const last=i===steps.length-1;
  return React.createElement("div",{className:"tour-wrap"},
    React.createElement("div",{className:"tour-spot",style:{left:rect.x-pad,top:rect.y-pad,width:rect.w+pad*2,height:rect.h+pad*2}}),
    React.createElement("div",{className:"tour-tip",style:tipStyle},
      React.createElement("div",{className:"tour-txt"},tf(steps[i].k,{gastos:t("tab_gastos"),fijos:t("tab_fijos"),patri:t("tab_patri")})),
      React.createElement("div",{className:"tour-dots"}, steps.map(function(_,d){ return React.createElement("span",{key:d,className:"td"+(d===i?" on":"")}); })),
      React.createElement("div",{className:"tour-btns"},
        React.createElement("button",{className:"tour-skip",onClick:onDone},t("tour_skip")),
        React.createElement("button",{className:"btn btn-primary",style:{padding:"9px 20px"},onClick:function(){ if(last) onDone(); else setI(i+1); }}, last?t("tour_done"):t("tour_next"))
      )
    )
  );
}

function CollapsibleCard({title, sub, dot, defaultOpen, right, children, storageKey, help}){
  const [open,setOpen]=useState(()=>{
    if(storageKey){ const s=store.get("col_"+storageKey); if(s!=null) return s; }
    return defaultOpen!==false;
  });
  const toggle=()=>{ const n=!open; setOpen(n); if(storageKey) store.set("col_"+storageKey,n); };
  // Ocultar bloques en CUALQUIER pestaña (petición 2026-07-10, como los widgets del Resumen).
  // App publica en cada render __mcBlocksEdit (modo edición, se activa en Ajustes) y
  // __mcCardHidden (settings.cardHidden); el toggle viaja por evento porque esta tarjeta
  // no recibe set(). Oculta y fuera de edición → no se pinta; en edición → atenuada + botón.
  const blocksEdit=!!window.__mcBlocksEdit;
  const cardHidden=(storageKey && Array.isArray(window.__mcCardHidden) && window.__mcCardHidden.indexOf(storageKey)>=0);
  if(cardHidden && !blocksEdit) return null;
  const hideBtn=(blocksEdit && storageKey) ? React.createElement("button",{
    onClick:function(e){ e.stopPropagation(); try{ window.dispatchEvent(new CustomEvent("mc-card-toggle",{detail:storageKey})); }catch(_){} },
    style:{fontSize:11.5,fontWeight:700,padding:"4px 9px",borderRadius:9,cursor:"pointer",
      background:cardHidden?"var(--mint)":"var(--surface-2)",color:cardHidden?"#06120C":"var(--coral)",
      border:cardHidden?"none":"1px solid var(--coral)"}
  }, cardHidden?t("cc_show"):t("cc_hide")) : null;
  return React.createElement("div",{className:"card",style:cardHidden?{opacity:.45,borderStyle:"dashed"}:null},
    React.createElement("div",{className:"card-head",onClick:toggle},
      React.createElement("div",{className:"card-title"},
        dot && React.createElement("span",{className:"dot",style:{background:dot}}),
        React.createElement("div",null, title, sub && React.createElement("div",{className:"sub"},sub))
      ),
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
        hideBtn,
        help && React.createElement(HelpTip,{text:help}),
        right, React.createElement(I.chev,{className:"chev"+(open?" open":"")})
      )
    ),
    React.createElement("div",{className:"collapsible"+(open?" open":"")},
      React.createElement("div",null, React.createElement("div",{className:"card-body"},children))
    )
  );
}

function Sparkline({data, current}){
  const pts = data.concat(current!=null?[current]:[]);
  const w=320, h=70, pad=4;
  const min=Math.min.apply(null,pts), max=Math.max.apply(null,pts);
  const rng=(max-min)||1;
  const xs=(i)=> pad + (pts.length>1 ? i*(w-2*pad)/(pts.length-1) : 0);
  const ys=(v)=> pad + (1-(v-min)/rng)*(h-2*pad);
  let d="M"+xs(0)+" "+ys(pts[0]);
  for(let i=1;i<pts.length;i++) d+=" L"+xs(i)+" "+ys(pts[i]);
  const area=d+" L"+xs(pts.length-1)+" "+h+" L"+xs(0)+" "+h+" Z";
  const lastX=xs(pts.length-1), lastY=ys(pts[pts.length-1]);
  return React.createElement("svg",{className:"spark",viewBox:"0 0 "+w+" "+h,preserveAspectRatio:"none"},
    React.createElement("defs",null,
      React.createElement("linearGradient",{id:"sparkfill",x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0",stopColor:"#5FD08A",stopOpacity:"0.28"}),
        React.createElement("stop",{offset:"1",stopColor:"#5FD08A",stopOpacity:"0"})
      )
    ),
    React.createElement("path",{d:area,fill:"url(#sparkfill)"}),
    React.createElement("path",{d:d,fill:"none",stroke:"#5FD08A",strokeWidth:"2.4",strokeLinecap:"round",strokeLinejoin:"round",vectorEffect:"non-scaling-stroke"}),
    React.createElement("circle",{cx:lastX,cy:lastY,r:"3.5",fill:"#7DE8A8"})
  );
}

// Snapshot diario del total invertido (valor + coste opcional). Idempotente por día.
function recordInvSnapshot(hist, today, value, cost){
  const h=(hist||[]).slice();
  const pt={d:today,v:+value.toFixed(2)};
  if(cost!=null && cost>=0) pt.c=+cost.toFixed(2);
  if(h.length && h[h.length-1].d===today) h[h.length-1]=pt;
  else h.push(pt);
  if(h.length>400) h.splice(0,h.length-400);
  return h;
}
function invPeriodChange(hist){
  if(!hist || hist.length<2) return null;
  const a=hist[0], b=hist[hist.length-1];
  if(!(a.v>0)) return null;
  return {pct:(b.v-a.v)/a.v*100, abs:b.v-a.v, days:hist.length};
}

// Gráfico de evolución: valor (sólido) + coste aportado (discontinuo) si hay datos.
function SparklineInv({hist}){
  if(!hist || !hist.length) return null;
  const vals=hist.map(function(h){ return h.v; });
  const costPts=hist.map(function(h){ return h.c; });
  const hasCost=costPts.some(function(c){ return c!=null && c>0; });
  const w=320, h=82, pad=8;
  const all=hasCost ? vals.concat(costPts.filter(function(c){ return c!=null; })) : vals.slice();
  const min=Math.min.apply(null,all), max=Math.max.apply(null,all);
  const rng=(max-min)||1;
  const n=vals.length;
  const xs=function(i){ return pad + (n>1 ? i*(w-2*pad)/(n-1) : (w-2*pad)/2); };
  const ys=function(v){ return pad + (1-(v-min)/rng)*(h-2*pad); };
  let dVal="M"+xs(0)+" "+ys(vals[0]);
  for(let i=1;i<n;i++) dVal+=" L"+xs(i)+" "+ys(vals[i]);
  const area=dVal+" L"+xs(n-1)+" "+h+" L"+xs(0)+" "+h+" Z";
  let dCost=null;
  if(hasCost){
    let started=false;
    for(let i=0;i<n;i++){
      if(costPts[i]==null) continue;
      const seg=(started?" L":"M")+xs(i)+" "+ys(costPts[i]);
      dCost=(dCost||"")+seg; started=true;
    }
  }
  const lastX=xs(n-1), lastY=ys(vals[n-1]);
  return React.createElement("svg",{className:"spark",viewBox:"0 0 "+w+" "+h,preserveAspectRatio:"none",style:{height:82}},
    React.createElement("defs",null,
      React.createElement("linearGradient",{id:"invsparkfill",x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0",stopColor:"#5FD08A",stopOpacity:"0.22"}),
        React.createElement("stop",{offset:"1",stopColor:"#5FD08A",stopOpacity:"0"})
      )
    ),
    React.createElement("path",{d:area,fill:"url(#invsparkfill)"}),
    dCost && React.createElement("path",{d:dCost,fill:"none",stroke:"#7FB5E8",strokeWidth:"1.8",strokeDasharray:"5 4",strokeLinecap:"round",vectorEffect:"non-scaling-stroke",opacity:0.85}),
    React.createElement("path",{d:dVal,fill:"none",stroke:"#5FD08A",strokeWidth:"2.4",strokeLinecap:"round",strokeLinejoin:"round",vectorEffect:"non-scaling-stroke"}),
    React.createElement("circle",{cx:lastX,cy:lastY,r:"3.5",fill:"#7DE8A8"})
  );
}

function StackedBar({segments}){
  const total=segments.reduce((a,s)=>a+s.value,0)||1;
  return React.createElement("div",null,
    React.createElement("div",{className:"stack"},
      segments.map((s,i)=>React.createElement("span",{key:i,style:{width:Math.max(2,(s.value/total)*100)+"%",background:s.color}}))
    ),
    React.createElement("div",{className:"stack-legend"},
      segments.map((s,i)=>React.createElement("div",{key:i,className:"sl-item"},
        React.createElement("span",{className:"sw",style:{background:s.color}}),
        React.createElement("span",{className:"nm"},s.label),
        React.createElement("span",{className:"vl num"},eur0(s.value))
      ))
    )
  );
}

function Ring({ratio, spent, budget}){
  const r=54, c=2*Math.PI*r, clamped=Math.min(ratio,1);
  const col = ratio>1 ? "#E2705F" : ratio>=0.7 ? "#E6C36A" : "#5FD08A";
  return React.createElement("div",{className:"ring-wrap"},
    React.createElement("div",{className:"ring"},
      React.createElement("svg",{width:"124",height:"124",viewBox:"0 0 124 124"},
        React.createElement("circle",{cx:"62",cy:"62",r:r,fill:"none",stroke:"#16291E",strokeWidth:"11"}),
        React.createElement("circle",{cx:"62",cy:"62",r:r,fill:"none",stroke:col,strokeWidth:"11",strokeLinecap:"round",strokeDasharray:c,strokeDashoffset:c*(1-clamped),style:{transition:"stroke-dashoffset .6s ease"}})
      ),
      React.createElement("div",{className:"ring-center"},
        React.createElement("div",{className:"big num",style:{color:col}},Math.round(ratio*100)+"%"),
        React.createElement("div",{className:"small"},"del límite")
      )
    ),
    React.createElement("div",{className:"ring-foot"},
      React.createElement("span",{className:"num",style:{fontWeight:700}},eur0(spent)),
      React.createElement("span",{className:"muted num"},"de "+eur0(budget))
    )
  );
}

function MiniPie({slices}){
  const total=slices.reduce((a,s)=>a+s.value,0)||1;
  let acc=0; const r=42,cx=48,cy=48;
  const arcs=slices.map((s,i)=>{
    const frac=s.value/total, a0=acc*2*Math.PI-Math.PI/2; acc+=frac; const a1=acc*2*Math.PI-Math.PI/2;
    const large=frac>0.5?1:0;
    const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    return React.createElement("path",{key:i,d:"M"+cx+" "+cy+" L"+x0+" "+y0+" A"+r+" "+r+" 0 "+large+" 1 "+x1+" "+y1+" Z",fill:s.color,stroke:"#0E1A14",strokeWidth:"1.5"});
  });
  return React.createElement("svg",{width:"96",height:"96",viewBox:"0 0 96 96"},arcs,React.createElement("circle",{cx:cx,cy:cy,r:"20",fill:"#0E1A14"}));
}

/* ---- Cierre de overlays con el gesto/botón "atrás" del móvil (History API) ----
   Sin esto, el gesto de retroceso hace history.back() y, al no haber una entrada
   propia, SALE de la PWA. Metemos una entrada de historial por cada overlay abierto
   y, al retroceder, cerramos SOLO el de arriba (pila LIFO), no todos a la vez. */
var _mcBackStack=[];        // overlays abiertos, en orden de apertura
var _mcIgnorePop=false;     // true mientras consumimos nuestra propia entrada (cierre por UI)
var _mcBackInit=false;
function _mcBackInitOnce(){
  if(_mcBackInit) return; _mcBackInit=true;
  window.addEventListener("popstate", function(){
    if(_mcIgnorePop){ _mcIgnorePop=false; return; }   // fue nuestro history.back() de cierre por UI
    var top=_mcBackStack.pop();
    if(top){ top._byPop=true; top.close(); }           // cierra el overlay superior
  });
}
function useBackClose(open, onClose){
  const entry=useRef(null);
  useEffect(function(){
    _mcBackInitOnce();
    if(!open) return undefined;
    const e={ close:onClose, _byPop:false };
    entry.current=e;
    _mcBackStack.push(e);
    try{ history.pushState({mcOverlay:true}, ""); }catch(err){}
    return function(){
      const i=_mcBackStack.indexOf(e);
      if(i>=0) _mcBackStack.splice(i,1);
      if(!e._byPop){                                    // cerrado por UI (botón/swipe), no por gesto atrás:
        _mcIgnorePop=true;                              // consumimos nuestra entrada sin cerrar otro overlay
        try{ history.back(); }catch(err){ _mcIgnorePop=false; }
      }
    };
  },[open]);
}

/* lista editable genérica; valFmt recibe el item entero */
function useEditable(items, onChange, opts){
  opts = opts || {};
  const disp     = opts.display  || (i=>i.value);                  // qué número se muestra al editar
  const toStored = opts.toStored || ((i,typed)=>typed);            // cómo se guarda lo tecleado
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState({});
  const start=()=>{ const d={}; items.forEach(i=>d[i.id]=disp(i)); setDraft(d); setEditing(true); };
  // un item SIN borrador (añadido en pleno modo edición, p.ej. cuenta OB promocionada) se deja
  // tal cual: antes parseFloat(undefined)→0 machacaba su valor al pulsar Guardar.
  const save=()=>{ onChange(items.map(i=>{ if(draft[i.id]==null) return i; const typed=parseFloat(String(draft[i.id]).replace(',','.'))||0; const extra=opts.extra?opts.extra(i,typed):null; return Object.assign({},i,{value: toStored(i,typed) }, extra||{}); })); setEditing(false); };
  return { editing, start, save, draft, setDraft };
}

/* Secciones ordenables por pestaña (petición 2026-07-11): como el orden de widgets del Resumen,
   pero para las tarjetas de Fijos/Patrimonio/Deudas/Inversiones/Metas. El orden se guarda en
   settings.secOrder[tab]; onMove opcional para pestañas cuyo orden vive en los propios datos
   (deudas, metas → se reordena el array del estado y sincroniza igual que todo lo demás). */
function secOrderOf(s, tab, allIds){
  const saved=((((s&&s.settings)||{}).secOrder||{})[tab]||[]).filter(function(id){ return allIds.indexOf(id)>=0; });
  return saved.concat(allIds.filter(function(id){ return saved.indexOf(id)<0; }));
}
function OrderableSections({tab, state, set, items, onMove}){
  const [ordering,setOrdering]=useState(false);
  const real=(items||[]).filter(function(i){ return i && i.el; });
  const allIds=real.map(function(i){ return i.id; });
  const order=onMove?allIds:secOrderOf(state,tab,allIds);
  const map={}; real.forEach(function(i){ map[i.id]=i; });
  const move=function(id,dir){
    if(onMove) return onMove(id,dir);
    set(function(s){
      const o=secOrderOf(s,tab,allIds); const i=o.indexOf(id), j=i+dir;
      if(i<0||j<0||j>=o.length) return s;
      const n=o.slice(); n[i]=o[j]; n[j]=id;
      return Object.assign({},s,{settings:Object.assign({},s.settings,{secOrder:Object.assign({},((s.settings||{}).secOrder)||{},{[tab]:n})})});
    });
  };
  return React.createElement(React.Fragment,null,
    order.map(function(id,idx){
      const it=map[id]; if(!it) return null;
      if(!ordering) return React.createElement(React.Fragment,{key:id},it.el);
      return React.createElement("div",{key:id,className:"wedit"},
        React.createElement("div",{className:"wedit-bar"},
          React.createElement("span",{className:"wedit-lbl"},it.label),
          React.createElement("div",{className:"wedit-btns"},
            React.createElement("button",{disabled:idx===0,onClick:function(){ move(id,-1); }},"↑"),
            React.createElement("button",{disabled:idx===order.length-1,onClick:function(){ move(id,1); }},"↓"))),
        React.createElement("div",{className:"wedit-body"},it.el)
      );
    }),
    real.length>1 && React.createElement("button",{
      className:"btn btn-ghost btn-block",
      style:ordering?{marginTop:10}:{marginTop:10,fontSize:12.5,color:"var(--muted-2)",border:"none",background:"none"},
      onClick:function(){ setOrdering(!ordering); }
    }, ordering?("✓ "+t("done")):t("sec_order"))
  );
}

