function eurParts(n){ const s=NF.format(Math.abs((n||0)*DISP.k)); const p=s.split(','); return {sign:n<0?"-":"", ent:p[0], dec:p[1], sym:DISP.sym}; }
/* ============================================================
   i18n — idiomas (ES/EN/CA). t(clave) traduce; si falta, cae al español.
   Fase 1: navegación, Ajustes y onboarding. El resto se irá traduciendo.
   ============================================================ */
let CURLANG = "es";
const LANGS = [["es","Español"],["en","English"],["ca","Català"]];
const LANG = {
  es:{
    tab_dash:"Inicio", tab_gastos:"Gastos", tab_plan:"Plan", tab_cartera:"Cartera", tab_fijos:"Fijos", tab_inv:"Inversiones", tab_patri:"Patrimonio", tab_debt:"Deudas", tab_compartido:"Compartido",
    tab_metas:"Metas", tab_logros:"Logros",
    v4_hola:"Hola, {n}", v4_hola_anon:"Hola",
    v4_money_total:"Tu dinero en total", v4_this_month:"este mes", v4_of_month:"del mes",
    v4_budget_spent:"Has gastado {spent} de tus {budget}.", v4_budget_daily:"Puedes gastar {x}/día hasta fin de mes.",
    v4_streak:"{n} meses sin pasarte", v4_see_gastos:"Ver gastos ›", v4_see_plan:"Ver plan ›",
    v4_upcoming:"Próximos cargos", v4_upcoming_empty:"Nada pendiente este mes. Los recibos aparecen aquí.",
    v4_your_goals:"Tus metas", v4_recent:"Últimos movimientos", v4_recent_empty:"Aún no hay movimientos. Apunta el primero con +.",
    v4_all:"Todos ›", v4_plan_title:"Tu plan del mes", v4_plan_recibos:"Recibos", v4_plan_deudas:"Deudas", v4_plan_metas:"Metas",
    v4_plan_left:"Queda por pagar en {month}", v4_plan_liq:"A fin de mes te quedarán {amount} en {bank}",
    v4_pendiente:"Pendiente", v4_ya_pagado:"Ya pagado", v4_gestionar:"Gestionar",
    v4_ver_mas:"Ver más · {n}", v4_ver_menos:"Ver menos",
    v4_gastos_title:"Tus gastos", v4_gastos_spent_in:"Gastado en {month}", v4_gastos_net_in:"Balance en {month}", v4_gastos_of:"de {x}", v4_gastos_left:"quedan {x}", v4_gastos_today_mark:"hoy · día {d}", v4_period_more:"Más…",
    v4_gastos_inc_line:"Ingresos {x} · balance {bal}", v4_gastos_split_line:"Gastos {spent} · ingresos {income}",
    v4_cartera_title:"Tu cartera", v4_cuentas:"Tus cuentas", v4_inversiones:"Tus inversiones", v4_inv_positions:"{n} posiciones",
    v4_inv_tools:"Herramientas de inversión", v4_inv_tools_h:"Precios, redondeo, proyección y edición manual — lo que antes llenaba Cartera.",
    v4_sync_banks:"Sincronizar bancos", v4_sync_banks_done:"✓ Bancos sincronizados",
    v4_sync_brokers_ok:"📈 Brókers al día (TR/MyInvestor)", v4_sync_broker_exp:"⚠ {b}: sesión caducada · reconecta en Ajustes → Bancos",
    ap_bank:"Banco", ap_bank_none:"Sin banco",
    bk_issue:"⚠ {bank} necesita tu permiso otra vez", bk_issue_sub:"El permiso de lectura caducó (obligatorio cada ~3 meses): el saldo puede estar desfasado. Un toque y listo.",
    bk_issue_cta:"🔓 Reconectar {bank}", bk_tr_dead:"⚠ Trade Republic está desconectado",
    bk_tr_sub:"Su sesión caducó: las posiciones y el efectivo no se actualizan. Se reconecta aquí, en la app (PIN + código SMS) — no en la app de Trade Republic.",
    bk_tr_cta:"🔓 Reconectar Trade Republic",
    v4_acc_locked:"El saldo de las cuentas conectadas lo trae el banco solo; el nombre y el rol sí puedes cambiarlos.",
    v4_sel_partial:"Seleccionado", v4_edit_goods:"Editar bienes",
    v4_gestionar_h:"Edita fijos, cuotas, flujos y conciliación del banco — sin llenar la vista diaria.",
    v4_debts_foot_a:"Deudas", v4_debts_foot_b:"ya descontadas",
    v4_apuntar:"Apuntar", v4_gasto:"Gasto", v4_ingreso:"Ingreso", v4_apuntar_ph:"¿En qué? (ej. Cena)",
    v4_apuntar_need:"Pon un importe 🙂", v4_apuntar_ok:"✓ Gasto apuntado", v4_apuntar_ok_in:"✓ Ingreso apuntado",
    v4_save_gasto:"Guardar gasto", v4_save_in:"Guardar ingreso", v4_back:"Volver",
    v4_debts_hero:"Debes en total", v4_debts_sub:"{x}/mes en cuotas · bajando cada mes 📉",
    v4_debts_ends:"acabas en {d}", v4_debts_ends_est:"a este ritmo acabas ~{d}", v4_amort_now:"💸 Amortizar ahora",
    v4_debt_party_1:"🎉 {name}: ¡ÚLTIMA cuota este mes ({x})!", v4_debt_party_sub:"Después, {x}/mes libres para ti.",
    v4_goals_hero:"Ahorrado en metas", v4_goal_new:"+ Nueva meta de ahorro",
    v4_paid_group:"{names} · {n} recibos",
    v4_roundup_card:"El redondeo de tus compras invirtió {x} este mes sin que hicieras nada.",
    v4_ob_skip:"Saltar", v4_ob_title1:"Tu dinero, por fin claro.",
    v4_ob_sub1:"Gastos, recibos y patrimonio en un sitio. Sin jerga y sin hojas de cálculo.",
    v4_ob_title2:"Los gastos se apuntan solos.",
    v4_ob_sub2:"Conecta el banco o Trade Republic y entran solos. También puedes apuntar con + en un toque.",
    v4_ob_demo1:"Mercadona", v4_ob_demo2:"Café",
    v4_ob_start:"Empezar con {x} €/mes",
    v4_set_profile_sync:"sincronizado ✓", v4_set_profile_local:"en este móvil",
    v4_set_appear:"Apariencia", v4_set_easy:"Para empezar fácil", v4_set_conn:"Conexiones",
    v4_set_money:"Dinero", v4_set_app:"App",
    v4_set_tour:"Ver el tutorial", v4_set_adv:"Avanzado",
    v4_moved_cat:"Movido a {cat}", v4_exp_auto:"entró solo", v4_exp_manual:"a mano",
    v4_exp_del:"Borrar", v4_exp_del_q:"¿Borrar «{name}»?", v4_exp_del_sub:"Esto no se puede deshacer.",
    v4_exp_amount:"Importe", v4_exp_merchant_ph:"Comercio o concepto",
    v4_exp_cat:"Categoría", v4_exp_type:"Tipo",
    v4_exp_with_card:"Pagado con tarjeta", v4_exp_not_card:"Bizum o transferencia",
    v4_budget_sheet:"Tu presupuesto del mes", v4_budget_sheet_h:"Solo el día a día: súper, bares, caprichos. Los recibos van aparte.",
    st_mode_hint:"Sencillo deja Inicio, Gastos, Plan (solo recibos) y Cartera. Ideal para empezar.",
    brand_sub:"tus finanzas, claras",
    settings:"Ajustes", language:"Idioma", theme:"Tema de color", currency:"Moneda de visualización",
    budget_month:"Presupuesto mensual (€)", save:"Guardar", backup:"Copia de seguridad",
    do_export:"⬇️ Exportar datos (JSON)", do_import:"⬆️ Importar datos (JSON)",
    eb_title:"Algo se ha torcido", eb_msg:"La app ha tenido un error al dibujar. Tus datos están a salvo. Descarga una copia por si acaso y recarga.", eb_export:"⬇️ Descargar copia de seguridad", eb_reload:"🔄 Recargar la app",
    off_pill:"📴 Sin conexión · se guarda y sincroniza al volver",
    upd_ready:"✨ Nueva versión · toca para actualizar",
    upd_downloading:"⬇️ Descargando versión nueva…",
    upd_notif:"Hay una actualización (v{v}) lista. Toca para instalarla.",
    upd_notif_web:"Hay una versión nueva de la app. Toca el botón de arriba para actualizar.",
    upd_notif_apk:"Hay una app nueva (v{v}). Toca el botón de arriba para instalarla.",
    apk_ready:"⬇️ App {v} lista · toca para instalar", apk_downloading:"Descargando la actualización… se abrirá el instalador", apk_perm:"Permite «instalar apps desconocidas» a Mi Cartera y vuelve a tocar el botón",
    ob_signup:"Crear cuenta nueva",
    st_custom:"Personalización", st_notifs:"Notificaciones", st_simple_lbl:"Modo sencillo",
    st_g_general:"General", st_search_ph:"🔍 Buscar en ajustes…", st_search_none:"Nada con ese nombre. Prueba con «tema», «banco», «copia»…",
    st_blocks:"Ocultar bloques de las pestañas", st_blocks_hint:"Con esto activado, cada bloque de cualquier pestaña muestra un botón «Ocultar». Los ocultos se quedan atenuados mientras editas; al desactivarlo desaparecen del todo (y aquí los recuperas).",
    cc_hide:"Ocultar", cc_show:"Mostrar",
    st_updates:"Actualizaciones", st_update:"Buscar actualización",
    st_up_ok:"✓ Estás a la última", st_up_web:"Hay versión web nueva: se instala sola — cierra y abre la app para estrenarla", st_up_applying:"⬇️ Actualizando a la v{v}… la app se recarga sola en unos segundos", st_up_apk:"⬇️ App {v} disponible · descargando, se abrirá el instalador",
    st_widget_hint:"📱 Widget: mantén pulsado el escritorio → Widgets → Mi Cartera. Verás el gasto del mes y lo que te queda.",
    st_news:"Novedades", st_news_row:"Historial de novedades",
    st_feedback:"Enviar sugerencia o error", st_shared:"Hogar y gastos compartidos",
    st_account:"Tu cuenta", st_privacy:"Privacidad y datos", st_delete_acc:"Borrar mi cuenta",
    st_delete_acc_sub:"Se borrarán todos tus datos en la nube (gastos, cuentas, inversiones…). No se puede deshacer.",
    st_delete_acc_ok:"Sí, borrar todo", st_delete_acc_pwd:"Confirma con tu contraseña",
    st_delete_acc_pwd_sub:"Por seguridad, escribe la contraseña de tu cuenta de Mi Cartera.",
    st_delete_acc_done:"✓ Cuenta borrada · datos eliminados",
    st_sync_conflict:"⚠ Otro dispositivo guardó cambios antes: se ha recargado la versión de la nube",
    wn_title:"Novedades", wn_sub:"Qué ha cambiado en cada versión. Toca una versión para ver su detalle.", wn_current:"tu versión",
    wn_fb_title:"💬 ¿Algo que contar?", wn_fb_hint:"Sugerencias, errores o cosas raras: quedan apuntadas aquí abajo y le llegan a Juanjo con tu versión, para que no se olviden.",
    wn_fb_ph:"Escribe la sugerencia o el error que has visto…", wn_fb_send:"Enviar", wn_fb_sent:"✓ Apuntado y enviado", wn_fb_offline:"✓ Apuntado en tus notas (no se pudo enviar; se queda guardado)",
    wn_yours:"Tus apuntes", wn_close:"¡Entendido!",
    st_trnotif:"Avisar de cada gasto apuntado (TR)", st_trnotif_hint:"Si lo apagas, Mi Cartera deja de confirmar cada gasto con una notificación (Trade Republic ya te avisa del cargo). Los avisos de presupuesto siguen llegando.",
    st_tring:"Apuntar aquí mis gastos de Trade Republic", st_tring_hint:"Al activarlo, esta app lee las notificaciones de gasto de Trade Republic de ESTE móvil y las apunta en TU cuenta (no en la de nadie más). Cada persona lo activa en su propio teléfono. Solo lee la notificación; nunca entra en tu banco. Puedes apagarlo cuando quieras.", st_tring_on:"✓ Listo · tus compras con la tarjeta de Trade Republic entrarán solas en esta cuenta", st_tring_off:"Apuntado de Trade Republic desactivado",
    st_banksync_notif:"Al detectar aviso del banco, sincronizar movimientos", st_banksync_notif_hint:"Si Caixa, Sabadell u otro banco te manda una notificación, la app pide los movimientos por Open Banking (no lee el importe de la noti). Como máximo una sync cada 2 minutos.",
    st_aicat:"Sugerir categoría (IA) en «Otros»", st_aicat_hint:"En Gastos, si un comercio queda en Otros, puedes pedir sugerencia. Primero usa palabras clave; si hay OPENAI_API_KEY en Supabase, la IA solo actúa en esos casos. No se envía el importe.",
    st_sentry:"Sentry (errores en prod)", st_sentry_test:"Enviar error de prueba", st_sentry_sent:"✓ Enviado a Sentry (mira Issues en unos segundos)", st_sentry_hint:"Solo tú ves este bloque (admin). Sirve para comprobar que los crashes llegan a Sentry; el resto de usuarios no lo ve.",
    bp_empty_hint:"Aquí se conectan tus bancos de verdad (Open Banking): el saldo y los movimientos entran solos. Las cuentas con saldo apuntado a mano viven en Patrimonio — conectar el banco es opcional y puedes hacerlo cuando quieras.",
    th_green:"Verde", th_dark:"Oscuro", th_light:"Claro", th_blue:"Azul", cur_eur:"€ Euro", cur_usd:"$ Dólar", cur_gbp:"£ Libra", cur_chf:"CHF Franco suizo",
    rp_saved:"✓ Informe guardado en Descargas (busca «mi-cartera-…png»)",
    rp_saved_notif:"📊 Informe del mes guardado en Descargas: {f}. Ábrelo desde tu app de Archivos o la galería.",
    ob_welcome:"Bienvenido/a 👋",
    ob_intro:"Vamos a montar tu cartera en 1 minuto. Empieza por tus cuentas y el presupuesto; las inversiones, deudas y gastos fijos los añades luego en sus pestañas.",
    ob_budget:"Presupuesto mensual para gastos (€)", ob_accounts:"Tus cuentas (banco y saldo actual)",
    ob_addacc:"+ Añadir cuenta", ob_start:"Empezar a usar Mi Cartera", ob_start_empty:"Empezar (añadiré cuentas luego)",
    ob_haveacc:"Ya tengo cuenta · Iniciar sesión",
    ob_returning:"¿Reinstalaste la app o cambiaste de móvil? Inicia sesión y recuperas todos tus datos al instante.",
    ob_foot:"Podrás editar y añadir todo cuando quieras. Inicia sesión para sincronizar entre dispositivos y recuperar tus datos.",
    ob_name_ph:"Nombre (opcional, ej. Cuenta corriente)", ob_balance_ph:"Saldo €",
    // v4.6 — aportar a metas con banco + teclado propio
    gl_contribute_title:"Aportar a {name}", gl_contribute_from:"¿De qué banco sale?", gl_contribute_save:"Aportar {x}", gl_contribute_need:"Pon un importe 🙂",
    // Accesibilidad
    v4_set_a11y:"Accesibilidad",
    st_textsize:"Tamaño de letra", st_textsize_hint:"Agranda toda la app. Si algo se descuadra en «Enorme», dímelo y lo ajusto.",
    ts_normal:"Normal", ts_big:"Grande", ts_huge:"Enorme",
    st_reduce_motion:"Reducir animaciones", st_reduce_motion_hint:"Quita deslizamientos y rebotes: la app va más sobria y directa. Útil si mareas.",
    st_contrast:"Más contraste", st_contrast_hint:"Sube el contraste del texto para que se lea mejor.",
    // Temáticas de temporada
    st_theme_season:"Temática", st_theme_season_hint:"Cambia los colores y añade un detalle animado de temporada (nieve, hojas, balón…). Quítalo cuando quieras.",
    th_none:"Ninguna", th_mundial:"Mundial 🇪🇸", th_halloween:"Halloween 🎃", th_navidad:"Navidad 🎄", th_verano:"Verano ☀️", th_invierno:"Invierno ❄️", th_pascua:"Pascua 🐣",
    // Bancos de gasto diario (varios)
    st_expense_banks:"Bancos de gasto diario", st_expense_banks_hint:"Marca todos los bancos cuyas compras cuentan en tu presupuesto del día a día (p. ej. Trade Republic + Revolut en un viaje). El saldo de gasto sigue saliendo del principal.",
    st_expense_banks_none:"Aún no tienes cuentas para elegir.",
    // Comparativa de monedas
    st_cur_compare:"Comparar monedas", st_cur_compare_hint:"Tipos del BCE (referencia). Toca una moneda para verla al cambio.",
    cur_jpy:"¥ Yen", cur_cad:"C$ Dólar canadiense", cur_aud:"A$ Dólar australiano", cur_cny:"¥ Yuan", cur_mxn:"$ Peso mexicano", cur_sek:"kr Corona sueca", cur_nok:"kr Corona noruega", cur_dkk:"kr Corona danesa", cur_pln:"zł Złoty", cur_brl:"R$ Real", cur_inr:"₹ Rupia",
  },
  en:{
    tab_dash:"Home", tab_gastos:"Spending", tab_plan:"Plan", tab_cartera:"Portfolio", tab_fijos:"Fixed", tab_inv:"Investments", tab_patri:"Net worth", tab_debt:"Debts", tab_compartido:"Shared",
    tab_metas:"Goals", tab_logros:"Achievements",
    v4_hola:"Hi, {n}", v4_hola_anon:"Hi",
    v4_money_total:"All your money", v4_this_month:"this month", v4_of_month:"of month",
    v4_budget_spent:"You've spent {spent} of your {budget}.", v4_budget_daily:"You can spend {x}/day until month end.",
    v4_streak:"{n} months on track", v4_see_gastos:"See spending ›", v4_see_plan:"See plan ›",
    v4_upcoming:"Upcoming", v4_upcoming_empty:"Nothing pending this month. Bills show up here.",
    v4_your_goals:"Your goals", v4_recent:"Latest activity", v4_recent_empty:"No activity yet. Add the first one with +.",
    v4_all:"All ›", v4_plan_title:"Your month plan", v4_plan_recibos:"Bills", v4_plan_deudas:"Debts", v4_plan_metas:"Goals",
    v4_plan_left:"Still to pay in {month}", v4_plan_liq:"By month end you will have {amount} in {bank}",
    v4_pendiente:"Pending", v4_ya_pagado:"Already paid", v4_gestionar:"Manage",
    v4_ver_mas:"See more · {n}", v4_ver_menos:"See less",
    v4_gastos_title:"Your spending", v4_gastos_spent_in:"Spent in {month}", v4_gastos_net_in:"Balance in {month}", v4_gastos_of:"of {x}", v4_gastos_left:"{x} left", v4_gastos_today_mark:"today · day {d}", v4_period_more:"More…",
    v4_gastos_inc_line:"Income {x} · balance {bal}", v4_gastos_split_line:"Spent {spent} · income {income}",
    v4_cartera_title:"Your portfolio", v4_cuentas:"Your accounts", v4_inversiones:"Your investments", v4_inv_positions:"{n} positions",
    v4_inv_tools:"Investment tools", v4_inv_tools_h:"Prices, round-ups, projections and manual edit — what used to clutter Portfolio.",
    v4_sync_banks:"Sync banks", v4_sync_banks_done:"✓ Banks synced",
    v4_sync_brokers_ok:"📈 Brokers up to date (TR/MyInvestor)", v4_sync_broker_exp:"⚠ {b}: session expired · reconnect in Settings → Banks",
    ap_bank:"Bank", ap_bank_none:"No bank",
    bk_issue:"⚠ {bank} needs your permission again", bk_issue_sub:"The read consent expired (required every ~3 months): the balance may be stale. One tap fixes it.",
    bk_issue_cta:"🔓 Reconnect {bank}", bk_tr_dead:"⚠ Trade Republic is disconnected",
    bk_tr_sub:"Its session expired: positions and cash aren't updating. Reconnect HERE in the app (PIN + SMS code) — not in the Trade Republic app.",
    bk_tr_cta:"🔓 Reconnect Trade Republic",
    v4_acc_locked:"Connected accounts get their balance from the bank; you can still change the name and role.",
    v4_sel_partial:"Selected", v4_edit_goods:"Edit assets",
    v4_gestionar_h:"Edit fixed bills, installments, cash flows and bank reconciliation — without cluttering the daily view.",
    v4_debts_foot_a:"Debts", v4_debts_foot_b:"already subtracted",
    v4_apuntar:"Add", v4_gasto:"Expense", v4_ingreso:"Income", v4_apuntar_ph:"What for? (e.g. Dinner)",
    v4_apuntar_need:"Enter an amount 🙂", v4_apuntar_ok:"✓ Expense added", v4_apuntar_ok_in:"✓ Income added",
    v4_save_gasto:"Save expense", v4_save_in:"Save income", v4_back:"Back",
    v4_debts_hero:"You owe in total", v4_debts_sub:"{x}/mo in payments · going down each month 📉",
    v4_debts_ends:"done by {d}", v4_debts_ends_est:"at this pace done ~{d}", v4_amort_now:"💸 Pay down now",
    v4_debt_party_1:"🎉 {name}: LAST instalment this month ({x})!", v4_debt_party_sub:"After that, {x}/mo back in your pocket.",
    v4_goals_hero:"Saved in goals", v4_goal_new:"+ New savings goal",
    v4_paid_group:"{names} · {n} bills",
    v4_roundup_card:"Rounding up your purchases invested {x} this month without you lifting a finger.",
    v4_ob_skip:"Skip", v4_ob_title1:"Your money, finally clear.",
    v4_ob_sub1:"Spending, bills and net worth in one place. No jargon, no spreadsheets.",
    v4_ob_title2:"Expenses log themselves.",
    v4_ob_sub2:"Connect your bank or Trade Republic and they come in alone. Or tap + anytime.",
    v4_ob_demo1:"Groceries", v4_ob_demo2:"Coffee",
    v4_ob_start:"Start with {x} €/month",
    v4_set_profile_sync:"synced ✓", v4_set_profile_local:"on this phone",
    v4_set_appear:"Look & feel", v4_set_easy:"Easy start", v4_set_conn:"Connections",
    v4_set_money:"Money", v4_set_app:"App",
    v4_set_tour:"See the tour", v4_set_adv:"Advanced",
    v4_moved_cat:"Moved to {cat}", v4_exp_auto:"auto", v4_exp_manual:"manual",
    v4_exp_del:"Delete", v4_exp_del_q:"Delete “{name}”?", v4_exp_del_sub:"This can't be undone.",
    v4_exp_amount:"Amount", v4_exp_merchant_ph:"Merchant or note",
    v4_exp_cat:"Category", v4_exp_type:"Type",
    v4_exp_with_card:"Paid by card", v4_exp_not_card:"Bizum or transfer",
    v4_budget_sheet:"Your monthly budget", v4_budget_sheet_h:"Day-to-day only: groceries, eating out, treats. Bills are separate.",
    tb_add:"Add tab", tb_add_hint:"Tap the one you want on the bar. To remove one, long-press it and drag it to the bin.",
    tb_trash:"Drop it here to remove", tb_removed:"Tab removed · bring it back with +", tb_nodel:"Home can't be removed",
    st_mode:"App mode", st_mode_full:"Full", st_mode_simple:"Simple", st_mode_hint:"Simple keeps Home, Spending, Plan (bills only) and Portfolio. Great to start.",
    brand_sub:"your money, clear",
    settings:"Settings", language:"Language", theme:"Colour theme", currency:"Display currency",
    budget_month:"Monthly budget (€)", save:"Save", backup:"Backup",
    do_export:"⬇️ Export data (JSON)", do_import:"⬆️ Import data (JSON)",
    eb_title:"Something went wrong", eb_msg:"The app hit a rendering error. Your data is safe. Download a backup just in case and reload.", eb_export:"⬇️ Download backup", eb_reload:"🔄 Reload the app",
    off_pill:"📴 Offline · saved and synced when you're back",
    upd_ready:"✨ New version · tap to update",
    upd_downloading:"⬇️ Downloading new version…",
    upd_notif:"An update (v{v}) is ready. Tap to install it.",
    upd_notif_web:"A new app version is ready. Tap the button at the top to update.",
    upd_notif_apk:"A new app (v{v}) is ready. Tap the button at the top to install it.",
    apk_ready:"⬇️ App {v} ready · tap to install", apk_downloading:"Downloading the update… the installer will open", apk_perm:"Allow «install unknown apps» for Mi Cartera and tap the button again",
    ob_signup:"Create a new account",
    st_custom:"Customisation", st_notifs:"Notifications", st_simple_lbl:"Simple mode",
    st_g_general:"General", st_search_ph:"🔍 Search settings…", st_search_none:"Nothing by that name. Try “theme”, “bank”, “backup”…",
    st_blocks:"Hide blocks in tabs", st_blocks_hint:"With this on, every block in any tab shows a «Hide» button. Hidden ones stay dimmed while editing; turn it off and they disappear entirely (and you recover them here).",
    cc_hide:"Hide", cc_show:"Show",
    st_updates:"Updates", st_update:"Check for updates",
    st_up_ok:"✓ You're up to date", st_up_web:"New web version available: it installs itself — close and reopen the app", st_up_applying:"⬇️ Updating to v{v}… the app will reload itself in a few seconds", st_up_apk:"⬇️ App {v} available · downloading, the installer will open",
    st_widget_hint:"📱 Widget: long-press the home screen → Widgets → Mi Cartera. Shows this month's spend and what's left.",
    st_news:"What's new", st_news_row:"Release history",
    st_feedback:"Send feedback or a bug", st_shared:"Household & shared expenses",
    st_account:"Your account", st_privacy:"Privacy & data", st_delete_acc:"Delete my account",
    st_delete_acc_sub:"All your cloud data will be deleted (expenses, accounts, investments…). This can't be undone.",
    st_delete_acc_ok:"Yes, delete everything", st_delete_acc_pwd:"Confirm with your password",
    st_delete_acc_pwd_sub:"For security, enter your Mi Cartera account password.",
    st_delete_acc_done:"✓ Account deleted · data removed",
    st_sync_conflict:"⚠ Another device saved changes first: reloaded from the cloud",
    wn_title:"What's new", wn_sub:"What changed in each version. Tap a version for details.", wn_current:"your version",
    wn_fb_title:"💬 Anything to share?", wn_fb_hint:"Suggestions, bugs or oddities: they're saved below and reach Juanjo with your version, so nothing gets lost.",
    wn_fb_ph:"Write your suggestion or the bug you saw…", wn_fb_send:"Send", wn_fb_sent:"✓ Saved and sent", wn_fb_offline:"✓ Saved to your notes (couldn't send; it stays stored)",
    wn_yours:"Your notes", wn_close:"Got it!",
    st_trnotif:"Notify every logged expense (TR)", st_trnotif_hint:"If you turn it off, Mi Cartera stops confirming each expense with a notification (Trade Republic already notifies the charge). Budget alerts keep coming.",
    st_tring:"Log my Trade Republic spending here", st_tring_hint:"When on, this app reads Trade Republic spending notifications on THIS phone and logs them into YOUR account (nobody else's). Each person turns it on on their own phone. It only reads the notification; it never touches your bank. You can turn it off anytime.", st_tring_on:"✓ Done · your Trade Republic card purchases will come in on their own into this account", st_tring_off:"Trade Republic logging turned off",
    st_banksync_notif:"When a bank notification arrives, sync movements", st_banksync_notif_hint:"If Caixa, Sabadell or another bank notifies you, the app pulls movements via Open Banking (it does not parse the notification amount). At most one sync every 2 minutes.",
    st_aicat:"Suggest category (AI) for “Other”", st_aicat_hint:"In Spending, if a merchant lands in Other, you can ask for a suggestion. Keywords first; if OPENAI_API_KEY is set in Supabase, AI only runs then. Amount is never sent.",
    st_sentry:"Sentry (prod errors)", st_sentry_test:"Send test error", st_sentry_sent:"✓ Sent to Sentry (check Issues in a few seconds)", st_sentry_hint:"Only you see this block (admin). Use it to verify crashes reach Sentry; other users never see it.",
    bp_empty_hint:"This is where your real banks connect (Open Banking): balance and transactions come in on their own. Accounts with a hand-typed balance live in Net worth — connecting the bank is optional and you can do it anytime.",
    th_green:"Green", th_dark:"Dark", th_light:"Light", th_blue:"Blue", cur_eur:"€ Euro", cur_usd:"$ Dollar", cur_gbp:"£ Pound", cur_chf:"CHF Swiss franc",
    rp_saved:"✓ Report saved to Downloads (look for “mi-cartera-…png”)",
    rp_saved_notif:"📊 Monthly report saved to Downloads: {f}. Open it from your Files app or gallery.",
    ob_welcome:"Welcome 👋",
    ob_intro:"Let's set up your wallet in 1 minute. Start with your accounts and budget; you can add investments, debts and fixed costs later in their tabs.",
    ob_budget:"Monthly spending budget (€)", ob_accounts:"Your accounts (bank and current balance)",
    ob_addacc:"+ Add account", ob_start:"Start using Mi Cartera", ob_start_empty:"Start (I'll add accounts later)",
    ob_haveacc:"I already have an account · Sign in",
    ob_returning:"Reinstalled the app or switched phones? Sign in and recover all your data instantly.",
    ob_foot:"You can edit and add everything whenever you want. Sign in to sync across devices and recover your data.",
    ob_name_ph:"Name (optional, e.g. Checking account)", ob_balance_ph:"Balance €",
    gl_contribute_title:"Add to {name}", gl_contribute_from:"Which bank does it come from?", gl_contribute_save:"Add {x}", gl_contribute_need:"Enter an amount 🙂",
    v4_set_a11y:"Accessibility",
    st_textsize:"Text size", st_textsize_hint:"Enlarges the whole app. If anything breaks on «Huge», tell me and I'll fix it.",
    ts_normal:"Normal", ts_big:"Large", ts_huge:"Huge",
    st_reduce_motion:"Reduce motion", st_reduce_motion_hint:"Removes slides and bounces: the app feels calmer and more direct. Useful if motion bothers you.",
    st_contrast:"More contrast", st_contrast_hint:"Boosts text contrast for easier reading.",
    st_theme_season:"Theme", st_theme_season_hint:"Changes colors and adds a seasonal animated touch (snow, leaves, football…). Turn it off anytime.",
    th_none:"None", th_mundial:"World Cup 🇪🇸", th_halloween:"Halloween 🎃", th_navidad:"Christmas 🎄", th_verano:"Summer ☀️", th_invierno:"Winter ❄️", th_pascua:"Easter 🐣",
    st_expense_banks:"Daily-spending banks", st_expense_banks_hint:"Tick every bank whose card spending counts toward your daily budget (e.g. Trade Republic + Revolut on a trip). The spending balance still comes from the main one.",
    st_expense_banks_none:"No accounts to choose yet.",
    st_cur_compare:"Compare currencies", st_cur_compare_hint:"ECB reference rates. Tap a currency to see it converted.",
    cur_jpy:"¥ Yen", cur_cad:"C$ Canadian dollar", cur_aud:"A$ Australian dollar", cur_cny:"¥ Yuan", cur_mxn:"$ Mexican peso", cur_sek:"kr Swedish krona", cur_nok:"kr Norwegian krone", cur_dkk:"kr Danish krone", cur_pln:"zł Złoty", cur_brl:"R$ Real", cur_inr:"₹ Rupee",
  },
  ca:{
    tab_dash:"Inici", tab_gastos:"Despeses", tab_plan:"Pla", tab_cartera:"Cartera", tab_fijos:"Fixes", tab_inv:"Inversions", tab_patri:"Patrimoni", tab_debt:"Deutes", tab_compartido:"Compartit",
    tab_metas:"Metes", tab_logros:"Assoliments",
    v4_hola:"Hola, {n}", v4_hola_anon:"Hola",
    v4_money_total:"Els teus diners en total", v4_this_month:"aquest mes", v4_of_month:"del mes",
    v4_budget_spent:"Has gastat {spent} dels teus {budget}.", v4_budget_daily:"Pots gastar {x}/dia fins a fi de mes.",
    v4_streak:"{n} mesos sense passar-te", v4_see_gastos:"Veure despeses ›", v4_see_plan:"Veure pla ›",
    v4_upcoming:"Pròxims càrrecs", v4_upcoming_empty:"Res pendent aquest mes. Els rebuts surten aquí.",
    v4_your_goals:"Les teves metes", v4_recent:"Últims moviments", v4_recent_empty:"Encara no hi ha moviments. Apunta el primer amb +.",
    v4_all:"Tots ›", v4_plan_title:"El teu pla del mes", v4_plan_recibos:"Rebuts", v4_plan_deudas:"Deutes", v4_plan_metas:"Metes",
    v4_plan_left:"Queda per pagar al {month}", v4_plan_liq:"A final de mes et quedaran {amount} a {bank}",
    v4_pendiente:"Pendent", v4_ya_pagado:"Ja pagat", v4_gestionar:"Gestionar",
    v4_ver_mas:"Veure més · {n}", v4_ver_menos:"Veure menys",
    v4_gastos_title:"Les teves despeses", v4_gastos_spent_in:"Gastat al {month}", v4_gastos_net_in:"Balanç al {month}", v4_gastos_of:"de {x}", v4_gastos_left:"queden {x}", v4_gastos_today_mark:"avui · dia {d}", v4_period_more:"Més…",
    v4_gastos_inc_line:"Ingressos {x} · balanç {bal}", v4_gastos_split_line:"Despeses {spent} · ingressos {income}",
    v4_cartera_title:"La teva cartera", v4_cuentas:"Els teus comptes", v4_inversiones:"Les teves inversions", v4_inv_positions:"{n} posicions",
    v4_inv_tools:"Eines d’inversió", v4_inv_tools_h:"Preus, arrodoniment, projecció i edició manual — el que abans omplia Cartera.",
    v4_sync_banks:"Sincronitza els bancs", v4_sync_banks_done:"✓ Bancs sincronitzats",
    v4_sync_brokers_ok:"📈 Brókers al dia (TR/MyInvestor)", v4_sync_broker_exp:"⚠ {b}: sessió caducada · reconnecta a Ajustos → Bancs",
    ap_bank:"Banc", ap_bank_none:"Sense banc",
    bk_issue:"⚠ {bank} necessita el teu permís altra vegada", bk_issue_sub:"El permís de lectura ha caducat (obligatori cada ~3 mesos): el saldo pot estar desfasat. Un toc i llest.",
    bk_issue_cta:"🔓 Reconnecta {bank}", bk_tr_dead:"⚠ Trade Republic està desconnectat",
    bk_tr_sub:"La sessió ha caducat: posicions i efectiu no s'actualitzen. Es reconnecta AQUÍ, a l'app (PIN + codi SMS) — no a l'app de Trade Republic.",
    bk_tr_cta:"🔓 Reconnecta Trade Republic",
    v4_acc_locked:"El saldo dels comptes connectats el porta el banc sol; el nom i el rol sí que els pots canviar.",
    v4_sel_partial:"Seleccionat", v4_edit_goods:"Edita els béns",
    v4_gestionar_h:"Edita fixes, quotes, fluxos i conciliació del banc — sense omplir la vista diària.",
    v4_debts_foot_a:"Deutes", v4_debts_foot_b:"ja descomptats",
    v4_apuntar:"Apuntar", v4_gasto:"Despesa", v4_ingreso:"Ingrés", v4_apuntar_ph:"En què? (ex. Sopar)",
    v4_apuntar_need:"Posa un import 🙂", v4_apuntar_ok:"✓ Despesa apuntada", v4_apuntar_ok_in:"✓ Ingrés apuntat",
    v4_save_gasto:"Desar despesa", v4_save_in:"Desar ingrés", v4_back:"Tornar",
    v4_debts_hero:"Deus en total", v4_debts_sub:"{x}/mes en quotes · baixant cada mes 📉",
    v4_debts_ends:"acabes el {d}", v4_debts_ends_est:"a aquest ritme acabes ~{d}", v4_amort_now:"💸 Amortitza ara",
    v4_debt_party_1:"🎉 {name}: ÚLTIMA quota aquest mes ({x})!", v4_debt_party_sub:"Després, {x}/mes lliures per a tu.",
    v4_goals_hero:"Estalviat en metes", v4_goal_new:"+ Nova meta d'estalvi",
    v4_paid_group:"{names} · {n} rebuts",
    v4_roundup_card:"L'arrodoniment de les teves compres ha invertit {x} aquest mes sense que facis res.",
    v4_ob_skip:"Salta", v4_ob_title1:"Els teus diners, per fi clars.",
    v4_ob_sub1:"Despeses, rebuts i patrimoni en un lloc. Sense argot i sense fulls de càlcul.",
    v4_ob_title2:"Les despeses s'apunten soles.",
    v4_ob_sub2:"Connecta el banc o Trade Republic i entren soles. O apunta amb + en un toc.",
    v4_ob_demo1:"Mercadona", v4_ob_demo2:"Cafè",
    v4_ob_start:"Comença amb {x} €/mes",
    v4_set_profile_sync:"sincronitzat ✓", v4_set_profile_local:"en aquest mòbil",
    v4_set_appear:"Aparença", v4_set_easy:"Per començar fàcil", v4_set_conn:"Connexions",
    v4_set_money:"Diners", v4_set_app:"App",
    v4_set_tour:"Veure el tutorial", v4_set_adv:"Avançat",
    v4_moved_cat:"Mogut a {cat}", v4_exp_auto:"ha entrat sol", v4_exp_manual:"a mà",
    v4_exp_del:"Esborra", v4_exp_del_q:"Vols esborrar «{name}»?", v4_exp_del_sub:"Això no es pot desfer.",
    v4_exp_amount:"Import", v4_exp_merchant_ph:"Comerç o concepte",
    v4_exp_cat:"Categoria", v4_exp_type:"Tipus",
    v4_exp_with_card:"Pagat amb targeta", v4_exp_not_card:"Bizum o transferència",
    v4_budget_sheet:"El teu pressupost del mes", v4_budget_sheet_h:"Només el dia a dia: súper, bars, capricis. Els rebuts van a part.",
    tb_add:"Afegeix pestanya", tb_add_hint:"Toca la que vulguis veure a la barra. Per treure'n una, mantén-la premuda i arrossega-la a la paperera.",
    tb_trash:"Deixa-la aquí per treure-la", tb_removed:"Pestanya treta · recupera-la amb el botó +", tb_nodel:"L'Inici no es pot treure",
    st_mode:"Mode de l'app", st_mode_full:"Complet", st_mode_simple:"Senzill", st_mode_hint:"Senzill deixa Inici, Despeses, Pla (només rebuts) i Cartera. Ideal per començar.",
    brand_sub:"els teus diners, clars",
    settings:"Configuració", language:"Idioma", theme:"Tema de color", currency:"Moneda de visualització",
    budget_month:"Pressupost mensual (€)", save:"Desa", backup:"Còpia de seguretat",
    do_export:"⬇️ Exporta dades (JSON)", do_import:"⬆️ Importa dades (JSON)",
    eb_title:"Alguna cosa ha fallat", eb_msg:"L'app ha tingut un error en dibuixar. Les teves dades estan segures. Descarrega una còpia per si de cas i recarrega.", eb_export:"⬇️ Descarrega còpia de seguretat", eb_reload:"🔄 Recarrega l'app",
    off_pill:"📴 Sense connexió · es desa i sincronitza en tornar",
    upd_ready:"✨ Nova versió · toca per actualitzar",
    upd_downloading:"⬇️ Baixant versió nova…",
    upd_notif:"Hi ha una actualització (v{v}) a punt. Toca per instal·lar-la.",
    upd_notif_web:"Hi ha una versió nova de l'app. Toca el botó de dalt per actualitzar.",
    upd_notif_apk:"Hi ha una app nova (v{v}). Toca el botó de dalt per instal·lar-la.",
    apk_ready:"⬇️ App {v} a punt · toca per instal·lar", apk_downloading:"Baixant l'actualització… s'obrirà l'instal·lador", apk_perm:"Permet «instal·lar apps desconegudes» a Mi Cartera i torna a tocar el botó",
    ob_signup:"Crea un compte nou",
    st_custom:"Personalització", st_notifs:"Notificacions", st_simple_lbl:"Mode senzill",
    st_g_general:"General", st_search_ph:"🔍 Cerca als ajustos…", st_search_none:"Res amb aquest nom. Prova amb «tema», «banc», «còpia»…",
    st_blocks:"Amaga blocs de les pestanyes", st_blocks_hint:"Amb això activat, cada bloc de qualsevol pestanya mostra un botó «Amaga». Els amagats queden atenuats mentre edites; en desactivar-ho desapareixen del tot (i aquí els recuperes).",
    cc_hide:"Amaga", cc_show:"Mostra",
    st_updates:"Actualitzacions", st_update:"Cerca actualització",
    st_up_ok:"✓ Estàs a l'última", st_up_web:"Hi ha versió web nova: s'instal·la sola — tanca i obre l'app per estrenar-la", st_up_applying:"⬇️ Actualitzant a la v{v}… l'app es recarrega sola en uns segons", st_up_apk:"⬇️ App {v} disponible · baixant, s'obrirà l'instal·lador",
    st_widget_hint:"📱 Widget: mantén premut l'escriptori → Widgets → Mi Cartera. Veuràs la despesa del mes i el que et queda.",
    st_news:"Novetats", st_news_row:"Historial de novetats",
    st_feedback:"Envia un suggeriment o error", st_shared:"Llar i despeses compartides",
    st_account:"El teu compte", st_privacy:"Privacitat i dades", st_delete_acc:"Esborrar el meu compte",
    st_delete_acc_sub:"S'esborraran totes les teves dades al núvol (despeses, comptes, inversions…). No es pot desfer.",
    st_delete_acc_ok:"Sí, esborrar tot", st_delete_acc_pwd:"Confirma amb la contrasenya",
    st_delete_acc_pwd_sub:"Per seguretat, escriu la contrasenya del teu compte de Mi Cartera.",
    st_delete_acc_done:"✓ Compte esborrat · dades eliminades",
    st_sync_conflict:"⚠ Un altre dispositiu ha desat canvis abans: s'ha recarregat des del núvol",
    wn_title:"Novetats", wn_sub:"Què ha canviat a cada versió. Toca una versió per veure'n el detall.", wn_current:"la teva versió",
    wn_fb_title:"💬 Alguna cosa a dir?", wn_fb_hint:"Suggeriments, errors o coses rares: queden apuntades aquí sota i arriben al Juanjo amb la teva versió, perquè no s'oblidin.",
    wn_fb_ph:"Escriu el suggeriment o l'error que has vist…", wn_fb_send:"Envia", wn_fb_sent:"✓ Apuntat i enviat", wn_fb_offline:"✓ Apuntat a les teves notes (no s'ha pogut enviar; queda desat)",
    wn_yours:"Els teus apunts", wn_close:"Entesos!",
    st_trnotif:"Avisar de cada despesa apuntada (TR)", st_trnotif_hint:"Si l'apagues, Mi Cartera deixa de confirmar cada despesa amb una notificació (Trade Republic ja t'avisa del càrrec). Els avisos de pressupost segueixen arribant.",
    st_tring:"Apuntar aquí les meves despeses de Trade Republic", st_tring_hint:"En activar-ho, aquesta app llegeix les notificacions de despesa de Trade Republic d'AQUEST mòbil i les apunta al TEU compte (no al de ningú més). Cada persona ho activa al seu propi telèfon. Només llegeix la notificació; mai no entra al teu banc. El pots apagar quan vulguis.", st_tring_on:"✓ Fet · les teves compres amb la targeta de Trade Republic entraran soles en aquest compte", st_tring_off:"Apuntat de Trade Republic desactivat",
    st_banksync_notif:"En detectar avís del banc, sincronitzar moviments", st_banksync_notif_hint:"Si Caixa, Sabadell o un altre banc et envia una notificació, l'app demana els moviments per Open Banking (no llegeix l'import de la noti). Com a màxim una sync cada 2 minuts.",
    st_aicat:"Suggerir categoria (IA) a «Altres»", st_aicat_hint:"A Despeses, si un comerç queda a Altres, pots demanar suggeriment. Primer paraules clau; si hi ha OPENAI_API_KEY a Supabase, l'IA només actua aleshores. No s'envia l'import.",
    st_sentry:"Sentry (errors en prod)", st_sentry_test:"Envia error de prova", st_sentry_sent:"✓ Enviat a Sentry (mira Issues en uns segons)", st_sentry_hint:"Només tu veus aquest bloc (admin). Serveix per comprovar que els crashes arriben a Sentry; la resta d'usuaris no el veuen.",
    bp_empty_hint:"Aquí es connecten els teus bancs de debò (Open Banking): el saldo i els moviments entren sols. Els comptes amb saldo apuntat a mà viuen a Patrimoni — connectar el banc és opcional i ho pots fer quan vulguis.",
    th_green:"Verd", th_dark:"Fosc", th_light:"Clar", th_blue:"Blau", cur_eur:"€ Euro", cur_usd:"$ Dòlar", cur_gbp:"£ Lliura", cur_chf:"CHF Franc suís",
    rp_saved:"✓ Informe desat a Baixades (busca «mi-cartera-…png»)",
    rp_saved_notif:"📊 Informe del mes desat a Baixades: {f}. Obre'l des de l'app d'Arxius o la galeria.",
    ob_welcome:"Benvingut/da 👋",
    ob_intro:"Muntem la teva cartera en 1 minut. Comença pels comptes i el pressupost; les inversions, deutes i despeses fixes les afegeixes després a les seves pestanyes.",
    ob_budget:"Pressupost mensual per a despeses (€)", ob_accounts:"Els teus comptes (banc i saldo actual)",
    ob_addacc:"+ Afegeix compte", ob_start:"Comença a usar Mi Cartera", ob_start_empty:"Comença (ja afegiré comptes)",
    ob_haveacc:"Ja tinc compte · Inicia sessió",
    ob_returning:"Has reinstal·lat l'app o has canviat de mòbil? Inicia sessió i recuperes totes les teves dades a l'instant.",
    ob_foot:"Podràs editar i afegir-ho tot quan vulguis. Inicia sessió per sincronitzar entre dispositius i recuperar les teves dades.",
    ob_name_ph:"Nom (opcional, ex. Compte corrent)", ob_balance_ph:"Saldo €",
    gl_contribute_title:"Aportar a {name}", gl_contribute_from:"De quin banc surt?", gl_contribute_save:"Aportar {x}", gl_contribute_need:"Posa un import 🙂",
    v4_set_a11y:"Accessibilitat",
    st_textsize:"Mida de la lletra", st_textsize_hint:"Amplia tota l'app. Si alguna cosa es descoloca amb «Enorme», digues-m'ho i ho ajusto.",
    ts_normal:"Normal", ts_big:"Gran", ts_huge:"Enorme",
    st_reduce_motion:"Reduir animacions", st_reduce_motion_hint:"Treu lliscaments i rebots: l'app va més sòbria i directa. Útil si et mareges.",
    st_contrast:"Més contrast", st_contrast_hint:"Puja el contrast del text perquè es llegeixi millor.",
    st_theme_season:"Temàtica", st_theme_season_hint:"Canvia els colors i afegeix un detall animat de temporada (neu, fulles, pilota…). Treu-lo quan vulguis.",
    th_none:"Cap", th_mundial:"Mundial 🇪🇸", th_halloween:"Halloween 🎃", th_navidad:"Nadal 🎄", th_verano:"Estiu ☀️", th_invierno:"Hivern ❄️", th_pascua:"Pasqua 🐣",
    st_expense_banks:"Bancs de despesa diària", st_expense_banks_hint:"Marca tots els bancs les compres dels quals compten al teu pressupost diari (p. ex. Trade Republic + Revolut en un viatge). El saldo de despesa continua sortint del principal.",
    st_expense_banks_none:"Encara no tens comptes per triar.",
    st_cur_compare:"Comparar monedes", st_cur_compare_hint:"Tipus del BCE (referència). Toca una moneda per veure-la al canvi.",
    cur_jpy:"¥ Ien", cur_cad:"C$ Dòlar canadenc", cur_aud:"A$ Dòlar australià", cur_cny:"¥ Iuan", cur_mxn:"$ Peso mexicà", cur_sek:"kr Corona sueca", cur_nok:"kr Corona noruega", cur_dkk:"kr Corona danesa", cur_pln:"zł Złoty", cur_brl:"R$ Real", cur_inr:"₹ Rúpia",
  },
};
// Modo Sencillo: además de ocultar pestañas/widgets, suaviza la JERGA en las etiquetas clave
// (para gente que no ha crecido con apps: "Patrimonio neto" → "Tu dinero en total").
let SIMPLEMODE = false;   // lo fija App en cada render desde settings.simpleMode
const LANG_SIMPLE = {
  es:{ d_networth:"Tu dinero en total", d_assets:"Lo que tienes", tab_fijos:"Recibos", tab_dash:"Inicio" },
  en:{ d_networth:"All your money",     d_assets:"What you have", tab_fijos:"Bills", tab_dash:"Home" },
  ca:{ d_networth:"Els teus diners en total", d_assets:"El que tens", tab_fijos:"Rebuts", tab_dash:"Inici" },
};
const t = (k)=>{
  if(SIMPLEMODE){ const v=(LANG_SIMPLE[CURLANG]&&LANG_SIMPLE[CURLANG][k])!=null?LANG_SIMPLE[CURLANG][k]:LANG_SIMPLE.es[k]; if(v!=null) return v; }
  return (LANG[CURLANG] && LANG[CURLANG][k]) || LANG.es[k] || k;
};
// textos con variables: tf("key",{name:"x"}) reemplaza {name} en la traducción
function tf(k,vals){ let s=t(k); if(vals) for(const v in vals) s=s.split("{"+v+"}").join(vals[v]); return s; }
/* Tour guiado + ayuda contextual + accesibilidad (UX para no-técnicos) */
Object.assign(LANG.es,{
  st_bigtext:"🔍 Letra grande", st_tour:"🎓 Ver el tutorial",
  tour_1:"💰 Aquí ves tu dinero de un vistazo: cuánto tienes en total y cómo va el mes.",
  tour_2:"🧾 «{gastos}» es solo el día a día (súper, bares, ropa…). Filtra por mes, categoría o banco. Los recibos NO van aquí.",
  tour_3:"➕ El botón verde del centro apunta un gasto o un ingreso al momento, sin ir a ninguna pestaña.",
  tour_4:"📅 «{plan}» junta recibos, deudas y metas. En Recibos ves lo pendiente y lo ya pagado; Gestionar abre el detalle.",
  tour_5:"💼 «{cartera}» es tu patrimonio: cuentas, inversiones y bienes. Las herramientas de inversión están un toque más abajo.",
  tour_6:"👤 El círculo de arriba abre tu perfil. Tira hacia abajo en Inicio para el mismo efecto. Ajustes: desliza de izquierda a derecha.",
  tour_7:"👆 Desliza entre pestañas con el dedo. ¡Ya estás listo!",
  tour_next:"Siguiente", tour_skip:"Saltar", tour_done:"¡Listo!",
  h_ok:"Entendido",
  h_dist:"Cómo se reparte tu dinero: lo líquido (cuentas), lo invertido y los bienes (coche, piso…). La barra crece hacia donde más tienes.",
  h_savings:"Lo que apartas AUTOMÁTICAMENTE cada mes hacia inversión o ahorro (tus aportaciones periódicas). No es el gasto: es lo que te pagas a ti primero.",
  h_culprit:"El reparto del gasto de este mes por categorías. El «culpable» es la categoría que más se lleva: si hay que recortar, empieza por ahí.",
  h_trend:"Compara lo que llevas gastado en cada categoría con tu media de los últimos meses. Flecha arriba = este mes vas por encima de lo normal.",
  h_goalw:"Tu meta de ahorro más cercana y cómo va. La frase de abajo te dice si llegas a la fecha o cuánto tendrías que apartar al mes.",
  h_subs:"Pagos que se repiten cada mes por el mismo importe (Netflix, gym…). La app los detecta sola en tus gastos: revisa si de verdad los usas.",
  h_cvg:"Cuánto has puesto de tu bolsillo en cada bróker y cuánto vale hoy. La diferencia es tu ganancia (o pérdida) real, en la moneda de cada uno.",
  h_bytype:"Tus inversiones agrupadas por tipo (acciones, ETF, fondo, oro…). Para ver de un vistazo si lo tienes todo en un mismo saco.",
  h_rend:"Cada posición ordenada por lo que te ha dado: verde = ganas, rojo = pierdes. Con el % sobre lo que pusiste.",
  h_evo:"El valor total de tus inversiones a lo largo del tiempo, con tus datos reales guardados. Sirve para ver la tendencia, no el día a día.",
  h_roles:"Cada cuenta tiene un rol (toca Editar): «Recibos» = de ahí salen luz, agua, Netflix, hipoteca… (Fijos). «Gasto diario» = supermercado, bares, ropa… (pestaña Gastos; solo puede haber una). «Todo» = un solo banco para ambas cosas. Si pagas el día a día con OTRO banco conectado, márcalo en Ajustes → Bancos («También apuntar gastos de tarjeta»).",
  h_trbreak:"La cuenta de gasto diario no se edita a mano cada día: la app la calcula (base + nómina − gastos − round-up − aporte). Aquí ves esa cuenta, línea a línea, para encontrar cualquier descuadre.",
  h_ptinv:"El total invertido en cada bróker. El detalle por posición está en la pestaña Inversiones.",
  h_goods:"Cosas tuyas con valor que no son dinero en el banco (piso, coche…). Cuentan en tu patrimonio pero no puedes gastarlas sin venderlas.",
  h_serv:"Los recibos de cada mes (luz, agua, gym, hipoteca…) con su día de cobro y de qué cuenta salen. Con esto la app calcula si te va a llegar el dinero.",
  h_debts:"Tus cuotas de préstamos y financiaciones. El saldo pendiente baja solo cada mes con lo que amortizas.",
  h_flows:"El dinero que ENTRA (nómina) y el que se MUEVE solo entre tus cuentas cada mes (transferencias programadas). Es el mapa de tu dinero automático.",
  h_oneoffs:"Pagos o ingresos de UNA vez que ya sabes que vienen (el seguro anual, un regalo, la declaración…). Se apuntan aquí para que el mes no te pille por sorpresa.",
  al_over:"🚨 Te has pasado del presupuesto: {x} de {b}",
  al_80:"⚠️ Ya llevas el {p}% del presupuesto del mes",
  al_big:"💥 Gasto tocho apuntado: {x}",
  ru_interest:"Interés del efectivo (% anual)",
  ru_interest_hint:"TR paga un {p}% anual sobre tu efectivo y lo abona el día 1. La app lo suma sola al cerrar cada mes, para que el saldo no se descuadre poco a poco. Pon el % que TR te aplique ahora mismo (sale en su app).",
  h_ru:"Trade Republic redondea cada compra con tarjeta al euro y ese pico lo invierte solo (round-up). El saveback es un 1% de regalo por pagar con la tarjeta. Esta tarjeta calcula cuánto se está moviendo y a qué inversión va.",
  h_import:"Descarga tus movimientos desde la app de tu bróker (un fichero CSV) y súbelo aquí: la app pone tus posiciones EXACTAS (participaciones y coste) tal y como las tiene el bróker. No se sube nada a internet: se lee en tu móvil.",
  h_proj:"Una estimación de cuánto podría valer tu inversión dentro de unos años si sigue creciendo a un ritmo parecido. No es una promesa: es para hacerse una idea.",
  h_afford:"Escribe un gasto que estás pensando hacer (importe y día) y te digo si te lo puedes permitir sin quedarte en números rojos antes de que entre la nómina.",
  h_recon:"Compara lo que TÚ tienes apuntado (recibos, cuotas) con lo que el banco dice que ha cobrado de verdad. Si algo no cuadra o falta, te lo marca.",
});
Object.assign(LANG.en,{
  st_bigtext:"🔍 Large text", st_tour:"🎓 View the tutorial",
  tour_1:"💰 Here's your money at a glance: how much you have in total and how the month is going.",
  tour_2:"🧾 “{gastos}” is day-to-day only (groceries, bars, clothes…). Filter by month, category or bank. Bills do NOT go here.",
  tour_3:"➕ The green button in the centre logs an expense or income right away — no need to open a tab.",
  tour_4:"📅 “{plan}” brings together bills, debts and goals. In Bills you see what's due and what's paid; Manage opens the detail.",
  tour_5:"💼 “{cartera}” is your net worth: accounts, investments and assets. Investment tools are one tap below.",
  tour_6:"👤 The circle up top opens your profile. Pull down on Home for the same effect. Settings: swipe right.",
  tour_7:"👆 Swipe between tabs with your finger. You're all set!",
  tour_next:"Next", tour_skip:"Skip", tour_done:"Done!",
  h_ok:"Got it",
  h_dist:"How your money is spread: liquid (accounts), invested, and goods (car, home…). The bar grows towards where you hold the most.",
  h_savings:"What you set aside AUTOMATICALLY each month into investments or savings (your recurring contributions). Not spending — paying yourself first.",
  h_culprit:"This month's spending split by category. The “culprit” is the category eating the most: if you need to cut back, start there.",
  h_trend:"Compares what you've spent per category with your average of recent months. Arrow up = above your normal this month.",
  h_goalw:"Your nearest savings goal and how it's going. The line below tells you if you'll make the date or how much to set aside monthly.",
  h_subs:"Payments that repeat monthly for the same amount (Netflix, gym…). The app detects them in your spending: check you still use them.",
  h_cvg:"How much of your own money went into each broker and what it's worth today. The difference is your real gain (or loss), in each one's currency.",
  h_bytype:"Your investments grouped by type (stocks, ETF, fund, gold…). A quick check that everything isn't in one basket.",
  h_rend:"Each position ranked by what it has made you: green = gaining, red = losing. With the % over what you put in.",
  h_evo:"The total value of your investments over time, from your real saved data. For the trend, not the day-to-day.",
  h_roles:"Each account has a role (tap Edit): “Bills” = power, water, Netflix, mortgage… (Fixed). “Daily spending” = groceries, bars, clothes… (Spending tab; only one). “Everything” = one bank for both. If day-to-day cards are on ANOTHER connected bank, tick it in Settings → Banks (“Also log card spending”).",
  h_trbreak:"The daily-spending account isn't edited by hand every day: the app computes it (base + payroll − spending − round-up − plan). Here you see that math line by line to hunt any mismatch.",
  h_ptinv:"Total invested per broker. Position detail lives in the Investments tab.",
  h_goods:"Things you own with value that aren't money in the bank (home, car…). They count in your net worth but you can't spend them without selling.",
  h_serv:"Monthly bills (power, water, gym, mortgage…) with their charge day and the account they come from. With this the app can tell if you'll make it.",
  h_debts:"Your loan and financing instalments. The outstanding balance drops on its own each month with what you pay off.",
  h_flows:"Money that comes IN (payroll) and money that moves between your accounts on its own each month (scheduled transfers). The map of your automatic money.",
  h_oneoffs:"One-off payments or income you already know are coming (annual insurance, a gift, tax season…). Logged here so the month doesn't surprise you.",
  al_over:"🚨 Over budget: {x} of {b}",
  al_80:"⚠️ You've used {p}% of this month's budget",
  al_big:"💥 Big expense logged: {x}",
  ru_interest:"Cash interest (% p.a.)",
  ru_interest_hint:"TR pays {p}% p.a. on your cash, credited on the 1st. The app adds it automatically at each month close so the balance doesn't drift. Enter the rate TR currently gives you (shown in their app).",
  h_ru:"Trade Republic rounds every card purchase up to the euro and invests the spare change (round-up). Saveback is a 1% reward for paying by card. This card tracks how much is moving and into which investment.",
  h_import:"Download your transactions from your broker's app (a CSV file) and upload it here: the app sets your EXACT positions (shares and cost) as the broker has them. Nothing is uploaded: it's read on your phone.",
  h_proj:"An estimate of what your investment could be worth in a few years if it keeps growing at a similar pace. Not a promise — just to get an idea.",
  h_afford:"Type a purchase you're considering (amount and day) and I'll tell you whether you can afford it without going into the red before payday.",
  h_recon:"Compares what YOU have written down (bills, instalments) with what the bank actually charged. If something doesn't match or is missing, it flags it.",
});
Object.assign(LANG.ca,{
  st_bigtext:"🔍 Lletra gran", st_tour:"🎓 Veure el tutorial",
  tour_1:"💰 Aquí veus els teus diners d'un cop d'ull: quant tens en total i com va el mes.",
  tour_2:"🧾 «{gastos}» és només el dia a dia (súper, bars, roba…). Filtra per mes, categoria o banc. Els rebuts NO van aquí.",
  tour_3:"➕ El botó verd del centre apunta una despesa o un ingrés al moment, sense anar a cap pestanya.",
  tour_4:"📅 «{plan}» junta rebuts, deutes i metes. A Rebuts veus el pendent i el ja pagat; Gestionar obre el detall.",
  tour_5:"💼 «{cartera}» és el teu patrimoni: comptes, inversions i béns. Les eines d'inversió són un toc més avall.",
  tour_6:"👤 El cercle de dalt obre el teu perfil. Estira cap avall a Inici per al mateix efecte. Ajustos: llisca de esquerra a dreta.",
  tour_7:"👆 Llisca entre pestanyes amb el dit. Ja estàs a punt!",
  tour_next:"Següent", tour_skip:"Omet", tour_done:"Fet!",
  h_ok:"Entesos",
  h_dist:"Com es reparteixen els teus diners: el líquid (comptes), l'invertit i els béns (cotxe, pis…). La barra creix cap on més tens.",
  h_savings:"El que apartes AUTOMÀTICAMENT cada mes cap a inversió o estalvi (les teves aportacions periòdiques). No és la despesa: és pagar-te a tu primer.",
  h_culprit:"El repartiment de la despesa d'aquest mes per categories. El «culpable» és la categoria que més s'emporta: si cal retallar, comença per aquí.",
  h_trend:"Compara el que portes gastat en cada categoria amb la teva mitjana dels últims mesos. Fletxa amunt = aquest mes vas per sobre del normal.",
  h_goalw:"La teva meta d'estalvi més propera i com va. La frase de sota et diu si arribes a la data o quant hauries d'apartar al mes.",
  h_subs:"Pagaments que es repeteixen cada mes pel mateix import (Netflix, gym…). L'app els detecta sola a les teves despeses: revisa si de debò els fas servir.",
  h_cvg:"Quant has posat de la teva butxaca a cada bròker i quant val avui. La diferència és el teu guany (o pèrdua) real, en la moneda de cadascun.",
  h_bytype:"Les teves inversions agrupades per tipus (accions, ETF, fons, or…). Per veure d'un cop d'ull si ho tens tot al mateix sac.",
  h_rend:"Cada posició ordenada pel que t'ha donat: verd = guanyes, vermell = perds. Amb el % sobre el que hi vas posar.",
  h_evo:"El valor total de les teves inversions al llarg del temps, amb les teves dades reals desades. Serveix per veure la tendència, no el dia a dia.",
  h_roles:"Cada compte té un rol (toca Edita): «Rebuts» = llum, aigua, Netflix, hipoteca… (Fixes). «Despesa diària» = súper, bars, roba… (pestanya Despeses; només n'hi pot haver un). «Tot» = un sol banc per a les dues coses. Si el dia a dia el pagues amb UN ALTRE banc connectat, marca'l a Ajustos → Bancs («També apuntar despeses de targeta»).",
  h_trbreak:"El compte de despesa diària no s'edita a mà cada dia: l'app el calcula (base + nòmina − despeses − round-up − aportació). Aquí veus aquest compte, línia a línia, per trobar qualsevol desquadrament.",
  h_ptinv:"El total invertit a cada bròker. El detall per posició és a la pestanya Inversions.",
  h_goods:"Coses teves amb valor que no són diners al banc (pis, cotxe…). Compten al teu patrimoni però no les pots gastar sense vendre-les.",
  h_serv:"Els rebuts de cada mes (llum, aigua, gym, hipoteca…) amb el seu dia de cobrament i de quin compte surten. Amb això l'app calcula si t'hi arribaran els diners.",
  h_debts:"Les teves quotes de préstecs i finançaments. El saldo pendent baixa sol cada mes amb el que amortitzes.",
  h_flows:"Els diners que ENTREN (nòmina) i els que es mouen sols entre els teus comptes cada mes (transferències programades). És el mapa dels teus diners automàtics.",
  h_oneoffs:"Pagaments o ingressos d'UNA vegada que ja saps que vénen (l'assegurança anual, un regal, la declaració…). S'apunten aquí perquè el mes no t'agafi per sorpresa.",
  al_over:"🚨 T'has passat del pressupost: {x} de {b}",
  al_80:"⚠️ Ja portes el {p}% del pressupost del mes",
  al_big:"💥 Despesa grossa apuntada: {x}",
  ru_interest:"Interès de l'efectiu (% anual)",
  ru_interest_hint:"TR paga un {p}% anual sobre el teu efectiu i l'abona el dia 1. L'app el suma sola en tancar cada mes, perquè el saldo no es desquadri a poc a poc. Posa el % que TR t'apliqui ara mateix (surt a la seva app).",
  h_ru:"Trade Republic arrodoneix cada compra amb targeta a l'euro i inverteix el pessic sol (round-up). El saveback és un 1% de regal per pagar amb targeta. Aquesta targeta calcula quant s'està movent i a quina inversió va.",
  h_import:"Descarrega els teus moviments des de l'app del teu bròker (un fitxer CSV) i puja'l aquí: l'app posa les teves posicions EXACTES (participacions i cost) tal com les té el bròker. No es puja res a internet: es llegeix al teu mòbil.",
  h_proj:"Una estimació de quant podria valer la teva inversió d'aquí a uns anys si segueix creixent a un ritme semblant. No és cap promesa: és per fer-se una idea.",
  h_afford:"Escriu una despesa que estàs pensant fer (import i dia) i et dic si te la pots permetre sense quedar en números vermells abans de la nòmina.",
  h_recon:"Compara el que TU tens apuntat (rebuts, quotes) amb el que el banc diu que ha cobrat de veritat. Si alguna cosa no quadra o falta, t'ho marca.",
});
/* Roles de cuenta + import OB + informe mensual */
Object.assign(LANG.es,{
  rl_fijos:"🏦 Recibos", rl_diario:"🛒 Gasto diario", rl_ambos:"🔁 Todo",
  rl_ob_q:"¿Para qué usas esta cuenta? Dale un rol y podrás asignarle gastos fijos y del día a día:",
  rl_ob_done:"✓ «{n}» activada como {r}. Ya puedes elegirla en tus gastos.",
  rl_hint:"«Recibos» = pagos fijos (luz, cuotas…). «Gasto diario» = compras variables del día a día (solo una cuenta; mueve presupuesto y round-up). «Todo» = ambas en la misma. Si gastas con tarjeta de otro banco conectado, actívalo en Ajustes → Bancos sin cambiar este rol. Al cambiar el rol, el saldo mostrado se conserva.",
  ob_imported:"🏦 {n} compras con tarjeta añadidas a Gastos",
  rp_btn:"📸 Informe del mes (imagen)", rp_spent:"Gastado este mes", rp_of_budget:"de {b} de presupuesto ({p}%)",
  rp_top:"Top categorías", rp_networth:"Patrimonio", rp_delta:"{x} este mes", rp_footer:"hecho con Mi Cartera",
  mr_title:"¡Nuevo mes!", mr_sub:"Tu resumen del mes que acaba de empezar. Compártelo con quien quieras o guárdalo.",
  mr_share:"📸 Crear imagen del informe", mr_later:"Ahora no", mr_shared:"✓ Informe listo para compartir",
  hh_title:"Hogar compartido", hh_intro:"Como la cuenta conjunta del banco: cada uno ve el patrimonio fusionado, sin mezclar datos privados.",
  hh_need_cloud:"Inicia sesión para crear o unirte a un hogar.", hh_need_login:"Inicia sesión para usar el hogar compartido.",
  hh_create:"Crear hogar", hh_join:"Unirme con código", hh_name_ph:"Nombre (ej. Casa Avila)", hh_code_ph:"Código de 6 letras",
  hh_create_go:"Crear y obtener código", hh_join_go:"Unirme", hh_default_name:"Mi hogar",
  hh_created:"✓ Hogar creado · comparte el código", hh_joined:"✓ Te has unido al hogar", hh_code_short:"Escribe el código completo",
  hh_code_bad:"Código no encontrado", hh_code_show:"Código invitación: {c}", hh_fused_net:"Patrimonio del hogar",
  hh_members_n:"{n} miembro(s) con vista publicada", hh_publish:"Actualizar mi vista en el hogar", hh_pub_ok:"✓ Vista publicada",
  hh_pub_busy:"Publicando…", hh_pub_hint:"Publica cuando cambie algo importante. Los demás solo ven tu snapshot, nunca editan tus datos.",
  hh_updated:"Actualizado", hh_leave:"Salir", hh_leave_q:"¿Salir del hogar?", hh_leave_sub:"Tu vista dejará de mostrarse. Tus datos locales no se borran.",
  hh_leave_ok:"Sí, salir", hh_left:"Has salido del hogar",
  hh_rls_fix:"La nube necesita un ajuste (migración 0015 en Supabase → SQL Editor). Ver docs/HOGAR.md",
  hh_spent_m:"Gastado este mes", hh_fixed_m:"Fijos /mes", hh_cats:"Gastos del hogar por categoría",
  hh_fixed_top:"Sus fijos principales",
  fmp_title:"Fin de mes en paz", fmp_sub:"ritmo diario vs tu presupuesto",
  fmp_ok:"Puedes gastar {x}/día hasta fin de mes", fmp_warn:"Vas demasiado rápido para el presupuesto",
  fmp_over:"Ya has pasado el presupuesto", fmp_proj:"A este ritmo acabarías en {x} · quedan {d} días",
  h_pace:"Compara lo que llevas gastado con los días que quedan. Si el ritmo proyecta pasarte, te avisa a tiempo.",
  wl_pace:"Fin de mes en paz", wl_catbudget:"Presupuesto por categoría",
  cb_title:"Presupuesto por categoría", cb_sub:"límites del mes", cb_empty:"Aún no has puesto límites. Toca Editar (ej. super=200, ocio=80).",
  cb_empty_sub:"opcional · barritas por categoría", cb_edit:"Límites por categoría",
  cb_edit_sub:"Escribe categoría=importe separados por comas. IDs: super, bares, ocio, transporte, compras, hogar, salud…",
  h_catbudget:"Pon un tope en las categorías que más te preocupan. La barra se llena con lo gastado este mes.",
  rc_title:"Recibo gordo cerca", rc_body:"{name}: {x} el día {d}",
  rc_title_tmrw:"Mañana toca recibo", rc_body_tmrw:"{name}: mañana se cobran {x}. Si algo no cuadra, aún estás a tiempo.",
  bn_50:"🟢 Mitad del presupuesto del mes: llevas {x} de {b}",
  bn_80:"⚠️ 80% del presupuesto usado: {x} de {b}",
  bn_95:"🔶 ¡95%! Casi agotado el presupuesto: {x} de {b}",
  bn_100:"🚨 Presupuesto del mes agotado: {x} de {b}",
});
Object.assign(LANG.en,{
  rl_fijos:"🏦 Bills", rl_diario:"🛒 Daily spending", rl_ambos:"🔁 Everything",
  rl_ob_q:"What do you use this account for? Give it a role and you'll be able to assign it fixed and day-to-day expenses:",
  rl_ob_done:"✓ \"{n}\" activated as {r}. You can now pick it for your expenses.",
  rl_hint:"“Bills” = fixed payments (utilities, instalments…). “Daily spending” = variable day-to-day purchases (only one; drives budget and round-up). “Everything” = both in the same account. Card spend from another connected bank: tick it in Settings → Banks without changing this role. Switching roles keeps the shown balance.",
  ob_imported:"🏦 {n} card purchases added to Spending",
  rp_btn:"📸 Month report (image)", rp_spent:"Spent this month", rp_of_budget:"of {b} budget ({p}%)",
  rp_top:"Top categories", rp_networth:"Net worth", rp_delta:"{x} this month", rp_footer:"made with Mi Cartera",
  mr_title:"New month!", mr_sub:"Your summary for the month that just started. Share it or save it.",
  mr_share:"📸 Create report image", mr_later:"Not now", mr_shared:"✓ Report ready to share",
  hh_title:"Shared household", hh_intro:"Like a joint bank view: each person publishes their snapshot; nothing crosses into the other's data.",
  hh_need_cloud:"Sign in to create or join a household.", hh_need_login:"Sign in to use shared household.",
  hh_create:"Create household", hh_join:"Join with code", hh_name_ph:"Name (e.g. Home)", hh_code_ph:"6-letter code",
  hh_create_go:"Create & get code", hh_join_go:"Join", hh_default_name:"My household",
  hh_created:"✓ Household created · share the code", hh_joined:"✓ You joined the household", hh_code_short:"Enter the full code",
  hh_code_bad:"Code not found", hh_code_show:"Invite code: {c}", hh_fused_net:"Household net worth",
  hh_members_n:"{n} member(s) published", hh_publish:"Update my household view", hh_pub_ok:"✓ View published",
  hh_pub_busy:"Publishing…", hh_pub_hint:"Publish when something important changes. Others only see your snapshot.",
  hh_updated:"Updated", hh_leave:"Leave", hh_leave_q:"Leave household?", hh_leave_sub:"Your view will disappear. Local data stays yours.",
  hh_leave_ok:"Yes, leave", hh_left:"You left the household",
  hh_rls_fix:"The cloud needs a fix (migration 0015 in Supabase → SQL Editor). See docs/HOGAR.md",
  hh_spent_m:"Spent this month", hh_fixed_m:"Fixed /mo", hh_cats:"Household spending by category",
  hh_fixed_top:"Their main fixed costs",
  fmp_title:"Peaceful month-end", fmp_sub:"daily pace vs your budget",
  fmp_ok:"You can spend {x}/day until month-end", fmp_warn:"You're spending too fast for the budget",
  fmp_over:"You're already over budget", fmp_proj:"At this pace you'd hit {x} · {d} days left",
  h_pace:"Compares what you've spent with days left. Warns early if the pace would overshoot.",
  wl_pace:"Peaceful month-end", wl_catbudget:"Category budgets",
  cb_title:"Category budgets", cb_sub:"monthly limits", cb_empty:"No limits yet. Tap Edit (e.g. super=200, ocio=80).",
  cb_empty_sub:"optional · bars per category", cb_edit:"Category limits",
  cb_edit_sub:"Write category=amount separated by commas. IDs: super, bares, ocio, transporte, compras, hogar, salud…",
  h_catbudget:"Cap the categories that worry you most. The bar fills with this month's spend.",
  rc_title:"Big bill coming", rc_body:"{name}: {x} on day {d}",
  rc_title_tmrw:"Bill due tomorrow", rc_body_tmrw:"{name}: {x} will be charged tomorrow. If something's off, there's still time.",
  bn_50:"🟢 Half the monthly budget: {x} of {b}",
  bn_80:"⚠️ 80% of the budget used: {x} of {b}",
  bn_95:"🔶 95%! Budget nearly gone: {x} of {b}",
  bn_100:"🚨 Monthly budget spent: {x} of {b}",
});
Object.assign(LANG.ca,{
  rl_fijos:"🏦 Rebuts", rl_diario:"🛒 Despesa diària", rl_ambos:"🔁 Tot",
  rl_ob_q:"Per a què fas servir aquest compte? Dona-li un rol i podràs assignar-li despeses fixes i del dia a dia:",
  rl_ob_done:"✓ «{n}» activat com a {r}. Ja pots triar-lo a les teves despeses.",
  rl_hint:"«Rebuts» = pagaments fixos (llum, quotes…). «Despesa diària» = compres variables del dia a dia (només un; mou pressupost i round-up). «Tot» = les dues al mateix. Si gastes amb targeta d'un altre banc connectat, activa'l a Ajustos → Bancs sense canviar aquest rol. En canviar el rol, el saldo mostrat es conserva.",
  ob_imported:"🏦 {n} compres amb targeta afegides a Despeses",
  rp_btn:"📸 Informe del mes (imatge)", rp_spent:"Gastat aquest mes", rp_of_budget:"de {b} de pressupost ({p}%)",
  rp_top:"Top categories", rp_networth:"Patrimoni", rp_delta:"{x} aquest mes", rp_footer:"fet amb Mi Cartera",
  mr_title:"Nou mes!", mr_sub:"El resum del mes que acaba de començar. Comparteix-lo o guarda'l.",
  mr_share:"📸 Crear imatge de l'informe", mr_later:"Ara no", mr_shared:"✓ Informe llest per compartir",
  hh_title:"Llar compartida", hh_intro:"Com el compte conjunt del banc: cadascú publica la seva instantània sense barrejar dades privades.",
  hh_need_cloud:"Inicia sessió per crear o unir-te a una llar.", hh_need_login:"Inicia sessió per usar la llar compartida.",
  hh_create:"Crear llar", hh_join:"Unir-me amb codi", hh_name_ph:"Nom (ex. Casa)", hh_code_ph:"Codi de 6 lletres",
  hh_create_go:"Crear i obtenir codi", hh_join_go:"Unir-me", hh_default_name:"La meva llar",
  hh_created:"✓ Llar creada · comparteix el codi", hh_joined:"✓ T'has unit a la llar", hh_code_short:"Escriu el codi complet",
  hh_code_bad:"Codi no trobat", hh_code_show:"Codi invitació: {c}", hh_fused_net:"Patrimoni de la llar",
  hh_members_n:"{n} membre(s) amb vista publicada", hh_publish:"Actualitzar la meva vista", hh_pub_ok:"✓ Vista publicada",
  hh_pub_busy:"Publicant…", hh_pub_hint:"Publica quan canviï alguna cosa important. Els altres només veuen la teva instantània.",
  hh_updated:"Actualitzat", hh_leave:"Sortir", hh_leave_q:"Sortir de la llar?", hh_leave_sub:"La teva vista deixarà de mostrar-se. Les dades locals no s'esborren.",
  hh_leave_ok:"Sí, sortir", hh_left:"Has sortit de la llar",
  hh_rls_fix:"El núvol necessita un ajust (migració 0015 a Supabase → SQL Editor). Vegeu docs/HOGAR.md",
  hh_spent_m:"Gastat aquest mes", hh_fixed_m:"Fixes /mes", hh_cats:"Despeses de la llar per categoria",
  hh_fixed_top:"Els seus fixes principals",
  fmp_title:"Fi de mes en pau", fmp_sub:"ritme diari vs el teu pressupost",
  fmp_ok:"Pots gastar {x}/dia fins a fi de mes", fmp_warn:"Vas massa ràpid per al pressupost",
  fmp_over:"Ja has passat el pressupost", fmp_proj:"A aquest ritme acabaries en {x} · queden {d} dies",
  h_pace:"Compara el que portes gastat amb els dies que queden. Si el ritme et fa passar, t'avisa a temps.",
  wl_pace:"Fi de mes en pau", wl_catbudget:"Pressupost per categoria",
  cb_title:"Pressupost per categoria", cb_sub:"límits del mes", cb_empty:"Encara no has posat límits. Toca Editar (ex. super=200, ocio=80).",
  cb_empty_sub:"opcional · barres per categoria", cb_edit:"Límits per categoria",
  cb_edit_sub:"Escriu categoria=import separats per comes. IDs: super, bares, ocio, transporte, compras, hogar, salud…",
  h_catbudget:"Posa un topall a les categories que més et preocupen. La barra es omple amb el gastat aquest mes.",
  rc_title:"Rebut gros a prop", rc_body:"{name}: {x} el dia {d}",
  rc_title_tmrw:"Demà toca rebut", rc_body_tmrw:"{name}: demà es cobren {x}. Si alguna cosa no quadra, encara ets a temps.",
  bn_50:"🟢 Meitat del pressupost del mes: portes {x} de {b}",
  bn_80:"⚠️ 80% del pressupost usat: {x} de {b}",
  bn_95:"🔶 95%! Pressupost gairebé esgotat: {x} de {b}",
  bn_100:"🚨 Pressupost del mes esgotat: {x} de {b}",
});
/* Importador CSV del bróker (Inversiones) */
Object.assign(LANG.es,{
  bi_title:"Importar del bróker (CSV)", bi_sub:"re-ancla posiciones con tu extracto",
  bi_hint:"Exporta tus movimientos desde la app del bróker (en Trade Republic: Perfil → Actividad/Documentos → Exportar CSV) y súbelo aquí, o pega el texto. Todo se procesa EN TU MÓVIL: el fichero no se sube a ningún sitio.",
  bi_file:"📄 Elegir CSV (puedes marcar varios)", bi_paste_ph:"…o pega aquí el contenido del CSV", bi_analyze:"Analizar",
  bi_err:"No he podido leer el CSV (¿formato raro?). Pega unas líneas y dime qué columnas tiene.",
  bi_err_pnl:"Ese es el «Extracto de Pérdidas y Ganancias»: solo trae lo que YA vendiste, no lo que tienes. Necesito el «Extracto de cuenta» (el de arriba del todo en Documentos). Ojo: alguno se llama «trading-account-statement» pero por dentro es el de P&G.",
  met_xau:"Oro (XAU)", met_xag:"Plata (XAG)", met_xpt:"Platino (XPT)", met_xpd:"Paladio (XPD)", bi_oz:"onzas",
  bi_metal_hint:"🥇 Materias primas: Revolut no dice en este extracto cuánto te costaron (esa parte va en el extracto de tu cuenta en €). Re-anclo las ONZAS y el precio del metal se actualiza en vivo. ¿Quieres ver si sube o baja? Escribe abajo lo que te costó en € (lo ves en tu app de Revolut) y ya te pinto el %.",
  bi_metal_cost_ph:"Coste en € (opcional, para ver el %)",
  bi_summary:"{n} posiciones detectadas · {from} → {to}", bi_skipped:"{n} filas no reconocidas (ignoradas)",
  bi_notouch:"— no tocar —", bi_shares:"particip.", bi_ops:"{n} operaciones",
  bi_buys:"{n} compras", bi_sells:"{n} ventas", bi_splits:"{n} splits/traspasos",
  bi_unmatched_hint:"⚠ Las posiciones sin pareja clara se quedan en «no tocar»: elige tú a cuál corresponden (o crear nueva). Cuadra participaciones y coste contra la app de Revolut antes de aplicar — solo se toca lo que mapees.",
  bi_cash_info:"ℹ Detectados {int} de intereses y {div} de dividendos en el extracto. La app no los suma sola: si quieres cuadrar el efectivo, re-ancla el saldo de la cuenta.",
  bi_usd_hint:"Los importes del CSV se leen en €. Cuidado al mapear a posiciones en $ (marcadas).",
  bi_apply:"Aplicar a {n} posiciones", bi_apply_hint:"Al aplicar: participaciones y coste se re-anclan al extracto (verdad del bróker) y el valor se recalcula con el último precio conocido. Justo después, los precios en vivo se actualizan solos por ticker.",
  bi_done:"✓ {n} posiciones re-ancladas con el extracto",
  bi_rev_title:"Importar de Revolut (CSV)", bi_rev_steps_btn:"Cómo exportar el CSV de Revolut",
  bi_rev_steps:["Abre la app de Revolut → pestaña «Invest».","«More» (Más) → «Documents» (Documentos).","«Cuenta de corretaje» → «Extracto de cuenta». NO cojas el de «Pérdidas y Ganancias»: ese solo trae lo que ya vendiste.","¿Tienes oro o plata? Vuelve atrás y repite con «Materias primas» → «Extracto de cuenta». Van en un extracto APARTE: sin él, tus metales no entran.","Formato «Excel», desde la apertura de la cuenta hasta hoy → «Get statement».","En el móvil ábrelo con Google Sheets → «Hacer una copia» y descárgalo como CSV (o guárdalo/compártelo y súbelo aquí).","Sube abajo los dos ficheros a la vez (o pega uno). Se procesa en tu móvil, no se sube a ningún sitio."],
});
Object.assign(LANG.en,{
  bi_title:"Import from broker (CSV)", bi_sub:"re-anchor positions with your statement",
  bi_hint:"Export your transactions from the broker app (Trade Republic: Profile → Activity/Documents → Export CSV) and upload it here, or paste the text. Everything is processed ON YOUR PHONE: the file is never uploaded anywhere.",
  bi_file:"📄 Choose CSV (you can pick several)", bi_paste_ph:"…or paste the CSV content here", bi_analyze:"Analyse",
  bi_err:"Couldn't read the CSV (odd format?). Paste a few lines and tell me its columns.",
  bi_err_pnl:"That's the «Profit and Loss statement»: it only lists what you ALREADY sold, not what you hold. I need the «Account statement» (the top one under Documents). Careful: one of them is named «trading-account-statement» but is a P&L inside.",
  met_xau:"Gold (XAU)", met_xag:"Silver (XAG)", met_xpt:"Platinum (XPT)", met_xpd:"Palladium (XPD)", bi_oz:"oz",
  bi_metal_hint:"🥇 Commodities: this statement doesn't say what they cost you (that part lives in your € account statement). I re-anchor the OUNCES and the metal price updates live. Want to see if it's up or down? Type below what it cost you in € (you'll find it in your Revolut app) and I'll show the %.",
  bi_metal_cost_ph:"Cost in € (optional, to see the %)",
  bi_summary:"{n} positions detected · {from} → {to}", bi_skipped:"{n} unrecognised rows (ignored)",
  bi_notouch:"— don't touch —", bi_shares:"shares", bi_ops:"{n} trades",
  bi_buys:"{n} buys", bi_sells:"{n} sells", bi_splits:"{n} splits/transfers",
  bi_unmatched_hint:"⚠ Positions without a clear match stay on «don't touch»: pick where each one goes (or create new). Square shares and cost against your Revolut app before applying — only what you map gets touched.",
  bi_cash_info:"ℹ Found {int} of interest and {div} of dividends in the statement. The app doesn't add them automatically: to square the cash, re-anchor the account balance.",
  bi_usd_hint:"CSV amounts are read as €. Careful mapping to $ positions (marked).",
  bi_apply:"Apply to {n} positions", bi_apply_hint:"On apply: shares and cost are re-anchored to the statement (broker truth) and value is rescaled to the last known price. Right after, live prices refresh automatically by ticker.",
  bi_done:"✓ {n} positions re-anchored to the statement",
  bi_rev_title:"Import from Revolut (CSV)", bi_rev_steps_btn:"How to export the Revolut CSV",
  bi_rev_steps:["Open the Revolut app → «Invest» tab.","«More» → «Documents».","«Brokerage account» → «Account statement». Do NOT take the «Profit and Loss» one: it only lists what you already sold.","Got gold or silver? Go back and repeat with «Commodities» → «Account statement». They live in a SEPARATE statement: without it your metals don't come in.","Format «Excel», from account opening to today → «Get statement».","On the phone open it with Google Sheets → «Make a copy» and download as CSV (or save/share it and upload here).","Upload both files at once below (or paste one). Processed on your phone, never uploaded."],
});
Object.assign(LANG.ca,{
  bi_title:"Importa del bròker (CSV)", bi_sub:"re-ancora posicions amb el teu extracte",
  bi_hint:"Exporta els teus moviments des de l'app del bròker (Trade Republic: Perfil → Activitat/Documents → Exporta CSV) i puja'l aquí, o enganxa el text. Tot es processa AL TEU MÒBIL: el fitxer no es puja enlloc.",
  bi_file:"📄 Tria CSV (en pots marcar diversos)", bi_paste_ph:"…o enganxa aquí el contingut del CSV", bi_analyze:"Analitza",
  bi_err:"No he pogut llegir el CSV (format estrany?). Enganxa unes línies i digue'm quines columnes té.",
  bi_err_pnl:"Aquest és l'«Extracte de Pèrdues i Guanys»: només porta el que JA has venut, no el que tens. Necessito l'«Extracte de compte» (el de dalt de tot a Documents). Compte: algun es diu «trading-account-statement» però per dins és el de P&G.",
  met_xau:"Or (XAU)", met_xag:"Plata (XAG)", met_xpt:"Platí (XPT)", met_xpd:"Pal·ladi (XPD)", bi_oz:"unces",
  bi_metal_hint:"🥇 Matèries primeres: en aquest extracte Revolut no diu quant et van costar (aquesta part va a l'extracte del teu compte en €). Re-ancoro les UNCES i el preu del metall s'actualitza en viu. Vols veure si puja o baixa? Escriu a sota el que et va costar en € (ho veus a la teva app de Revolut) i et pinto el %.",
  bi_metal_cost_ph:"Cost en € (opcional, per veure el %)",
  bi_summary:"{n} posicions detectades · {from} → {to}", bi_skipped:"{n} files no reconegudes (ignorades)",
  bi_notouch:"— no tocar —", bi_shares:"particip.", bi_ops:"{n} operacions",
  bi_buys:"{n} compres", bi_sells:"{n} vendes", bi_splits:"{n} splits/traspassos",
  bi_unmatched_hint:"⚠ Les posicions sense parella clara es queden a «no tocar»: tria tu a quina corresponen (o crear-ne una de nova). Quadra participacions i cost amb l'app de Revolut abans d'aplicar — només es toca el que mapegis.",
  bi_cash_info:"ℹ Detectats {int} d'interessos i {div} de dividends a l'extracte. L'app no els suma sola: per quadrar l'efectiu, re-ancora el saldo del compte.",
  bi_usd_hint:"Els imports del CSV es llegeixen en €. Compte en mapar a posicions en $ (marcades).",
  bi_apply:"Aplica a {n} posicions", bi_apply_hint:"En aplicar: participacions i cost es re-ancoren a l'extracte (veritat del bròker) i el valor es recalcula amb l'últim preu conegut. Just després, els preus en viu s'actualitzen sols per ticker.",
  bi_done:"✓ {n} posicions re-ancorades amb l'extracte",
  bi_rev_title:"Importa de Revolut (CSV)", bi_rev_steps_btn:"Com exportar el CSV de Revolut",
  bi_rev_steps:["Obre l'app de Revolut → pestanya «Invest».","«More» (Més) → «Documents».","«Compte de corretatge» → «Extracte de compte». NO agafis el de «Pèrdues i Guanys»: aquell només porta el que ja has venut.","Tens or o plata? Torna enrere i repeteix amb «Matèries primeres» → «Extracte de compte». Van en un extracte A PART: sense ell, els teus metalls no entren.","Format «Excel», des de l'obertura del compte fins avui → «Get statement».","Al mòbil obre'l amb Google Sheets → «Fes una còpia» i descarrega'l com a CSV (o desa'l/comparteix-lo i puja'l aquí).","Puja a sota els dos fitxers alhora (o enganxa'n un). Es processa al teu mòbil, no es puja enlloc."],
});
/* Mini-tutoriales por pestaña (backlog 2026-07: «tu pareja no encontraba el lápiz de editar gastos») */
Object.assign(LANG.es,{
  coach_btn:"¿Cómo va esto?", coach_title:"Trucos de «{tab}»", coach_ok:"¡Entendido!",
  coach_dash:["Desliza a los lados para cambiar de pestaña (o toca los puntitos de abajo).","El ⚙️ de arriba abre Ajustes: tema, idioma, bancos, copias… ahora con buscador.","¿Más o menos tarjetas en el Resumen? Ajustes → Personalización → «Personalizar widgets»."],
  coach_metas:["Una meta es una hucha: ponle nombre, emoji e importe objetivo.","Apunta lo que ya llevas y ve actualizándolo: la barra enseña el progreso.","Puedes ponerle fecha límite y una aportación mensual para verla venir."],
  coach_logros:["Aquí no hay que rellenar nada: las insignias se desbloquean solas usando la app y ahorrando.","Tu nivel sube con la constancia — de Aprendiz a Maestro del ahorro."],
  coach_gastos:["Aquí SOLO el gasto VARIABLE: súper, bares, ropa, gasolina… NO la luz, el móvil ni la hipoteca (eso es Fijos).","Nómina, Bizum recibido u otros cobros: «+» → Ingreso, o filtra el chip 💰 Ingreso. Así ves el balance del mes sin mezclar recibos.","Arriba filtras por mes, categoría y banco (Caixa, TR, a mano…). Varios bancos de tarjeta: Ajustes → Bancos → «También apuntar gastos de…».","Trade Republic se apunta solo con las notis. Toca un gasto para editarlo (✎) o borrar; la categoría se recuerda por comercio."],
  coach_fijos:["Aquí van los pagos FIJOS que se repiten: luz, agua, móvil, Netflix, hipoteca, cuotas… NO las compras del día a día (esas van en Gastos).","Si tienes el banco conectado, la tarjeta «Conciliación» te propone lo que el banco ya cobró: toca «Confirmar y apuntar» y no hace falta teclear todo.","Las cuotas de deuda entran solas desde Deudas; no las dupliques. Para un pago de una vez usa «Cargos puntuales»."],
  coach_inv:["Conecta Trade Republic o MyInvestor, o importa el CSV de Revolut, desde sus tarjetas (beta): re-anclan tus posiciones con la verdad del bróker.","Lo manual también vale: añade una posición y edítala tocándola.","La calculadora de proyección simula cuánto tendrás aportando X al mes."],
  coach_patri:["Tu foto completa: cuentas, inversiones y bienes, todo sumado.","Al editar una cuenta, elige su rol: «Recibos» = fijos/cuotas; «Gasto diario» = compras del día a día (solo una); «Todo» = ambas cosas. Si el día a día va con OTRO banco, márcalo en Ajustes → Bancos.","Lo conectado (banco/bróker) se refresca solo; lo manual se edita tocándolo."],
  coach_debt:["El pendiente baja solo cada mes con lo que amortizas; cuando te llegue el saldo real del banco, edítalo y se re-ancla.","💸 «Amortizar» adelanta pago: baja el pendiente y acorta el plazo (misma cuota, menos meses).","💡 En «¿Cuándo amortizar?» pones el interés de la deuda y te digo cuánto ahorras y si te compensa."],
  coach_compartido:["Grupos para gastos a medias (viaje, casa, cena): añade personas y apunta quién pagó qué.","La app calcula el reparto y quién debe a quién."],
});
Object.assign(LANG.en,{
  coach_btn:"How does this work?", coach_title:"Tips for “{tab}”", coach_ok:"Got it!",
  coach_dash:["Swipe sideways to switch tabs (or tap the dots below).","The ⚙️ up top opens Settings: theme, language, banks, backups… now with a search box.","Want more or fewer cards on the Summary? Settings → Customisation → “Customise widgets”."],
  coach_metas:["A goal is a piggy bank: give it a name, an emoji and a target amount.","Log what you've saved so far and keep it updated: the bar shows progress.","Add a deadline and a monthly contribution to see it coming."],
  coach_logros:["Nothing to fill in here: badges unlock by themselves as you use the app and save.","Your level grows with consistency — from Apprentice to Savings Master."],
  coach_gastos:["VARIABLE spending only: groceries, bars, clothes, fuel… NOT power, phone or mortgage (those are Fixed).","Salary, Bizum received or other money in: “+” → Income, or filter the 💰 Income chip — see the month's balance without mixing bills.","Filter by month, category and bank up top (Caixa, TR, manual…). Several card banks: Settings → Banks → “Also log card spending from…”.","Trade Republic logs itself from notifications. Tap an expense to edit (✎) or delete; category is remembered per merchant."],
  coach_fijos:["FIXED recurring payments live here: power, water, phone, Netflix, mortgage, instalments… NOT day-to-day purchases (those go in Spending).","With a bank connected, “Reconciliation” suggests what the bank already charged — tap “Confirm and log” so you don't type everything.","Debt instalments flow in from Debts; don't duplicate. For one-offs use “One-off charges”."],
  coach_inv:["Connect Trade Republic or MyInvestor, or import the Revolut CSV, from their cards (beta): they re-anchor your positions to the broker's truth.","Manual works too: add a position and tap it to edit.","The projection calculator simulates what you'd have contributing X per month."],
  coach_patri:["Your full picture: accounts, investments and assets, all added up.","When editing an account, pick its role: “Bills” = fixed/instalments; “Daily spending” = day-to-day (only one); “Everything” = both. If day-to-day is on ANOTHER bank, tick it in Settings → Banks.","Connected stuff (bank/broker) refreshes itself; manual entries are edited by tapping."],
  coach_debt:["The outstanding drops by itself each month by what you amortise; when the bank's real balance arrives, edit it and it re-anchors.","💸 “Pay down” makes an early payment: the balance drops and the term shortens (same instalment, fewer months).","💡 In “When to pay down?” set the debt's interest and I'll tell you what you save and whether it's worth it."],
  coach_compartido:["Groups for shared expenses (trip, house, dinner): add people and log who paid what.","The app works out the split and who owes whom."],
});
Object.assign(LANG.ca,{
  coach_btn:"Com va això?", coach_title:"Trucs de «{tab}»", coach_ok:"Entesos!",
  coach_dash:["Llisca als costats per canviar de pestanya (o toca els puntets de sota).","L'⚙️ de dalt obre Ajustos: tema, idioma, bancs, còpies… ara amb cercador.","Més o menys targetes al Resum? Ajustos → Personalització → «Personalitza widgets»."],
  coach_metas:["Una meta és una guardiola: posa-li nom, emoji i import objectiu.","Apunta el que ja portes i ves actualitzant-ho: la barra ensenya el progrés.","Pots posar-li data límit i una aportació mensual per veure-la venir."],
  coach_logros:["Aquí no cal omplir res: les insígnies es desbloquegen soles fent servir l'app i estalviant.","El teu nivell puja amb la constància — d'Aprenent a Mestre de l'estalvi."],
  coach_gastos:["Aquí NOMÉS la despesa VARIABLE: súper, bars, roba, benzina… NO la llum, el mòbil ni la hipoteca (això és Fixes).","Nòmina, Bizum rebut o altres cobraments: «+» → Ingrés, o filtra el xip 💰 Ingrés. Així veus el balanç del mes sense barrejar rebuts.","A dalt filtres per mes, categoria i banc (Caixa, TR, a mà…). Diversos bancs de targeta: Ajustos → Bancs → «També apuntar despeses de…».","Trade Republic s'apunta sol amb les notis. Toca una despesa per editar-la (✎) o esborrar; la categoria es recorda per comerç."],
  coach_fijos:["Aquí van els pagaments FIXOS que es repeteixen: llum, aigua, mòbil, Netflix, hipoteca, quotes… NO les compres del dia a dia (aquestes van a Despeses).","Si tens el banc connectat, la targeta «Conciliació» et proposa el que el banc ja ha cobrat: toca «Confirma i apunta» i no cal teclejar-ho tot.","Les quotes de deute entren soles des de Deutes; no les dupliquis. Per a un pagament d'una vegada fes servir «Càrrecs puntuals»."],
  coach_inv:["Connecta Trade Republic o MyInvestor, o importa el CSV de Revolut, des de les seves targetes (beta): re-ancoren les teves posicions amb la veritat del bròker.","Lo manual també val: afegeix una posició i edita-la tocant-la.","La calculadora de projecció simula quant tindràs aportant X al mes."],
  coach_patri:["La teva foto completa: comptes, inversions i béns, tot sumat.","En editar un compte, tria el rol: «Rebuts» = fixos/quotes; «Despesa diària» = compres del dia a dia (només un); «Tot» = les dues coses. Si el dia a dia va amb UN ALTRE banc, marca'l a Ajustos → Bancs.","El que està connectat (banc/bròker) es refresca sol; el manual s'edita tocant-lo."],
  coach_debt:["El pendent baixa sol cada mes amb el que amortitzes; quan t'arribi el saldo real del banc, edita'l i es re-ancora.","💸 «Amortitza» avança pagament: baixa el pendent i s'escurça el termini (mateixa quota, menys mesos).","💡 A «Quan amortitzar?» poses l'interès del deute i et dic quant estalvies i si et compensa."],
  coach_compartido:["Grups per a despeses a mitges (viatge, casa, sopar): afegeix persones i apunta qui va pagar què.","L'app calcula el repartiment i qui deu a qui."],
});
/* Sincronización Trade Republic (beta · nativa en Android) */
Object.assign(LANG.es,{
  tr_title:"Conectar Trade Republic", tr_sub:"un botón · trae tus posiciones",
  tr_hint:"Posiciones y efectivo al momento · solo lectura · conexión no oficial (puede pedir el 2FA).",
  tr_beta:"BETA",
  tr_web_only:"Esta conexión funciona dentro de la app de Android (necesita un navegador real para el acceso seguro de TR). Ábrelo desde la app del móvil.",
  na_toast:"⚠ El apunte automático de gastos está desactivado — actívalo en Ajustes",
  na_body:"⚠ El apunte automático de gastos (lector de notificaciones de TR) no tiene permiso — los gastos NO entran solos. Pasa al reinstalar la app: actívalo para Mi Cartera.",
  na_fix:"Activar acceso a notificaciones",
  na_restricted:"Si Android dice «acceso denegado» o «ajuste restringido» (pasa al instalar la app fuera de la Play Store): ve a Ajustes de Android → Aplicaciones → Mi Cartera → menú ⋮ (arriba a la derecha) → «Permitir ajustes restringidos», y vuelve a intentarlo. Es una sola vez.",
  tr_tos:"Conexión no oficial · puede pedir el 2FA de vez en cuando · tus credenciales no salen del móvil.",
  tr_phone_ph:"Teléfono (+34…)", tr_pin_ph:"PIN de Trade Republic",
  tr_connect:"Conectar", tr_connecting:"Conectando…",
  tr_code_intro:"Mete el código de 4 dígitos que te ha llegado a la app de Trade Republic (o por SMS).",
  tr_code_ph:"Código de 4 dígitos", tr_verify:"Verificar", tr_verifying:"Verificando…",
  tr_sync:"Sincronizar ahora", tr_syncing:"Trayendo posiciones…",
  tr_connected:"✓ Conectado a Trade Republic",
  tr_disconnect:"Desconectar",
  tr_preview:"{n} posiciones traídas de Trade Republic. Revisa el mapeo y aplica:",
  tr_cash:"Efectivo en TR: {x} · al aplicar se actualiza también tu cuenta TR",
  g_edit:"Editar", g_edited:"✓ Gasto corregido",
  rec_hide:"Ocultar aviso",
  pt_name_ph:"Nombre (ej. Personal)",
  pt_acc_del:"Quitar cuenta", pt_acc_del_q:"¿Quitar esta cuenta del patrimonio?", pt_acc_del_yes:"Sí, quitar", pt_acc_del_no:"Cancelar", pt_acc_del_hint:"Quita del patrimonio una cuenta que añadiste a mano (p. ej. de una pareja que ya no usas). Si la cuenta está conectada al banco, desconéctala en Ajustes → Bancos.",
  ob2_claim:"Tu dinero claro y sin trabajo: gastos que se apuntan solos, tus bancos conectados y tus inversiones al día.",
  ob2_f1_t:"Gastos sin teclear", ob2_f1_d:"Apunta un gasto en dos toques… o deja que entren solos con tu tarjeta de Trade Republic.",
  ob2_f2_t:"Tus fijos, vigilados", ob2_f2_d:"Recibos, nómina y cuotas con su calendario: sabrás si llegas a fin de mes antes de que pase.",
  ob2_f3_t:"Bancos e inversiones", ob2_f3_d:"Conecta tus bancos (Open Banking) y tu bróker, y mira tu patrimonio entero en un sitio.",
  ob2_f4_t:"Metas y retos", ob2_f4_d:"Ponte metas de ahorro con previsión de cuándo las cumples — con confeti incluido.",
  ob2_go:"Empezar", ob2_next:"Siguiente",
  ob2_budget_t:"¿Cuánto quieres gastar al mes?", ob2_budget_d:"Tu presupuesto para el día a día (súper, bares, caprichos…). La app te avisa antes de pasarte.",
  ob2_budget_h:"Lo cambias cuando quieras desde el Resumen o Ajustes.",
  ob2_acc_t:"Tus cuentas", ob2_acc_d:"Añade tus bancos con el saldo de hoy para ver tu dinero total. Si prefieres, sáltatelo: también se pueden conectar por Open Banking después.",
  ob2_acc_h:"Todo se puede editar luego en Patrimonio y Ajustes.",
  ob3_t:"¿Deudas o inversiones?", ob3_d:"Opcional — puedes saltarlo y añadirlo luego en sus pestañas.",
  ob3_debt:"Una deuda (opcional)", ob3_debt_name:"Nombre (ej. Hipoteca)", ob3_debt_val:"Saldo pendiente €", ob3_debt_monthly:"Cuota/mes €",
  ob3_inv:"Una inversión (opcional)", ob3_inv_name:"Nombre (ej. MSCI World)", ob3_inv_val:"Valor actual €",
  ob3_skip:"Saltar — empezar ya", ob3_finish:"Listo — entrar a Mi Cartera",
  ob_hint_t:"Primeros pasos", ob_hint_d:"Conecta tu banco en Ajustes, activa el apunte de Trade Republic o importa gastos cuando quieras.",
  ob_hint_go:"Abrir Ajustes", ob_hint_dismiss:"Entendido",
  tr_createnew:"➕ Crear como posición nueva", tr_apply:"Aplicar a {n} posiciones", tr_apply_hint:"Al aplicar: participaciones, valor y coste se re-anclan con lo que dice Trade Republic ahora mismo (es dato en vivo, no hace falta actualizar precios).",
  tr_done:"✓ {n} posiciones actualizadas desde Trade Republic",
  tr_err:"No se pudo conectar con Trade Republic. Revisa teléfono/PIN o el código, e inténtalo otra vez.",
  tr_expired_re:"Tu sesión de Trade Republic caducó de verdad. Vuelve a conectar: el teléfono ya está puesto — solo PIN y el código nuevo.",
  mi_title:"Conectar MyInvestor", mi_sub:"trae tus fondos indexados",
  mi_expired:"Tu sesión de MyInvestor caducó y no se pudo renovar sola. Vuelve a entrar (usuario recordado): contraseña y, si lo pide, el código SMS.",
  mi_hint:"Login con tu usuario de MyInvestor · la contraseña no se guarda nunca.",
  mi_need_login:"Para conectar MyInvestor primero inicia sesión en Mi Cartera (arriba, «Iniciar sesión»).",
  mi_user_ph:"Usuario / DNI de MyInvestor", mi_pass_ph:"Contraseña de MyInvestor",
  mi_connect:"Conectar", mi_connecting:"Conectando…", mi_nostore:"🔒 Tu contraseña no se guarda. Viaja cifrada solo para el login.",
  mi_otp_intro:"MyInvestor te ha mandado un código por SMS. Escríbelo aquí:", mi_otp_ph:"Código SMS", mi_verify:"Verificar", mi_verifying:"Verificando…",
  mi_recaptcha:"🛡 El anti-bot de MyInvestor pide captcha ahora mismo y la app no puede resolverlo. No insistas seguido (alarga el bloqueo): espera unas horas y reintenta desde el WiFi de casa. Suele desbloquearse solo.",
  mi_connected:"✓ MyInvestor conectado", mi_sync:"Sincronizar posiciones", mi_syncing:"Sincronizando…", mi_disconnect:"Desconectar",
  mi_preview:"{n} posiciones encontradas. Elige a cuál de tus posiciones va cada una:",
  mi_apply:"Aplicar a {n} posiciones", mi_done:"✓ {n} posiciones actualizadas desde MyInvestor",
  mi_err:"No se pudo conectar con MyInvestor. Revisa usuario/contraseña o el código, e inténtalo otra vez.",
});
Object.assign(LANG.en,{
  tr_title:"Connect Trade Republic", tr_sub:"one button · pulls your positions",
  tr_hint:"Positions and cash in one tap · read-only · unofficial connection (may ask for 2FA).",
  tr_beta:"BETA",
  tr_web_only:"This connection runs inside the Android app (it needs a real browser for TR's secure login). Open it from the mobile app.",
  na_toast:"⚠ Automatic expense capture is off — enable it in Settings",
  na_body:"⚠ Automatic expense capture (TR notification reader) has no permission — expenses will NOT come in on their own. This happens after reinstalling: enable it for Mi Cartera.",
  na_fix:"Enable notification access",
  na_restricted:"If Android says \"access denied\" or \"restricted setting\" (happens when the app is installed outside the Play Store): go to Android Settings → Apps → Mi Cartera → ⋮ menu (top right) → \"Allow restricted settings\", then try again. One time only.",
  tr_tos:"Unofficial connection · may ask for 2FA now and then · your credentials never leave the phone.",
  tr_phone_ph:"Phone (+34…)", tr_pin_ph:"Trade Republic PIN",
  tr_connect:"Connect", tr_connecting:"Connecting…",
  tr_code_intro:"Enter the 4-digit code sent to your Trade Republic app (or by SMS).",
  tr_code_ph:"4-digit code", tr_verify:"Verify", tr_verifying:"Verifying…",
  tr_sync:"Sync now", tr_syncing:"Pulling positions…",
  tr_connected:"✓ Connected to Trade Republic",
  tr_disconnect:"Disconnect",
  tr_preview:"{n} positions pulled from Trade Republic. Check the mapping and apply:",
  tr_cash:"Cash in TR: {x} · applying also updates your TR account",
  g_edit:"Edit", g_edited:"✓ Expense fixed",
  rec_hide:"Hide alert",
  pt_name_ph:"Name (e.g. Personal)",
  pt_acc_del:"Remove account", pt_acc_del_q:"Remove this account from net worth?", pt_acc_del_yes:"Yes, remove", pt_acc_del_no:"Cancel", pt_acc_del_hint:"Removes from net worth an account you added by hand (e.g. a partner's you no longer use). If the account is connected to a bank, disconnect it in Settings → Banks.",
  ob2_claim:"Your money, clear and effortless: expenses that log themselves, your banks connected and your investments up to date.",
  ob2_f1_t:"No-typing expenses", ob2_f1_d:"Log an expense in two taps… or let them come in on their own with your Trade Republic card.",
  ob2_f2_t:"Your bills, watched", ob2_f2_d:"Bills, payroll and instalments on their calendar: you'll know if you make it to month's end before it happens.",
  ob2_f3_t:"Banks & investments", ob2_f3_d:"Connect your banks (Open Banking) and your broker, and see your whole net worth in one place.",
  ob2_f4_t:"Goals & challenges", ob2_f4_d:"Set savings goals with a forecast of when you'll hit them — confetti included.",
  ob2_go:"Start", ob2_next:"Next",
  ob2_budget_t:"How much do you want to spend per month?", ob2_budget_d:"Your day-to-day budget (groceries, eating out, treats…). The app warns you before you go over.",
  ob2_budget_h:"You can change it anytime from Overview or Settings.",
  ob2_acc_t:"Your accounts", ob2_acc_d:"Add your banks with today's balance to see your total money. Or skip it: you can also connect them via Open Banking later.",
  ob2_acc_h:"Everything can be edited later in Wealth and Settings.",
  ob3_t:"Debts or investments?", ob3_d:"Optional — skip and add them later in their tabs.",
  ob3_debt:"One debt (optional)", ob3_debt_name:"Name (e.g. Mortgage)", ob3_debt_val:"Outstanding balance €", ob3_debt_monthly:"Payment/mo €",
  ob3_inv:"One investment (optional)", ob3_inv_name:"Name (e.g. MSCI World)", ob3_inv_val:"Current value €",
  ob3_skip:"Skip — start now", ob3_finish:"Done — open Mi Cartera",
  ob_hint_t:"First steps", ob_hint_d:"Connect your bank in Settings, turn on Trade Republic logging, or import expenses whenever you like.",
  ob_hint_go:"Open Settings", ob_hint_dismiss:"Got it",
  tr_createnew:"➕ Create as a new position", tr_apply:"Apply to {n} positions", tr_apply_hint:"On apply: shares, value and cost are re-anchored to what Trade Republic says right now (live data, no need to refresh prices).",
  mi_title:"Connect MyInvestor", mi_sub:"pulls your index funds",
  mi_expired:"Your MyInvestor session expired and couldn't renew itself. Sign in again (username remembered): password and, if asked, the SMS code.",
  mi_hint:"Log in with your MyInvestor user · the password is never stored.",
  mi_need_login:"To connect MyInvestor, first sign in to Mi Cartera (top, «Sign in»).",
  mi_user_ph:"MyInvestor username / ID", mi_pass_ph:"MyInvestor password",
  mi_connect:"Connect", mi_connecting:"Connecting…", mi_nostore:"🔒 Your password is never stored. It travels encrypted only for the login.",
  mi_otp_intro:"MyInvestor texted you a code. Type it here:", mi_otp_ph:"SMS code", mi_verify:"Verify", mi_verifying:"Verifying…",
  mi_recaptcha:"🛡 MyInvestor's anti-bot is demanding a captcha and the app can't solve it. Don't retry repeatedly (it extends the block): wait a few hours and retry from your home WiFi. It usually clears on its own.",
  mi_connected:"✓ MyInvestor connected", mi_sync:"Sync positions", mi_syncing:"Syncing…", mi_disconnect:"Disconnect",
  mi_preview:"{n} positions found. Choose which of your positions each maps to:",
  mi_apply:"Apply to {n} positions", mi_done:"✓ {n} positions updated from MyInvestor",
  mi_err:"Couldn't connect to MyInvestor. Check username/password or the code, and try again.",
  tr_done:"✓ {n} positions updated from Trade Republic",
  tr_err:"Couldn't connect to Trade Republic. Check phone/PIN or the code, and try again.",
  tr_expired_re:"Your Trade Republic session really expired. Reconnect: your phone is already filled in — just PIN and a fresh code.",
});
Object.assign(LANG.ca,{
  tr_title:"Connecta Trade Republic", tr_sub:"un botó · porta les teves posicions",
  tr_hint:"Posicions i efectiu a l'instant · només lectura · connexió no oficial (pot demanar el 2FA).",
  tr_beta:"BETA",
  tr_web_only:"Aquesta connexió funciona dins l'app d'Android (necessita un navegador real per a l'accés segur de TR). Obre-ho des de l'app del mòbil.",
  na_toast:"⚠ L'apunt automàtic de despeses està desactivat — activa'l a Ajustos",
  na_body:"⚠ L'apunt automàtic de despeses (lector de notificacions de TR) no té permís — les despeses NO entren soles. Passa en reinstal·lar l'app: activa'l per a Mi Cartera.",
  na_fix:"Activar accés a notificacions",
  na_restricted:"Si Android diu «accés denegat» o «configuració restringida» (passa en instal·lar l'app fora de la Play Store): ves a Configuració d'Android → Aplicacions → Mi Cartera → menú ⋮ (a dalt a la dreta) → «Permet configuracions restringides», i torna-ho a provar. Només un cop.",
  tr_tos:"Connexió no oficial · pot demanar el 2FA de tant en tant · les credencials no surten del mòbil.",
  tr_phone_ph:"Telèfon (+34…)", tr_pin_ph:"PIN de Trade Republic",
  tr_connect:"Connecta", tr_connecting:"Connectant…",
  tr_code_intro:"Posa el codi de 4 dígits que t'ha arribat a l'app de Trade Republic (o per SMS).",
  tr_code_ph:"Codi de 4 dígits", tr_verify:"Verifica", tr_verifying:"Verificant…",
  tr_sync:"Sincronitza ara", tr_syncing:"Portant posicions…",
  tr_connected:"✓ Connectat a Trade Republic",
  tr_disconnect:"Desconnecta",
  tr_preview:"{n} posicions portades de Trade Republic. Revisa el mapatge i aplica:",
  tr_cash:"Efectiu a TR: {x} · en aplicar s'actualitza també el teu compte TR",
  g_edit:"Edita", g_edited:"✓ Despesa corregida",
  rec_hide:"Amaga l'avís",
  pt_name_ph:"Nom (ex. Personal)",
  pt_acc_del:"Treu compte", pt_acc_del_q:"Treure aquest compte del patrimoni?", pt_acc_del_yes:"Sí, treu", pt_acc_del_no:"Cancel·la", pt_acc_del_hint:"Treu del patrimoni un compte que vas afegir a mà (p. ex. d'una parella que ja no fas servir). Si el compte està connectat al banc, desconnecta'l a Configuració → Bancs.",
  ob2_claim:"Els teus diners clars i sense feina: despeses que s'apunten soles, els teus bancs connectats i les inversions al dia.",
  ob2_f1_t:"Despeses sense teclejar", ob2_f1_d:"Apunta una despesa en dos tocs… o deixa que entrin soles amb la teva targeta de Trade Republic.",
  ob2_f2_t:"Les teves fixes, vigilades", ob2_f2_d:"Rebuts, nòmina i quotes amb el seu calendari: sabràs si arribes a final de mes abans que passi.",
  ob2_f3_t:"Bancs i inversions", ob2_f3_d:"Connecta els teus bancs (Open Banking) i el teu bròquer, i mira tot el teu patrimoni en un sol lloc.",
  ob2_f4_t:"Metes i reptes", ob2_f4_d:"Posa't metes d'estalvi amb previsió de quan les compliràs — amb confeti inclòs.",
  ob2_go:"Comença", ob2_next:"Següent",
  ob2_budget_t:"Quant vols gastar al mes?", ob2_budget_d:"El teu pressupost del dia a dia (súper, bars, capricis…). L'app t'avisa abans de passar-te.",
  ob2_budget_h:"El canvies quan vulguis des del Resum o Ajustos.",
  ob2_acc_t:"Els teus comptes", ob2_acc_d:"Afegeix els teus bancs amb el saldo d'avui per veure els teus diners totals. O salta-t'ho: també es poden connectar per Open Banking després.",
  ob2_acc_h:"Tot es pot editar després a Patrimoni i Ajustos.",
  ob3_t:"Deutes o inversions?", ob3_d:"Opcional — salta-ho i afegeix-ho després a les seves pestanyes.",
  ob3_debt:"Un deute (opcional)", ob3_debt_name:"Nom (p. ex. Hipoteca)", ob3_debt_val:"Saldo pendent €", ob3_debt_monthly:"Quota/mes €",
  ob3_inv:"Una inversió (opcional)", ob3_inv_name:"Nom (p. ex. MSCI World)", ob3_inv_val:"Valor actual €",
  ob3_skip:"Saltar — començar ja", ob3_finish:"Fet — entrar a Mi Cartera",
  ob_hint_t:"Primers passos", ob_hint_d:"Connecta el teu banc a Ajustos, activa l'apunt de Trade Republic o importa despeses quan vulguis.",
  ob_hint_go:"Obrir Ajustos", ob_hint_dismiss:"Entesos",
  tr_createnew:"➕ Crea com a posició nova", tr_apply:"Aplica a {n} posicions", tr_apply_hint:"En aplicar: participacions, valor i cost es re-ancoren amb el que diu Trade Republic ara mateix (és dada en viu, no cal actualitzar preus).",
  mi_title:"Connecta MyInvestor", mi_sub:"porta els teus fons indexats",
  mi_expired:"La teva sessió de MyInvestor ha caducat i no s'ha pogut renovar sola. Torna a entrar (usuari recordat): contrasenya i, si el demana, el codi SMS.",
  mi_hint:"Login amb el teu usuari de MyInvestor · la contrasenya no es desa mai.",
  mi_need_login:"Per connectar MyInvestor primer inicia sessió a Mi Cartera (a dalt, «Inicia sessió»).",
  mi_user_ph:"Usuari / DNI de MyInvestor", mi_pass_ph:"Contrasenya de MyInvestor",
  mi_connect:"Connecta", mi_connecting:"Connectant…", mi_nostore:"🔒 La teva contrasenya no es desa. Viatja xifrada només per al login.",
  mi_otp_intro:"MyInvestor t'ha enviat un codi per SMS. Escriu-lo aquí:", mi_otp_ph:"Codi SMS", mi_verify:"Verifica", mi_verifying:"Verificant…",
  mi_recaptcha:"🛡 L'anti-bot de MyInvestor demana captcha ara mateix i l'app no pot resoldre'l. No insisteixis seguit (allarga el bloqueig): espera unes hores i torna-ho a provar des del WiFi de casa. Sol desbloquejar-se sol.",
  mi_connected:"✓ MyInvestor connectat", mi_sync:"Sincronitza posicions", mi_syncing:"Sincronitzant…", mi_disconnect:"Desconnecta",
  mi_preview:"{n} posicions trobades. Tria a quina de les teves posicions va cada una:",
  mi_apply:"Aplica a {n} posicions", mi_done:"✓ {n} posicions actualitzades des de MyInvestor",
  mi_err:"No s'ha pogut connectar amb MyInvestor. Revisa usuari/contrasenya o el codi, i torna-ho a provar.",
  tr_done:"✓ {n} posicions actualitzades des de Trade Republic",
  tr_err:"No s'ha pogut connectar amb Trade Republic. Revisa telèfon/PIN o el codi, i torna-ho a provar.",
  tr_expired_re:"La teva sessió de Trade Republic ha caducat de debò. Torna a connectar: el telèfon ja està posat — només PIN i el codi nou.",
});
// meses traducidos (largos y cortos)
const MON_I18N = {
  es:{ long:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"], short:["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"] },
  en:{ long:["January","February","March","April","May","June","July","August","September","October","November","December"], short:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] },
  ca:{ long:["gener","febrer","març","abril","maig","juny","juliol","agost","setembre","octubre","novembre","desembre"], short:["Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"] },
};
const monthLong  = (i)=> ((MON_I18N[CURLANG]||MON_I18N.es).long[i])||"";
const monthShort = (i)=> ((MON_I18N[CURLANG]||MON_I18N.es).short[i])||"";
const LOCALE = { es:"es-ES", en:"en-GB", ca:"ca-ES" };
const loc = ()=> LOCALE[CURLANG] || "es-ES";

