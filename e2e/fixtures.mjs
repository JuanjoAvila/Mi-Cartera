/** Estado mínimo onboarded + sesión Supabase simulada (sin red). */
export async function seedLoggedInDashboard(page) {
  await page.addInitScript(() => {
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

    localStorage.setItem(
      "micartera_v3",
      JSON.stringify({
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
      })
    );
    localStorage.setItem("_seenVersion", "dev");
    try {
      ["dash", "metas", "gastos", "fijos", "inv"].forEach((id) =>
        localStorage.setItem("_coach_" + id, "1")
      );
    } catch (e) {}
  });
}
