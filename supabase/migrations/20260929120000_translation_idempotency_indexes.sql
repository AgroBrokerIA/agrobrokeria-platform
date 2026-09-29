create unique index if not exists uq_mensajes_traducciones_message_language_version
  on public.mensajes_traducciones (mensaje_id, idioma_destino, version);

create unique index if not exists uq_documento_traducciones_document_language_version
  on public.documento_traducciones (documento_id, idioma_destino, version);