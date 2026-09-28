type Props = {
  tipo: string;
  pais: string;
  provincia: string;
  ciudad: string;
  producto: string;
  onTipoChange: (value: string) => void;
  onPaisChange: (value: string) => void;
  onProvinciaChange: (value: string) => void;
  onCiudadChange: (value: string) => void;
  onProductoChange: (value: string) => void;
  tipos: string[];
  paises: Array<{ code: string; name: string }>;
  provincias: Array<{ code: string; name: string }>;
  ciudades: Array<{ name: string }>;
  productos: string[];
};

export default function MarketplaceFilters({
  tipo, pais, provincia, ciudad, producto,
  onTipoChange, onPaisChange, onProvinciaChange, onCiudadChange, onProductoChange,
  tipos, paises, provincias, ciudades, productos,
}: Props) {
  return (
    <div className="marketplace-filters-grid">
      <select value={tipo} onChange={(e) => onTipoChange(e.target.value)} style={style}>
        <option value="">Tipo de operación</option>
        <option value="COMPRA">COMPRA · Demanda</option>
        <option value="VENTA">VENTA · Oferta</option>
        {tipos.filter((item) => item !== "COMPRA" && item !== "VENTA").map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={pais} onChange={(e) => onPaisChange(e.target.value)} style={style}>
        <option value="">País</option>
        {paises.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
      <select value={provincia} onChange={(e) => onProvinciaChange(e.target.value)} style={style} disabled={!pais}>
        <option value="">{pais ? "Provincia / Estado / Región" : "Seleccioná un país primero"}</option>
        {provincias.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
      <select value={ciudad} onChange={(e) => onCiudadChange(e.target.value)} style={style} disabled={!provincia}>
        <option value="">{provincia ? "Ciudad / Localidad" : "Seleccioná una provincia/estado"}</option>
        {ciudades.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
      </select>
      <select value={producto} onChange={(e) => onProductoChange(e.target.value)} style={style}>
        <option value="">Producto</option>
        {productos.map((item) => <option key={item} value={item}>{item}</option>)}
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