/* --- Diccionario: pestaña RESUMEN (Dashboard) --- */
Object.assign(LANG.es,{
  d_networth:"Patrimonio neto", d_assets:"Activos", d_debts:"Deudas", d_dist:"Distribución de activos",
  hp_hint:"mantén pulsada la cifra para oírla",
  d_liquid:"Liquidez", d_invest:"Inversiones", d_goods:"Bienes",
  d_budget:"Presupuesto", d_streak:"Racha sin pasarte", d_months:"meses",
  d_inbudget:"{m} va dentro de límite ✓", d_overbudget:"{m} se ha pasado",
  d_guilt_ok:"para gastar sin culpa este mes 😎", d_guilt_over_a:"Este mes te has pasado ",
  d_fixed:"Gastos fijos", d_fixed_sub:"media/mes · este mes {x}", d_saving:"Ahorro", d_saving_sub:"al mes a inversión",
  d_saving_card:"¿A dónde va tu ahorro?", d_saving_card_sub:"{x}/mes a inversión", d_saving_total:"Total ahorrado/mes",
  d_culprit:"Categoría culpable", d_culprit_sub:"Lo que más gastas en {m}",
  d_trend:"Esto vs tu media", d_trend_sub:"Gasto del mes por categoría vs tu media", d_trend_avg:"media {x}", d_trend_hint:"▲ por encima de tu media de meses anteriores · ▼ por debajo.", d_trend_nodata:"Aparecerá en cuanto tengas 2+ meses de datos en alguna categoría. Sigue apuntando 😉",
  recap_title:"📅 Cómo fue {m}", recap_spent:"gastado", recap_under:"bajo presupuesto 🟢", recap_over:"sobre presupuesto 🔴", recap_subs:"subs activas", recap_ok:"¡Entendido!",
  d_noexp_t:"Aún sin gastos", d_noexp_d:"Sincroniza o apunta un gasto.", d_culprit_hint:"👑 {name} se lleva {pct}% de tu gasto este mes.",
  wl_budget:"Presupuesto y racha", wl_culpa:"Sin culpa (lo que te queda)", wl_fixedsave:"Gastos fijos y ahorro", wl_savings:"A dónde va tu ahorro",
  wl_letter:"Resumen del mes (carta)",
  lt_title:"{m}, hasta ahora", lt_open_good:"Vas con calma.", lt_open_tight:"Vas ajustando bien.", lt_open_over:"Este mes te has estirado un poco.",
  lt_spent:"Has gastado {s} de los {b} que te marcaste", lt_rem_ok:": te quedan {r} para lo que quieras sin darle vueltas.", lt_rem_over:": te has pasado {r}, nada grave — el mes que viene lo ajustas.",
  lt_top:" {cat} se lleva la mayor parte, como casi siempre.", lt_net_up:" Tu patrimonio ha subido un poco este mes.", lt_net_down:" Tu patrimonio ha bajado un poco este mes.",
  personalize:"✎ Personalizar", done:"Listo ✓", drag_hint:"mantén pulsada una tarjeta para moverla",
  et_tabs:"✎ Editar pestañas", et_intro:"Antes las pestañas se movían manteniendo una pulsada y arrastrándola (un gesto oculto, fácil de tocar sin querer). Ahora se editan aquí: reordénalas con ▲▼, quita con ✕ o vuelve a añadir con +.", et_fixed:"fija", et_hidden:"Pestañas ocultas (toca para añadirlas):",
  w_fixed:"fijo", w_hide:"Ocultar", w_show:"Mostrar",
  // Gastos
  g_month:"Este mes", g_last:"Mes pasado", g_cycle:"Mi ciclo", g_3m:"Últimos 3 meses", g_all:"Todo", g_custom:"Rango…", g_allcats:"Todas",
  g_allbanks:"Todos los bancos", g_bank_manual:"A mano",
  ai_cat_btn:"✨ Sugerir categoría", ai_cat_busy:"Pensando…", ai_cat_ok:"✓ Categoría: {c}", ai_cat_none:"No hay sugerencia clara — elige a mano", ai_cat_off:"Activa «Sugerir categoría (IA)» en Ajustes → Notificaciones",
  g_cycle_from:"Del {d} (cobro de {x}) a hoy",
  g_cycle_none_t:"Sin nómina detectada",
  g_cycle_none:"Para ajustar «Mi ciclo» hace falta tu nómina. Apúntala como 💰 ingreso (con +) y el filtro irá de cobro a cobro.",
  g_search:"Buscar comercio o categoría…",
  sub_title:"🔁 Suscripciones detectadas", sub_sub:"{n} · ~{y}/año", sub_inactive:"· inactiva", sub_months:"{n} meses", sub_peryear:"~{y}/año", sub_permonth:"/mes", sub_tofixed:"pasar a Gastos fijos", sub_infixed:"ya en Fijos", sub_tofixed_done:"✓ «{n}» añadido a Gastos fijos ({b}). Si quieres que el cargo salga de ahí de verdad, cambia la tarjeta en la web de la suscripción.",
  sub_hint:"Cargos al mismo comercio en ≥3 meses con importe parecido. Revisa si alguna ya no la usas.",
  g_totalfilt:"Gastos del período", g_n_one:"gasto", g_n_many:"gastos", g_inc_one:"ingreso", g_inc_many:"ingresos", g_balance:"Balance", g_lbl_spent:"Gastos", g_lbl_income:"Ingresos",
  g_totalnet:"Balance del período", st_gview:"Total de Gastos", st_gview_split:"Gastos e ingresos", st_gview_split_d:"El total de gastos arriba; debajo, los ingresos y el balance (ingresos − gastos) en una línea.", st_gview_net:"Balance", st_gview_net_d:"Manda el balance (ingresos − gastos del período); debajo, gastos e ingresos en pequeño. Verde si te queda dinero, rojo si gastaste de más.",
  sv_add:"Añadir aportación", sv_name_ph:"Concepto (ej. MSCI World)", sv_edit_hint:"Cambia importe, nombre o banco; ✕ borra. Solo ajusta la cifra de «Ahorro/mes»: no mueve dinero de verdad.", sv_empty:"Aún no has apuntado aportaciones. Toca «Editar» para añadir lo que apartas cada mes.",
  sec_order:"⇅ Ordenar secciones", bp_role_nodata:"Este banco está conectado pero no ha traído ninguna cuenta con saldo utilizable. Prueba «Actualizar saldo» y, si sigue igual, «Reconectar».",
  g_sync:"Sincronizar", g_syncing:"Sincronizando…", g_add:"Apuntar",
  g_lastsync:"Última sincronización: {d}", g_nosync:"Sin sincronizar todavía",
  g_gasto:"💸 Gasto", g_ingreso:"💰 Ingreso", g_concept_g:"Concepto (ej. Cena)", g_concept_i:"Concepto (ej. me devolvió Ana)",
  g_addgasto:"Añadir gasto", g_addingreso:"Añadir ingreso", g_date:"Fecha (vacía = hoy)",
  g_card:"Con tarjeta (cuenta round-up)", g_nocard:"Bizum/transfer · sin round-up",
  g_empty_t:"No hay gastos aquí", g_empty_d:"Cambia el filtro, sincroniza o apunta uno.", g_loadmore:"Cargando más…",
  g_today:"Hoy", g_yesterday:"Ayer", g_invalid:"Pon un importe válido", g_saved_g:"✓ Gasto apuntado", g_saved_i:"✓ Ingreso apuntado", g_deleted:"Eliminado", g_changecat:"Cambiar categoría",
  cat_super:"Supermercado", cat_pan:"Panadería", cat_bares:"Bares y restaurantes", cat_cine:"Cine", cat_padel:"Pádel", cat_ocio:"Ocio", cat_transporte:"Transporte", cat_parking:"Parking", cat_tasas:"Impuestos y multas", cat_compras:"Compras", cat_salud:"Salud", cat_pelu:"Peluquería", cat_hogar:"Hogar", cat_regalos:"Regalos", cat_otros:"Otros", cat_ingreso:"Ingreso",
  freq_mes:"mensual", freq_bimestral:"bimestral", freq_trimestral:"trimestral", freq_semestral:"semestral", "freq_año":"anual",
  // Fijos
  fj_monthly:"Gasto fijo mensual", fj_peryear:"{x}/año", fj_top_a:"Tu mayor gasto fijo es ", fj_top_b:" ({x}/mes)",
  fj_prox:"Próximos cargos · {m}", fj_prox_sub:"{x} este mes",
  fj_today:"{bank} hoy", fj_in:"+ nómina por entrar", fj_transf:"− transferencias pend.", fj_pend:"− fijos pendientes", fj_eom:"= a fin de mes", fj_low:"punto más bajo", fj_low_day:"punto más bajo (día {d})",
  af_title:"💸 ¿Me lo puedo permitir?", af_sub:"Simula una compra y mira el impacto", af_amount:"Importe €", af_day:"Día", af_enter:"Escribe un importe para simular el gasto.",
  af_yes:"✅ Sí, puedes permitírtelo", af_tight:"🟠 Puedes, pero te quedarías muy justo", af_no:"🔴 Mejor no: te quedarías en negativo",
  af_low:"Tu punto más bajo del mes sería {x} (día {d})", af_low_noday:"Tu punto más bajo del mes sería {x}", af_from_to:"sin la compra {a} → con ella {b}",
  af_floor:"🛟 Colchón mínimo de {bank}", af_floor_ph:"sin tope", af_floor_break:"🟠 Puedes, PERO bajarías de tu colchón de {x}", af_below:"⚠ Ya estás por debajo de tu colchón de {x} (vas {y})",
  af_safe:"💚 Hoy puedes gastar hasta {x} sin pasarte", af_eom:"A fin de mes te quedarían ~{x}",
  af_mode_cash:"💶 Al contado", af_mode_fin:"📅 A plazos", af_fin_months:"Meses", af_fin_down:"Entrada €",
  af_fin_quota:"Cuota: {x}/mes · {n} meses (hasta {d})", af_fin_fixed:"Tus fijos pasarían de {a} a {b}/mes",
  af_fin_margin_ok:"✅ La cuota te cabe: te quedarían {x}/mes libres", af_fin_margin_tight:"🟠 Justo: la cuota se come más de la mitad de tu margen libre ({x}/mes)",
  af_fin_margin_no:"🔴 No te cabe: tu margen libre mensual es {x}", af_fin_margin_none:"Apunta tu nómina (Plan → Gestionar → ingresos) y te digo si la cuota te cabe cada mes.",
  af_fin_name_ph:"¿Qué es? (ej. iPhone)", af_fin_create:"➕ Crear la deuda · {x}/mes", af_fin_created:"✓ Deuda creada · la verás en Plan → Deudas",
  af_fin_hint:"Cuota estimada al 0%. Si lleva intereses, crea la deuda y ponle la TAE en Plan → Deudas.",
  fj_alarm:"🚨 ¡Cuidado! ", fj_alarm_a:" se queda en {x} sobre el día {d} (antes de que entre la nómina). Mete fondos o no llegarás.", fj_alarm_b:" se queda en negativo este mes con lo que falta por pagar. Mete fondos o no llegarás.",
  fj_heavy_now:"Este mes ", fj_heavy_next:"El mes que viene ", fj_heavy_in:"En {m} ", fj_heavy_b:"se viene cargado: {x} en fijos (la media es {avg}). 👀",
  fj_pend_in:"Pendiente en {m}:", fj_allpaid:"✓ Todo pagado este mes.", fj_paid_m:"Ya pagado este mes ({x}):",
  fj_pend_tot:"Pendiente {m}", fj_next_m:"Mes que viene ({m})",
  fj_noprog:"⚠ {n} gasto(s) anual(es) sin mes asignado. Pulsa «Editar» abajo y márcale el mes para que entren en el cálculo.",
  fj_paid_tag:"✓ pagado · ", fj_oneoff_tag:"cargo puntual", fj_debt_tag:"cuota de deuda", fj_fixed_tag:"gasto fijo",
  fj_flows_h:"Nómina y transferencias", fj_income_tag:"ingreso (entra)", fj_transfer_tag:"transferencia",
  fj_serv:"Servicios y suministros", fj_permonth:"{x}/mes", fj_edit:"Editar", fj_save:"Guardar",
  fj_year:"año", fj_time:"vez", fj_custom:" · a medida (≈{x}/año)", fj_percharge:" · {x}/cobro", fj_mensual:"mensual", fj_prorated:"/mes prorrateado", fj_nomonth:"⚠ sin mes",
  fj_chargedin:"Se cobra en", fj_day:"día", fj_whatmonths:"¿Qué mes(es) se cobra?", fj_whatmonths_opt:"¿Qué mes(es) se cobra? (opcional)",
  fj_diffamounts:"Importes/días distintos por cobro", fj_amount:"importe", fj_sched_hint:"Pon el importe y el día reales de cada cobro (p.ej. seguro 172,05 y 166,94; Hacienda 146,14 el 30 y 97,42 el 5).",
  fj_serv_tot:"Total servicios/mes", fj_concept_gym:"Concepto (ej. Gimnasio)", fj_day_hint:"El «día» (1-31) marca cuándo te lo cobran: los cargos cuyo día ya pasó este mes cuentan como pagados y no restan del disponible.",
  ask_ok:"Aceptar", ask_all:"Todo · {x}",
  fj_cancel:"Cancelar", fj_addfixed:"Añadir gasto fijo",
  fj_debts:"Cuotas de deuda", fj_pending:"Pendiente {x}", fj_permonth2:"/mes", fj_amort:"amortiza/mes", fj_amort_hint:"cuánto baja el saldo (si difiere de la cuota)", fj_debts_tot:"Total cuotas/mes",
  fj_debts_hint:"Pon el día y el banco de cada cuota para que en «Próximos cargos» se tachen al pagarse, igual que los gastos fijos. El importe es la cuota mensual; el saldo pendiente se edita en la pestaña Deudas.",
  fj_flows:"Ingresos y transferencias", fj_flows_sub:"Nómina y traspasos automáticos", fj_inc_to:"Ingreso · a {bank}", fj_tr_fromto:"Transferencia · {from} → {to}",
  fj_when_last:"último día laborable", fj_when_first:"primer día laborable", fj_day_n:"día {d}",
  fj_entersin:"Entra en", fj_from:"De", fj_when:"cuándo", fj_fixedday:"día fijo", fj_lastwork:"últ. laborable", fj_firstwork:"1er laborable",
  fj_income:"Ingreso", fj_transfer:"Transferencia", fj_concept_payroll:"Concepto (ej. Nómina)", fj_addmove:"Añadir movimiento",
  fj_recurring:"Cada mes", fj_once:"Una vez", fj_month:"mes",
  fj_flows_hint:"Con esto el Sabadell se calcula solo: entra la nómina y salen las transferencias y los fijos. Pon el «día» de cada uno; los que ya han pasado este mes ya están en el saldo, así que no se vuelven a restar.",
  fj_addflow:"Añadir ingreso o transferencia",
  fj_oneoffs:"Cargos puntuales", fj_oneoffs_sub:"Imprevistos y amortizaciones (una vez)", fj_oneoffs_empty:"No hay cargos puntuales próximos. Añade uno para imprevistos o amortizaciones que ocurren una sola vez.",
  fj_concept_amort:"Concepto (ej. Amortización préstamo)", fj_year_lbl:"año", fj_bank:"banco", fj_addoneoff:"Añadir cargo puntual",
  fj_oneoff_hint:"Entra en «Próximos cargos» el mes que toque y se tacha al pasar su día. Solo cuenta una vez; cuando pasa el mes desaparece de la lista.",
  fj_foot:"Los gastos no mensuales (agua, seguros, IBI…) se reparten a su equivalente mensual para que veas el peso real de cada uno. Total al año: {x}.",
});
Object.assign(LANG.en,{
  d_networth:"Net worth", d_assets:"Assets", d_debts:"Debts", d_dist:"Asset distribution",
  hp_hint:"hold the amount to hear it",
  d_liquid:"Cash", d_invest:"Investments", d_goods:"Property",
  d_budget:"Budget", d_streak:"Streak under budget", d_months:"months",
  d_inbudget:"{m} is within budget ✓", d_overbudget:"{m} went over budget",
  d_guilt_ok:"to spend guilt-free this month 😎", d_guilt_over_a:"You've gone over this month by ",
  d_fixed:"Fixed costs", d_fixed_sub:"avg/month · this month {x}", d_saving:"Saving", d_saving_sub:"per month to investing",
  d_saving_card:"Where does your saving go?", d_saving_card_sub:"{x}/month to investing", d_saving_total:"Total saved/month",
  d_culprit:"Top category", d_culprit_sub:"What you spend most on in {m}",
  d_trend:"This vs your average", d_trend_sub:"This month's spend by category vs your average", d_trend_avg:"avg {x}", d_trend_hint:"▲ above your previous-months average · ▼ below.", d_trend_nodata:"It'll appear once you have 2+ months of data in any category. Keep logging 😉",
  recap_title:"📅 How {m} went", recap_spent:"spent", recap_under:"under budget 🟢", recap_over:"over budget 🔴", recap_subs:"active subs", recap_ok:"Got it!",
  d_noexp_t:"No spending yet", d_noexp_d:"Sync or add an expense.", d_culprit_hint:"👑 {name} takes {pct}% of your spending this month.",
  wl_budget:"Budget & streak", wl_culpa:"Guilt-free (what's left)", wl_fixedsave:"Fixed costs & saving", wl_savings:"Where your saving goes",
  wl_letter:"Month letter",
  lt_title:"{m}, so far", lt_open_good:"Taking it easy.", lt_open_tight:"Keeping it tidy.", lt_open_over:"You stretched a little this month.",
  lt_spent:"You've spent {s} of the {b} you set yourself", lt_rem_ok:": you've got {r} left for whatever you like, no worries.", lt_rem_over:": you went {r} over — no drama, you'll tune it next month.",
  lt_top:" {cat} takes the biggest share, as almost always.", lt_net_up:" Your net worth ticked up a little this month.", lt_net_down:" Your net worth dipped a little this month.",
  personalize:"✎ Customise", done:"Done ✓", drag_hint:"press and hold a card to move it",
  et_tabs:"✎ Edit tabs", et_intro:"Tabs used to move by pressing and holding one and dragging it (a hidden gesture, easy to trigger by accident). Now you edit them here: reorder with ▲▼, remove with ✕, or add back with +.", et_fixed:"fixed", et_hidden:"Hidden tabs (tap to add them):",
  w_fixed:"fixed", w_hide:"Hide", w_show:"Show",
  g_month:"This month", g_last:"Last month", g_cycle:"My cycle", g_3m:"Last 3 months", g_all:"All", g_custom:"Range…", g_allcats:"All",
  g_allbanks:"All banks", g_bank_manual:"Manual",
  ai_cat_btn:"✨ Suggest category", ai_cat_busy:"Thinking…", ai_cat_ok:"✓ Category: {c}", ai_cat_none:"No clear suggestion — pick by hand", ai_cat_off:"Turn on “Suggest category (AI)” in Settings → Notifications",
  g_cycle_from:"From {d} (payday, {x}) to today",
  g_cycle_none_t:"No payday detected",
  g_cycle_none:"“My cycle” needs your salary. Log it as a 💰 income (with +) and the filter will run payday to payday.",
  g_search:"Search merchant or category…",
  sub_title:"🔁 Detected subscriptions", sub_sub:"{n} · ~{y}/yr", sub_inactive:"· inactive", sub_months:"{n} months", sub_peryear:"~{y}/yr", sub_permonth:"/mo", sub_tofixed:"move to Fixed expenses", sub_infixed:"already in Fixed", sub_tofixed_done:"✓ \"{n}\" added to Fixed expenses ({b}). To have it truly charged there, change the card on the subscription's site.",
  sub_hint:"Charges to the same merchant in ≥3 months with similar amounts. Check if you still use them.",
  g_totalfilt:"Spending", g_n_one:"expense", g_n_many:"expenses", g_inc_one:"income", g_inc_many:"incomes", g_balance:"Net", g_lbl_spent:"Spent", g_lbl_income:"Income",
  g_totalnet:"Net balance", st_gview:"Expenses total", st_gview_split:"Spending & income", st_gview_split_d:"Total spent on top; income and net balance (income − spending) below, on one line.", st_gview_net:"Balance", st_gview_net_d:"The balance leads (income − spending for the period); spending and income shown small below. Green if money is left, red if you overspent.",
  sv_add:"Add contribution", sv_name_ph:"Name (e.g. MSCI World)", sv_edit_hint:"Change amount, name or bank; ✕ deletes. It only adjusts the «Savings/month» figure: no real money moves.", sv_empty:"No contributions yet. Tap «Edit» to add what you set aside each month.",
  sec_order:"⇅ Reorder sections", bp_role_nodata:"This bank is connected but returned no account with a usable balance. Try «Refresh balance» and, if it persists, «Reconnect».",
  g_sync:"Sync", g_syncing:"Syncing…", g_add:"Add",
  g_lastsync:"Last sync: {d}", g_nosync:"Not synced yet",
  g_gasto:"💸 Expense", g_ingreso:"💰 Income", g_concept_g:"What (e.g. Dinner)", g_concept_i:"What (e.g. Ana paid me back)",
  g_addgasto:"Add expense", g_addingreso:"Add income", g_date:"Date (empty = today)",
  g_card:"Card (counts round-up)", g_nocard:"Bizum/transfer · no round-up",
  g_empty_t:"No expenses here", g_empty_d:"Change the filter, sync or add one.", g_loadmore:"Loading more…",
  g_today:"Today", g_yesterday:"Yesterday", g_invalid:"Enter a valid amount", g_saved_g:"✓ Expense added", g_saved_i:"✓ Income added", g_deleted:"Deleted", g_changecat:"Change category",
  cat_super:"Groceries", cat_pan:"Bakery", cat_bares:"Bars & restaurants", cat_cine:"Cinema", cat_padel:"Padel", cat_ocio:"Leisure", cat_transporte:"Transport", cat_parking:"Parking", cat_tasas:"Taxes & fines", cat_compras:"Shopping", cat_salud:"Health", cat_pelu:"Hair & beauty", cat_hogar:"Home", cat_regalos:"Gifts", cat_otros:"Other", cat_ingreso:"Income",
  freq_mes:"monthly", freq_bimestral:"bimonthly", freq_trimestral:"quarterly", freq_semestral:"biannual", "freq_año":"yearly",
  fj_monthly:"Monthly fixed cost", fj_peryear:"{x}/year", fj_top_a:"Your biggest fixed cost is ", fj_top_b:" ({x}/mo)",
  fj_prox:"Upcoming charges · {m}", fj_prox_sub:"{x} this month",
  fj_today:"{bank} today", fj_in:"+ incoming payroll", fj_transf:"− pending transfers", fj_pend:"− pending fixed", fj_eom:"= end of month", fj_low:"lowest point", fj_low_day:"lowest point (day {d})",
  af_title:"💸 Can I afford it?", af_sub:"Simulate a purchase and see the impact", af_amount:"Amount €", af_day:"Day", af_enter:"Type an amount to simulate the purchase.",
  af_yes:"✅ Yes, you can afford it", af_tight:"🟠 You can, but it'd be very tight", af_no:"🔴 Better not: you'd go negative",
  af_low:"Your lowest point this month would be {x} (day {d})", af_low_noday:"Your lowest point this month would be {x}", af_from_to:"without it {a} → with it {b}",
  af_floor:"🛟 {bank} safety floor", af_floor_ph:"no floor", af_floor_break:"🟠 You can, BUT you'd dip below your {x} floor", af_below:"⚠ You're already below your {x} floor (at {y})",
  af_safe:"💚 Today you can spend up to {x} safely", af_eom:"End of month you'd have ~{x}",
  af_mode_cash:"💶 Upfront", af_mode_fin:"📅 In instalments", af_fin_months:"Months", af_fin_down:"Down payment €",
  af_fin_quota:"Instalment: {x}/mo · {n} months (until {d})", af_fin_fixed:"Your fixed costs would go from {a} to {b}/mo",
  af_fin_margin_ok:"✅ It fits: you'd keep {x}/mo free", af_fin_margin_tight:"🟠 Tight: the instalment eats over half your free margin ({x}/mo)",
  af_fin_margin_no:"🔴 It doesn't fit: your free monthly margin is {x}", af_fin_margin_none:"Log your salary (Plan → Manage → income) and I'll tell you if the instalment fits each month.",
  af_fin_name_ph:"What is it? (e.g. iPhone)", af_fin_create:"➕ Create the debt · {x}/mo", af_fin_created:"✓ Debt created · see Plan → Debts",
  af_fin_hint:"Instalment estimated at 0%. If it carries interest, create the debt and set the APR in Plan → Debts.",
  fj_alarm:"🚨 Heads up! ", fj_alarm_a:" drops to {x} around day {d} (before payroll arrives). Add funds or you won't make it.", fj_alarm_b:" goes negative this month with what's left to pay. Add funds or you won't make it.",
  fj_heavy_now:"This month ", fj_heavy_next:"Next month ", fj_heavy_in:"In {m} ", fj_heavy_b:"is heavy: {x} in fixed costs (avg is {avg}). 👀",
  fj_pend_in:"Pending in {m}:", fj_allpaid:"✓ All paid this month.", fj_paid_m:"Already paid this month ({x}):",
  fj_pend_tot:"Pending {m}", fj_next_m:"Next month ({m})",
  fj_noprog:"⚠ {n} yearly expense(s) with no month set. Tap «Edit» below and set the month so they're counted.",
  fj_paid_tag:"✓ paid · ", fj_oneoff_tag:"one-off charge", fj_debt_tag:"debt payment", fj_fixed_tag:"fixed cost",
  fj_flows_h:"Income & transfers", fj_income_tag:"income (in)", fj_transfer_tag:"transfer",
  fj_serv:"Bills & utilities", fj_permonth:"{x}/mo", fj_edit:"Edit", fj_save:"Save",
  fj_year:"yr", fj_time:"time", fj_custom:" · custom (≈{x}/yr)", fj_percharge:" · {x}/charge", fj_mensual:"monthly", fj_prorated:"/mo prorated", fj_nomonth:"⚠ no month",
  fj_chargedin:"Charged from", fj_day:"day", fj_whatmonths:"Which month(s)?", fj_whatmonths_opt:"Which month(s)? (optional)",
  fj_diffamounts:"Different amounts/days per charge", fj_amount:"amount", fj_sched_hint:"Set the real amount and day of each charge (e.g. insurance 172.05 and 166.94; tax 146.14 on the 30th and 97.42 on the 5th).",
  fj_serv_tot:"Total bills/mo", fj_concept_gym:"What (e.g. Gym)", fj_day_hint:"The «day» (1-31) marks when you're charged: charges whose day has passed this month count as paid and don't reduce what's available.",
  ask_ok:"OK", ask_all:"All · {x}",
  fj_cancel:"Cancel", fj_addfixed:"Add fixed cost",
  fj_debts:"Debt payments", fj_pending:"Pending {x}", fj_permonth2:"/mo", fj_amort:"pays off/mo", fj_amort_hint:"how much the balance drops (if different from the payment)", fj_debts_tot:"Total payments/mo",
  fj_debts_hint:"Set the day and bank of each payment so they get crossed off in «Upcoming charges», like fixed costs. The amount is the monthly payment; the outstanding balance is edited in the Debts tab.",
  fj_flows:"Income & transfers", fj_flows_sub:"Payroll and automatic transfers", fj_inc_to:"Income · to {bank}", fj_tr_fromto:"Transfer · {from} → {to}",
  fj_when_last:"last working day", fj_when_first:"first working day", fj_day_n:"day {d}",
  fj_entersin:"Into", fj_from:"From", fj_when:"when", fj_fixedday:"fixed day", fj_lastwork:"last work.", fj_firstwork:"1st work.",
  fj_income:"Income", fj_transfer:"Transfer", fj_concept_payroll:"What (e.g. Payroll)", fj_addmove:"Add movement",
  fj_recurring:"Monthly", fj_once:"One-off", fj_month:"month",
  fj_flows_hint:"With this, Sabadell calculates itself: payroll comes in and transfers and fixed costs go out. Set the «day» of each; those already passed this month are in the balance and aren't subtracted again.",
  fj_addflow:"Add income or transfer",
  fj_oneoffs:"One-off charges", fj_oneoffs_sub:"Unexpected costs and one-time payoffs", fj_oneoffs_empty:"No upcoming one-off charges. Add one for unexpected costs or payoffs that happen only once.",
  fj_concept_amort:"What (e.g. Loan payoff)", fj_year_lbl:"year", fj_bank:"bank", fj_addoneoff:"Add one-off charge",
  fj_oneoff_hint:"It appears in «Upcoming charges» the relevant month and is crossed off once its day passes. It counts only once; when the month passes it leaves the list.",
  fj_foot:"Non-monthly costs (water, insurance, property tax…) are spread to their monthly equivalent so you see each one's real weight. Total per year: {x}.",
});
Object.assign(LANG.ca,{
  d_networth:"Patrimoni net", d_assets:"Actius", d_debts:"Deutes", d_dist:"Distribució d'actius",
  hp_hint:"mantén premuda la xifra per escoltar-la",
  d_liquid:"Liquiditat", d_invest:"Inversions", d_goods:"Béns",
  d_budget:"Pressupost", d_streak:"Ratxa sense passar-te", d_months:"mesos",
  d_inbudget:"{m} va dins del límit ✓", d_overbudget:"{m} s'ha passat",
  d_guilt_ok:"per gastar sense culpa aquest mes 😎", d_guilt_over_a:"Aquest mes t'has passat ",
  d_fixed:"Despeses fixes", d_fixed_sub:"mitjana/mes · aquest mes {x}", d_saving:"Estalvi", d_saving_sub:"al mes a inversió",
  d_saving_card:"On va el teu estalvi?", d_saving_card_sub:"{x}/mes a inversió", d_saving_total:"Total estalviat/mes",
  d_culprit:"Categoria culpable", d_culprit_sub:"On més gastes al {m}",
  d_trend:"Això vs la teva mitjana", d_trend_sub:"Despesa del mes per categoria vs la teva mitjana", d_trend_avg:"mitjana {x}", d_trend_hint:"▲ per sobre de la mitjana de mesos anteriors · ▼ per sota.", d_trend_nodata:"Apareixerà quan tinguis 2+ mesos de dades en alguna categoria. Segueix apuntant 😉",
  recap_title:"📅 Com va anar {m}", recap_spent:"gastat", recap_under:"sota pressupost 🟢", recap_over:"sobre pressupost 🔴", recap_subs:"subs actives", recap_ok:"Entesos!",
  d_noexp_t:"Encara sense despeses", d_noexp_d:"Sincronitza o apunta una despesa.", d_culprit_hint:"👑 {name} s'emporta el {pct}% de la teva despesa aquest mes.",
  wl_budget:"Pressupost i ratxa", wl_culpa:"Sense culpa (el que et queda)", wl_fixedsave:"Despeses fixes i estalvi", wl_savings:"On va el teu estalvi",
  wl_letter:"Resum del mes (carta)",
  lt_title:"{m}, fins ara", lt_open_good:"Vas amb calma.", lt_open_tight:"Ho vas ajustant bé.", lt_open_over:"Aquest mes t'has estirat una mica.",
  lt_spent:"Has gastat {s} dels {b} que et vas marcar", lt_rem_ok:": et queden {r} per al que vulguis, sense donar-hi voltes.", lt_rem_over:": t'has passat {r}, res greu — el mes que ve ho ajustes.",
  lt_top:" {cat} s'emporta la major part, com gairebé sempre.", lt_net_up:" El teu patrimoni ha pujat una mica aquest mes.", lt_net_down:" El teu patrimoni ha baixat una mica aquest mes.",
  personalize:"✎ Personalitza", done:"Fet ✓", drag_hint:"mantén premuda una targeta per moure-la",
  et_tabs:"✎ Edita pestanyes", et_intro:"Abans les pestanyes es movien mantenint-ne una premuda i arrossegant-la (un gest ocult, fàcil de tocar sense voler). Ara s'editen aquí: reordena amb ▲▼, treu amb ✕ o torna a afegir amb +.", et_fixed:"fixa", et_hidden:"Pestanyes ocultes (toca per afegir-les):",
  w_fixed:"fix", w_hide:"Amaga", w_show:"Mostra",
  g_month:"Aquest mes", g_last:"Mes passat", g_cycle:"El meu cicle", g_3m:"Últims 3 mesos", g_all:"Tot", g_custom:"Rang…", g_allcats:"Totes",
  g_allbanks:"Tots els bancs", g_bank_manual:"A mà",
  ai_cat_btn:"✨ Suggerir categoria", ai_cat_busy:"Pensant…", ai_cat_ok:"✓ Categoria: {c}", ai_cat_none:"No hi ha suggeriment clar — tria a mà", ai_cat_off:"Activa «Suggerir categoria (IA)» a Ajustos → Notificacions",
  g_cycle_from:"Del {d} (cobrament de {x}) a avui",
  g_cycle_none_t:"Sense nòmina detectada",
  g_cycle_none:"Per ajustar «El meu cicle» cal la nòmina. Apunta-la com a 💰 ingrés (amb +) i el filtre anirà de cobrament a cobrament.",
  g_search:"Cerca comerç o categoria…",
  sub_title:"🔁 Subscripcions detectades", sub_sub:"{n} · ~{y}/any", sub_inactive:"· inactiva", sub_months:"{n} mesos", sub_peryear:"~{y}/any", sub_permonth:"/mes", sub_tofixed:"passar a Despeses fixes", sub_infixed:"ja a Fixes", sub_tofixed_done:"✓ «{n}» afegit a Despeses fixes ({b}). Perquè el càrrec surti d'allà de debò, canvia la targeta al web de la subscripció.",
  sub_hint:"Càrrecs al mateix comerç en ≥3 mesos amb import semblant. Revisa si ja no n'uses alguna.",
  g_totalfilt:"Despeses del període", g_n_one:"despesa", g_n_many:"despeses", g_inc_one:"ingrés", g_inc_many:"ingressos", g_balance:"Balanç", g_lbl_spent:"Despeses", g_lbl_income:"Ingressos",
  g_totalnet:"Balanç del període", st_gview:"Total de Despeses", st_gview_split:"Despeses i ingressos", st_gview_split_d:"El total de despeses a dalt; a sota, els ingressos i el balanç (ingressos − despeses) en una línia.", st_gview_net:"Balanç", st_gview_net_d:"Mana el balanç (ingressos − despeses del període); a sota, despeses i ingressos en petit. Verd si et queden diners, vermell si has gastat de més.",
  sv_add:"Afegeix aportació", sv_name_ph:"Concepte (p. ex. MSCI World)", sv_edit_hint:"Canvia import, nom o banc; ✕ esborra. Només ajusta la xifra d'«Estalvi/mes»: no mou diners de veritat.", sv_empty:"Encara no has apuntat aportacions. Toca «Edita» per afegir el que apartes cada mes.",
  sec_order:"⇅ Ordena les seccions", bp_role_nodata:"Aquest banc està connectat però no ha portat cap compte amb saldo utilitzable. Prova «Actualitza el saldo» i, si continua igual, «Reconnecta».",
  g_sync:"Sincronitza", g_syncing:"Sincronitzant…", g_add:"Apunta",
  g_lastsync:"Última sincronització: {d}", g_nosync:"Encara sense sincronitzar",
  g_gasto:"💸 Despesa", g_ingreso:"💰 Ingrés", g_concept_g:"Concepte (ex. Sopar)", g_concept_i:"Concepte (ex. l'Ana m'ho ha tornat)",
  g_addgasto:"Afegeix despesa", g_addingreso:"Afegeix ingrés", g_date:"Data (buida = avui)",
  g_card:"Amb targeta (compta round-up)", g_nocard:"Bizum/transfer · sense round-up",
  g_empty_t:"No hi ha despeses aquí", g_empty_d:"Canvia el filtre, sincronitza o apunta'n una.", g_loadmore:"Carregant més…",
  g_today:"Avui", g_yesterday:"Ahir", g_invalid:"Posa un import vàlid", g_saved_g:"✓ Despesa apuntada", g_saved_i:"✓ Ingrés apuntat", g_deleted:"Eliminat", g_changecat:"Canvia la categoria",
  cat_super:"Supermercat", cat_pan:"Fleca", cat_bares:"Bars i restaurants", cat_cine:"Cinema", cat_padel:"Pàdel", cat_ocio:"Oci", cat_transporte:"Transport", cat_parking:"Pàrquing", cat_tasas:"Impostos i multes", cat_compras:"Compres", cat_salud:"Salut", cat_pelu:"Perruqueria", cat_hogar:"Llar", cat_regalos:"Regals", cat_otros:"Altres", cat_ingreso:"Ingrés",
  freq_mes:"mensual", freq_bimestral:"bimestral", freq_trimestral:"trimestral", freq_semestral:"semestral", "freq_año":"anual",
  fj_monthly:"Despesa fixa mensual", fj_peryear:"{x}/any", fj_top_a:"La teva despesa fixa més gran és ", fj_top_b:" ({x}/mes)",
  fj_prox:"Pròxims càrrecs · {m}", fj_prox_sub:"{x} aquest mes",
  fj_today:"{bank} avui", fj_in:"+ nòmina per entrar", fj_transf:"− transferències pend.", fj_pend:"− fixes pendents", fj_eom:"= a fi de mes", fj_low:"punt més baix", fj_low_day:"punt més baix (dia {d})",
  af_title:"💸 M'ho puc permetre?", af_sub:"Simula una compra i mira l'impacte", af_amount:"Import €", af_day:"Dia", af_enter:"Escriu un import per simular la despesa.",
  af_yes:"✅ Sí, t'ho pots permetre", af_tight:"🟠 Pots, però et quedaries molt just", af_no:"🔴 Millor no: et quedaries en negatiu",
  af_low:"El teu punt més baix del mes seria {x} (dia {d})", af_low_noday:"El teu punt més baix del mes seria {x}", af_from_to:"sense la compra {a} → amb ella {b}",
  af_floor:"🛟 Coixí mínim de {bank}", af_floor_ph:"sense límit", af_floor_break:"🟠 Pots, PERÒ baixaries del teu coixí de {x}", af_below:"⚠ Ja estàs per sota del teu coixí de {x} (vas {y})",
  af_safe:"💚 Avui pots gastar fins a {x} sense passar-te", af_eom:"A fi de mes et quedarien ~{x}",
  af_mode_cash:"💶 Al comptat", af_mode_fin:"📅 A terminis", af_fin_months:"Mesos", af_fin_down:"Entrada €",
  af_fin_quota:"Quota: {x}/mes · {n} mesos (fins a {d})", af_fin_fixed:"Els teus fixes passarien de {a} a {b}/mes",
  af_fin_margin_ok:"✅ La quota t'hi cap: et quedarien {x}/mes lliures", af_fin_margin_tight:"🟠 Just: la quota es menja més de la meitat del teu marge lliure ({x}/mes)",
  af_fin_margin_no:"🔴 No t'hi cap: el teu marge lliure mensual és {x}", af_fin_margin_none:"Apunta la teva nòmina (Pla → Gestionar → ingressos) i et dic si la quota t'hi cap cada mes.",
  af_fin_name_ph:"Què és? (ex. iPhone)", af_fin_create:"➕ Crear el deute · {x}/mes", af_fin_created:"✓ Deute creat · el veuràs a Pla → Deutes",
  af_fin_hint:"Quota estimada al 0%. Si porta interessos, crea el deute i posa-li la TAE a Pla → Deutes.",
  fj_alarm:"🚨 Compte! ", fj_alarm_a:" es queda en {x} cap al dia {d} (abans que entri la nòmina). Posa-hi fons o no hi arribaràs.", fj_alarm_b:" es queda en negatiu aquest mes amb el que falta per pagar. Posa-hi fons o no hi arribaràs.",
  fj_heavy_now:"Aquest mes ", fj_heavy_next:"El mes que ve ", fj_heavy_in:"Al {m} ", fj_heavy_b:"ve carregat: {x} en fixes (la mitjana és {avg}). 👀",
  fj_pend_in:"Pendent al {m}:", fj_allpaid:"✓ Tot pagat aquest mes.", fj_paid_m:"Ja pagat aquest mes ({x}):",
  fj_pend_tot:"Pendent {m}", fj_next_m:"Mes que ve ({m})",
  fj_noprog:"⚠ {n} despesa/es anual(s) sense mes assignat. Prem «Edita» a sota i marca-li el mes perquè entrin al càlcul.",
  fj_paid_tag:"✓ pagat · ", fj_oneoff_tag:"càrrec puntual", fj_debt_tag:"quota de deute", fj_fixed_tag:"despesa fixa",
  fj_flows_h:"Nòmina i transferències", fj_income_tag:"ingrés (entra)", fj_transfer_tag:"transferència",
  fj_serv:"Serveis i subministraments", fj_permonth:"{x}/mes", fj_edit:"Edita", fj_save:"Desa",
  fj_year:"any", fj_time:"cop", fj_custom:" · a mida (≈{x}/any)", fj_percharge:" · {x}/càrrec", fj_mensual:"mensual", fj_prorated:"/mes prorratejat", fj_nomonth:"⚠ sense mes",
  fj_chargedin:"Es cobra a", fj_day:"dia", fj_whatmonths:"Quin(s) mes(os) es cobra?", fj_whatmonths_opt:"Quin(s) mes(os) es cobra? (opcional)",
  fj_diffamounts:"Imports/dies diferents per càrrec", fj_amount:"import", fj_sched_hint:"Posa l'import i el dia reals de cada càrrec (ex. assegurança 172,05 i 166,94; Hisenda 146,14 el 30 i 97,42 el 5).",
  fj_serv_tot:"Total serveis/mes", fj_concept_gym:"Concepte (ex. Gimnàs)", fj_day_hint:"El «dia» (1-31) marca quan et cobren: els càrrecs el dia dels quals ja ha passat aquest mes compten com pagats i no resten del disponible.",
  ask_ok:"D'acord", ask_all:"Tot · {x}",
  fj_cancel:"Cancel·la", fj_addfixed:"Afegeix despesa fixa",
  fj_debts:"Quotes de deute", fj_pending:"Pendent {x}", fj_permonth2:"/mes", fj_amort:"amortitza/mes", fj_amort_hint:"quant baixa el saldo (si difereix de la quota)", fj_debts_tot:"Total quotes/mes",
  fj_debts_hint:"Posa el dia i el banc de cada quota perquè a «Pròxims càrrecs» es ratllin en pagar-se, igual que les despeses fixes. L'import és la quota mensual; el saldo pendent s'edita a la pestanya Deutes.",
  fj_flows:"Ingressos i transferències", fj_flows_sub:"Nòmina i traspassos automàtics", fj_inc_to:"Ingrés · a {bank}", fj_tr_fromto:"Transferència · {from} → {to}",
  fj_when_last:"últim dia laborable", fj_when_first:"primer dia laborable", fj_day_n:"dia {d}",
  fj_entersin:"Entra a", fj_from:"De", fj_when:"quan", fj_fixedday:"dia fix", fj_lastwork:"últ. laborable", fj_firstwork:"1r laborable",
  fj_income:"Ingrés", fj_transfer:"Transferència", fj_concept_payroll:"Concepte (ex. Nòmina)", fj_addmove:"Afegeix moviment",
  fj_recurring:"Cada mes", fj_once:"Un cop", fj_month:"mes",
  fj_flows_hint:"Amb això el Sabadell es calcula sol: entra la nòmina i surten les transferències i les fixes. Posa el «dia» de cadascun; els que ja han passat aquest mes ja són al saldo, així que no es tornen a restar.",
  fj_addflow:"Afegeix ingrés o transferència",
  fj_oneoffs:"Càrrecs puntuals", fj_oneoffs_sub:"Imprevistos i amortitzacions (un cop)", fj_oneoffs_empty:"No hi ha càrrecs puntuals pròxims. Afegeix-ne un per a imprevistos o amortitzacions que passen un sol cop.",
  fj_concept_amort:"Concepte (ex. Amortització préstec)", fj_year_lbl:"any", fj_bank:"banc", fj_addoneoff:"Afegeix càrrec puntual",
  fj_oneoff_hint:"Apareix a «Pròxims càrrecs» el mes que toqui i es ratlla en passar el seu dia. Només compta un cop; quan passa el mes desapareix de la llista.",
  fj_foot:"Les despeses no mensuals (aigua, assegurances, IBI…) es reparteixen al seu equivalent mensual perquè vegis el pes real de cadascuna. Total a l'any: {x}.",
});

