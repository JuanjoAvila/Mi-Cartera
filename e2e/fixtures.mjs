/** Estado mínimo onboarded + sesión Supabase simulada (sin red).
 *  `overrides` se mezcla sobre el estado base (p.ej. {investments:[...]}) para que cada test
 *  no tenga que repetir el objeto entero. */
export async function seedLoggedInDashboard(page, overrides = {}) {
  await page.addInitScript((overrides) => {
    const session = { user: { id: "e2e-user", email: "e2e@test.local" } };
    const mockClient = () => {
      const chain = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        eq: () => chain,
        lt: () => chain,
        update: () => chain,
        upsert: () => chain,
        delete: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      };
      chain.then = (resolve) => resolve({ data: [], error: null });
      return {
        auth: {
          getSession: async () => ({ data: { session } }),
          onAuthStateChange: (cb) => {
            setTimeout(() => cb("INITIAL_SESSION", session), 0);
            return { data: { subscription: { unsubscribe: () => {} } } };
          },
          signOut: async () => {},
        },
        from: () => chain,
        functions: { invoke: async () => ({ data: {}, error: null }) },
      };
    };

    // Intercepta la asignación de supabase.min.js para devolver cliente mock.
    let _sb = null;
    Object.defineProperty(window, "supabase", {
      configurable: true,
      enumerable: true,
      get() {
        return _sb;
      },
      set(lib) {
        if (lib && typeof lib.createClient === "function") {
          _sb = { createClient: () => mockClient() };
        } else {
          _sb = lib;
        }
      },
    });

    const base = {
      fx: 0.92,
      budget: 500,
      monthStartNet: 1000,
      history: [],
      accounts: [{ id: "e2e", ent: "sabadell", name: "Cuenta", value: 1000 }],
      investments: [],
      assets: [],
      debts: [],
      fixed: [],
      flows: [],
      oneoffs: [],
      aportaciones: [],
      expenses: [],
      goals: [],
      shared: [],
      catOverrides: {},
      obAccounts: [],
      obLabels: {},
      verNotes: [],
      streak: 0,
      tourSeen: true,
      setupHint: false,
      settings: { autoPrices: false, theme: "green" },
      lastSync: null,
      lastPriceSync: null,
      onboarded: true,
      _dataVer: 6,
      trAnchor: new Date().toISOString().slice(0, 7),
    };
    localStorage.setItem("micartera_v3", JSON.stringify(Object.assign(base, overrides)));
    localStorage.setItem("_seenVersion", "dev");
    try {
      ["dash", "metas", "gastos", "fijos", "inv"].forEach((id) =>
        localStorage.setItem("_coach_" + id, "1")
      );
    } catch (e) {}
  }, overrides);
}

/** Cierra el popup de Novedades si sale (cambia de versión en cada release). Llamar tras el
 *  primer goto("/") en cualquier test que necesite interactuar con la pantalla. */
export async function dismissNews(page) {
  const btn = page.getByRole("button", { name: /Entendido|Got it|D'acord/i });
  if (await btn.count()) await btn.first().click();
}
