# Auditoría autónoma — 2026-09-25

Se continúa el cierre de AgroBrokerIA sin datos simulados.

## Cambios recientes
- UnitConversionService con catálogo de unidades y conversión dimensional segura.
- Persistencia de cantidad original/unidad/factor en publicaciones, ofertas y operaciones.
- Smart Match endurecido: producto, volumen, precio/moneda, historial, condición y logística basados en datos existentes.
- Oportunidades IA vinculadas a puntajes calculados por el motor.
- URLs firmadas de Storage con autorización por operación y expiración.
- Expediente de operación conectado a documentos_operacion y Pricing Engine.
- Dashboard y Oportunidades dejaron de asumir USD cuando la publicación tiene otra moneda.

## Dependencias externas no simuladas
- Credenciales/certificados ARCA.
- Proveedor externo de firma y sus credenciales.
- Acceso operativo al equipo/proyecto Vercel.
- Secretos de producción que solo puede suministrar el titular.

## Estado de verificación
- Supabase: RLS deshabilitadas: 0.
- SECURITY DEFINER ejecutables por anon: 0.
- Plantillas contractuales activas: 6.
- Unidades activas cargadas: 8.
- Cotizaciones de mercado verificadas actualmente: 0; no se muestran valores inventados.


## Continuación autónoma — 25/09/2026

### Verificaciones
- 123/123 tablas públicas tienen RLS.
- 0 funciones SECURITY DEFINER son ejecutables por `anon`.
- GitHub Actions verificó con éxito los commits de corrección del dashboard/firma con npm ci, lint, typecheck y build.

### Legal e internacionalización
- La aceptación legal de alta quedó persistida desde metadata de registro mediante trigger server-side.
- Catálogo `traducciones_ui` cargado para es/en/pt/it/fr/de.
- Sidebar consume traducciones reales del catálogo.
- Mensajes comerciales conservan idioma original y disponen de traducción bajo demanda.
- `translate-document` quedó desplegado para contratos; con proveedor configurado genera artefacto traducido privado, versión y SHA-256. Sin proveedor no inventa contenido.

### Integraciones externas restantes
- ARCA: certificado/clave y configuración real.
- Firma: proveedor concreto y credenciales.
- Google Meet: OAuth.
- Traducción: proveedor/API.
- Vercel: autorización del scope y secretos de producción.
- CRON de mercado: `CRON_SECRET`.
- Prueba E2E autenticada de producción/preproducción.


## Cierre autónomo adicional — 25/09/2026
- Flujo Google Meet endurecido: la API valida empresa activa, participación real en la operación y existencia del vínculo autorizado antes de crear el evento externo.
- La pantalla de videollamadas ahora exige fecha/hora y permite título configurable; no usa datos de prueba.
- Se revisó el cron de verificaciones: sin credenciales oficiales no fabrica resultados; registra explícitamente el estado pendiente de integración externa.
- Vercel continúa sin equipo/proyecto accesible desde la integración actual; no se declara deployment de producción como verificado.
