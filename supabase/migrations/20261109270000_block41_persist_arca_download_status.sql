-- BLOQUE 41: evidencia persistente de consulta oficial del estado de Carta de Porte en ARCA.
alter table public.viajes
  add column if not exists carta_porte_estado_arca text,
  add column if not exists carta_porte_ultima_consulta_arca timestamptz,
  add column if not exists carta_porte_descargada_at timestamptz,
  add column if not exists carta_porte_verificacion_arca jsonb;

comment on column public.viajes.carta_porte_estado_arca is
  'Último estado devuelto directamente por ARCA WSCPE (por ejemplo AC, DD, AN). No editable por usuarios.';
comment on column public.viajes.carta_porte_ultima_consulta_arca is
  'Fecha y hora de la última consulta de estado realizada al servicio oficial ARCA WSCPE.';
comment on column public.viajes.carta_porte_descargada_at is
  'Fecha de inicio del estado DD devuelta por ARCA. Solo se completa tras verificar DD en WSCPE.';
comment on column public.viajes.carta_porte_verificacion_arca is
  'Evidencia técnica de la última consulta WSCPE: ambiente, CTG, estado, fecha y respuesta SOAP. Acceso restringido por las políticas existentes de viajes.';
