# Sugerencia de categoría (KW + IA)

## Cómo funciona

1. En **Gastos**, abres un movimiento y tocas **✨ Sugerir categoría** (cualquier categoría, no solo Otros). Hace falta el interruptor en Ajustes → Notificaciones.
2. Primero corren las **keywords del móvil** (mismas que el ingest). Si ya hay categoría, se aplica sin red.
3. Si sigue siendo `otros` y hay sesión, la Edge Function `categorize`:
   - primero aplica las **mismas keywords** que el ingest TR;
   - si sigue siendo `otros` **y** existe el secreto `OPENAI_API_KEY` en Supabase → pide a OpenAI (`gpt-4o-mini` por defecto) **solo el id de categoría**, con la lista completa (heladería, videojuegos, joyería, recibos…);
   - **nunca envía el importe**, solo el comercio (máx. 120 caracteres).

Sin `OPENAI_API_KEY` la app sigue siendo útil: KW locales + aprendizaje al recategorizar a mano (`catOverrides`).

## Desplegar la función

```bash
supabase functions deploy categorize --project-ref sfyfjagbnhbplrljpbvh
```

Secretos (Dashboard → Edge Functions → Secrets, o CLI):

| Secret | Obligatorio |
|--------|-------------|
| `OPENAI_API_KEY` | No — sin él solo KW |
| `OPENAI_MODEL` | No — default `gpt-4o-mini` |

JWT: la función usa el cliente anon + `Authorization` del usuario logueado.

## Alinear keywords

Cliente: `src/modules/00-core.js` → `KW`.  
Servidor: `supabase/functions/_shared/ingest_logic.ts` → `CATEGORIAS`.  
Mantenerlos alineados al cambiar uno.