/* --- Diccionario: Inversiones, Proyección, Patrimonio, Deudas y login --- */
Object.assign(LANG.es,{
  inv_total:"Total invertido", inv_save:"Guardar", inv_cancel:"Cancelar", inv_prices:"Precios USD", inv_pricing:"Precios…", inv_editmanual:"Editar a mano",
  inv_autoprices:"Actualizar precios USD al abrir la app", inv_lastprice:" · última: {d}", inv_alsoinvested:"También ajustar lo invertido (si he comprado o vendido)",
  inv_cvg:"Contribuciones vs ganancias", inv_invested_lbl:"invertido {x}", inv_invested_tot:"Invertido (coste) total", inv_value_tot:"Valor actual total", inv_gain_lat:"Ganancia (plusvalía latente)", inv_contributed:"Aportado", inv_gain:"Ganancia",
  inv_cvg_hint:"«Invertido» es el coste de lo que tienes ahora (base de coste). Tras ventas parciales puede no cuadrar con las «contribuciones netas» que muestra tu bróker. La ganancia aquí es la plusvalía latente (valor − coste).",
  inv_bytype:"Distribución por tipo", inv_rend:"Rendimiento por posición", inv_best_worst:"mejor {best} · peor {worst}",
  inv_evo:"Evolución", inv_evo_sub:"valor invertido", inv_evo_hint:"📈 La evolución del valor invertido se irá dibujando a partir de hoy (un punto por día).",
  inv_evo_period:"{sign}{pct}% en {days} días ({x})", inv_evo_cost:"Coste aportado (línea discontinua)", inv_evo_today:"Primer punto guardado hoy — mañana verás la tendencia.",
  inv_sold:"💸 Líquido vendido (realizado)", inv_proj:"Proyección de tu ahorro", inv_proj_sub:"Interés compuesto",
  inv_hint_edit:"Escribe el valor actual de cada posición (al tocar se selecciona solo). El % de ganancia se calcula automáticamente.",
  inv_hint_view:"«Precios USD» trae solas las cotizaciones de las acciones con ticker. Lo que no tiene precio automático (fondos, oro, algunos ETF) se edita con «Editar a mano». Cambio dólar→euro: {fx} · BCE en vivo.",
  fx_multi_hint:"Las posiciones en otras divisas se convierten a € con el tipo en vivo del BCE. Si editas el coste invertido, se ancla en € (costEur) al tipo de ese momento.",
  inv_manual_t:"Sin cotización automática", inv_manual_sub:"fondos MyInvestor, Meta TR…",
  inv_manual_body:"Algunos activos no tienen feed gratuito fiable por ISIN. Actualízalos a mano con «Editar a mano»: pon el valor actual que ves en tu bróker y, si has comprado/vendido, marca «También ajustar lo invertido». Fondos indexados en MyInvestor (p. ej. Fidelity MSCI World) y posiciones sin ticker en Trade Republic entran aquí. Las acciones/ETF con ticker sí se actualizan con «Precios USD».",
  inv_sold_part:"Vendí parte →", inv_value:"Valor", inv_invested:"Invertido", inv_sell_prompt:"¿Qué % de «{name}» has vendido?",
  inv_sell_sub:"Pon el porcentaje (30 = un 30 %). Se ajustan valor, coste y participaciones, y el líquido se apunta como vendido.",
  inv_delete:"Borrar", inv_delete_confirm:"¿Borrar «{name}» de tu cartera?", inv_delete_sub:"Esto no toca tu bróker: solo la quita de la app.",
  ru_title:"Round-up & Saveback (TR)", ru_sub_on:"redondeo ×{m} activo", ru_sub_off:"desactivado",
  ru_title_simple:"Redondeo y regalo por pagar", ru_sub_simple:"cada compra suma un poquito a tu inversión",
  ru_hint_simple:"Cada vez que pagas con la tarjeta, la app redondea la compra al euro y esa diferencia se invierte sola. Además, Trade Republic te devuelve un 1% de lo que pagas con su tarjeta, y también se invierte.",
  ru_mult:"Multiplicador del redondeo", ru_off:"Off", ru_dest:"Inversión destino", ru_pick:"Elige una inversión…",
  ru_saveback:"Saveback 1% (cashback de TR, máx 15€/mes)",
  ru_month_ru:"Round-up ya invertido (este mes)", ru_month_sb:"Saveback ya invertido (este mes)", ru_total:"Aportado vía TR (total acumulado)",
  ru_plan:"Aporte periódico a inversión", ru_plan_amt:"Cada mes (€)", ru_plan_hint:"{x}/mes salen de tu efectivo de TR y compran {inv} (tu plan de ahorro). Así tu saldo de TR cuadra sin tocar nada.", pt_trb_plan:"Aporte a inversión",
  ru_hint:"El round-up redondea cada compra al € superior × multiplicador y sale de tu efectivo TR hacia {inv} (TR lo invierte los días 2/9/16/23). El Saveback es un 1% que TR te regala e invierte el día 2. La app lo aplica a tu efectivo e inversión al CERRAR cada mes. Estimación según tus gastos registrados: tu saldo TR real siempre manda.",
  ru_hint_off:"Actívalo si en TR tienes Round-up o Saveback, para que tu efectivo TR cuadre con el real (TR mueve esa calderilla a inversión).",
  ru_manual_hint:"Puedes escribir el importe REAL que ves en TR para corregir la estimación (déjalo vacío para que lo calcule solo).",
  type_acciones:"Acciones", type_etf:"ETF", type_fondo:"Fondo indexado", type_materias:"Materias primas",
  pj_projvalue:"Valor proyectado", pj_contrib:"Tu contribución", pj_monthly:"Contribución mensual", pj_rate:"Interés anual %", pj_years:"Años",
  pj_gain:"Ganancia estimada en {y} años", pj_hint:"Sobre lo ya invertido ({x}). La banda es ±2% sobre el interés. Estimación, no garantía.",
  pt_accounts:"Cuentas", pt_cash_avail:"Liquidez disponible", pt_monthspent:"Gasto del mes: −{x}", pt_payroll:" · nómina +{x}", pt_total_liquid:"Total líquido",
  pt_trbreak:"Desglose del efectivo TR", pt_trbreak_sub:"De dónde sale el saldo mostrado", pt_trb_base:"Base (inicio de mes)", pt_trb_payroll:"+ nómina (si ya entró)", pt_trb_spent:"− gasto del mes", pt_trb_roundup:"− round-up del mes", pt_trb_shown:"= saldo mostrado hoy", pt_trb_movs:"Gastos de este mes ({n})", pt_trb_nomovs:"No hay gastos registrados este mes. Si el saldo baja igual, es la nómina/cierre de mes.", pt_trb_ru_of:"round-up: {x}", pt_trb_hint:"💳 = compra con tarjeta (cuenta para el round-up). 🔄 = bizum/transferencia (NO cuenta). Si ves un bizum marcado 💳, cámbialo en Gastos para que no infle el round-up. Este saldo se recalcula solo: base + nómina − gastos − round-up. Un descuadre PEQUEÑO con TR es normal: TR abona intereses del efectivo el día 1 (ponlos en Inversiones → Round-up para que la app los sume sola) e invierte round-ups/saveback los días 2/9/16/23. Si molesta, edita el saldo en Cuentas y se re-ancla.", pt_ob_extra:"Cuenta", pt_ob_badge:"del banco", pt_ob_joint:"Conjunta", pt_ob_saving:"Ahorro", pt_ob_current:"Corriente",
  pt_investments:"Inversiones", pt_byBroker:"Resumen por bróker", pt_total_inv:"Total invertido", pt_goods:"Bienes", pt_nonliquid:"Activos no líquidos", pt_total_goods:"Total bienes",
  db_total:"Deuda total", db_quota:"Cuota {x}/mes", db_amort:"amortiza {x}/mes", db_amort_q:"amortiza {x}/mes (cuota {y})", db_paidoff:"Amortizado {x} ({p}%)",
  db_pending:"Pendiente", db_pending_sub:"baja solo cada mes", db_delete:"Eliminar esta deuda", db_savechanges:"Guardar cambios", db_editbalances:"Editar saldos pendientes",
  db_concept:"Concepto (ej. Financiación móvil)", db_amount:"Importe €", db_quota_ph:"Cuota/mes € (vacío si 0%)", db_add:"Añadir deuda", db_newdebt:"Nueva deuda", db_addedmanual:"Añadida manualmente",
  db_months_ph:"Plazo (meses)", db_day_ph:"Día", db_left:"Quedan {n}/{tot} cuotas · {x}/mes", db_paidoff_done:"✓ Financiación pagada", db_financing_hint:"Pon el plazo en meses para una financiación: la cuota aparece sola en Gastos fijos cada mes y se para al acabar. Si es 0% deja la cuota vacía (la calculo). Para interés, escribe la cuota real.",
  db_down_ph:"Entrada € (opcional)", db_balloon_ph:"Pago final € (coche)", db_balloon_tag:"(pago final)", db_balloon_hint:"¿Coche? Entrada al inicio + cuotas + un PAGO FINAL grande al acabar el plazo. Pon el importe financiado, el pago final y el plazo: la cuota se calcula sola y el pago final aparece como cargo el último mes.", db_balloon_line:"Pago final: {x}", db_down_line:"Entrada: {x}",
  db_hint:"El saldo baja solo cada mes según lo que amortizas. Cuando te llegue el saldo real del banco, edítalo aquí y se vuelve a anclar. La cuota y la amortización (si difieren, p.ej. pagas 197 € pero amortizas 250 €) se ponen en Fijos → Cuotas de deuda.",
  db_err_amount:"⚠ Falta el importe total de la deuda", db_err_quota:"⚠ Pon la cuota/mes o el plazo en meses", db_err_paid:"⚠ Has pagado tantas cuotas como el plazo: esa deuda ya está liquidada", db_added:"✓ Deuda añadida",
  db_paid_ph:"Cuotas ya pagadas", db_paid_hint:"¿Ya la tienes empezada? Pon cuántas cuotas llevas pagadas y el pendiente se calcula solo.",
  db_amortize:"Amortizar", db_amortize_prompt:"¿Cuánto amortizas de «{name}»?", db_amortize_sub:"Pendiente ahora: {x}. Lo que pongas baja el saldo y acorta el plazo, manteniendo la misma cuota.", db_amortized:"✓ Amortizado {x} · pendiente {y}", db_amortize_full:"🎉 ¡Deuda liquidada!",
  da_title:"¿Cuándo amortizar?", da_sub:"simula y decide con números",
  da_rate:"Interés anual (TAE %)", da_rate_hint:"Ponle el interés a la deuda (sale en tu contrato o en la app del banco) y te digo cuánto te ahorras amortizando. Si es una financiación sin intereses, pon 0.",
  da_amount:"¿Cuánto amortizarías?",
  da_cut:"Te quitas {n} cuotas: acabarías en {d} en vez de {d0}.",
  da_nocut:"Con ese importe no te quitas una cuota entera (recorta el último pago).",
  da_saved:"≈ {x} menos de intereses de aquí al final.",
  da_saved_yr:"≈ {x} menos de intereses al año.",
  da_wait:"Cada mes que esperas, esta deuda te cuesta ≈ {x} en intereses: si vas a amortizar, cuanto antes mejor.",
  da_rate0:"Al 0 % no hay prisa por amortizar{p}: ese dinero trabaja más en tu bolsillo.",
  da_rate0_cash:" (tu efectivo remunerado da un {b}%)",
  da_beats_cash:"Amortizar te «renta» un {a}% garantizado, más que el {b}% de tu efectivo remunerado: sale a cuenta.",
  da_under_cash:"Ojo: tu efectivo remunerado da un {b}%, más que el {a}% de esta deuda. Matemáticamente gana el efectivo… aunque quitarte deuda también da paz.",
  da_first:"🥇 Con varias deudas, amortiza primero la de mayor interés: «{name}» ({p}%).",
  da_apply:"💸 Amortizar {x} ahora",
  da_apply_q:"¿Amortizar {x} de «{name}»?", da_apply_sub:"El pendiente baja y el plazo se acorta con la misma cuota.",
  da_est:"Estimación con el modelo lineal de la app: la cifra exacta depende de cómo calcule tu banco.",
  lk_unlock:"Desbloquea para continuar", lk_failed:"No se pudo verificar. Inténtalo de nuevo.", lk_unlockbtn:"Desbloquear con huella", lk_cant:"No puedo desbloquear",
  lk_escape:"¿Quitar el candado de huella?", lk_escape_sub:"Solo en este dispositivo. Podrás volver a activarlo desde tu cuenta.", lk_escape_ok:"Quitar el candado",
  au_account:"Tu cuenta", au_bio_off:"🔒 Desactivar desbloqueo con huella", au_bio_on:"🔓 Activar desbloqueo con huella", au_nobio:"Este dispositivo/navegador no soporta huella.",
  au_signout:"Cerrar sesión", au_close:"Cerrar", au_signin:"Iniciar sesión", au_signup:"Crear cuenta", au_email:"Email", au_pass:"Contraseña", au_enter:"Entrar",
  au_toup:"¿No tienes cuenta? Crear una", au_toin:"¿Ya tienes cuenta? Inicia sesión", au_cancel:"Cancelar",
  au_forgot:"¿Olvidaste tu contraseña?", au_reset_title:"Recuperar contraseña", au_reset_send:"Enviar email de recuperación", au_reset_sent:"📩 Si el email existe, te hemos enviado un enlace para cambiarla.", au_need_email:"Pon tu email", au_newpass_title:"Nueva contraseña", au_newpass_save:"Guardar contraseña", au_pass_changed:"✓ Contraseña actualizada", au_pass_short:"Mínimo 6 caracteres", au_back:"← Volver",
  au_need:"Pon email y contraseña", au_signedin:"✓ Sesión iniciada", au_created:"✓ Cuenta creada", au_signedout:"Sesión cerrada", au_bio_dis:"Huella desactivada", au_bio_en:"✓ Huella activada",
  st_budget_saved:"✓ Presupuesto guardado", st_backup_dl:"✓ Backup descargado", st_imported:"✓ Datos importados", st_badfile:"El archivo no parece un backup válido", st_confirm_import:"¿Restaurar esta copia de seguridad?", st_confirm_import_sub:"Reemplazará TODOS tus datos actuales por los del archivo. Esto no se puede deshacer.", st_confirm_import_ok:"Restaurar",
});
Object.assign(LANG.en,{
  inv_total:"Total invested", inv_save:"Save", inv_cancel:"Cancel", inv_prices:"USD prices", inv_pricing:"Prices…", inv_editmanual:"Edit manually",
  inv_autoprices:"Update USD prices on app open", inv_lastprice:" · last: {d}", inv_alsoinvested:"Also adjust what's invested (if I bought or sold)",
  inv_cvg:"Contributions vs gains", inv_invested_lbl:"invested {x}", inv_invested_tot:"Invested (cost) total", inv_value_tot:"Current value total", inv_gain_lat:"Gain (unrealised)", inv_contributed:"Contributed", inv_gain:"Gain",
  inv_cvg_hint:"«Invested» is the cost of what you hold now (cost basis). After partial sells it may not match the «net contributions» your broker shows. The gain here is unrealised (value − cost).",
  inv_bytype:"By asset type", inv_rend:"Performance by position", inv_best_worst:"best {best} · worst {worst}",
  inv_evo:"Evolution", inv_evo_sub:"invested value", inv_evo_hint:"📈 The invested value chart will build up from today (one point per day).",
  inv_evo_period:"{sign}{pct}% in {days} days ({x})", inv_evo_cost:"Cost basis (dashed line)", inv_evo_today:"First point saved today — check back tomorrow for the trend.",
  inv_sold:"💸 Cash from sales (realised)", inv_proj:"Your savings projection", inv_proj_sub:"Compound interest",
  inv_hint_edit:"Type the current value of each position (tap to select). The gain % is calculated automatically.",
  inv_hint_view:"«USD prices» fetches quotes for tickered stocks automatically. Anything without an automatic price (funds, gold, some ETFs) is edited via «Edit manually». USD→EUR rate: {fx} · live ECB.",
  fx_multi_hint:"Holdings in other currencies convert to € at live ECB rates. If you edit invested cost, it locks in € (costEur) at that moment's rate.",
  inv_manual_t:"No automatic quote", inv_manual_sub:"MyInvestor funds, TR Meta…",
  inv_manual_body:"Some holdings have no reliable free ISIN feed. Update them with «Edit manually»: enter the current value from your broker and, if you bought or sold, tick «Also adjust what's invested». Indexed funds on MyInvestor (e.g. Fidelity MSCI World) and untickered TR positions go here. Stocks/ETFs with a ticker update via «USD prices».",
  inv_sold_part:"Sold part →", inv_value:"Value", inv_invested:"Invested", inv_sell_prompt:"What % of “{name}” did you sell?",
  inv_sell_sub:"Enter the percentage (30 = 30 %). Value, cost and shares are adjusted, and the proceeds are logged as sold.",
  inv_delete:"Delete", inv_delete_confirm:"Delete “{name}” from your portfolio?", inv_delete_sub:"This doesn't touch your broker: it only removes it from the app.",
  ru_title:"Round-up & Saveback (TR)", ru_sub_on:"round-up ×{m} on", ru_sub_off:"off",
  ru_title_simple:"Round-ups & card reward", ru_sub_simple:"each purchase adds a little to your investing",
  ru_hint_simple:"Every time you pay by card, the app rounds the purchase up to the whole euro and that difference is invested on its own. Plus, Trade Republic gives you 1% back on what you pay with its card, and that's invested too.",
  ru_mult:"Round-up multiplier", ru_off:"Off", ru_dest:"Target investment", ru_pick:"Pick an investment…",
  ru_saveback:"Saveback 1% (TR cashback, max €15/mo)",
  ru_month_ru:"Round-up invested (this month)", ru_month_sb:"Saveback invested (this month)", ru_total:"Contributed via TR (running total)",
  ru_plan:"Recurring investment", ru_plan_amt:"Each month (€)", ru_plan_hint:"{x}/mo leave your TR cash and buy {inv} (your savings plan). This keeps your TR balance right with no manual tweaks.", pt_trb_plan:"Investment plan",
  ru_hint:"Round-up rounds each purchase up to the next € × multiplier and leaves your TR cash towards {inv} (TR invests it on the 2nd/9th/16th/23rd). Saveback is a 1% TR gives you, invested on the 2nd. The app applies it to your cash and investment when each month CLOSES. Estimate from your logged spending: your real TR balance always wins.",
  ru_hint_off:"Turn it on if you use Round-up or Saveback in TR, so your TR cash matches reality (TR moves that spare change into investments).",
  ru_manual_hint:"You can type the REAL amount you see in TR to correct the estimate (leave empty to auto-calculate).",
  type_acciones:"Stocks", type_etf:"ETF", type_fondo:"Index fund", type_materias:"Commodities",
  pj_projvalue:"Projected value", pj_contrib:"Your contribution", pj_monthly:"Monthly contribution", pj_rate:"Annual interest %", pj_years:"Years",
  pj_gain:"Estimated gain in {y} years", pj_hint:"On what's already invested ({x}). The band is ±2% on the rate. Estimate, not a guarantee.",
  pt_accounts:"Accounts", pt_cash_avail:"Available cash", pt_monthspent:"Spent this month: −{x}", pt_payroll:" · payroll +{x}", pt_total_liquid:"Total cash",
  pt_trbreak:"TR cash breakdown", pt_trbreak_sub:"Where the shown balance comes from", pt_trb_base:"Base (start of month)", pt_trb_payroll:"+ payroll (if already in)", pt_trb_spent:"− spent this month", pt_trb_roundup:"− round-up this month", pt_trb_shown:"= balance shown today", pt_trb_movs:"This month's spending ({n})", pt_trb_nomovs:"No spending logged this month. If the balance still drops, it's payroll/month close.", pt_trb_ru_of:"round-up: {x}", pt_trb_hint:"💳 = card purchase (counts toward round-up). 🔄 = bizum/transfer (does NOT count). If a bizum is tagged 💳, change it in Expenses so it doesn't inflate round-up. This balance recomputes itself: base + payroll − spending − round-up. A SMALL mismatch vs TR is normal: TR credits cash interest on the 1st (set it in Investments → Round-up so the app adds it) and invests round-ups/saveback on the 2nd/9th/16th/23rd. If it bothers you, edit the balance in Accounts and it re-anchors.", pt_ob_extra:"Account", pt_ob_badge:"from bank", pt_ob_joint:"Joint account", pt_ob_saving:"Savings", pt_ob_current:"Current account",
  pt_investments:"Investments", pt_byBroker:"By broker", pt_total_inv:"Total invested", pt_goods:"Property", pt_nonliquid:"Non-liquid assets", pt_total_goods:"Total property",
  db_total:"Total debt", db_quota:"Payment {x}/mo", db_amort:"pays off {x}/mo", db_amort_q:"pays off {x}/mo (payment {y})", db_paidoff:"Paid off {x} ({p}%)",
  db_pending:"Outstanding", db_pending_sub:"drops on its own each month", db_delete:"Delete this debt", db_savechanges:"Save changes", db_editbalances:"Edit outstanding balances",
  db_concept:"What (e.g. Phone financing)", db_amount:"Amount €", db_quota_ph:"Payment/mo € (empty if 0%)", db_add:"Add debt", db_newdebt:"New debt", db_addedmanual:"Added manually",
  db_months_ph:"Term (months)", db_day_ph:"Day", db_left:"{n}/{tot} payments left · {x}/mo", db_paidoff_done:"✓ Financing paid off", db_financing_hint:"Set a term in months for a financing: the payment shows up by itself in Fixed costs each month and stops when it ends. If 0%, leave the payment empty (I compute it). For interest, enter the real payment.",
  db_down_ph:"Down payment € (optional)", db_balloon_ph:"Final payment € (car)", db_balloon_tag:"(final payment)", db_balloon_hint:"Car? Down payment upfront + installments + a big FINAL PAYMENT at term end. Enter the financed amount, the final payment and the term: the installment is computed and the final payment shows as a charge in the last month.", db_balloon_line:"Final payment: {x}", db_down_line:"Down payment: {x}",
  db_hint:"The balance drops on its own each month based on what you pay off. When you get the real bank balance, edit it here and it re-anchors. The payment and payoff (if different, e.g. you pay 197 € but pay off 250 €) are set in Fixed → Debt payments.",
  db_err_amount:"⚠ Missing the total debt amount", db_err_quota:"⚠ Set the payment/mo or the term in months", db_err_paid:"⚠ You've paid as many installments as the term: that debt is already settled", db_added:"✓ Debt added",
  db_paid_ph:"Installments already paid", db_paid_hint:"Already partway through? Enter how many installments you've paid and the outstanding balance is computed for you.",
  db_amortize:"Pay down", db_amortize_prompt:"How much of “{name}” do you pay down?", db_amortize_sub:"Outstanding now: {x}. Whatever you enter drops the balance and shortens the term, keeping the same payment.", db_amortized:"✓ Paid down {x} · outstanding {y}", db_amortize_full:"🎉 Debt settled!",
  da_title:"When to pay down?", da_sub:"simulate and decide with numbers",
  da_rate:"Annual interest (APR %)", da_rate_hint:"Give the debt its interest rate (it's in your contract or the bank's app) and I'll tell you what early repayment saves. For 0% financing, put 0.",
  da_amount:"How much would you pay down?",
  da_cut:"You'd drop {n} payments: done by {d} instead of {d0}.",
  da_nocut:"That amount doesn't remove a whole payment (it trims the last one).",
  da_saved:"≈ {x} less interest between now and the end.",
  da_saved_yr:"≈ {x} less interest per year.",
  da_wait:"Every month you wait, this debt costs ≈ {x} in interest: if you're going to do it, sooner is better.",
  da_rate0:"At 0% there's no rush to pay down{p}: that money works harder in your pocket.",
  da_rate0_cash:" (your interest-bearing cash pays {b}%)",
  da_beats_cash:"Paying down “earns” you a guaranteed {a}%, beating the {b}% on your cash: worth it.",
  da_under_cash:"Heads-up: your cash earns {b}%, more than this debt's {a}%. The math favours the cash… though killing debt buys peace of mind too.",
  da_first:"🥇 With several debts, pay down the highest interest first: “{name}” ({p}%).",
  da_apply:"💸 Pay down {x} now",
  da_apply_q:"Pay down {x} of “{name}”?", da_apply_sub:"The balance drops and the term shortens with the same payment.",
  da_est:"Estimate using the app's linear model: the exact figure depends on your bank's math.",
  lk_unlock:"Unlock to continue", lk_failed:"Couldn't verify. Try again.", lk_unlockbtn:"Unlock with fingerprint", lk_cant:"I can't unlock",
  lk_escape:"Remove the fingerprint lock?", lk_escape_sub:"On this device only. You can re-enable it from your account.", lk_escape_ok:"Remove lock",
  au_account:"Your account", au_bio_off:"🔒 Turn off fingerprint unlock", au_bio_on:"🔓 Turn on fingerprint unlock", au_nobio:"This device/browser doesn't support fingerprint.",
  au_signout:"Sign out", au_close:"Close", au_signin:"Sign in", au_signup:"Create account", au_email:"Email", au_pass:"Password", au_enter:"Enter",
  au_toup:"No account? Create one", au_toin:"Already have an account? Sign in", au_cancel:"Cancel",
  au_forgot:"Forgot your password?", au_reset_title:"Reset password", au_reset_send:"Send recovery email", au_reset_sent:"📩 If the email exists, we've sent you a link to change it.", au_need_email:"Enter your email", au_newpass_title:"New password", au_newpass_save:"Save password", au_pass_changed:"✓ Password updated", au_pass_short:"At least 6 characters", au_back:"← Back",
  au_need:"Enter email and password", au_signedin:"✓ Signed in", au_created:"✓ Account created", au_signedout:"Signed out", au_bio_dis:"Fingerprint off", au_bio_en:"✓ Fingerprint on",
  st_budget_saved:"✓ Budget saved", st_backup_dl:"✓ Backup downloaded", st_imported:"✓ Data imported", st_badfile:"The file doesn't look like a valid backup", st_confirm_import:"Restore this backup?", st_confirm_import_sub:"It will replace ALL your current data with the file's. This can't be undone.", st_confirm_import_ok:"Restore",
});
Object.assign(LANG.ca,{
  inv_total:"Total invertit", inv_save:"Desa", inv_cancel:"Cancel·la", inv_prices:"Preus USD", inv_pricing:"Preus…", inv_editmanual:"Edita a mà",
  inv_autoprices:"Actualitza preus USD en obrir l'app", inv_lastprice:" · última: {d}", inv_alsoinvested:"Ajusta també l'invertit (si he comprat o venut)",
  inv_cvg:"Contribucions vs guanys", inv_invested_lbl:"invertit {x}", inv_invested_tot:"Invertit (cost) total", inv_value_tot:"Valor actual total", inv_gain_lat:"Guany (plusvàlua latent)", inv_contributed:"Aportat", inv_gain:"Guany",
  inv_cvg_hint:"«Invertit» és el cost del que tens ara (base de cost). Després de vendes parcials pot no quadrar amb les «contribucions netes» que mostra el teu bròker. El guany aquí és la plusvàlua latent (valor − cost).",
  inv_bytype:"Distribució per tipus", inv_rend:"Rendiment per posició", inv_best_worst:"millor {best} · pitjor {worst}",
  inv_evo:"Evolució", inv_evo_sub:"valor invertit", inv_evo_hint:"📈 L'evolució del valor invertit es dibuixarà a partir d'avui (un punt per dia).",
  inv_evo_period:"{sign}{pct}% en {days} dies ({x})", inv_evo_cost:"Cost aportat (línia discontinua)", inv_evo_today:"Primer punt desat avui — demà veuràs la tendència.",
  inv_sold:"💸 Líquid venut (realitzat)", inv_proj:"Projecció del teu estalvi", inv_proj_sub:"Interès compost",
  inv_hint_edit:"Escriu el valor actual de cada posició (en tocar se selecciona sol). El % de guany es calcula automàticament.",
  inv_hint_view:"«Preus USD» porta soles les cotitzacions de les accions amb ticker. El que no té preu automàtic (fons, or, alguns ETF) s'edita amb «Edita a mà». Canvi dòlar→euro: {fx} · BCE en viu.",
  fx_multi_hint:"Les posicions en altres divises es converteixen a € amb el tipus en viu del BCE. Si edites el cost invertit, s'ancora en € (costEur) al tipus d'aquell moment.",
  inv_manual_t:"Sense cotització automàtica", inv_manual_sub:"fons MyInvestor, Meta TR…",
  inv_manual_body:"Alguns actius no tenen feed gratuït fiable per ISIN. Actualitza'ls a mà amb «Edita a mà»: posa el valor actual que veus al teu bròker i, si has comprat/vendut, marca «Ajusta també l'invertit». Fons indexats a MyInvestor (p. ex. Fidelity MSCI World) i posicions sense ticker a Trade Republic entren aquí. Les accions/ETF amb ticker sí s'actualitzen amb «Preus USD».",
  inv_sold_part:"He venut part →", inv_value:"Valor", inv_invested:"Invertit", inv_sell_prompt:"Quin % de «{name}» has venut?",
  inv_sell_sub:"Posa el percentatge (30 = un 30 %). S'ajusten valor, cost i participacions, i el líquid s'apunta com a venut.",
  inv_delete:"Esborra", inv_delete_confirm:"Esborrar «{name}» de la teva cartera?", inv_delete_sub:"Això no toca el teu bròker: només la treu de l'app.",
  ru_title:"Round-up & Saveback (TR)", ru_sub_on:"arrodoniment ×{m} actiu", ru_sub_off:"desactivat",
  ru_title_simple:"Arrodoniment i regal per pagar", ru_sub_simple:"cada compra suma una miqueta a la teva inversió",
  ru_hint_simple:"Cada cop que pagues amb la targeta, l'app arrodoneix la compra a l'euro i aquesta diferència s'inverteix sola. A més, Trade Republic et torna un 1% del que pagues amb la seva targeta, i també s'inverteix.",
  ru_mult:"Multiplicador de l'arrodoniment", ru_off:"Off", ru_dest:"Inversió destí", ru_pick:"Tria una inversió…",
  ru_saveback:"Saveback 1% (cashback de TR, màx 15€/mes)",
  ru_month_ru:"Arrodoniment ja invertit (aquest mes)", ru_month_sb:"Saveback ja invertit (aquest mes)", ru_total:"Aportat via TR (total acumulat)",
  ru_plan:"Aportació periòdica a inversió", ru_plan_amt:"Cada mes (€)", ru_plan_hint:"{x}/mes surten del teu efectiu de TR i compren {inv} (el teu pla d'estalvi). Així el teu saldo de TR quadra sense tocar res.", pt_trb_plan:"Aportació a inversió",
  ru_hint:"L'arrodoniment puja cada compra a l'€ superior × multiplicador i surt del teu efectiu TR cap a {inv} (TR ho inverteix els dies 2/9/16/23). El Saveback és un 1% que TR et regala i inverteix el dia 2. L'app ho aplica al teu efectiu i inversió en TANCAR cada mes. Estimació segons les teves despeses registrades: el teu saldo TR real sempre mana.",
  ru_hint_off:"Activa'l si a TR tens Round-up o Saveback, perquè el teu efectiu TR quadri amb el real (TR mou aquesta xavalla a inversió).",
  ru_manual_hint:"Pots escriure l'import REAL que veus a TR per corregir l'estimació (deixa-ho buit perquè ho calculi sol).",
  type_acciones:"Accions", type_etf:"ETF", type_fondo:"Fons indexat", type_materias:"Matèries primeres",
  pj_projvalue:"Valor projectat", pj_contrib:"La teva contribució", pj_monthly:"Contribució mensual", pj_rate:"Interès anual %", pj_years:"Anys",
  pj_gain:"Guany estimat en {y} anys", pj_hint:"Sobre el ja invertit ({x}). La banda és ±2% sobre l'interès. Estimació, no garantia.",
  pt_accounts:"Comptes", pt_cash_avail:"Liquiditat disponible", pt_monthspent:"Despesa del mes: −{x}", pt_payroll:" · nòmina +{x}", pt_total_liquid:"Total líquid",
  pt_trbreak:"Desglossament de l'efectiu TR", pt_trbreak_sub:"D'on surt el saldo mostrat", pt_trb_base:"Base (inici de mes)", pt_trb_payroll:"+ nòmina (si ja ha entrat)", pt_trb_spent:"− despesa del mes", pt_trb_roundup:"− round-up del mes", pt_trb_shown:"= saldo mostrat avui", pt_trb_movs:"Despeses d'aquest mes ({n})", pt_trb_nomovs:"No hi ha despeses registrades aquest mes. Si el saldo baixa igualment, és la nòmina/tancament de mes.", pt_trb_ru_of:"round-up: {x}", pt_trb_hint:"💳 = compra amb targeta (compta per al round-up). 🔄 = bizum/transferència (NO compta). Si veus un bizum marcat 💳, canvia'l a Despeses perquè no infli el round-up. Aquest saldo es recalcula sol: base + nòmina − despeses − round-up. Un desquadrament PETIT amb TR és normal: TR abona interessos de l'efectiu el dia 1 (posa'ls a Inversions → Round-up perquè l'app els sumi sola) i inverteix round-ups/saveback els dies 2/9/16/23. Si molesta, edita el saldo a Comptes i es re-ancora.", pt_ob_extra:"Compte", pt_ob_badge:"del banc", pt_ob_joint:"Conjunta", pt_ob_saving:"Estalvi", pt_ob_current:"Corrent",
  pt_investments:"Inversions", pt_byBroker:"Resum per bròker", pt_total_inv:"Total invertit", pt_goods:"Béns", pt_nonliquid:"Actius no líquids", pt_total_goods:"Total béns",
  db_total:"Deute total", db_quota:"Quota {x}/mes", db_amort:"amortitza {x}/mes", db_amort_q:"amortitza {x}/mes (quota {y})", db_paidoff:"Amortitzat {x} ({p}%)",
  db_pending:"Pendent", db_pending_sub:"baixa sol cada mes", db_delete:"Elimina aquest deute", db_savechanges:"Desa els canvis", db_editbalances:"Edita saldos pendents",
  db_concept:"Concepte (ex. Finançament mòbil)", db_amount:"Import €", db_quota_ph:"Quota/mes € (buit si 0%)", db_add:"Afegeix deute", db_newdebt:"Nou deute", db_addedmanual:"Afegida manualment",
  db_months_ph:"Termini (mesos)", db_day_ph:"Dia", db_left:"Queden {n}/{tot} quotes · {x}/mes", db_paidoff_done:"✓ Finançament pagat", db_financing_hint:"Posa el termini en mesos per a un finançament: la quota apareix sola a Despeses fixes cada mes i s'atura en acabar. Si és 0%, deixa la quota buida (la calculo). Per interès, escriu la quota real.",
  db_down_ph:"Entrada € (opcional)", db_balloon_ph:"Pagament final € (cotxe)", db_balloon_tag:"(pagament final)", db_balloon_hint:"Cotxe? Entrada a l'inici + quotes + un PAGAMENT FINAL gran en acabar el termini. Posa l'import finançat, el pagament final i el termini: la quota es calcula sola i el pagament final surt com a càrrec l'últim mes.", db_balloon_line:"Pagament final: {x}", db_down_line:"Entrada: {x}",
  db_hint:"El saldo baixa sol cada mes segons el que amortitzes. Quan et arribi el saldo real del banc, edita'l aquí i es torna a ancorar. La quota i l'amortització (si difereixen, ex. pagues 197 € però amortitzes 250 €) es posen a Fixes → Quotes de deute.",
  db_err_amount:"⚠ Falta l'import total del deute", db_err_quota:"⚠ Posa la quota/mes o el termini en mesos", db_err_paid:"⚠ Has pagat tantes quotes com el termini: aquest deute ja està liquidat", db_added:"✓ Deute afegit",
  db_paid_ph:"Quotes ja pagades", db_paid_hint:"Ja el tens començat? Posa quantes quotes portes pagades i el pendent es calcula sol.",
  db_amortize:"Amortitza", db_amortize_prompt:"Quant amortitzes de «{name}»?", db_amortize_sub:"Pendent ara: {x}. El que posis baixa el saldo i escurça el termini, mantenint la mateixa quota.", db_amortized:"✓ Amortitzat {x} · pendent {y}", db_amortize_full:"🎉 Deute liquidat!",
  da_title:"Quan amortitzar?", da_sub:"simula i decideix amb números",
  da_rate:"Interès anual (TAE %)", da_rate_hint:"Posa-li l'interès al deute (surt al contracte o a l'app del banc) i et dic quant t'estalvies amortitzant. Si és un finançament sense interessos, posa 0.",
  da_amount:"Quant amortitzaries?",
  da_cut:"Et treus {n} quotes: acabaries el {d} en comptes del {d0}.",
  da_nocut:"Amb aquest import no et treus una quota sencera (retalla l'últim pagament).",
  da_saved:"≈ {x} menys d'interessos d'aquí al final.",
  da_saved_yr:"≈ {x} menys d'interessos l'any.",
  da_wait:"Cada mes que esperes, aquest deute et costa ≈ {x} en interessos: si has d'amortitzar, com més aviat millor.",
  da_rate0:"Al 0 % no hi ha pressa per amortitzar{p}: aquests diners treballen més a la teva butxaca.",
  da_rate0_cash:" (el teu efectiu remunerat dona un {b}%)",
  da_beats_cash:"Amortitzar et «renta» un {a}% garantit, més que el {b}% del teu efectiu remunerat: surt a compte.",
  da_under_cash:"Compte: el teu efectiu remunerat dona un {b}%, més que l'{a}% d'aquest deute. Matemàticament guanya l'efectiu… tot i que treure't deute també dona pau.",
  da_first:"🥇 Amb diversos deutes, amortitza primer el de més interès: «{name}» ({p}%).",
  da_apply:"💸 Amortitza {x} ara",
  da_apply_q:"Amortitzar {x} de «{name}»?", da_apply_sub:"El pendent baixa i el termini s'escurça amb la mateixa quota.",
  da_est:"Estimació amb el model lineal de l'app: la xifra exacta depèn de com calculi el teu banc.",
  lk_unlock:"Desbloqueja per continuar", lk_failed:"No s'ha pogut verificar. Torna-ho a provar.", lk_unlockbtn:"Desbloqueja amb empremta", lk_cant:"No puc desbloquejar",
  lk_escape:"Treure el bloqueig d'empremta?", lk_escape_sub:"Només en aquest dispositiu. Podràs tornar a activar-lo des del teu compte.", lk_escape_ok:"Treu el bloqueig",
  au_account:"El teu compte", au_bio_off:"🔒 Desactiva el desbloqueig amb empremta", au_bio_on:"🔓 Activa el desbloqueig amb empremta", au_nobio:"Aquest dispositiu/navegador no admet empremta.",
  au_signout:"Tanca la sessió", au_close:"Tanca", au_signin:"Inicia sessió", au_signup:"Crea un compte", au_email:"Email", au_pass:"Contrasenya", au_enter:"Entra",
  au_toup:"No tens compte? Crea'n un", au_toin:"Ja tens compte? Inicia sessió", au_cancel:"Cancel·la",
  au_forgot:"Has oblidat la contrasenya?", au_reset_title:"Recupera la contrasenya", au_reset_send:"Envia email de recuperació", au_reset_sent:"📩 Si l'email existeix, t'hem enviat un enllaç per canviar-la.", au_need_email:"Posa el teu email", au_newpass_title:"Nova contrasenya", au_newpass_save:"Desa la contrasenya", au_pass_changed:"✓ Contrasenya actualitzada", au_pass_short:"Mínim 6 caràcters", au_back:"← Torna",
  au_need:"Posa email i contrasenya", au_signedin:"✓ Sessió iniciada", au_created:"✓ Compte creat", au_signedout:"Sessió tancada", au_bio_dis:"Empremta desactivada", au_bio_en:"✓ Empremta activada",
  st_budget_saved:"✓ Pressupost desat", st_backup_dl:"✓ Còpia descarregada", st_imported:"✓ Dades importades", st_badfile:"El fitxer no sembla una còpia vàlida", st_confirm_import:"Restaurar aquesta còpia de seguretat?", st_confirm_import_sub:"Substituirà TOTES les teves dades actuals per les del fitxer. Això no es pot desfer.", st_confirm_import_ok:"Restaura",
});

