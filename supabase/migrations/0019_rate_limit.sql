-- ============================================================
-- 0019 — Límite de peticiones para las funciones sin sesión o con credencial propia.
--
-- Qué protege y por qué (2026-07-25). Hasta ahora NINGUNA Edge Function tenía freno:
--   · `ingest` (verify_jwt = false) acepta un token en cabecera. Sin límite, quien quiera puede
--     probar tokens a la velocidad de la red — y `ingest` escribe gastos en la cuenta de alguien.
--     La comparación en tiempo constante de la 4.8.0 tapó la fuga por tiempos; esto tapa la
--     fuerza bruta a secas.
--   · `myinvestor-connect` manda usuario y CONTRASEÑA reales del banco a MyInvestor. Sin freno,
--     un bug (o un bucle de reintentos del cliente) puede dejar la cuenta del usuario bloqueada
--     en SU BANCO. El límite protege al usuario de nosotros, no solo de un atacante.
--
-- Ventana deslizante por tramos: cada `bucket` guarda el inicio de su ventana y cuántos golpes
-- lleva. Si la ventana caducó, se reinicia. Todo dentro de una función para que dos peticiones
-- simultáneas no puedan contar la misma vez dos veces (`on conflict do update` es atómico).
-- ============================================================

create table if not exists public.rate_limits (
  bucket       text primary key,
  window_start timestamptz not null default now(),
  hits         integer     not null default 0
);

alter table public.rate_limits enable row level security;
-- Sin políticas a propósito: NADIE llega desde el cliente. Solo la escribe la función de abajo
-- (security definer) llamada por las Edge Functions con la service role.
revoke all on public.rate_limits from anon, authenticated;

-- Devuelve TRUE si la petición cabe dentro del límite (y la cuenta), FALSE si hay que rechazarla.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_limit  integer,
  p_window_secs integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set hits = case
                 when public.rate_limits.window_start < now() - make_interval(secs => p_window_secs)
                 then 1
                 else public.rate_limits.hits + 1
               end,
        window_start = case
                 when public.rate_limits.window_start < now() - make_interval(secs => p_window_secs)
                 then now()
                 else public.rate_limits.window_start
               end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Limpieza A MANO, y a propósito: NADIE la llama sola. La tabla no crece con las peticiones sino
-- con los cubos DISTINTOS (un hash de IP para ingest, un usuario para el login de MyInvestor), que
-- se reutilizan; para el círculo de esta app son unas pocas filas de unos pocos bytes. Montar un
-- cron o meter un barrido en el camino de cada petición por eso sería pagar mantenimiento por
-- nada. Si algún día la tabla creciera de verdad: `select public.prune_rate_limits();`.
create or replace function public.prune_rate_limits() returns void
language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_start < now() - interval '2 days';
$$;
revoke all on function public.prune_rate_limits() from public, anon, authenticated;
grant execute on function public.prune_rate_limits() to service_role;

-- ============================================================
-- `state` del OAuth de Open Banking: caducidad y un solo uso.
--
-- `bank-callback` casa el callback del banco con el usuario buscando el `state` en bank_links.
-- El `state` viaja en la URL de vuelta, así que acaba en el historial del navegador y en logs
-- intermedios. Sin caducidad, un `state` de hace meses seguía siendo válido para siempre; sin
-- consumirlo, seguía valiendo después de usarse. Se añade la marca de emisión para poder
-- rechazar los viejos (el código lo comprueba; aquí solo se guarda el dato).
-- ============================================================
alter table public.bank_links add column if not exists state_issued_at timestamptz;
