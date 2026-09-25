# AgroBrokerIA — Arquitectura Maestra y Alcance de Producto

## Objetivo

AgroBrokerIA es una plataforma B2B de intermediación y comercialización de commodities agrícolas nacionales e internacionales. El producto final debe automatizar el trabajo operativo de un broker sin eliminar el control humano en decisiones comerciales, contractuales, financieras o reguladas.

**Principio de diseño:** el usuario carga una oferta o demanda una sola vez; el sistema analiza el mercado autorizado, identifica contrapartes compatibles, prepara acciones comerciales, registra las respuestas y acompaña la operación hasta el cierre.

## Flujo comercial completo

Oferta/demanda → normalización → Smart Match → Radar → priorización → propuesta IA → canal autorizado → respuesta → conversación protegida → contraoferta → acuerdo → verificación → LOI/SCO/FCO → contrato → firma → liquidación → comisión → facturación → pago → cierre → CRM permanente.

Ningún componente debe marcar una operación como cerrada si faltan condiciones obligatorias.

## Broker Autopilot

Entrada: commodity, toneladas, precio/moneda, provincia, localidad/zona, puerto/destino, calidad, campaña, modalidad, Incoterm, fechas, frecuencia, pago, documentación y observaciones.

Automatiza:
1. validación y normalización;
2. detección de compradores/vendedores compatibles;
3. preferencias e historial;
4. distancia/logística cuando haya datos suficientes;
5. compatibilidad;
6. priorización;
7. generación de mensaje;
8. envío/presentación por canales permitidos;
9. registro de acción y respuesta;
10. creación/actualización de oportunidad;
11. escalamiento al usuario cuando haga falta una decisión.

Las acciones externas deben respetar APIs, términos, límites y políticas de cada proveedor.

## Smart Match

El puntaje debe considerar producto, tipo de operación, volumen, precio, moneda, provincia, localidad/zona, puerto/destino, logística, vigencia, preferencias, historial, verificación/documentación y comportamiento comercial.

El puntaje prioriza oportunidades; no garantiza solvencia ni cumplimiento.

## Radar y CRM

Guardar empresas, contactos, roles, productos, intención, zonas, volúmenes, precios objetivo, puertos, condiciones, interacciones, operaciones, contratos, documentación, verificación y última actividad.

Consultas previstas: compradores por zona, compradores recurrentes, vendedores con abastecimiento, exportadores que buscan origen Argentina, contratos mensuales/anuales y prospectos por commodity/volumen/puerto.

## Prospección externa

Fuentes: APIs oficiales, directorios, registros públicos, sitios corporativos, fuentes comerciales autorizadas e integraciones autorizadas.

No se debe evadir autenticación, límites, controles técnicos o términos de Google, Meta/Facebook u otros servicios.

Cada prospecto externo registra fuente, fecha, método, verificación, base jurídica/consentimiento cuando corresponda y actualización.

## Export Radar

Exportador/importador → commodity → origen → volumen → frecuencia → destino → Incoterm → documentación → condiciones → abastecimiento → propuestas → negociación → contrato.

Debe soportar contratos mensuales/anuales y abastecimiento parcial.

## IA comercial

Redacción de ofertas/contraofertas, resumen de conversaciones, detección de intención, próximos pasos, datos faltantes, comparación de condiciones, LOI/SCO/FCO, incompatibilidades, alternativas, preguntas de negociación y priorización.

La IA no firma contratos, acepta condiciones vinculantes, mueve fondos ni asume obligaciones legales sin autorización explícita y trazable.

## Contact Shield

Antes de la etapa autorizada no se exponen teléfono, email, CBU/alias, cuenta bancaria, dirección exacta, credenciales ni datos financieros sensibles.

Se puede mostrar información comercial necesaria: zona, provincia, puerto, commodity, volumen, precio, calidad, fechas y condiciones.

Registrar intentos de compartir contacto en canales internos y aplicar las reglas de la etapa. La protección no debe impedir una revelación exigida por ley o contrato.

## Verificación y Trust

Sellos visuales:
- verde: empresa/acopio/cooperativa verificada;
- azul: corredor verificado;
- naranja: intermediario verificado;
- amarillo: productor/comprador con identidad o empresa verificada.

El sello indica estado de verificación, no garantía financiera.

Verificación posible: CUIT/CUIL, condición fiscal, actividad, documentación societaria, matrícula/registro, documentación de productor/logística y cuenta bancaria solo cuando sea necesaria para una operación.

## Comisiones

Soportar comisión de AgroBrokerIA, broker e intermediarios; porcentaje, fija, USD/tn, por operación, por contrato y múltiples participantes.

Calcular precio base, toneladas, importe, comisiones individuales, importe comprador, neto vendedor y liquidación de cada participante. Cada participante solo ve sus datos autorizados.

## Facturación

Estados: pendiente, documentación requerida, factura recibida, verificada, retenida, liberada, pagada, rechazada/anulada.

Si la factura es requisito, la comisión permanece retenida hasta cumplirlo.

## Pagos y datos bancarios

Los datos bancarios se separan del perfil comercial y se protegen con mínimo privilegio. Se solicitan cuando sean necesarios para la operación.

Contrato → datos protegidos → proveedor/servicio habilitado → liquidación → eliminación/retención conforme a obligaciones legales → conservación de trazabilidad necesaria.

No almacenar credenciales bancarias.

