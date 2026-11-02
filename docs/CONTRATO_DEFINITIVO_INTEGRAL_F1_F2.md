# Contrato definitivo integral F1 / F2 — especificación funcional

## Regla principal
El contrato definitivo es la consolidación trazable de todos los datos y acuerdos de una operación. Se genera desde el expediente real de AgroBrokerIA; no se completa con datos inventados ni se reemplazan acuerdos anteriores sin conservar historial.

## Selección del modelo
Al ingresar en la etapa 4 (Contrato Definitivo), las partes autorizadas deben:
1. Elegir el modelo correspondiente: F1 (compraventa de granos) o F2 (abastecimiento de granos).
2. Ver una vista previa completa con datos recuperados del expediente.
3. Revisar campos pendientes, corregirlos mediante el flujo autorizado y confirmar.
4. Guardar una versión borrador y luego una versión definitiva. Registrar quién confirmó y cuándo.
5. Mantener el modelo y la versión seleccionados vinculados a la operación y al documento firmado.

No inferir F1/F2 únicamente por texto libre. La clasificación debe ser un dato explícito de la operación/contrato y validarse contra sus condiciones.

## Contenido mínimo del contrato
### 1. Identificación y comparecencia
- Número de contrato, código de operación, localidad, provincia, fecha.
- Vendedor y comprador: nombre/razón social, tipo de persona, CUIT/DNI, condición IVA, domicilio legal, localidad, provincia, datos de representante y carácter de actuación.
- Estado SISA y condición/rol registral de cada parte, con fecha y fuente de verificación.
- Corredor, intermediario, comisionista y demás participantes: razón social/nombre, CUIT/DNI, domicilio, rol y representación. Omitir solo si no existen.

### 2. Mercadería y origen
- Producto, variedad, campaña/cosecha, toneladas contratadas, tolerancia de volumen, unidad y procedencia.
- Establecimiento/campo, localidad/departamento/provincia y datos de origen.
- Condición comercial F1/F2 y modalidad de operación.

### 3. Precio y condiciones económicas
- Precio por tonelada, moneda, importe estimado, modalidad firme/a fijar, pizarra/mercado de referencia, fecha y mecanismo de fijación, tipo de cambio y fuente acordados.
- Bonificaciones, descuentos, impuestos, retenciones, gastos y ajustes.
- Forma de pago, moneda efectiva, plazo, vencimientos, medio de pago, cuenta/titular cuando corresponda, LPG y condiciones de liquidación.
- Condiciones especiales y acuerdos comerciales aceptados por ambas partes.

### 4. Calidad, análisis y visado
- Especificación de calidad pactada y tolerancias.
- Cada inspección/visado: identidad y rol del responsable, entidad, fecha/hora, lugar/planta/puerto, resultado y observaciones.
- Valores medidos: humedad, proteína, materias extrañas, granos dañados/verdes/quebrados y todo parámetro efectivamente registrado; unidad, método, laboratorio/cámara y documento de respaldo.
- Mermas, bonificaciones/descuentos y tabla/norma aplicada, si fueron acordadas o determinadas.
- Estado del visado: pendiente, aprobado u observado/rechazado. Nunca imprimir un visado pendiente como aprobado ni atribuirlo a una persona sin registro.

### 5. Entrega, flete y logística
- Lugar de carga, origen, destino, planta, terminal, puerto, país/provincia/localidad y direcciones completas.
- Ventana/plazo de entrega, turnos y tolerancias.
- Responsable del flete (vendedor/comprador/tercero), transportista, costo, moneda, modalidad de contratación y quién lo abona.
- Cartas de Porte Electrónicas, cupos, CTG y demás identificadores/documentos que existan.
- Secado, zarandeo, almacenaje, paritarias, descarga, seguros, gastos y responsable de cada uno.
- Entrega parcial/total, pesaje, recepción y constancias.

### 6. Intermediación y comisiones
- Cada corredor/intermediario/comisionista, rol, CUIT, lado que representa.
- Base de cálculo, importe o tarifa por tonelada/porcentaje/fijo, moneda, toneladas computables.
- Quién abona (vendedor/comprador/compartida), momento de devengamiento, vencimiento, medio de pago y estado.
- Comisión de plataforma separada de comisiones de terceros, con su regla vigente y trazabilidad.

### 7. Historial de negociación y anexos
- Acuerdos, contraofertas, aceptaciones, rechazos, modificaciones y condiciones finales; autor, fecha/hora y vínculo a mensaje/propuesta.
- Cambios posteriores al borrador como versiones/adendas, nunca sobrescritura silenciosa.
- Anexos y respaldos: visados, análisis, cartas de porte, constancias SISA/ARCA, LPG, comprobantes, documentos de origen/destino, instrucciones de fijación y demás archivos.

### 8. Firmas, registración y jurisdicción
- Firmantes por cada parte y por cada intermediario que deba firmar, carácter, DNI, fecha/hora, estado y evidencia.
- Responsable y estado de registración ante ARCA y constancia, cuando aplique.
- Jurisdicción/arbitraje solo si fue pactado y validado legalmente para esa operación.

## Validaciones de cierre
- Bloquear la confirmación si faltan datos obligatorios para el modelo elegido, identificación de partes, producto, volumen, precio/modalidad, destino/entrega, pago o firmantes.
- Permitir marcar datos no aplicables con motivo; no convertir ausencias en supuestos.
- Diferenciar claramente «pendiente», «no informado», «no aplica» y «confirmado».
- Recalcular importe y comisiones desde datos fuente, conservando moneda y unidad.
- Vista previa antes de confirmar; ambas partes deben aceptar la misma versión/hash del contrato.
- Una vez firmado, cambios únicamente mediante adenda versionada y aceptación de las partes.
- Generar PDF descargable idéntico al contenido confirmado y conservar la trazabilidad del documento.

## Modelos aportados por negocio
Los textos F1 y F2 aportados por AgroBrokerIA son bases de cláusulas comerciales, no plantillas rígidas. Se completan con los datos reales del expediente y se someten a revisión legal antes de utilizarlos como contratos vinculantes. No afirmar automáticamente que todas las partes están inscriptas en SISA, ni imponer una jurisdicción arbitral o tipo de cambio si no existe verificación/acuerdo.
