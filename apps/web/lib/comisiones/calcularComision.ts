export type TipoGanancia =
  | "USD_TN"
  | "ARS_TN"
  | "PORCENTAJE"
  | "DIFERENCIAL"
  | "FIJA";

export type CalculoComisionParams = {
  tipoGanancia: TipoGanancia;

  cantidadTn?: number;

  valorUnitario?: number;

  porcentaje?: number;

  valorBase?: number;

  precioCompra?: number;

  precioVenta?: number;

  ivaPorcentaje?: number;
};

export type ResultadoComision = {
  cantidadTn: number;
  valorUnitario: number;
  porcentaje: number;
  valorBase: number;

  subtotal: number;

  ivaPorcentaje: number;
  ivaImporte: number;

  total: number;
};

export function calcularComision({
  tipoGanancia,
  cantidadTn = 0,
  valorUnitario = 0,
  porcentaje = 0,
  valorBase = 0,
  precioCompra = 0,
  precioVenta = 0,
  ivaPorcentaje = 0,
}: CalculoComisionParams): ResultadoComision {
  const tn = Number(cantidadTn) || 0;
  const unitario = Number(valorUnitario) || 0;
  const porc = Number(porcentaje) || 0;
  const base = Number(valorBase) || 0;
  const compra = Number(precioCompra) || 0;
  const venta = Number(precioVenta) || 0;
  const iva = Number(ivaPorcentaje) || 0;

  let subtotal = 0;
  let valorBaseCalculado = base;

  switch (tipoGanancia) {
    case "USD_TN":
    case "ARS_TN":
      subtotal = tn * unitario;
      valorBaseCalculado = tn;
      break;

    case "PORCENTAJE":
      subtotal = base * (porc / 100);
      valorBaseCalculado = base;
      break;

    case "DIFERENCIAL":
      subtotal = (venta - compra) * tn;
      valorBaseCalculado = tn;
      break;

    case "FIJA":
      subtotal = unitario;
      valorBaseCalculado = 1;
      break;

    default:
      subtotal = 0;
      valorBaseCalculado = 0;
  }

  const subtotalNormalizado = Math.round(subtotal * 100) / 100;

  const ivaImporte =
    Math.round(subtotalNormalizado * (iva / 100) * 100) / 100;

  const total =
    Math.round((subtotalNormalizado + ivaImporte) * 100) / 100;

  return {
    cantidadTn: tn,
    valorUnitario: unitario,
    porcentaje: porc,
    valorBase: valorBaseCalculado,

    subtotal: subtotalNormalizado,

    ivaPorcentaje: iva,
    ivaImporte,

    total,
  };
}
