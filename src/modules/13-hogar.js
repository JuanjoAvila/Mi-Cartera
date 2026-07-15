/* ============================================================
   HOGAR — vista fusionada por snapshots (Fase 1)
   Cada miembro publica SU patrimonio; el hogar suma sin escribir en app_state ajeno.
   ============================================================ */

function mcInviteCode(){
  const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s=""; for(let i=0;i<6;i++) s+=c[Math.floor(Math.random()*c.length)];
  return s;
}

function buildHouseholdSnapshot(state, totals, email){
  const accounts=(state.accounts||[]).map(function(a){
    const ent=entOf(a.ent);
    const val=(totals.bankBal&&totals.bankBal[a.ent]!=null)?totals.bankBal[a.ent]:(a.value||0);
    return { name:a.name||ent.label, ent:a.ent, label:ent.label, value:+Number(val).toFixed(2) };
  });
  return {
    displayName:(email&&email.split("@")[0])||"Usuario",
    netWorth:+Number(totals.netWorth||0).toFixed(2),
    activos:+Number(totals.activos||0).toFixed(2),
    debtTotal:+Number(totals.debtTotal||0).toFixed(2),
    invested:+Number(totals.invested||0).toFixed(2),
    liquid:+Number((totals.liquid)||0).toFixed(2),
    thisMonthSpent:+Number(totals.thisMonthSpent||0).toFixed(2),
    budget:state.budget||0,
    accounts:accounts,
    appVersion:CONFIG.APP_VERSION,
    publishedAt:new Date().toISOString(),
  };
}

function mergeHouseholdSnapshots(snaps){
  const list=(snaps||[]).filter(function(s){ return s&&s.payload; });
  let net=0, activos=0, debts=0, invested=0, spent=0;
  const byMember=[];
  list.forEach(function(row){
    const p=row.payload||{};
    net+=Number(p.netWorth)||0;
    activos+=Number(p.activos)||0;
    debts+=Number(p.debtTotal)||0;
    invested+=Number(p.invested)||0;
    spent+=Number(p.thisMonthSpent)||0;
    byMember.push({
      userId:row.user_id,
      name:p.displayName||"?",
      netWorth:Number(p.netWorth)||0,
      accounts:p.accounts||[],
      publishedAt:row.published_at||p.publishedAt,
    });
  });
  return {
    netWorth:+net.toFixed(2),
    activos:+activos.toFixed(2),
    debtTotal:+debts.toFixed(2),
    invested:+invested.toFixed(2),
    thisMonthSpent:+spent.toFixed(2),
    members:byMember,
  };
}