/* ---- Metas de ahorro (#15) ---- */
Object.assign(LANG.es,{
  tab_metas:"Metas", tab_logros:"Logros",
  gl_total:"Ahorrado en metas", gl_total_sub:"de {x} en total",
  gl_new:"Nueva meta", gl_create:"Crear meta", gl_cancel:"Cancelar",
  gl_name_ph:"Nombre (ej. Vacaciones)", gl_target_ph:"Objetivo €", gl_saved_ph:"Ya ahorrado €", gl_deadline:"Fecha límite (opcional)", gl_monthly_ph:"Aporte al mes € (opcional)",
  gl_emoji:"Icono", gl_newdefault:"Mi meta",
  gl_contribute:"+ Aportar", gl_contribute_prompt:"¿Cuánto añades a «{name}»?", gl_contribute_sub:"Se suma a lo que llevas ahorrado para esta meta.",
  gl_edit:"Editar metas", gl_save:"Guardar cambios", gl_delete:"Eliminar meta", gl_of:"de",
  gl_eta:"A tu ritmo ({x}/mes) la cumples en {when} 🟢",
  gl_eta_ok:"Vas bien 🟢 · faltan {x}", gl_eta_behind:"Necesitas {x}/mes para llegar a tiempo 🟠",
  gl_eta_reached:"🎉 ¡Conseguida!", gl_eta_overdue:"La fecha ya pasó 🟠 · ajústala", gl_eta_nosaving:"Empieza a ahorrar para ver la previsión",
  gl_done_badge:"🏅 Cumplida", gl_celebrate:"🎉 ¡Meta «{name}» cumplida!",
  gm_level:"Tu nivel", gm_next:"{x} para nivel {n}", gm_maxlvl:"¡Nivel máximo alcanzado! 👑", gm_score:"Ahorro acumulado",
  st_good_h:"Vas muy bien", st_good_l:"Sigues dentro de tu presupuesto, mes tras mes.",
  st_tight_h:"Ojo, apurando", st_tight_l:"Te queda poco margen, pero aún dentro de lo tuyo.",
  st_over_h:"Te has pasado un poco", st_over_l:"Este mes te fuiste del presupuesto. Se ajusta y ya.",
  gm_lvl_0:"Aprendiz", gm_lvl_1:"Ahorrador", gm_lvl_2:"Constante", gm_lvl_3:"Experto", gm_lvl_4:"Maestro del ahorro",
  gm_retos:"Retos del mes", gm_logros:"Logros",
  gm_reto_budget:"Mes bajo presupuesto", gm_reto_budget_ok:"Te quedan {x} de margen 🟢", gm_reto_budget_over:"Te has pasado {x} 🔴", gm_reto_budget_done:"¡Mes cerrado bajo presupuesto! 🏆",
  gm_reto_roundup:"Reto round-up", gm_reto_roundup_sub:"{x} de {y} este mes", gm_reto_done:"✓ Conseguido",
  gm_streak:"🔥 {n} meses seguidos bajo presupuesto", gm_streak_1:"🔥 1 mes bajo presupuesto", gm_streak_none:"Aún sin racha · cierra un mes bajo presupuesto", gm_streak_best:"Mejor racha: {n}",
  gm_locked:"🔒 Bloqueado", gm_levelup:"🎉 ¡Subiste al nivel {n}!", gm_badge_new:"🏅 Logro: {x}",
  gm_b_first_goal:"1ª meta cumplida", gm_b_first_underbudget:"1er mes bajo presupuesto", gm_b_first_reto:"1er reto completado", gm_b_streak_3:"Racha de 3 meses",
  gm_b_save_100:"100 € ahorrado", gm_b_save_500:"500 € ahorrado", gm_b_save_1000:"1.000 € ahorrado", gm_b_save_5000:"5.000 € ahorrado",
  sh_newdefault:"Grupo", sh_newgroup:"Nuevo grupo compartido", sh_groups_title:"Gastos a medias (viajes, eventos)", sh_name_ph:"Nombre (ej. Crucero)", sh_you:"Tú", sh_other_ph:"Otra persona (ej. Pareja)", sh_create:"Crear grupo", sh_cancel:"Cancelar",
  sh_empty_t:"Aún no hay grupos", sh_empty_d:"Crea un grupo para repartir gastos de un viaje, piso o evento con otras personas.",
  sh_people:"personas", sh_people_h:"Personas", sh_addperson_ph:"Añadir persona", sh_balances:"Quién debe a quién", sh_settled:"Todo saldado 🎉", sh_settled_short:"saldado", sh_pending:"{n} pago(s) pendiente(s)",
  sh_expenses:"Gastos del grupo", sh_noexp:"Aún no hay gastos. Añade el primero.", sh_paidby:"Pagó {who}", sh_addexp:"Añadir gasto", sh_exp:"Gasto", sh_exp_ph:"Concepto (ej. Cena)", sh_split:"¿Entre quién se reparte?",
  sh_back:"Grupos", sh_delgroup:"Borrar grupo", sh_delgroup_q:"¿Borrar este grupo y sus gastos?",
  gl_empty_t:"Aún no tienes metas", gl_empty_d:"Crea tu primera meta de ahorro y mira cómo se acerca cada mes.",
  gl_widget_title:"Tu meta", wl_goal:"Meta",
});
Object.assign(LANG.en,{
  tab_metas:"Goals", tab_logros:"Achievements",
  gl_total:"Saved towards goals", gl_total_sub:"of {x} total",
  gl_new:"New goal", gl_create:"Create goal", gl_cancel:"Cancel",
  gl_name_ph:"Name (e.g. Holidays)", gl_target_ph:"Target €", gl_saved_ph:"Already saved €", gl_deadline:"Deadline (optional)", gl_monthly_ph:"Monthly amount € (optional)",
  gl_emoji:"Icon", gl_newdefault:"My goal",
  gl_contribute:"+ Add", gl_contribute_prompt:"How much do you add to “{name}”?", gl_contribute_sub:"It adds to what you've already saved for this goal.",
  gl_edit:"Edit goals", gl_save:"Save changes", gl_delete:"Delete goal", gl_of:"of",
  gl_eta:"At your pace ({x}/mo) you'll hit it in {when} 🟢",
  gl_eta_ok:"On track 🟢 · {x} to go", gl_eta_behind:"You need {x}/mo to make it in time 🟠",
  gl_eta_reached:"🎉 Reached!", gl_eta_overdue:"Deadline has passed 🟠 · adjust it", gl_eta_nosaving:"Start saving to see the forecast",
  gl_done_badge:"🏅 Reached", gl_celebrate:"🎉 Goal “{name}” reached!",
  gm_level:"Your level", gm_next:"{x} to level {n}", gm_maxlvl:"Max level reached! 👑", gm_score:"Total saved",
  st_good_h:"Doing great", st_good_l:"Still within your budget, month after month.",
  st_tight_h:"Cutting it close", st_tight_l:"Not much margin left, but still within yours.",
  st_over_h:"A little over", st_over_l:"You went past your budget this month. Easy to adjust.",
  gm_lvl_0:"Beginner", gm_lvl_1:"Saver", gm_lvl_2:"Steady", gm_lvl_3:"Expert", gm_lvl_4:"Savings Master",
  gm_retos:"Monthly challenges", gm_logros:"Achievements",
  gm_reto_budget:"Month under budget", gm_reto_budget_ok:"{x} margin left 🟢", gm_reto_budget_over:"{x} over 🔴", gm_reto_budget_done:"Month closed under budget! 🏆",
  gm_reto_roundup:"Round-up challenge", gm_reto_roundup_sub:"{x} of {y} this month", gm_reto_done:"✓ Done",
  gm_streak:"🔥 {n} months in a row under budget", gm_streak_1:"🔥 1 month under budget", gm_streak_none:"No streak yet · close a month under budget", gm_streak_best:"Best streak: {n}",
  gm_locked:"🔒 Locked", gm_levelup:"🎉 You reached level {n}!", gm_badge_new:"🏅 Achievement: {x}",
  gm_b_first_goal:"1st goal reached", gm_b_first_underbudget:"1st month under budget", gm_b_first_reto:"1st challenge done", gm_b_streak_3:"3-month streak",
  gm_b_save_100:"€100 saved", gm_b_save_500:"€500 saved", gm_b_save_1000:"€1,000 saved", gm_b_save_5000:"€5,000 saved",
  sh_newdefault:"Group", sh_newgroup:"New shared group", sh_groups_title:"Split expenses (trips, events)", sh_name_ph:"Name (e.g. Cruise)", sh_you:"You", sh_other_ph:"Other person (e.g. Partner)", sh_create:"Create group", sh_cancel:"Cancel",
  sh_empty_t:"No groups yet", sh_empty_d:"Create a group to split trip, flat or event expenses with others.",
  sh_people:"people", sh_people_h:"People", sh_addperson_ph:"Add person", sh_balances:"Who owes whom", sh_settled:"All settled 🎉", sh_settled_short:"settled", sh_pending:"{n} payment(s) pending",
  sh_expenses:"Group expenses", sh_noexp:"No expenses yet. Add the first one.", sh_paidby:"Paid by {who}", sh_addexp:"Add expense", sh_exp:"Expense", sh_exp_ph:"What (e.g. Dinner)", sh_split:"Split between whom?",
  sh_back:"Groups", sh_delgroup:"Delete group", sh_delgroup_q:"Delete this group and its expenses?",
  gl_empty_t:"No goals yet", gl_empty_d:"Create your first savings goal and watch it get closer each month.",
  gl_widget_title:"Your goal", wl_goal:"Goal",
});
Object.assign(LANG.ca,{
  tab_metas:"Objectius", tab_logros:"Assoliments",
  gl_total:"Estalviat en objectius", gl_total_sub:"de {x} en total",
  gl_new:"Nou objectiu", gl_create:"Crea objectiu", gl_cancel:"Cancel·la",
  gl_name_ph:"Nom (ex. Vacances)", gl_target_ph:"Objectiu €", gl_saved_ph:"Ja estalviat €", gl_deadline:"Data límit (opcional)", gl_monthly_ph:"Aportació al mes € (opcional)",
  gl_emoji:"Icona", gl_newdefault:"El meu objectiu",
  gl_contribute:"+ Aporta", gl_contribute_prompt:"Quant afegeixes a «{name}»?", gl_contribute_sub:"Se suma al que ja portes estalviat per a aquesta meta.",
  gl_edit:"Edita objectius", gl_save:"Desa els canvis", gl_delete:"Elimina objectiu", gl_of:"de",
  gl_eta:"Al teu ritme ({x}/mes) l'assoleixes el {when} 🟢",
  gl_eta_ok:"Vas bé 🟢 · falten {x}", gl_eta_behind:"Necessites {x}/mes per arribar a temps 🟠",
  gl_eta_reached:"🎉 Assolit!", gl_eta_overdue:"La data ja ha passat 🟠 · ajusta-la", gl_eta_nosaving:"Comença a estalviar per veure la previsió",
  gl_done_badge:"🏅 Assolit", gl_celebrate:"🎉 Objectiu «{name}» assolit!",
  gm_level:"El teu nivell", gm_next:"{x} per al nivell {n}", gm_maxlvl:"Nivell màxim assolit! 👑", gm_score:"Estalvi acumulat",
  st_good_h:"Molt bé", st_good_l:"Segueixes dins del teu pressupost, mes rere mes.",
  st_tight_h:"Compte, just", st_tight_l:"Et queda poc marge, però encara dins del teu.",
  st_over_h:"T'has passat una mica", st_over_l:"Aquest mes has sortit del pressupost. S'ajusta i ja.",
  gm_lvl_0:"Aprenent", gm_lvl_1:"Estalviador", gm_lvl_2:"Constant", gm_lvl_3:"Expert", gm_lvl_4:"Mestre de l'estalvi",
  gm_retos:"Reptes del mes", gm_logros:"Assoliments",
  gm_reto_budget:"Mes sota pressupost", gm_reto_budget_ok:"Et queden {x} de marge 🟢", gm_reto_budget_over:"T'has passat {x} 🔴", gm_reto_budget_done:"Mes tancat sota pressupost! 🏆",
  gm_reto_roundup:"Repte round-up", gm_reto_roundup_sub:"{x} de {y} aquest mes", gm_reto_done:"✓ Aconseguit",
  gm_streak:"🔥 {n} mesos seguits sota pressupost", gm_streak_1:"🔥 1 mes sota pressupost", gm_streak_none:"Encara sense ratxa · tanca un mes sota pressupost", gm_streak_best:"Millor ratxa: {n}",
  gm_locked:"🔒 Bloquejat", gm_levelup:"🎉 Has pujat al nivell {n}!", gm_badge_new:"🏅 Assoliment: {x}",
  gm_b_first_goal:"1r objectiu assolit", gm_b_first_underbudget:"1r mes sota pressupost", gm_b_first_reto:"1r repte completat", gm_b_streak_3:"Ratxa de 3 mesos",
  gm_b_save_100:"100 € estalviats", gm_b_save_500:"500 € estalviats", gm_b_save_1000:"1.000 € estalviats", gm_b_save_5000:"5.000 € estalviats",
  sh_newdefault:"Grup", sh_newgroup:"Nou grup compartit", sh_groups_title:"Despeses a mitges (viatges, esdeveniments)", sh_name_ph:"Nom (ex. Creuer)", sh_you:"Tu", sh_other_ph:"Altra persona (ex. Parella)", sh_create:"Crea grup", sh_cancel:"Cancel·la",
  sh_empty_t:"Encara no hi ha grups", sh_empty_d:"Crea un grup per repartir despeses d'un viatge, pis o esdeveniment amb altres persones.",
  sh_people:"persones", sh_people_h:"Persones", sh_addperson_ph:"Afegeix persona", sh_balances:"Qui deu a qui", sh_settled:"Tot saldat 🎉", sh_settled_short:"saldat", sh_pending:"{n} pagament(s) pendent(s)",
  sh_expenses:"Despeses del grup", sh_noexp:"Encara no hi ha despeses. Afegeix la primera.", sh_paidby:"Va pagar {who}", sh_addexp:"Afegeix despesa", sh_exp:"Despesa", sh_exp_ph:"Concepte (ex. Sopar)", sh_split:"Entre qui es reparteix?",
  sh_back:"Grups", sh_delgroup:"Esborra grup", sh_delgroup_q:"Esborrar aquest grup i les seves despeses?",
  gl_empty_t:"Encara no tens objectius", gl_empty_d:"Crea el teu primer objectiu d'estalvi i mira com s'acosta cada mes.",
  gl_widget_title:"El teu objectiu", wl_goal:"Objectiu",
});
// --- Open Banking (Capa 2: el saldo real del banco) ---
Object.assign(LANG.es,{
  bank_section:"Banco (Open Banking)",
  bank_intro:"Conecta tu banco y tu saldo real será el «hoy» de la app. Solo lectura, sin tarjeta. El permiso se renueva cada ~3 meses.",
  bank_connect:"Conectar mi banco", bank_connecting:"Abriendo tu banco…",
  bank_connected:"Banco conectado ✓", bank_error:"No se pudo conectar el banco",
  bank_syncfail:"No pude leer el saldo del banco · reconéctate", bank_none:"No tienes ningún banco conectado",
  bank_syncsoft:"{bank}: el banco no respondió ahora · lo reintento solo (no hace falta reconectar)",
  bank_expired_re:"permiso caducado · reconéctate",
  bank_nolink:"esta cuenta aún no está dada de alta en Enable Banking (modo restringido). Enlázala en el panel de Enable Banking y vuelve a conectar.",
  bank_refresh:"Actualizar saldo", bank_reconnect:"Reconectar",
  bank_linked:"{bank} conectado", bank_pending:"Pendiente de autorizar en el banco",
  bank_updated:"Saldo actualizado: {x}", bank_neversync:"Aún sin sincronizar",
  bank_consent:"Permiso válido hasta {x}", bank_consent_soon:"⚠ El permiso caduca el {x} · reconéctate",
});
Object.assign(LANG.en,{
  bank_section:"Bank (Open Banking)",
  bank_intro:"Connect your bank and your real balance becomes the app's “today”. Read-only, no card. The consent renews every ~3 months.",
  bank_connect:"Connect my bank", bank_connecting:"Opening your bank…",
  bank_connected:"Bank connected ✓", bank_error:"Couldn't connect the bank",
  bank_syncfail:"Couldn't read the bank balance · reconnect", bank_none:"No bank connected",
  bank_syncsoft:"{bank}: the bank didn't answer just now · I'll retry on my own (no need to reconnect)",
  bank_expired_re:"consent expired · reconnect",
  bank_nolink:"this account isn't linked in Enable Banking yet (restricted mode). Link it in the Enable Banking control panel and reconnect.",
  bank_refresh:"Refresh balance", bank_reconnect:"Reconnect",
  bank_linked:"{bank} connected", bank_pending:"Pending authorization at the bank",
  bank_updated:"Balance updated: {x}", bank_neversync:"Not synced yet",
  bank_consent:"Consent valid until {x}", bank_consent_soon:"⚠ Consent expires on {x} · reconnect",
});
Object.assign(LANG.ca,{
  bank_section:"Banc (Open Banking)",
  bank_intro:"Connecta el teu banc i el teu saldo real serà l'«avui» de l'app. Només lectura, sense targeta. El permís es renova cada ~3 mesos.",
  bank_connect:"Connecta el meu banc", bank_connecting:"Obrint el teu banc…",
  bank_connected:"Banc connectat ✓", bank_error:"No s'ha pogut connectar el banc",
  bank_syncfail:"No he pogut llegir el saldo del banc · reconnecta't", bank_none:"No tens cap banc connectat",
  bank_syncsoft:"{bank}: el banc no ha respost ara · ho reintento sol (no cal reconnectar)",
  bank_expired_re:"permís caducat · reconnecta't",
  bank_nolink:"aquest compte encara no està donat d'alta a Enable Banking (mode restringit). Enllaça'l al panell d'Enable Banking i torna a connectar.",
  bank_refresh:"Actualitza saldo", bank_reconnect:"Reconnecta",
  bank_linked:"{bank} connectat", bank_pending:"Pendent d'autoritzar al banc",
  bank_updated:"Saldo actualitzat: {x}", bank_neversync:"Encara sense sincronitzar",
  bank_consent:"Permís vàlid fins {x}", bank_consent_soon:"⚠ El permís caduca el {x} · reconnecta't",
});
// --- Privacidad in-app (2026-07-17: antes abría privacy.html en _blank → «muy arriba» bajo el
// notch y «cuesta tirar para atrás». Ahora es un panel dentro de la app, con safe-area y gesto atrás). ---
Object.assign(LANG.es,{
  st_back_settings:"Ajustes",
  pv_title:"Privacidad y datos", pv_updated:"Última actualización: 15 jul 2026 · Mi Cartera (Juanjo Ávila)",
  pv_s1_h:"Qué datos guardamos",
  pv_s1:["Tu cartera: cuentas, inversiones, deudas, presupuesto y ajustes (en el móvil y, si inicias sesión, en Supabase).","Gastos: importe, comercio, categoría y fecha.","Conexiones bancarias: estado del enlace Open Banking y tokens de sesión cifrados. No guardamos la contraseña del banco.","MyInvestor: tokens de sesión cifrados tras conectar. La contraseña solo se usa al entrar y no se almacena.","Telemetría mínima (opcional): versión, plataforma y errores — sin datos financieros."],
  pv_s2_h:"Dónde se alojan",
  pv_s2:"Los datos en la nube están en Supabase (UE). La app se sirve desde GitHub Pages. Cada usuario solo lee y escribe sus propios datos (Row Level Security). Los CSV de tus extractos se procesan en el móvil y no se suben a ningún sitio.",
  pv_s3_h:"Tus derechos",
  pv_s3:["Acceso y portabilidad: exporta tus datos en JSON desde Ajustes → Copia de seguridad.","Supresión: Ajustes → Tu cuenta → Borrar mi cuenta (pide contraseña). Borra tu usuario y todos sus datos.","Rectificación: puedes editar cualquier dato dentro de la app."],
  pv_s4_h:"Contacto",
  pv_s4:"Para dudas sobre privacidad: juanjo.avila.chavero@gmail.com",
});
Object.assign(LANG.en,{
  st_back_settings:"Settings",
  pv_title:"Privacy & data", pv_updated:"Last updated: 15 Jul 2026 · Mi Cartera (Juanjo Ávila)",
  pv_s1_h:"What we store",
  pv_s1:["Your portfolio: accounts, investments, debts, budget and settings (on the phone and, if you sign in, in Supabase).","Expenses: amount, merchant, category and date.","Bank connections: Open Banking link status and encrypted session tokens. We never store your bank password.","MyInvestor: encrypted session tokens after connecting. The password is only used to sign in and is not stored.","Minimal telemetry (optional): version, platform and errors — no financial data."],
  pv_s2_h:"Where it lives",
  pv_s2:"Cloud data is in Supabase (EU). The app is served from GitHub Pages. Each user can only read and write their own data (Row Level Security). Your statement CSVs are processed on the phone and never uploaded.",
  pv_s3_h:"Your rights",
  pv_s3:["Access & portability: export your data as JSON from Settings → Backup.","Erasure: Settings → Your account → Delete my account (asks for password). Removes your user and all its data.","Rectification: you can edit any data inside the app."],
  pv_s4_h:"Contact",
  pv_s4:"Privacy questions: juanjo.avila.chavero@gmail.com",
});
Object.assign(LANG.ca,{
  st_back_settings:"Ajustos",
  pv_title:"Privacitat i dades", pv_updated:"Última actualització: 15 jul 2026 · Mi Cartera (Juanjo Ávila)",
  pv_s1_h:"Quines dades desem",
  pv_s1:["La teva cartera: comptes, inversions, deutes, pressupost i ajustos (al mòbil i, si inicies sessió, a Supabase).","Despeses: import, comerç, categoria i data.","Connexions bancàries: estat de l'enllaç Open Banking i tokens de sessió xifrats. No desem la contrasenya del banc.","MyInvestor: tokens de sessió xifrats després de connectar. La contrasenya només s'usa en entrar i no es desa.","Telemetria mínima (opcional): versió, plataforma i errors — sense dades financeres."],
  pv_s2_h:"On s'allotgen",
  pv_s2:"Les dades al núvol són a Supabase (UE). L'app se serveix des de GitHub Pages. Cada usuari només llegeix i escriu les seves dades (Row Level Security). Els CSV dels teus extractes es processen al mòbil i no es pugen enlloc.",
  pv_s3_h:"Els teus drets",
  pv_s3:["Accés i portabilitat: exporta les teves dades en JSON des d'Ajustos → Còpia de seguretat.","Supressió: Ajustos → El teu compte → Esborra el meu compte (demana contrasenya). Esborra el teu usuari i totes les dades.","Rectificació: pots editar qualsevol dada dins de l'app."],
  pv_s4_h:"Contacte",
  pv_s4:"Dubtes sobre privacitat: juanjo.avila.chavero@gmail.com",
});
// --- Open Banking (Capa 3: conciliación — el banco confirma tus fijos o te avisa) ---
Object.assign(LANG.es,{
  rec_title:"Conciliación con el banco",
  rec_sub_ok:"{ok} cargos confirmados ✓", rec_sub_issues:"{n} por revisar · {ok} confirmados", rec_sub_none:"Sin cargos que conciliar este mes",
  rec_mismatch_t:"⚠ No cuadra", rec_mismatch_l:"{name} — tú modelas {modeled}, el banco cobró {bank}",
  rec_missing_t:"⏳ Aún no aparece en el banco", rec_missing_l:"{name} · {amount} · día {day}",
  rec_new_t:"🆕 Cargos del banco sin modelar", rec_new_l:"{merchant} · día {day}",
  rec_add:"✓ Confirmar y apuntar", rec_added:"Añadido a Fijos ✓",
  rec_confirmed:"✓ {n} cargos confirmados por el banco", rec_feed:"Movimientos del banco", rec_income:"ingreso", rec_card:"tarjeta",
  rec_adjust:"Ajustar a {x}", rec_mark_shared:"Pago solo mi parte", rec_ignore:"Ignorar",
  rec_shared_t:"ℹ Pagas solo tu parte (te reintegran el resto)", rec_shared_l:"{name} — pagas {net}, el banco cobra {gross}", rec_unshare:"deshacer",
  rec_pay_from:"lo pago desde:",
  rec_hint:"Compara lo que modelas con lo que el banco cobró. Los cargos nuevos se pueden «Confirmar y apuntar» a Fijos sin teclearlos — no toca tu saldo ni la pestaña Gastos.",
});
// --- Open Banking · sección "Mis bancos" (multibanco) ---
Object.assign(LANG.es,{
  bp_title:"Mis bancos", bp_intro:"Solo lectura · el permiso se renueva cada ~3 meses.",
  bp_manage:"Gestionar mis bancos", bp_close:"Ajustes", bp_back:"Mis bancos",
  bp_empty:"Aún no has conectado ningún banco.", bp_add:"Conectar un banco",
  bp_expbanks:"También apuntar gastos de tarjeta de…", bp_expbanks_hint:"Sus compras con tarjeta entrarán solas en Gastos.", bp_expbanks_none:"Conecta un banco Open Banking para poder importar sus compras con tarjeta a Gastos.",
  bp_hist_btn:"Importar histórico", bp_hist_title:"Importar histórico", bp_hist_sub:"Trae movimientos de los últimos meses de: {banks}. Elige cuáles y si van a Gastos, Recibos o Ingresos. Tarjeta→Gasto, recibo→Recibos, crédito→Ingreso (puedes cambiarlo).", bp_hist_nodaily:"Conecta un banco Open Banking (o márcalo en «También apuntar gastos de tarjeta»). Trade Republic no vale aquí: no está en Open Banking.", bp_hist_m:"{n} mes(es)", bp_hist_search:"Buscar movimientos", bp_hist_searching:"Buscando…", bp_hist_none:"No hay movimientos nuevos en ese periodo (o ya están todos apuntados). Recuerda: el banco solo deja ver ~90 días.", bp_hist_found:"{n} movimientos · marca y elige destino", bp_hist_notcard:"no es tarjeta", bp_hist_import:"Importar {n}", bp_hist_done:"✓ {n} importados", bp_hist_as_gasto:"🛒 Gasto", bp_hist_as_recibo:"🧾 Recibo", bp_hist_as_ingreso:"💰 Ingreso", bp_hist_recibo:"Recibo", bp_hist_done_g:"✓ {n} en Gastos", bp_hist_done_i:"✓ {n} ingresos", bp_hist_done_r:"✓ {n} recibos",
  bp_summary_n:"{n} conectado(s)", bp_summary_exp:"⚠ {n} caducado(s) — reconéctalo", bp_summary_none:"Ningún banco conectado todavía",
  bp_pick_title:"Elige tu banco", bp_pick_sub:"Solo verás las cuentas que autorices.",
  bp_search:"Buscar banco…", bp_loading:"Cargando bancos…", bp_noresults:"Ningún banco coincide.", bp_already:"ya conectado",
  bp_need_login:"Inicia sesión para conectar tu banco", bp_syncing:"Actualizando…",
  bp_st_active:"activo", bp_st_soon:"caduca pronto", bp_st_pending:"pendiente", bp_st_expired:"caducado", bp_st_noacct:"sin cuentas",
  bp_roles_hint:"Dile a la app para qué usas cada banco: «Recibos» = de ahí salen tus gastos fijos y cuotas; «Gasto diario» = ahí se apuntan las compras del día a día (solo puede haber uno); «Todo» = las dos cosas en la misma cuenta. Así cada cargo cae donde toca.",
  bp_role_q:"¿Para qué usas este banco?",
  bp_role_obonly:"Este banco solo aporta su saldo al Patrimonio (no tiene cuenta con rol en la app).",
  bp_noacct_help:"Autorizaste el banco pero no llegó ninguna cuenta. En modo restringido, Enable Banking solo trae las cuentas que has dado de alta en su panel de control. Entra en el panel de Enable Banking, enlaza (whitelistea) esta cuenta y pulsa «Volver a intentar».",
  bp_retry_link:"Volver a intentar", bp_naccts:"{n} cuentas",
  bp_remove:"Quitar", bp_remove_q:"¿Quitar {bank}?", bp_remove_yes:"Sí, quitar", bp_remove_no:"Cancelar",
  bp_removing:"Quitando…", bp_removed:"{bank} quitado · puedes reconectarlo cuando quieras",
  bp_foot:"Trade Republic no está en Open Banking: su gasto entra por notificaciones.",
  bp_brokers:"Brókers",
  bp_apk_hint:"Si Trade Republic se desconecta solo: hace falta el APK nuevo (el arreglo es nativo). MyInvestor pide captcha por su anti-bot — espera un rato y reintenta.",
});
Object.assign(LANG.en,{
  bp_title:"My banks", bp_intro:"Read-only · consent renews every ~3 months.",
  bp_manage:"Manage my banks", bp_close:"Settings", bp_back:"My banks",
  bp_empty:"You haven't connected any bank yet.", bp_add:"Connect a bank",
  bp_expbanks:"Also log card spending from…", bp_expbanks_hint:"Their card purchases will land in Spending on their own.", bp_expbanks_none:"Connect an Open Banking bank to import its card purchases into Spending.",
  bp_hist_btn:"Import history", bp_hist_title:"Import history", bp_hist_sub:"Pull the last months from: {banks}. Pick which ones and whether they go to Spending, Bills or Income. Card→Spending, bill→Bills, credit→Income (you can change it).", bp_hist_nodaily:"Connect an Open Banking bank (or tick it under “Also log card spending”). Trade Republic won't work here: it's not in Open Banking.", bp_hist_m:"{n} month(s)", bp_hist_search:"Find transactions", bp_hist_searching:"Searching…", bp_hist_none:"No new transactions in that period (or they're all logged already). Remember: the bank only shows ~90 days.", bp_hist_found:"{n} transactions · check and pick destination", bp_hist_notcard:"not a card purchase", bp_hist_import:"Import {n}", bp_hist_done:"✓ {n} imported", bp_hist_as_gasto:"🛒 Spend", bp_hist_as_recibo:"🧾 Bill", bp_hist_as_ingreso:"💰 Income", bp_hist_recibo:"Bill", bp_hist_done_g:"✓ {n} in Spending", bp_hist_done_i:"✓ {n} income", bp_hist_done_r:"✓ {n} bills",
  bp_summary_n:"{n} connected", bp_summary_exp:"⚠ {n} expired — reconnect it", bp_summary_none:"No bank connected yet",
  bp_pick_title:"Choose your bank", bp_pick_sub:"You'll only see the accounts you authorize.",
  bp_search:"Search bank…", bp_loading:"Loading banks…", bp_noresults:"No bank matches.", bp_already:"already connected",
  bp_need_login:"Sign in to connect your bank", bp_syncing:"Refreshing…",
  bp_st_active:"active", bp_st_soon:"expires soon", bp_st_pending:"pending", bp_st_expired:"expired", bp_st_noacct:"no accounts",
  bp_roles_hint:"Tell the app what each bank is for: \"Bills\" = your fixed expenses and instalments come out of it; \"Daily spending\" = day-to-day purchases get logged there (only one allowed); \"Everything\" = both in the same account. That way every charge lands where it should.",
  bp_role_q:"What do you use this bank for?",
  bp_role_obonly:"This bank only adds its balance to Net worth (it has no role account in the app).",
  bp_noacct_help:"You authorised the bank but no account came through. In restricted mode, Enable Banking only returns accounts you've registered in its control panel. Open the Enable Banking panel, link (whitelist) this account and tap «Try again».",
  bp_retry_link:"Try again", bp_naccts:"{n} accounts",
  bp_remove:"Remove", bp_remove_q:"Remove {bank}?", bp_remove_yes:"Yes, remove", bp_remove_no:"Cancel",
  bp_removing:"Removing…", bp_removed:"{bank} removed · you can reconnect it whenever you want",
  bp_foot:"Trade Republic isn't in Open Banking: its spending arrives via notifications.",
  bp_brokers:"Brokers",
  bp_apk_hint:"If Trade Republic keeps logging you out: install the new APK (native fix). MyInvestor captcha is their anti-bot — wait and retry.",
});
Object.assign(LANG.ca,{
  bp_title:"Els meus bancs", bp_intro:"Només lectura · el permís es renova cada ~3 mesos.",
  bp_manage:"Gestiona els meus bancs", bp_close:"Ajustos", bp_back:"Els meus bancs",
  bp_empty:"Encara no has connectat cap banc.", bp_add:"Connecta un banc",
  bp_expbanks:"També apuntar despeses de targeta de…", bp_expbanks_hint:"Les seves compres amb targeta entraran soles a Despeses.", bp_expbanks_none:"Connecta un banc Open Banking per poder importar-ne les compres amb targeta a Despeses.",
  bp_hist_btn:"Importar històric", bp_hist_title:"Importar històric", bp_hist_sub:"Porta moviments dels últims mesos de: {banks}. Tria quins i si van a Despeses, Rebuts o Ingressos. Targeta→Despesa, rebut→Rebuts, crèdit→Ingrés (ho pots canviar).", bp_hist_nodaily:"Connecta un banc Open Banking (o marca'l a «També apuntar despeses de targeta»). Trade Republic no val aquí: no és a Open Banking.", bp_hist_m:"{n} mes(os)", bp_hist_search:"Cerca moviments", bp_hist_searching:"Cercant…", bp_hist_none:"No hi ha moviments nous en aquest període (o ja estan tots apuntats). Recorda: el banc només deixa veure ~90 dies.", bp_hist_found:"{n} moviments · marca i tria destinació", bp_hist_notcard:"no és targeta", bp_hist_import:"Importar {n}", bp_hist_done:"✓ {n} importats", bp_hist_as_gasto:"🛒 Despesa", bp_hist_as_recibo:"🧾 Rebut", bp_hist_as_ingreso:"💰 Ingrés", bp_hist_recibo:"Rebut", bp_hist_done_g:"✓ {n} a Despeses", bp_hist_done_i:"✓ {n} ingressos", bp_hist_done_r:"✓ {n} rebuts",
  bp_summary_n:"{n} connectat(s)", bp_summary_exp:"⚠ {n} caducat(s) — reconnecta'l", bp_summary_none:"Cap banc connectat encara",
  bp_pick_title:"Tria el teu banc", bp_pick_sub:"Només veuràs els comptes que autoritzis.",
  bp_search:"Cerca banc…", bp_loading:"Carregant bancs…", bp_noresults:"Cap banc coincideix.", bp_already:"ja connectat",
  bp_need_login:"Inicia sessió per connectar el teu banc", bp_syncing:"Actualitzant…",
  bp_st_active:"actiu", bp_st_soon:"caduca aviat", bp_st_pending:"pendent", bp_st_expired:"caducat", bp_st_noacct:"sense comptes",
  bp_roles_hint:"Digues a l'app per a què uses cada banc: «Rebuts» = d'allà surten les despeses fixes i quotes; «Despesa diària» = allà s'apunten les compres del dia a dia (només n'hi pot haver un); «Tot» = les dues coses al mateix compte. Així cada càrrec cau on toca.",
  bp_role_q:"Per a què uses aquest banc?",
  bp_role_obonly:"Aquest banc només aporta el seu saldo al Patrimoni (no té compte amb rol a l'app).",
  bp_noacct_help:"Vas autoritzar el banc però no va arribar cap compte. En mode restringit, Enable Banking només porta els comptes que has donat d'alta al seu panell de control. Entra al panell d'Enable Banking, enllaça (whitelist) aquest compte i prem «Torna-ho a provar».",
  bp_retry_link:"Torna-ho a provar", bp_naccts:"{n} comptes",
  bp_remove:"Treu", bp_remove_q:"Treure {bank}?", bp_remove_yes:"Sí, treu", bp_remove_no:"Cancel·la",
  bp_removing:"Traient…", bp_removed:"{bank} tret · pots reconnectar-lo quan vulguis",
  bp_foot:"Trade Republic no és a Open Banking: la seva despesa entra per notificacions.",
  bp_brokers:"Brókers",
  bp_apk_hint:"Si Trade Republic es desconnecta sol: cal l'APK nou (l'arreglo és natiu). MyInvestor demana captcha pel seu anti-bot — espera i torna-ho a provar.",
});
Object.assign(LANG.en,{
  rec_title:"Bank reconciliation",
  rec_sub_ok:"{ok} charges confirmed ✓", rec_sub_issues:"{n} to review · {ok} confirmed", rec_sub_none:"Nothing to reconcile this month",
  rec_mismatch_t:"⚠ Doesn't match", rec_mismatch_l:"{name} — you model {modeled}, the bank charged {bank}",
  rec_missing_t:"⏳ Not in the bank yet", rec_missing_l:"{name} · {amount} · day {day}",
  rec_new_t:"🆕 Bank charges you don't model", rec_new_l:"{merchant} · day {day}",
  rec_add:"✓ Confirm and log", rec_added:"Added to Fixed ✓",
  rec_confirmed:"✓ {n} charges confirmed by the bank", rec_feed:"Bank movements", rec_income:"income", rec_card:"card",
  rec_adjust:"Set to {x}", rec_mark_shared:"I only pay my share", rec_ignore:"Ignore",
  rec_shared_t:"ℹ You only pay your share (you get the rest back)", rec_shared_l:"{name} — you pay {net}, the bank charges {gross}", rec_unshare:"undo",
  rec_pay_from:"I pay it from:",
  rec_hint:"Compares what you model with what the bank charged. New charges can be “Confirm and log” into Fixed without typing — it doesn't touch your balance or the Spending tab.",
});
Object.assign(LANG.ca,{
  rec_title:"Conciliació amb el banc",
  rec_sub_ok:"{ok} càrrecs confirmats ✓", rec_sub_issues:"{n} per revisar · {ok} confirmats", rec_sub_none:"Res a conciliar aquest mes",
  rec_mismatch_t:"⚠ No quadra", rec_mismatch_l:"{name} — tu modeles {modeled}, el banc va cobrar {bank}",
  rec_missing_t:"⏳ Encara no apareix al banc", rec_missing_l:"{name} · {amount} · dia {day}",
  rec_new_t:"🆕 Càrrecs del banc sense modelar", rec_new_l:"{merchant} · dia {day}",
  rec_add:"✓ Confirma i apunta", rec_added:"Afegit a Fixes ✓",
  rec_confirmed:"✓ {n} càrrecs confirmats pel banc", rec_feed:"Moviments del banc", rec_income:"ingrés", rec_card:"targeta",
  rec_adjust:"Ajusta a {x}", rec_mark_shared:"Pago només la meva part", rec_ignore:"Ignora",
  rec_shared_t:"ℹ Pagues només la teva part (et retornen la resta)", rec_shared_l:"{name} — pagues {net}, el banc cobra {gross}", rec_unshare:"desfés",
  rec_pay_from:"ho pago des de:",
  rec_hint:"Compara el que modeles amb el que el banc ha cobrat. Els càrrecs nous es poden «Confirma i apunta» a Fixes sense teclejar-los — no toca el teu saldo ni la pestanya Despeses.",
});

