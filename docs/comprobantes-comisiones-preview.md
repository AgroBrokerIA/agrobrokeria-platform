# Comprobantes de comisiones — despliegue seguro

Esta rama incorpora la pantalla inicial de revisión y la migración propuesta para comprobantes privados. No ejecutar la migración en producción todavía.

## Incluye
- Ruta web `/comisiones/comprobantes`.
- Subida de PDF/JPG/PNG/WEBP hasta 10 MB.
- Bucket privado `comprobantes-comisiones`.
- URL firmada de corta duración para visualizar archivos.
- Estados: comprobante subido, en revisión, rechazado, pago parcial y pagado.
- Tabla de auditoría y trigger para registrar cambios.
- Tabla de revisores explícitos; la habilitación debe hacerse mediante SQL administrativo revisado.

## Requisitos antes de habilitar
1. Crear un proyecto Supabase Preview aislado y verificar que `NEXT_PUBLIC_SUPABASE_URL` de Preview no sea el proyecto productivo.
2. Revisar la relación y tipos reales de `public.comisiones.id`, `operacion_id`, `profile_id`, `saldo_pendiente`, y adaptar la FK/validación si difieren.
3. Revisar la política de pagadores: actualmente solo permite subir para una comisión cuyo `profile_id = auth.uid()`. Para pagadores empresa hay que incorporar la relación de membresía real del esquema antes de habilitarlos.
4. Implementar notificación real usando el módulo existente de notificaciones después de comprobar su esquema; no se incluye envío por correo.
5. Reemplazar la actualización directa desde el cliente por una función RPC transaccional para validar pagos parciales/completos y actualizar `comisiones.saldo_pagado` / `saldo_pendiente` sin doble acreditación. La pantalla no debe considerarse lista para dinero real hasta este paso.
6. Añadir protección contra cambios de pagador/importe/archivo y contra transiciones de estado inválidas en base de datos; revisar el trigger de auditoría y las políticas RLS con pruebas negativas.
7. Ejecutar typecheck, lint, build, pruebas RLS y pruebas de carga/visualización; mantener PR en borrador hasta superar todo.

## No realizado
- No se aplicó la migración a ninguna base de datos.
- No se configuraron usuarios revisores.
- No se envían notificaciones todavía.
- No se acreditan saldos reales ni se ejecutan transferencias.
- No se modificó producción.