function HogarSection({state, totals, uid, showToast, meEmail}){
  const [hh,setHh]=useState(null);
  const [snaps,setSnaps]=useState([]);
  const [busy,setBusy]=useState(false);
  const [joinCode,setJoinCode]=useState("");
  const [createName,setCreateName]=useState("");
  const [mode,setMode]=useState(null);

  const reload=function(){
    if(!cloud.enabled()||!uid) return Promise.resolve();
    setBusy(true);
    return cloud.fetchHouseholdBundle().then(function(b){
      setHh(b.household); setSnaps(b.snapshots||[]);
    }).catch(function(e){
      showToast("✕ "+((e&&e.message)||e));
    }).finally(function(){ setBusy(false); });
  };

  useEffect(function(){ reload(); },[uid]);

  const merged=useMemo(function(){ return mergeHouseholdSnapshots(snaps); },[snaps]);

  const publish=function(){
    if(!hh) return;
    setBusy(true);
    const payload=buildHouseholdSnapshot(state, totals, meEmail);
    cloud.publishHouseholdSnapshot(hh.id, payload).then(function(){
      showToast(t("hh_pub_ok"));
      return reload();
    }).catch(function(e){ showToast("✕ "+((e&&e.message)||e)); }).finally(function(){ setBusy(false); });
  };

  const doCreate=function(){
    const nm=(createName||"").trim()||t("hh_default_name");
    setBusy(true);
    cloud.createHousehold(nm, mcInviteCode()).then(function(){
      showToast(t("hh_created"));
      setMode(null);
      return reload();
    }).catch(function(e){ showToast("✕ "+((e&&e.message)||e)); }).finally(function(){ setBusy(false); });
  };

  const doJoin=function(){
    const code=(joinCode||"").trim();
    if(code.length<4){ showToast(t("hh_code_short")); return; }
    setBusy(true);
    cloud.joinHousehold(code).then(function(){
      showToast(t("hh_joined"));
      setMode(null); setJoinCode("");
      return reload();
    }).catch(function(e){
      const m=(e&&e.message)||String(e);
      showToast(m.indexOf("invalid")>=0?t("hh_code_bad"):("✕ "+m));
    }).finally(function(){ setBusy(false); });
  };

  const doLeave=function(){
    if(!hh) return;
    askConfirm({ title:t("hh_leave_q"), sub:t("hh_leave_sub"), ok:t("hh_leave_ok"), danger:true }).then(function(yes){
      if(!yes) return;
      setBusy(true);
      cloud.leaveHousehold(hh.id).then(function(){
        showToast(t("hh_left"));
        setHh(null); setSnaps([]);
      }).catch(function(e){ showToast("✕ "+((e&&e.message)||e)); }).finally(function(){ setBusy(false); });
    });
  };

  if(!cloud.enabled()){
    return React.createElement("div",{className:"card",style:{padding:"14px 16px",marginBottom:14}},
      React.createElement("div",{className:"gm-sec-h"},"🏠 "+t("hh_title")),
      React.createElement("div",{className:"hint"}, t("hh_need_cloud"))
    );
  }
  if(!uid){
    return React.createElement("div",{className:"card",style:{padding:"14px 16px",marginBottom:14}},
      React.createElement("div",{className:"gm-sec-h"},"🏠 "+t("hh_title")),
      React.createElement("div",{className:"hint"}, t("hh_need_login"))
    );
  }

  if(!hh){
    return React.createElement("div",{className:"card",style:{padding:"14px 16px",marginBottom:14}},
      React.createElement("div",{className:"gm-sec-h"},"🏠 "+t("hh_title")),
      React.createElement("div",{className:"hint",style:{marginBottom:10}}, t("hh_intro")),
      mode!=="create" && mode!=="join" && React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        React.createElement("button",{className:"btn btn-primary btn-block",onClick:function(){ setMode("create"); }}, t("hh_create")),
        React.createElement("button",{className:"btn btn-ghost btn-block",onClick:function(){ setMode("join"); }}, t("hh_join"))
      ),
      mode==="create" && React.createElement("div",{style:{marginTop:8}},
        React.createElement("input",{className:"af-in",placeholder:t("hh_name_ph"),value:createName,onChange:function(e){ setCreateName(e.target.value); }}),
        React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:8},onClick:doCreate,disabled:busy}, t("hh_create_go")),
        React.createElement("button",{className:"btn btn-ghost btn-block",onClick:function(){ setMode(null); }}, t("sh_cancel"))
      ),
      mode==="join" && React.createElement("div",{style:{marginTop:8}},
        React.createElement("input",{className:"af-in",placeholder:t("hh_code_ph"),value:joinCode,onChange:function(e){ setJoinCode(e.target.value.toUpperCase()); },style:{letterSpacing:"0.15em",fontWeight:700}}),
        React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:8},onClick:doJoin,disabled:busy}, t("hh_join_go")),
        React.createElement("button",{className:"btn btn-ghost btn-block",onClick:function(){ setMode(null); }}, t("sh_cancel"))
      )
    );
  }

  return React.createElement("div",{className:"card",style:{padding:"14px 16px",marginBottom:14}},
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}},
      React.createElement("div",null,
        React.createElement("div",{className:"gm-sec-h"},"🏠 "+hh.name),
        React.createElement("div",{className:"hint"}, tf("hh_code_show",{c:hh.invite_code}))),
      React.createElement("button",{className:"btn btn-ghost",style:{flex:"0 0 auto",fontSize:12},onClick:doLeave}, t("hh_leave"))
    ),
    React.createElement("div",{className:"total-bar",style:{marginTop:12,marginBottom:0}},
      React.createElement("div",null,
        React.createElement("div",{className:"tl"}, t("hh_fused_net")),
        React.createElement("div",{className:"tn num"}, eur(merged.netWorth)),
        React.createElement("div",{className:"hint"}, tf("hh_members_n",{n:merged.members.length}))
      )
    ),
    merged.members.map(function(m,i){
      return React.createElement("div",{key:m.userId||i,style:{marginTop:12,paddingTop:12,borderTop:"1px solid var(--line-soft)"}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("span",{style:{fontWeight:700}}, m.name),
          React.createElement("span",{className:"num",style:{fontWeight:700}}, eur(m.netWorth))),
        (m.accounts||[]).slice(0,6).map(function(a,j){
          return React.createElement("div",{key:j,className:"liqrow",style:{fontSize:12.5,marginTop:4}},
            React.createElement("span",{className:"muted"}, (a.label||a.name)),
            React.createElement("span",{className:"num"}, eur0(a.value)));
        }),
        m.publishedAt && React.createElement("div",{className:"hint",style:{fontSize:11,marginTop:4}},
          t("hh_updated")+" "+new Date(m.publishedAt).toLocaleString())
      );
    }),
    React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:14},onClick:publish,disabled:busy},
      busy?t("hh_pub_busy"):t("hh_publish")),
    React.createElement("div",{className:"hint",style:{marginTop:8}}, t("hh_pub_hint"))
  );
}

function MonthReportPrompt({state, totals, onClose, showToast}){
  return React.createElement("div",{className:"tabsheet-back",onClick:onClose},
    React.createElement("div",{className:"tabsheet",onClick:function(e){ e.stopPropagation(); },style:{maxWidth:400}},
      React.createElement("div",{className:"ts-title"},"📊 "+t("mr_title")),
      React.createElement("div",{className:"ts-hint"}, t("mr_sub")),
      React.createElement("div",{className:"card",style:{padding:14,marginTop:10}},
        React.createElement("div",{className:"hint"}, monthLong(new Date().getMonth())+" "+new Date().getFullYear()),
        React.createElement("div",{className:"num",style:{fontSize:28,fontWeight:800,marginTop:6}}, eur0(totals.thisMonthSpent)),
        React.createElement("div",{className:"hint"}, t("rp_spent")),
        (state.budget||0)>0 && React.createElement("div",{style:{marginTop:8,fontSize:13}},
          tf("rp_of_budget",{b:eur0(state.budget||0),p:Math.round(Math.min(100,(totals.thisMonthSpent/(state.budget||1))*100))})),
        React.createElement("div",{style:{marginTop:10,fontSize:13}},
          t("rp_networth")+": ", React.createElement("span",{className:"num",style:{fontWeight:700}}, eur0(totals.netWorth)))
      ),
      React.createElement("button",{className:"btn btn-primary btn-block",style:{marginTop:12},onClick:function(){
        shareMonthReport(state, totals);
        showToast(t("mr_shared"));
        onClose();
      }}, t("mr_share")),
      React.createElement("button",{className:"btn btn-ghost btn-block",onClick:onClose}, t("mr_later"))
    )
  );
}