// --- Perfil personal (pull-down Inicio) ---
Object.assign(LANG.es,{
  pf_title:"Tu perfil", pf_personal:"Personal", pf_wealth:"Patrimonio", pf_investor:"Perfil inversor",
  pf_add:"Añadir", pf_handle:"Usuario", pf_basic:"Información básica", pf_name:"Nombre", pf_name_ph:"Tu nombre",
  pf_birth:"Fecha de nacimiento", pf_birth_ph:"p. ej. 13 mayo 1998", pf_nationality:"Nacionalidad",
  pf_country_ph:"España", pf_address:"Dirección", pf_address_ph:"Calle, CP, ciudad",
  pf_phone:"Teléfono", pf_email:"Correo", pf_account_purpose:"Finalidad de la cuenta",
  pf_purpose_ph:"p. ej. Gastos, cambio de divisas…", pf_tax:"Residencia fiscal",
  pf_job:"Empleo", pf_job_status:"Situación laboral", pf_job_status_ph:"Empleado/a, autónomo…",
  pf_job_sector:"Sector", pf_job_sector_ph:"Informática, sanidad…", pf_job_role:"Puesto",
  pf_job_role_ph:"Desarrollador/a…", pf_salary:"Rango de ingresos", pf_salary_ph:"€50.001 – €75.000",
  pf_wealth_src:"Origen del patrimonio", pf_wealth_src_ph:"Ingresos laborales…",
  pf_networth:"Patrimonio neto", pf_networth_ph:"€150.001 – €400.000",
  pf_inv_purpose:"Finalidad de la inversión", pf_inv_purpose_ph:"Exploratoria; riesgo equilibrado…",
  pf_hint:"Estos datos viven solo en tu móvil (y en la nube de Mi Cartera si tienes sesión). No se comparten con bancos.",
  pf_to_settings:"Ir a Ajustes",
});
Object.assign(LANG.en,{
  pf_title:"Your profile", pf_personal:"Personal", pf_wealth:"Wealth", pf_investor:"Investor profile",
  pf_add:"Add", pf_handle:"Username", pf_basic:"Basic info", pf_name:"Name", pf_name_ph:"Your name",
  pf_birth:"Date of birth", pf_birth_ph:"e.g. 13 May 1998", pf_nationality:"Nationality",
  pf_country_ph:"Spain", pf_address:"Address", pf_address_ph:"Street, postcode, city",
  pf_phone:"Phone", pf_email:"Email", pf_account_purpose:"Account purpose",
  pf_purpose_ph:"e.g. Spending, FX…", pf_tax:"Tax residency",
  pf_job:"Employment", pf_job_status:"Employment status", pf_job_status_ph:"Employee, self-employed…",
  pf_job_sector:"Industry", pf_job_sector_ph:"IT, healthcare…", pf_job_role:"Role",
  pf_job_role_ph:"Developer…", pf_salary:"Income range", pf_salary_ph:"€50,001 – €75,000",
  pf_wealth_src:"Source of wealth", pf_wealth_src_ph:"Employment income…",
  pf_networth:"Net worth", pf_networth_ph:"€150,001 – €400,000",
  pf_inv_purpose:"Investment purpose", pf_inv_purpose_ph:"Exploratory; balanced risk…",
  pf_hint:"This data stays on your phone (and Mi Cartera cloud if signed in). It is not shared with banks.",
  pf_to_settings:"Go to Settings",
});
Object.assign(LANG.ca,{
  pf_title:"El teu perfil", pf_personal:"Personal", pf_wealth:"Patrimoni", pf_investor:"Perfil inversor",
  pf_add:"Afegeix", pf_handle:"Usuari", pf_basic:"Informació bàsica", pf_name:"Nom", pf_name_ph:"El teu nom",
  pf_birth:"Data de naixement", pf_birth_ph:"p. ex. 13 maig 1998", pf_nationality:"Nacionalitat",
  pf_country_ph:"Espanya", pf_address:"Adreça", pf_address_ph:"Carrer, CP, ciutat",
  pf_phone:"Telèfon", pf_email:"Correu", pf_account_purpose:"Finalitat del compte",
  pf_purpose_ph:"p. ex. Despeses, canvi de divises…", pf_tax:"Residència fiscal",
  pf_job:"Ocupació", pf_job_status:"Situació laboral", pf_job_status_ph:"Assalariat/da, autònom…",
  pf_job_sector:"Sector", pf_job_sector_ph:"Informàtica, sanitat…", pf_job_role:"Càrrec",
  pf_job_role_ph:"Desenvolupador/a…", pf_salary:"Rang d'ingressos", pf_salary_ph:"€50.001 – €75.000",
  pf_wealth_src:"Origen del patrimoni", pf_wealth_src_ph:"Ingressos laborals…",
  pf_networth:"Patrimoni net", pf_networth_ph:"€150.001 – €400.000",
  pf_inv_purpose:"Finalitat de la inversió", pf_inv_purpose_ph:"Exploratòria; risc equilibrat…",
  pf_hint:"Aquestes dades viuen només al teu mòbil (i al núvol de Mi Cartera si tens sessió). No es comparteixen amb bancs.",
  pf_to_settings:"Ves a Ajustos",
});

