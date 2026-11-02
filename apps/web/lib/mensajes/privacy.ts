/**
 * Contact data must remain private until the definitive contract stage.
 * This is a presentation safeguard; the database trigger is the enforcement layer.
 */
export function redactContactData(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[correo oculto hasta contrato]")
    .replace(/\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me)\/\S+/gi, "[enlace oculto hasta contrato]")
    .replace(/@[a-z0-9_.]{2,}/gi, "[usuario oculto hasta contrato]")
    .replace(/(?:\+?\d[\d().\s-]{7,}\d)/g, (match) => {
      const digits = match.replace(/\D/g, "");
      return digits.length >= 8 && digits.length <= 15
        ? "[teléfono/dato numérico oculto hasta contrato]"
        : match;
    })
    .replace(/\b(?:calle|avenida|av\.|domicilio|dirección|direccion|ruta)\s+[^,.;\n]+/gi, "[dirección ocultada hasta contrato]");
}

export function containsContactData(value: string): boolean {
  return redactContactData(value) !== value;
}
