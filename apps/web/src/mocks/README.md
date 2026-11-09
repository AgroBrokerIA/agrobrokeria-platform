# Prueba local del autocompletado del padrón ARCA

La pantalla de registro consulta el backend mediante `POST /api/v1/padron/consulta`. El navegador nunca consume directamente los Web Services SOAP de ARCA.

## Mock de homologación

Para probar el mapeo del formulario sin depender de certificados ni de la disponibilidad de ARCA, configurar únicamente en el entorno local:

```dotenv
ARCA_ENVIRONMENT=HOMOLOGACION
ARCA_PADRON_MOCK=true
```

Reiniciar el servidor de desarrollo. Ingresar exactamente el CUIT/CUIL ficticio `27134987001`. El backend devolverá el fixture `src/mocks/arcaPadronResponse.json`, transformado al contrato JSON que consume el formulario.

El mock está condicionado simultáneamente a:
- `ARCA_PADRON_MOCK=true`;
- `ARCA_ENVIRONMENT` distinto de producción;
- CUIT/CUIL exactamente igual a `27134987001`.

No cambiar estas condiciones ni utilizar el mock para validar identidades reales. No configurar `ARCA_PADRON_MOCK=true` en producción.

## Resultado esperado

- Nombre: `SAMA_MOCK_TEST`
- Apellido: `SEQUEIRA`
- Fecha de nacimiento: `1988-05-14`
- Género: `Femenino`
- Domicilio: `Mitre 800`
- Localidad: `Venado Tuerto`
- Provincia: `Santa Fe`
- Código postal: `S2600`
- Actividad e impuestos: primer registro del fixture y condiciones detectadas.

La respuesta de homologación se identifica como `ARCA_MOCK_HOMOLOGACION`; no debe interpretarse como una constancia emitida por ARCA.

## Verificación productiva

Para consultas reales, desactivar el mock y configurar certificados y clave privada exclusivamente como secretos del servidor. El backend conserva la autenticación WSAA, el consumo SOAP y el control de frecuencia. El frontend solo recibe los campos necesarios para completar el formulario.