const MONTHS=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function parseDate(v){
  if(v instanceof Date) return v;
  if(typeof v==="number") return new Date(v);
  const s=String(v||"").trim();
  const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if(m){ let y=+m[3]; if(y<100)y+=2000; return new Date(y,(+m[2])-1,+m[1]); }
  const d=new Date(s); return isNaN(d)?new Date():d;
}
const dayKey=(d)=> d.toISOString().slice(0,10);
function relDay(d){
  const tn=new Date(); const y=new Date(); y.setDate(tn.getDate()-1);
  if(dayKey(d)===dayKey(tn)) return t("g_today");
  if(dayKey(d)===dayKey(y)) return t("g_yesterday");
  return d.getDate()+" "+monthShort(d.getMonth());
}
const startOfMonth=(d)=>{ d=d||new Date(); return new Date(d.getFullYear(),d.getMonth(),1); };

/* ---------- Lógica del efectivo de Trade Republic ----------
   El "value" de la cuenta de gasto = saldo al INICIO del mes en curso
   (después de inyecciones de meses anteriores, antes del gasto de este mes).
   Saldo mostrado = value + inyección(si ya pasó el último día laborable) − gasto del mes.
   La nómina entra el último día LABORABLE del mes (sin falta). */
const mk=(y,m)=> y+"-"+String(m+1).padStart(2,"0");                 // "2026-06"
const mkOf=(d)=> mk(d.getFullYear(), d.getMonth());
function lastWorkingDay(y,m){                                        // último lun-vie del mes
  const d=new Date(y, m+1, 0);                                      // último día del mes
  while(d.getDay()===0 || d.getDay()===6) d.setDate(d.getDate()-1);  // retrocede si cae finde
  return d;
}
function nominaYaEntro(now){                                        // ¿ya pasó el último día laborable?
  now=now||new Date();
  return now.getDate() >= lastWorkingDay(now.getFullYear(), now.getMonth()).getDate();
}
// Al cargar: arrastra meses ya cerrados al saldo base (les mete su inyección y les resta su gasto)
/* ---- ROLES DE CUENTA: qué papel juega cada cuenta en el motor ----
   "fijos"  → lleva recibos/cuotas/nómina (comportamiento banco de siempre).
   "diario" → de aquí sale el gasto variable del día a día (el spendFrom de siempre, TR).
   "ambos"  → UNA cuenta para todo (gente que usa un solo banco): recibos Y gasto diario.
   `spendFrom` se mantiene sincronizado con el rol (diario/ambos → true) para que todo el
   motor existente siga funcionando sin tocar cada find(a=>a.spendFrom). Solo puede haber
   UNA cuenta diario/ambos a la vez (la UI degrada las demás a fijos). */
