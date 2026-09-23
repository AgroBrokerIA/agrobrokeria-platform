type Props = {
  tipo: string;
  provincia: string;
  producto: string;
  onTipoChange: (value: string) => void;
  onProvinciaChange: (value: string) => void;
  onProductoChange: (value: string) => void;
  tipos: string[];
  provincias: string[];
  productos: string[];
};

export default function MarketplaceFilters({
  tipo, provincia, producto, onTipoChange, onProvinciaChange, onProductoChange,
  tipos, provincias, productos,
}: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 20 }}>
      <select value={tipo} onChange={(e) => onTipoChange(e.target.value)} style={style}>
        <option value="">Tipo de operación</option>
        {tipos.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={producto} onChange={(e) => onProductoChange(e.target.value)} style={style}>
        <option value="">Producto</option>
        {productos.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={provincia} onChange={(e) => onProvinciaChange(e.target.value)} style={style}>
        <option value="">Provincia</option>
        {provincias.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  );
}

const style = {
  width: "100%",
  padding: 10,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "white",
};
