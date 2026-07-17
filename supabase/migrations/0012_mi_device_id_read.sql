-- device_id no es secreto (UUID del móvil); hace falta en el cliente para reutilizar
-- el mismo x-device-id al reconectar y bajar captchas (feedback 2026-07-17).
grant select (user_id, status, last_sync, created_at, updated_at, device_id)
  on table public.myinvestor_links to authenticated;