function accRole(a){ return (a&&a.role) || (a&&a.spendFrom ? "diario" : "fijos"); }
function accDaily(a){ const r=accRole(a); return r==="diario"||r==="ambos"; }   // gasto variable sale de aquí
/* Bancos cuyas compras con tarjeta Open Banking entran en Gastos. Independiente del
   spendFrom único (presupuesto/round-up). Por defecto = ent de la cuenta diaria. */
function expenseBankEnts(s){
  const raw=s&&s.settings&&s.settings.expenseBanks;
  if(Array.isArray(raw)&&raw.length){
    const out=[]; raw.forEach(function(e){ if(e&&out.indexOf(e)<0) out.push(e); });
    if(out.length) return out;
  }
  const daily=(s.accounts||[]).find(function(a){ return accDaily(a); });
  return (daily&&daily.ent)? [daily.ent] : [];
}
// Cambia el ROL de una cuenta re-anclando `value` para que el saldo mostrado no cambie (se
// despeja value de la fórmula del rol nuevo). Solo puede haber UNA cuenta de gasto diario: si
// otra lo era, pasa a «fijos» con el mismo re-anclaje. Transform PURO de estado — lo usan el
// editor de Patrimonio y el selector de «Gestionar mis bancos» (UX 2026-07-11).
function applyAccountRole(s, totals, id, r){
  const pn=function(i){ return (totals.paidNetByBank&&totals.paidNetByBank[i.ent])||0; };
  const ruM=totals.roundupThisMonth||0, miM=totals.monthlyInvestThisMonth||0;
  const spendBal=function(i){ return i.value + totals.injTR - totals.thisMonthSpent - ruM - miM + (accRole(i)==="ambos"?pn(i):0); };
  const ruOfA=function(a){ return (a.roundupManual!=null)?a.roundupManual:(a.roundup?ruM:0); };
  const injOfA=function(a){ return nominaYaEntro()? accInject(a):0; };
  const shownOf=function(a){ return accDaily(a)? spendBal(a) : ((a.value||0) + pn(a)); };
  const valueForRole=function(a,rr,shown){
    if(rr==="fijos") return +(shown - pn(a)).toFixed(2);
    return +((shown - injOfA(a) + (totals.thisMonthSpent||0) + ruOfA(a) + (a.monthlyInvest||0) - (rr==="ambos"?pn(a):0))).toFixed(2);
  };
  return Object.assign({},s,{accounts:s.accounts.map(function(a){
    if(a.id===id){ if(accRole(a)===r) return a; return Object.assign({},a,{role:r, spendFrom:r!=="fijos", value:valueForRole(a,r,shownOf(a))}); }
    if(r!=="fijos" && accDaily(a)) return Object.assign({},a,{role:"fijos", spendFrom:false, value:valueForRole(a,"fijos",shownOf(a))});
    return a;
  })});
}
function accFixed(a){ const r=accRole(a); return r==="fijos"||r==="ambos"; }    // participa en el motor de fijos
// Inyección de nómina de la cuenta de gasto (€ que entran cada mes FUERA del sistema de flujos).
// Antes era CONFIG.TR_INJECTION hardcodeado para todos; ahora es por cuenta (a.inject). Fallback
// anclado al id de la cuenta TR del creador (patrón de migración por id) hasta que la semilla escriba el campo.
function accInject(a){ if(!a) return 0; return a.inject!=null ? a.inject : (a.id==="ebj0vbh" ? CONFIG.TR_INJECTION : 0); }

