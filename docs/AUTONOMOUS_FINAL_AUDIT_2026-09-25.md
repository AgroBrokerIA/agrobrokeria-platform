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
