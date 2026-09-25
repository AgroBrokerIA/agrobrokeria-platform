# AgroBrokerIA — auditoría final integral 2026-09-25

## Implementado en esta fase
- Preferencias internacionales de usuario/empresa: idioma, país, zona horaria, formatos, moneda/unidad y preferencias de traducción.
- Catálogo legal versionado con hash SHA-256 y aceptación trazable.
- Gate de aceptación legal en registro/login mediante /legal/aceptar.
- Centro de ayuda con 22 artículos iniciales y buscador.
- Página pública “Cómo verificamos”.
- Módulo de verificaciones con fuente, organismo, estado, fecha e identificador.
- Historial/programación de verificaciones.
- Mensajería comercial reforzada con RPC server-side, bloqueo de contenido no comercial y de intentos claros de sacar el proceso fuera de la plataforma; se eliminó escritura directa autenticada.
- Persistencia de traducciones de mensajes sin reemplazar el original.
- Edge Function translate-message con estado explícito cuando falta proveedor externo.
- Modelo de videollamadas comerciales asociado a operación, negociación, empresas, usuarios y eventos.
- Adaptador Google Meet vía Calendar API en ruta server-side; queda condicionado a OAuth/secretos reales.
- UI responsive existente ampliada con idioma, verificaciones, videollamadas, ayuda y legal.
- Auditoría de seguridad: 123/123 tablas públicas con RLS; 0 SECURITY DEFINER ejecutables por anon en la comprobación final.

## No certificado todavía
- Vercel: no hay equipos/proyectos accesibles mediante la integración actual; no puede certificarse deployment productivo.
- Google OAuth/Meet: faltan credenciales/autorización de producción.
- Traducción automática: falta seleccionar/configurar proveedor y API key.
- SISA/SENASA/INASE: faltan mecanismos/credenciales/autorizaciones oficiales concretas; el sistema no simula resultados.
- ARCA: código WSAA/WSFEv1 está desplegado, pero faltan certificado/clave/CUIT de producción.
- Firma externa: falta proveedor y credenciales.
- CRON de Vercel: requiere CRON_SECRET y deployment accesible.
- E2E autenticado completo y build remoto no pueden certificarse sin acceso al deployment/CI.
- Supabase Auth Leaked Password Protection requiere habilitación en configuración del proyecto.

## Regla de producción
No se muestran como reales resultados de organismos o proveedores externos que no hayan respondido realmente. Los estados pendientes permanecen explícitos.