function reconcileTR(s){
  if(!s.accounts || !s.expenses) return s;
  const acc=s.accounts.find(a=>a.spendFrom);
  if(!acc) return s;
  const now=new Date();
  const cmKey=mkOf(now);
  let anchor=s.trAnchor || cmKey;
  let [ay,am]=anchor.split("-").map(Number); am=am-1;
  let guard=0;
  while(mk(ay,am) < cmKey && guard<120){
    const key=mk(ay,am);
    const monthExp=s.expenses.filter(e=> mkOf(parseDate(e.date))===key);
    const spent=monthExp.reduce((a,e)=>a+e.amount,0);
    acc.value = acc.value + accInject(acc) - spent;                 // mes cerrado: + inyección de nómina − gasto
    // rol "ambos" (una cuenta para todo): además arrastra su neto de fijos/nómina/puntuales del mes
    if(accRole(acc)==="ambos") acc.value = +(acc.value + monthNetForAccount(s, acc.ent, ay, am+1, null)).toFixed(2);
    // Round-up & Saveback (#19): al cerrar el mes, el round-up sale del efectivo y se abona
    // (junto al saveback, dinero gratis) a la inversión destino comprando participaciones.
    const ru = (acc.roundupManual!=null) ? acc.roundupManual : roundupOf(monthExp, acc.roundup||0);
    const sb = (acc.savebackManual!=null) ? acc.savebackManual : (acc.saveback ? savebackOf(monthExp) : 0);
    if(ru>0) acc.value = +(acc.value - ru).toFixed(2);             // el round-up abandona el efectivo
    const contrib = ru + sb;                                       // total que entra a la inversión (€)
    if(contrib>0 && acc.rewardInv){
      const inv = s.investments && s.investments.find(function(i){ return i.id===acc.rewardInv; });
      if(inv){
        const cInv = inv.cur==="USD" ? contrib/(s.fx||1) : contrib;   // a la moneda de la inversión
        if(inv.shares>0 && inv.value>0) inv.shares = +(inv.shares + cInv/(inv.value/inv.shares)).toFixed(6);
        inv.value = +((inv.value||0)+cInv).toFixed(2);
        inv.cost  = +((inv.cost||0)+cInv).toFixed(2);
      }
      s.trRewardsTotal = +(((s.trRewardsTotal||0)+contrib)).toFixed(2);   // acumulado histórico (€)
    }
    // Aporte periódico a inversión (plan de ahorro, p.ej. 50€/mes al FTSE): sale del efectivo y
    // compra participaciones en su destino (por defecto el mismo del round-up).
    const mi = acc.monthlyInvest||0;
    if(mi>0){
      const dest = acc.monthlyInvestTo || acc.rewardInv;
      const inv2 = s.investments && s.investments.find(function(i){ return i.id===dest; });
      if(inv2){
        acc.value = +(acc.value - mi).toFixed(2);
        const cInv2 = inv2.cur==="USD" ? mi/(s.fx||1) : mi;
        if(inv2.shares>0 && inv2.value>0) inv2.shares = +(inv2.shares + cInv2/(inv2.value/inv2.shares)).toFixed(6);
        inv2.value = +((inv2.value||0)+cInv2).toFixed(2);
        inv2.cost  = +((inv2.cost||0)+cInv2).toFixed(2);
      }
    }
    // Interés del efectivo (TR lo abona el día 1 del mes siguiente = justo al cerrar):
    // estimación % anual / 12 sobre el saldo de cierre. Sin esto el saldo derivaba unos €/mes.
    if(acc.interestApr>0) acc.value = +(acc.value + acc.value*acc.interestApr/1200).toFixed(2);
    // los importes manuales de round-up/saveback eran de ESTE mes que se cierra → ya aplicados, se limpian
    if(acc.roundupManual!=null) delete acc.roundupManual;
    if(acc.savebackManual!=null) delete acc.savebackManual;
    // Demás bancos (Sabadell, etc.): arrastran su neto del mes cerrado (ingresos − fijos − cuotas − puntuales − transfers)
    s.accounts.forEach(function(a2){ if(!a2.spendFrom){ a2.value = +(((a2.value||0) + monthNetForAccount(s, a2.ent, ay, am+1, null))).toFixed(2); } });
    am++; if(am>11){am=0;ay++;}
    guard++;
  }
  s.trAnchor=cmKey;
  return s;
}

const uid=()=> Math.random().toString(36).slice(2,10);
const FREQ_M = { mes:1, mensual:1, bimestral:1/2, trimestral:1/3, semestral:1/6, "año":1/12, anual:1/12, semana:4.345 };

/* ---- Round-up & Saveback de TR (#19): calderilla y cashback que TR mueve a inversión ---- */
// Calderilla de una compra: TR redondea al € superior (2,00→3,00=1€; 5,95→6,00=0,05).
function spareOf(amt){ amt=Math.abs(amt||0); return +(Math.floor(amt)+1-amt).toFixed(2); }
// Round-up/saveback SOLO cuentan compras con tarjeta: gasto real (amount>0) que no esté
// marcado noCard (bizum/transferencia a personas, que TR no redondea ni bonifica).
function isCardSpend(e){ return e && e.amount>0 && !e.noCard; }
// Round-up total de una lista de gastos × multiplicador.
function roundupOf(expenses, mult){ if(!mult||mult<=0) return 0; let s=0; (expenses||[]).forEach(function(e){ if(isCardSpend(e)) s+=spareOf(e.amount); }); return +(s*mult).toFixed(2); }
// Saveback: 1% del gasto con tarjeta del periodo, tope 15€/mes (dinero gratis de TR).
function savebackOf(expenses){ let g=0; (expenses||[]).forEach(function(e){ if(isCardSpend(e)) g+=e.amount; }); return +Math.min(15, g*0.01).toFixed(2); }
const RU_MULTS=[0,2,3,5,10];

/* ---- Metas de ahorro (#15): helpers de progreso/previsión + celebración ---- */
const GOAL_EMOJIS=["🎯","✈️","🏠","🚗","💍","🎓","🛟","🎮","💻","🏖️","🎁","💰","📱","🐱"];
function goalPct(g){ const tg=(g&&g.target)||0; return tg>0 ? Math.min(100, Math.max(0,((g.saved||0)/tg)*100)) : 0; }
function goalRemaining(g){ return Math.max(0, ((g&&g.target)||0)-((g&&g.saved)||0)); }
// meses enteros desde hoy hasta una fecha "YYYY-MM" (negativo = ya pasada); null si no hay fecha
function monthsUntil(ym){ if(!ym) return null; const p=String(ym).split("-"); const d=new Date(); return (+p[0]-d.getFullYear())*12 + ((+p[1]-1)-d.getMonth()); }
// etiqueta "mes año" sumando n meses al mes actual
function monthYearIn(n){ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+(n||0)); return monthShort(d.getMonth())+" "+d.getFullYear(); }
// frase viva de previsión a partir del ahorro mensual real → {text, cls:""|"ok"|"warn"}
function goalEta(g, monthlySaving){
  const rem=goalRemaining(g);
  if((g&&g.done) || rem<=0) return {text:t("gl_eta_reached"), cls:"ok"};
  // aporte mensual elegido PARA esta meta tiene prioridad sobre el ahorro global
  const m = (g && g.monthly>0) ? g.monthly : monthlySaving;
  const dl=monthsUntil(g.deadline);
  if(dl!=null){
    if(dl<=0) return {text:t("gl_eta_overdue"), cls:"warn"};
    const need=rem/dl;
    if(m>0 && m>=need) return {text:tf("gl_eta_ok",{x:eur0(rem),m:dl}), cls:"ok"};
    return {text:tf("gl_eta_behind",{x:eur0(need)}), cls:"warn"};
  }
  if(m>0){ const months=Math.max(1,Math.ceil(rem/m)); return {text:tf("gl_eta",{x:eur0(m),when:monthYearIn(months)}), cls:""}; }
  return {text:t("gl_eta_nosaving"), cls:""};
}
// confeti DOM: ligero, se autolimpia. Para celebrar una meta cumplida.
function celebrate(){
  // Rediseño: confeti reservado SOLO a metas cumplidas y más suave (26 piezas, paleta calmada
  // mint+dorado, opacidad ~.85). Antes: 90 piezas y 5 colores (competía con los momentos silenciosos).
  try{
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const colors=["#5FD08A","#7DE8A8","#E6C36A"];
    for(let i=0;i<26;i++){
      const c=document.createElement("div"); c.className="confetti";
      c.style.left=(Math.random()*100)+"vw";
      c.style.background=colors[i%colors.length];
      c.style.animationDelay=(Math.random()*0.35)+"s";
      c.style.animationDuration=(2.6+Math.random()*1.5)+"s";
      c.style.opacity="0.85";
      document.body.appendChild(c);
      setTimeout(function(){ c.remove(); },4600);
    }
  }catch(e){}
}

// Rediseño · toque 2: convierte un entero a palabras en español (hasta millones), para "ver/oír"
// el patrimonio al mantener pulsada la cifra. Apócopes: "un"/"veintiún", "cien"/"ciento".
function words(num){
  num=Math.round(Math.abs(num));
  if(num===0) return "cero";
  const U=["","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve","veinte","veintiuno","veintidós","veintitrés","veinticuatro","veinticinco","veintiséis","veintisiete","veintiocho","veintinueve"];
  const D=["","","","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
  const C=["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];
  const tens=function(n){ return n<30?U[n]:D[Math.floor(n/10)]+(n%10?" y "+U[n%10]:""); };
  const hund=function(n){ return n===100?"cien":(Math.floor(n/100)?C[Math.floor(n/100)]:"")+(Math.floor(n/100)&&n%100?" ":"")+(n%100?tens(n%100):""); };
  const apo=function(s){ return s.replace(/uno$/,"un").replace(/veintiuno$/,"veintiún"); };
  const mill=Math.floor(num/1000000), miles=Math.floor((num%1000000)/1000), resto=num%1000;
  let out="";
  if(mill) out+=(mill===1?"un millón":apo(hund(mill))+" millones");
  if(miles) out+=(out?" ":"")+(miles===1?"mil":apo(hund(miles))+" mil");
  if(resto) out+=(out?" ":"")+hund(resto);
  return out.trim();
}
// Rediseño · toque 4: mezcla dos hex (mint↔coral) en JS → "r,g,b". Evita depender de color-mix
// del WebView; con t=0 devuelve exactamente el mint del hero actual (0 cambios visibles).
function mixHex(a,b,t){
  const h=function(s,i){ return parseInt(s.slice(i,i+2),16); };
  const r=Math.round(h(a,1)+(h(b,1)-h(a,1))*t), g=Math.round(h(a,3)+(h(b,3)-h(a,3))*t), bl=Math.round(h(a,5)+(h(b,5)-h(a,5))*t);
  return r+","+g+","+bl;
}

/* ============================================================
   GAMIFICACIÓN (#15 capas Retos + Logros) — TODO DERIVADO de los datos,
   sin marcar nada a mano. savedScore = ahorrado en metas + recompensas TR acumuladas.
   ============================================================ */
const RU_GOAL=30;                       // €/mes objetivo de round-up+saveback (reto)
const SAVE_HITOS=[100,500,1000,5000];   // hitos de ahorro (medallas)
const GM_LEVELS=[0,250,1000,3000,8000]; // umbrales de savedScore por nivel
const GM_ICONS=["🐣","🐢","🦊","🦅","👑"];
// Gasto mensual (solo gastos reales, amount>0) por clave YYYY-MM.
function spendByMonth(expenses){ const m={}; (expenses||[]).forEach(function(e){ if(e.amount>0){ const k=mkOf(parseDate(e.date)); m[k]=(m[k]||0)+e.amount; } }); return m; }
function median(arr){ const a=(arr||[]).slice().sort(function(x,y){return x-y;}); const n=a.length; if(!n) return 0; return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2; }
// Detector de SUSCRIPCIONES / cargos recurrentes: mismo comercio en ≥3 meses distintos con importe
// estable (≥60% dentro de ±25% de la mediana). Devuelve {name,cat,amount,months,last,active,yearly}.
function detectSubscriptions(expenses){
  const now=new Date();
  const activeCut=mk(now.getFullYear(), now.getMonth()-2);   // visto en los últimos ~2 meses = sigue activa
  const groups={};
  (expenses||[]).forEach(function(e){
    if(!(e.amount>0)) return; const k=catKey(e.merchant); if(!k) return;
    const mkey=mkOf(parseDate(e.date));
    const g=(groups[k]=groups[k]||{name:e.merchant||k,cat:e.category,byMonth:{}});
    g.byMonth[mkey]=(g.byMonth[mkey]||0)+e.amount; g.name=e.merchant||g.name; g.cat=e.category;
  });
  const subs=[];
  Object.keys(groups).forEach(function(k){
    const g=groups[k]; const months=Object.keys(g.byMonth).sort(); if(months.length<3) return;
    const amts=months.map(function(m){ return g.byMonth[m]; });
    const med=median(amts); if(med<=0) return;
    const consistent=amts.filter(function(a){ return Math.abs(a-med)<=Math.max(1,med*0.25); }).length;
    if(consistent < Math.ceil(months.length*0.6)) return;
    const last=months[months.length-1];
    subs.push({ key:k, name:g.name, cat:g.cat, amount:+med.toFixed(2), months:months.length, last:last, active:last>=activeCut, yearly:Math.round(med*12) });
  });
  return subs.sort(function(a,b){ return b.amount-a.amount; });
}
// Racha de meses CERRADOS consecutivos bajo presupuesto + mejor racha histórica.
function underBudgetStreak(expenses, budget){
  if(!budget||budget<=0) return {current:0,best:0,ever:false};
  const sb=spendByMonth(expenses);
  const now=new Date(); const curKey=mk(now.getFullYear(),now.getMonth());
  const keys=Object.keys(sb).filter(function(k){ return k<curKey; }).sort();   // meses cerrados, ascendente
  let best=0,run=0,ever=false;
  keys.forEach(function(k){ if(sb[k]<=budget){ run++; if(run>best)best=run; ever=true; } else run=0; });
  let cur=0; for(let i=keys.length-1;i>=0;i--){ if(sb[keys[i]]<=budget) cur++; else break; }
  return {current:cur,best:best,ever:ever};
}
// Estado completo de gamificación (puro, sin efectos).
function gamifOf(state, totals){
  const tt=totals||{};
  const goals=state.goals||[];
  const savedScore=goals.reduce(function(a,g){return a+(g.saved||0);},0) + (tt.trRewardsTotal||state.trRewardsTotal||0);
  let lvl=0; for(let i=0;i<GM_LEVELS.length;i++){ if(savedScore>=GM_LEVELS[i]) lvl=i; }
  const nextMin = (lvl+1<GM_LEVELS.length) ? GM_LEVELS[lvl+1] : null;
  const base=GM_LEVELS[lvl];
  const lvlProg = nextMin!=null ? Math.min(100,Math.max(0,(savedScore-base)/(nextMin-base)*100)) : 100;
  const budget=state.budget||0, spent=tt.thisMonthSpent||0;
  const ruCur=+(((tt.roundupThisMonth||0)+(tt.savebackThisMonth||0))).toFixed(2);
  const budgetReto={ id:"budget", spent:spent, budget:budget, margin:+(budget-spent).toFixed(2), done:budget>0&&spent<=budget, pct: budget>0?Math.min(100,spent/budget*100):0 };
  const ruReto={ id:"roundup", cur:ruCur, goal:RU_GOAL, done:ruCur>=RU_GOAL, pct:Math.min(100,ruCur/RU_GOAL*100) };
  const streak=underBudgetStreak(state.expenses, budget);
  const anyGoalDone=goals.some(function(g){return g.done;});
  const badges=[
    {id:"first_goal", unlocked:anyGoalDone},
    {id:"first_underbudget", unlocked:streak.ever},
    {id:"first_reto", unlocked:ruReto.done||streak.ever},
    {id:"streak_3", unlocked:streak.best>=3},
    {id:"save_100", unlocked:savedScore>=100},
    {id:"save_500", unlocked:savedScore>=500},
    {id:"save_1000", unlocked:savedScore>=1000},
    {id:"save_5000", unlocked:savedScore>=5000}
  ];
  return {savedScore:savedScore, lvl:lvl, nextMin:nextMin, lvlProg:lvlProg, retos:[budgetReto,ruReto], budgetReto:budgetReto, ruReto:ruReto, streak:streak, badges:badges};
}

/* ============================================================
   SEMILLA DE MIGRACIÓN (sintética, repo público) — NO son datos reales.
   Usuarios nuevos arrancan con buildEmpty() + onboarding; esto solo alimenta
   migrate()/seedFlows para ids legacy. Nada personal en el repositorio.
   ============================================================ */
const DATA = {
  fx: 0.92,
  budget: 650,
  monthStartNet: 42800,
  history: [42000,42150,42300,42450,42600,42750,42800],
  accounts: [
    { id:"demo_sb01", ent:"sabadell",       name:"Cuenta corriente",      value:850,   note:"" },
    { id:"demo_rev1", ent:"revolut",        name:"Cuenta conjunta",       value:320,   note:"" },
    { id:"demo_tr01", ent:"trade_republic", name:"Efectivo",              value:1200,  note:"Fondo de emergencia · gasto con tarjeta", spendFrom:true },
    { id:"demo_mi01", ent:"myinvestor",     name:"Efectivo",              value:50,    note:"" },
  ],
  investments: [
    { id:"demo_nvda", ent:"revolut",        name:"NVIDIA",               value:520,  cost:480,  cur:"USD", ticker:"NVDA", shares:2.5 },
    { id:"demo_goog", ent:"revolut",        name:"Alphabet (C)",         value:380,  cost:350,  cur:"USD", ticker:"GOOG", shares:1.2 },
    { id:"demo_vwce", ent:"trade_republic", name:"FTSE All-World",       value:900,  cost:850,  cur:"EUR", ticker:"VWCE", shares:5.2 },
    { id:"demo_fund", ent:"myinvestor",     name:"Fondo indexado global", value:500,  cost:500,  cur:"EUR" },
    { id:"demo_gold", ent:"revolut",        name:"Oro (XAU)",            value:600,  cost:580,  cur:"USD", ticker:"GOLD" },
  ],
  assets: [
    { id:"demo_home", name:"Vivienda (estimación)", kind:"piso",  value:280000, note:"Valor orientativo de mercado" },
    { id:"demo_car",  name:"Coche (estimación)",    kind:"coche", value:15000,  note:"Valor orientativo 2ª mano" },
  ],
  debts: [
    { id:"demo_mort", ent:"sabadell", name:"Hipoteca (ejemplo)",     value:120000, original:150000, monthly:520, note:"Tipo fijo · plazo largo" },
    { id:"demo_loan", ent:"familia",  name:"Préstamo familiar",    value:5000,   original:8000,   monthly:200, note:"Cuota mensual de ejemplo" },
  ],
  fixed: [
    { id:"demo_wifi", name:"Internet + móvil", amount:45,  freq:"mes" },
    { id:"demo_luz",  name:"Luz",              amount:55,  freq:"mes" },
    { id:"demo_gym",  name:"Gimnasio",         amount:35,  freq:"mes" },
    { id:"demo_ibi",  name:"IBI",              amount:400, freq:"año" },
  ],
  aportaciones: [
    { id:"demo_ap1", ent:"myinvestor",     name:"Fondo indexado",      amount:200 },
    { id:"demo_ap2", ent:"trade_republic", name:"Fondo de emergencia", amount:150 },
  ],
  flows: [
    { id:"demo_nom", kind:"income",   name:"Nómina",           amount:2500, to:"sabadell",                       when:"last"  },
    { id:"demo_trf", kind:"transfer", name:"A Trade Republic", amount:800,  from:"sabadell", to:"trade_republic", when:"first" },
  ],
  variables: [
    { id:"demo_g1", name:"Supermercado", cat:"super",      amount:42,  date:"2026-06-10" },
    { id:"demo_g2", name:"Restaurante",  cat:"bares",      amount:28,  date:"2026-06-11" },
    { id:"demo_g3", name:"Metro",        cat:"transporte", amount:15,  date:"2026-06-12" },
  ],
};

// Estado VACÍO para usuarios nuevos (no heredan la cartera de ejemplo). Pasan por el onboarding.
function buildEmpty(){
  return {
    fx: 0.92, budget: 0, monthStartNet: 0, history: [],
    accounts: [], investments: [], assets: [], debts: [], fixed: [], flows: [], oneoffs: [], aportaciones: [],
    expenses: [], goals: [], shared: [], catOverrides: {}, obAccounts: [], obLabels: {}, verNotes: [], streak: 0,
    tourSeen: false,   // usuario nuevo → tour de bienvenida tras el onboarding
    setupHint: true,   // tarjeta «primeros pasos» en el Resumen hasta que la cierren
    settings: { autoPrices:false },
    categoryBudgets: {},
    lastSync: null, lastPriceSync: null,
    onboarded: false, _dataVer: 6, trAnchor: mkOf(new Date()),
  };
}
function buildInitial(){
  return {
    fx: DATA.fx,
    budget: DATA.budget,
    monthStartNet: DATA.monthStartNet,
    history: DATA.history.slice(),
    accounts: DATA.accounts.map(a=>Object.assign({},a)),
    investments: DATA.investments.map(a=>Object.assign({},a)),
    assets: DATA.assets.map(a=>Object.assign({},a)),
    debts: DATA.debts.map(a=>Object.assign({},a)),
    fixed: DATA.fixed.map(a=>Object.assign({},a)),
    flows: DATA.flows.map(a=>Object.assign({},a)),
    oneoffs: [],
    aportaciones: DATA.aportaciones.map(a=>Object.assign({},a)),
    expenses: DATA.variables.map(v=>({ id:v.id, date:new Date(v.date).toISOString(), merchant:v.name, amount:v.amount, category:v.cat, source:"manual" })),
    goals: [],
    shared: [],
    obAccounts: [],
    obLabels: {},
    streak: 4,
    settings: { autoPrices:false },
    lastSync: null,
    lastPriceSync: null,
  };
}
function migrate(s){
  // corrige el importe ORIGINAL de las deudas (referencia fija) aunque ya hubiera datos guardados
  if(s.debts){
    s.debts = s.debts.map(function(d){
      const seed = DATA.debts.find(function(x){ return x.id===d.id; });
      if(seed) return Object.assign({}, d, { original: seed.original, note: seed.note });
      return d;
    });
  }
  // inversiones: si no tienen "cost", lo derivamos del % antiguo (cost = value/(1+pl/100))
  if(s.investments){
    s.investments = s.investments.map(function(i){
      if(i.cost!=null) return i;
      const seed = DATA.investments.find(function(x){ return x.id===i.id; });
      let cost = seed ? seed.cost : (i.pl!=null ? i.value/(1+i.pl/100) : i.value);
      const o = Object.assign({}, i, { cost: cost }); delete o.pl; return o;
    });
  }
  // aseguramos array de gastos fijos
  if(!s.fixed) s.fixed = DATA.fixed.map(function(a){ return Object.assign({},a); });
  // v4: refrescar valor+coste de inversiones con los últimos datos (por id)
  if(s.investments && (!s._dataVer || s._dataVer<4)){
    s.investments = s.investments.map(function(i){
      const seed = DATA.investments.find(function(x){ return x.id===i.id; });
      return seed ? Object.assign({}, i, { value:seed.value, cost:seed.cost, cur:seed.cur }) : i;
    });
  }
  s._dataVer = 4;
  // v5: tickers/shares para auto-precio, marca de cuenta de gasto y settings
  if(s.investments && s._dataVer<5){
    s.investments = s.investments.map(function(i){
      const seed = DATA.investments.find(function(x){ return x.id===i.id; });
      return seed ? Object.assign({}, i, { ticker:seed.ticker, shares:seed.shares }) : i;
    });
  }
  if(s.accounts){
    s.accounts = s.accounts.map(function(a){
      const seed = DATA.accounts.find(function(x){ return x.id===a.id; });
      return seed ? Object.assign({}, a, { spendFrom:seed.spendFrom, note:seed.note }) : a;
    });
  }
  if(!s.settings) s.settings={ autoPrices:false };
  s._dataVer = 5;
  // v6: ancla de mes para el efectivo de TR (la inyección mensual y el arrastre se calculan desde aquí)
  if(s._dataVer<6){
    if(!s.trAnchor) s.trAnchor = mkOf(new Date());
  }
  s._dataVer = 6;
  store.set("micartera_v3", s);
  return s;
}
// Corrección única de posiciones tras ventas parciales en Revolut (datos reales del usuario).
// Idempotente y marcada con flag para no pisar futuras compras/ediciones.
function fixInvSold(s){
  if(!s || s._invFixSold || !s.investments) return s;
  const fix={ "aamv0u9":{shares:0.2, value:237.95, cost:149.62}, "9wyyzwg":{shares:0.85, value:394.89, cost:343.38}, "t2h1dsy":{shares:0.52, value:284.35, cost:269.27} };
  s.investments = s.investments.map(function(i){ return fix[i.id]?Object.assign({},i,fix[i.id]):i; });
  s._invFixSold = true;
  return s;
}
// Auto-precio de ETF (VWCE) y oro (GOLD): les añade ticker+participaciones; corrige el fondo de MyInvestor (manual).
function fixInvAuto(s){
  if(!s || s._invFixAuto || !s.investments) return s;
  const fix={
    "0mrszi5":{ ticker:"GOLD", shares:0.25, value:1055.42, cost:1165.32 },           // Oro (Revolup, USD)
    "7zjaw0y":{ ticker:"VWCE", shares:6.289227, value:1038.10, cost:967.66 },         // FTSE All-World (TR, EUR)
    "0itlr5k":{ shares:36.944, value:514.50, cost:510.00 }                            // Fidelity MSCI World (MyInvestor, manual)
  };
  s.investments = s.investments.map(function(i){ return fix[i.id]?Object.assign({},i,fix[i.id]):i; });
  s._invFixAuto = true;
  return s;
}
// Limpieza única de los duplicados que sembró el importador Revolut de la 3.96.0 (bug
// 2026-07-13): creaba posiciones nuevas nombradas por su ticker («NVDA» al lado de tu
// «NVIDIA») que quedaron a 0 € y −100% para siempre. Cadáver = ent revolut, nombre==ticker
// y valor ~0. Idempotente con flag, como fixInvSold/fixInvAuto.
function fixRevoDupes(s){
  if(!s || s._invFixRevoDupes || !s.investments) return s;
  s.investments = s.investments.filter(function(i){
    return !(i.ent==="revolut" && i.ticker && i.name===i.ticker && !(i.value>0.01));
  });
  s._invFixRevoDupes = true;
  return s;
}
// Motor de cash-flow: si el estado no tiene movimientos recurrentes, siembra los del usuario
// (nómina + transferencias). Idempotente: no pisa ediciones una vez que ya hay flows.
function seedFlows(s){
  if(!s) return s;
  // estados existentes = ya en uso → no son onboarding
  if(s.onboarded==null) s.onboarded=true;
  // estados existentes tampoco ven el tour de bienvenida (se puede abrir desde Ajustes)
  if(s.tourSeen==null) s.tourSeen=true;
  if(!s.oneoffs) s.oneoffs = [];
  if(!s.flows) s.flows = [];
  if(!s.goals) s.goals = [];
  // Sin estos dos, la app entera REVIENTA al pintar (totals lee aportaciones.reduce y el
  // Sparkline history.concat): un estado en la nube sin ellos = pantalla de crash (2026-07-11).
  if(!s.aportaciones) s.aportaciones = [];
  if(!s.history) s.history = [];
  if(!s.shared) s.shared = [];
  if(!s.obAccounts) s.obAccounts = [];
  if(!s.obLabels) s.obLabels = {};
  if(!s.verNotes) s.verNotes = [];   // apuntes/sugerencias del popup de Novedades (sincroniza)
  if(!s.invHistory) s.invHistory = [];   // evolución del total invertido (snapshot diario)
  // Limpieza puntual (petición 2026-07-11): una cuenta OB quedó re-etiquetada "personalizado
  // solo mío" (dato heredado, la cadena nunca fue de la app). Se borra la etiqueta para que
  // vuelva el nombre bonito por defecto (Conjunta + «del banco»), como el resto.
  Object.keys(s.obLabels).forEach(function(k){
    if(/personalizad[oa]\s*[·(\-—]?\s*solo\s*m[ií][oa]/i.test(String(s.obLabels[k]||""))) delete s.obLabels[k];
  });
  if(s.accounts){ s.accounts = s.accounts.map(function(a){
    if(a && /personalizad[oa]\s*[·(\-—]?\s*solo\s*m[ií][oa]/i.test(String(a.name||""))) return Object.assign({},a,{name:""});
    return a;
  }); }
  if(!s.catOverrides) s.catOverrides = {};
  if(!s.categoryBudgets) s.categoryBudgets = {};   // límites €/mes por categoría (§5)
  USER_OVERRIDES = Object.assign({}, s.catOverrides);    // overrides personales (comercio→cat) activos
  // recategoriza lo que quedó en "Otros" (gastos auto, no manuales) con las keywords/overrides mejorados
  if(s.expenses){ s.expenses = s.expenses.map(function(e){
    if(e.category==="otros" && e.source!=="manual"){ const nc=autoCategory(e.merchant); if(nc!=="otros") return Object.assign({},e,{category:nc}); }
    return e;
  }); }
  // SEMILLAS DE LA CARTERA DE EJEMPLO: solo para estados legacy (ids demo o del creador).
  // Usuarios nuevos arrancan vacíos (buildEmpty) y no heredan nada del repo.
  const isDemo = s.accounts && s.accounts.some(function(a){
    return a.id==="qnx5klq" || a.id==="demo_sb01" || a.id==="ebj0vbh" || a.id==="demo_tr01";
  });
  if(isDemo){
    if(!s.flows.length){ s.flows = DATA.flows.map(function(a){ return Object.assign({},a); }); }
    if(!s._flowsWhen){ s.flows = s.flows.map(function(f){ const seed=DATA.flows.find(function(x){return x.id===f.id;}); if(seed && seed.when && !f.when){ const o=Object.assign({},f,{when:seed.when}); delete o.day; return o; } return f; }); s._flowsWhen=true; }
    // semilla única: una meta de ejemplo para que la pestaña Metas se vea viva (solo cartera demo)
    if(!s._goalSeed){ if(!s.goals.length){ s.goals=[{id:uid(),name:"Vacaciones",emoji:"✈️",target:3000,saved:1200,deadline:null,color:"#5FD08A",createdAt:new Date().toISOString(),done:false,doneAt:null}]; } s._goalSeed=true; }
    // semilla única: un grupo de gastos compartidos de ejemplo (crucero con la pareja)
    if(!s._sharedSeed){ if(!s.shared.length){ s.shared=[{id:uid(),name:"Crucero",emoji:"🛳️",people:["Yo","Pareja"],expenses:[{id:uid(),desc:"Excursión",amount:120,payer:"Yo",parts:["Yo","Pareja"],date:new Date().toISOString()},{id:uid(),desc:"Cena especial",amount:80,payer:"Pareja",parts:["Yo","Pareja"],date:new Date().toISOString()}]}]; } s._sharedSeed=true; }
    // semilla única: round-up ×2 + saveback en la cuenta TR demo → FTSE All-World (#19)
    if(!s._trRewardSeed){ s.accounts=s.accounts.map(function(a){ return a.spendFrom?Object.assign({roundup:2,saveback:true,rewardInv:"demo_vwce"},a,{roundup:a.roundup!=null?a.roundup:2,saveback:a.saveback!=null?a.saveback:true,rewardInv:a.rewardInv||"demo_vwce"}):a; }); s._trRewardSeed=true; }
    // override personal del creador (antes vivía hardcodeado en MERCHANT_OVERRIDES para TODOS)
    if(!s.catOverrides["mapfre"]){ s.catOverrides["mapfre"]="bares"; USER_OVERRIDES["mapfre"]="bares"; }
    // semilla única: aporte periódico 50€/mes al FTSE desde el efectivo de TR (plan de ahorro real del usuario)
    if(!s._monthlyInvestSeed){ s.accounts=s.accounts.map(function(a){ return (a.spendFrom && a.monthlyInvest==null)?Object.assign({},a,{monthlyInvest:50}):a; }); s._monthlyInvestSeed=true; }
    // semilla única: materializa la inyección de nómina de TR como campo por cuenta (antes CONFIG global)
    if(!s._injectSeed){ s.accounts=s.accounts.map(function(a){ return (a.spendFrom && a.inject==null)?Object.assign({},a,{inject:CONFIG.TR_INJECTION}):a; }); s._injectSeed=true; }
  }
  // FIX v3.50: el saldo dinámico (v3.48) interpretó el `value` guardado como "inicio de mes" y volvió a
  // restar los cargos YA pagados de este mes → saldos disparados (Sabadell −3312 en vez de 147). Re-anclamos
  // UNA sola vez: el value guardado era el saldo de HOY, así que le sumamos de vuelta el neto ya ocurrido
  // (base = hoy − netoYaOcurrido) para que el saldo mostrado vuelva a ser el real y evolucione bien.
  if(!s._dynBalAnchored){
    const cy=new Date().getFullYear(), cm=new Date().getMonth()+1, td=new Date().getDate();
    (s.accounts||[]).forEach(function(a){ if(!a.spendFrom){ a.value = +(((a.value||0) - monthNetForAccount(s, a.ent, cy, cm, td))).toFixed(2); } });
    s._dynBalAnchored=true;
  }
  // deuda dinámica: ancla el saldo actual al mes de hoy si aún no tenía ancla (vale para todos)
  if(s.debts){ const nowAbs=ymNow(); s.debts = s.debts.map(function(d){ return (d.asOf==null)?Object.assign({},d,{asOf:nowAbs}):d; }); }
  return s;
}
// Aplica el tema de color poniendo data-theme en <html> (las variables CSS hacen el resto).
function applyTheme(t){
  try{
    document.documentElement.setAttribute("data-theme", t||"green");
    // barra de estado del móvil (PWA) a juego con el fondo del tema
    const bg=getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta && bg) meta.setAttribute("content", bg);
  }catch(e){}
}
// Nivel de letra (accesibilidad). Antes era un booleano (bigText); ahora 3 niveles en
// settings.textSize (normal|big|huge). El zoom se aplica al BODY, no a #root: los sheets y
// diálogos van portaleados a document.body (fuera de #root) y con el zoom en #root se
// quedaban a tamaño normal → «se descuadra» (feedback 2026-07-18). En body todo escala igual.
function textSizeOf(s){ const st=s&&s.settings; if(st&&st.textSize) return st.textSize; return (st&&st.bigText)?"big":"normal"; }
function applyTextSize(size){
  try{
    const el=document.documentElement;
    el.classList.toggle("bigtext", size==="big");
    el.classList.toggle("hugetext", size==="huge");
  }catch(e){}
}
// Compat: algunos sitios aún llaman applyBigText(bool). Se mapea al nuevo sistema.
function applyBigText(on){ applyTextSize(on?"big":"normal"); }
function applyReduceMotion(on){ try{ document.documentElement.classList.toggle("reduce-motion", !!on); }catch(e){} }
function applyContrast(on){ try{ document.documentElement.classList.toggle("hi-contrast", !!on); }catch(e){} }
// Temática de temporada (Mundial, Halloween, Navidad…): re-tinta acentos decorativos y activa
// una capa ambiental animada. data-season en <html>; "" o "none" = sin temática.
function applySeason(season){ try{ document.documentElement.setAttribute("data-season", (season&&season!=="none")?season:""); }catch(e){} }
function applyA11y(s){
  applyTextSize(textSizeOf(s));
  applyReduceMotion(!!(s&&s.settings&&s.settings.reduceMotion));
  applyContrast(!!(s&&s.settings&&s.settings.hiContrast));
  applySeason(s&&s.settings&&s.settings.season);
}
const THEMES=[["green","Verde","#5FD08A"],["dark","Oscuro","#3A3A40"],["light","Claro","#F2F4F2"],["blue","Azul","#7FB5E8"]];
// Temáticas de temporada seleccionables (id, emoji para el chip). El color base (claro/oscuro)
// lo sigue mandando el tema de arriba; la temporada solo añade acentos + animación ambiental.
const SEASONS=[["none","—"],["mundial","🇪🇸"],["halloween","🎃"],["navidad","🎄"],["verano","☀️"],["invierno","❄️"],["pascua","🐣"]];
// Emojis que caen en la capa ambiental de cada temática.
const SEASON_FX={
  mundial:["⚽","🇪🇸","⚽","🏆","⚽","🥅","⚽","🇪🇸"],
  halloween:["🎃","👻","🦇","🕷️","🎃","👻","🍬","🦇"],
  navidad:["❄️","🎄","🎁","⭐","❄️","🎅","🎄","❄️"],
  verano:["☀️","🌴","🏖️","🍦","🌊","🐚","🍉","☀️"],
  invierno:["❄️","⛄","❄️","🌨️","❄️","🧣","❄️","⛄"],
  pascua:["🐣","🥚","🐰","🌷","🐣","🥚","🌸","🐰"]
};
function loadState(){
  const saved = store.get("micartera_v3");
  if(saved && saved.accounts){
    // Capturar ANTES de seedFlows (muta in-place): evita stringify de toda la cartera en cada
    // apertura fría — feedback 2026-07-16.
    var writeBack=!(saved._dataVer>=6) || !saved._dynBalAnchored;
    const s = seedFlows(fixRevoDupes(fixInvAuto(fixInvSold(reconcileTR((saved._dataVer>=6) ? saved : migrate(saved))))));
    if(writeBack) store.set("micartera_v3", s);
    applyTheme(s.settings&&s.settings.theme);
    applyA11y(s);
    return s;
  }
  // Sin estado guardado = usuario nuevo → arranca VACÍO y verá el onboarding (no hereda la cartera de ejemplo).
  const init = buildEmpty();
  store.set("micartera_v3", init);
  applyTheme(init.settings&&init.settings.theme);
  applyA11y(init);
  return init;
}