eCheq y otros instrumentos deben integrarse mediante proveedores/entidades habilitados; AgroBrokerIA no debe actuar como entidad financiera no autorizada.

## Intermediarios

Soportar cadenas comprador ↔ intermediario(s) ↔ corredor ↔ vendedor con comisiones acordadas, visibles solo para participantes autorizados. Una comisión fijada no puede modificarse unilateralmente; toda modificación debe estar autorizada y auditada.

## Documentos y contratos

Expediente: LOI, SCO, FCO, contrato, anexos, documentación societaria/fiscal, calidad, logística, facturas y comprobantes.

Cada documento: propietario, tipo, versión, fecha, estado, hash/huella cuando corresponda, cargador, verificador e historial.

Firma electrónica/digital mediante proveedor adecuado cuando corresponda.

## Workflow contractual

1. oportunidad
2. contacto
3. negociación
4. términos preliminares
5. verificación
6. documentación
7. LOI/SCO/FCO
8. contrato preparado
9. firma pendiente
10. contrato firmado
11. pago/liquidación
12. ejecución
13. completada
14. cerrada
15. cancelada/disputada

Las transiciones se ejecutan mediante backend/RPC y quedan auditadas.

## Logística

Origen, destino, localidad, provincia, puerto, distancia, transportista, vehículo, toneladas/viaje, viajes, costo/tn, costo total, impuestos, fechas y estado.

Calcular ARS/USD según configuración y tipo de cambio autorizado.

## Calculadora comercial

**importe base = toneladas × precio/tn**

**importe final = importe base + comisiones + logística + conceptos acordados**

Soportar ARS, USD, conversión, comisión porcentual, USD/tn, fija, múltiples comisiones, redondeos e historial.

Los cálculos críticos deben ejecutarse en backend.

## Memoria comercial

Detectar compradores/vendedores recurrentes, precios históricos, volúmenes, zonas, puertos, condiciones aceptadas, tiempos de respuesta, operaciones completadas y contratos recurrentes.

## Dashboard de inteligencia

Mostrar oportunidades nuevas, compradores/vendedores activos, contratos próximos, negociaciones, cierres, comisiones, documentación, facturas, pagos, alertas, prospectos prioritarios y actividad comercial.

## Seguridad

Obligatorio: RLS, mínimo privilegio, autorización server-side, separación de datos sensibles, auditoría, secretos protegidos, validación, acceso por empresa/rol, RPC para operaciones críticas, idempotencia, protección de comisiones, aislamiento entre empresas, logs y política de retención.

No existe garantía de sistema imposible de hackear. El objetivo es defensa en profundidad, reducción de superficie de ataque y capacidad de detección/respuesta.

## Video

Videollamada mediante proveedor autorizado como etapa del workflow. Registrar invitación, participantes, fecha, estado y referencia. No grabar por defecto; si se graba, debe existir consentimiento/base legal.

## Administración del creador

Rol administrativo interno separado de las cuentas comerciales, con acceso a empresas, usuarios, verificaciones, operaciones, contratos, comisiones de plataforma, auditoría, configuración y métricas.

Acceso protegido con MFA/controles reforzados y auditado. La identidad personal del administrador puede mantenerse separada del perfil comercial público cuando la estructura legal lo permita, sin engañar a los usuarios.

## Automatización y consentimiento

Automatizar no significa enviar spam. Toda automatización externa debe respetar términos, APIs, límites, opt-out, consentimiento/base jurídica, identificación comercial, anti-spam y protección de datos.

Implementar colas, límites, deduplicación, registro de envíos y mecanismos de baja.

## Definición de terminado — Test E2E

Productor publica 5.000 TN de soja
→ IA normaliza
→ Smart Match encuentra compradores
→ Radar prioriza
→ IA redacta
→ canal autorizado envía
→ respuestas registradas
→ negociación
→ contraoferta
→ acuerdo
→ partes verificadas
→ documentación
→ LOI/SCO/FCO
→ contrato
→ firma
→ comisiones fijadas
→ facturas/documentación
→ pago mediante proveedor habilitado
→ liquidación
→ comisión AgroBrokerIA
→ cierre
→ datos sensibles protegidos
→ CRM conserva la relación permitida
→ IA reutiliza la relación en futuras oportunidades.

Este es el test E2E principal.

## Fases

### A — Núcleo
Publicaciones, marketplace, empresas, intereses, Smart Match, oportunidades, negociación, acuerdos y operaciones.

### B — Broker Autopilot
Radar, CRM, mensajes, colas, notificaciones y seguimiento.

### C — Protección y confianza
KYC, verificación, Contact Shield, auditoría, permisos y RLS.

### D — Contratos
LOI/SCO/FCO, expediente, firma y workflow.

### E — Liquidación
Comisiones múltiples, facturación, pagos, eCheq mediante integración habilitada y liquidaciones.

### F — Inteligencia
Broker Copilot, memoria comercial, priorización, contratos recurrentes y Export Radar.

### G — Escala
Multiidioma, mercados internacionales, proveedores externos, observabilidad, rendimiento y hardening.

## Regla de desarrollo

Hasta completar el E2E principal no se agregan funcionalidades de alcance ajenas a seguridad, cumplimiento o funcionamiento.

Cada módulo cuenta como terminado únicamente con:

**UI + backend + base de datos + permisos + estados + auditoría + pruebas.**

Una pantalla visual sin flujo real conectado no cuenta como funcionalidad terminada.
