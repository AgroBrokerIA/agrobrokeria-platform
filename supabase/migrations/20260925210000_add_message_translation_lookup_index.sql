create index if not exists idx_mensajes_traducciones_message_language_version
on public.mensajes_traducciones (mensaje_id, idioma_destino, version desc);
