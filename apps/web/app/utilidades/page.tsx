"use client";
import Link from "next/link";
import {useMemo,useState} from "react";

const links=[
 {group:"Logística y documentación",items:[
  ["Carta de Porte","Gestión de Carta de Porte vinculada a operaciones.","/carta-porte"],
  ["Mapa de puertos Up River","Ubicaciones y accesos de los puertos del corredor Paraná.","/logistica"],
  ["Datos de exportadores y destinos","Consulta de referencias para documentación de transporte.","https://www.argentina.gob.ar/arca"],
 ]},
 {group:"Comercialización de granos",items:[
  ["Normas de comercialización de soja","Estándares de calidad y condiciones comerciales.","https://www.bcr.com.ar/es/mercados/mercado-de-granos"],
  ["Normas de comercialización de girasol","Estándares de calidad y condiciones comerciales.","https://www.bcr.com.ar/es/mercados/mercado-de-granos"],
  ["Normas de comercialización de maíz","Estándares de calidad y condiciones comerciales.","https://www.bcr.com.ar/es/mercados/mercado-de-granos"],
  ["Normas de comercialización de sorgo","Estándares de calidad y condiciones comerciales.","https://www.bcr.com.ar/es/mercados/mercado-de-granos"],
  ["Normas de comercialización de trigo pan","Estándares de calidad y condiciones comerciales.","https://www.bcr.com.ar/es/mercados/mercado-de-granos"],
  ["Normas de comercialización de cebada cervecera y forrajera","Estándares de calidad y condiciones comerciales.","https://www.bcr.com.ar/es/mercados/mercado-de-granos"],
 ]},
 {group:"Mercados y bolsas",items:[
  ["MATBA-ROFEX","Mercado de futuros y opciones.","https://www.matbarofex.com.ar/"],
  ["BYMA","Bolsas y Mercados Argentinos.","https://www.byma.com.ar/"],
  ["MAV","Mercado Argentino de Valores.","https://www.mav-sa.com.ar/"],
  ["Caja de Valores","Depósito y custodia de valores negociables.","https://www.cajadevalores.com.ar/"],
  ["Bolsa de Cereales de Bahía Blanca","Información institucional y de mercado.","https://www.bcp.org.ar/"],
  ["Bolsa de Cereales de Buenos Aires","Información institucional y de mercado.","https://www.bolsadecereales.com/"],
  ["Bolsa de Cereales de Córdoba","Información institucional y de mercado.","https://www.bccba.org.ar/"],
  ["Bolsa de Cereales de Entre Ríos","Información institucional y de mercado.","https://www.bolsacer.org.ar/"],
  ["Bolsa de Comercio de Santa Fe","Información institucional y de mercado.","https://www.bcsf.com.ar/"],
  ["Bolsa de Comercio de Rosario","Pizarra, mercados y Cámara Arbitral de Cereales.","https://www.bcr.com.ar/"],
 ]},
 {group:"Normativa y cumplimiento",items:[
  ["SISA — Sistema de Información Simplificado Agrícola","Registro y estado de operadores agrícolas.","https://www.afip.gob.ar/actividadesAgropecuarias/sisa/"],
  ["RUCA — Registro Único de Operadores","Registro de operadores de la cadena agroindustrial.","https://www.argentina.gob.ar/agricultura/registro-unico-de-operadores-de-la-cadena-agroindustrial-ruca"],
  ["ARCA — normativa y servicios","Resoluciones, trámites y servicios fiscales.","https://www.arca.gob.ar/"],
  ["PLAFT — prevención de lavado","Normativa y resoluciones de la UIF.","https://www.argentina.gob.ar/uif"],
  ["Ley de Mercado de Capitales 26.831","Texto normativo oficial.","https://www.argentina.gob.ar/normativa/nacional/ley-26831-206592"],
 ]},
 {group:"Tablas técnicas",items:[
  ["Merma por secado de girasol","Consultar tabla técnica y criterios de aplicación.","https://www.bcr.com.ar/"],
  ["Merma por secado de maíz","Consultar tabla técnica y criterios de aplicación.","https://www.bcr.com.ar/"],
  ["Merma por secado de soja","Consultar tabla técnica y criterios de aplicación.","https://www.bcr.com.ar/"],
  ["Merma por secado de sorgo","Consultar tabla técnica y criterios de aplicación.","https://www.bcr.com.ar/"],
  ["Merma por secado de trigo","Consultar tabla técnica y criterios de aplicación.","https://www.bcr.com.ar/"],
 ]},
];
const styles:Record<string,React.CSSProperties>={
 card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:20,boxShadow:"0 4px 18px rgba(15,23,42,.04)",minWidth:0},
 input:{width:"100%",padding:"11px 12px",border:"1px solid #cbd5e1",borderRadius:9,marginTop:6,color:"#0f172a",background:"#fff"},
 label:{display:"block",fontSize:13,fontWeight:650,color:"#334155",minWidth:0},
};
const bushelKg:Record<string,number>={trigo:27.2155,soja:27.2155,maiz:25.4012};
const fmt=(n:number,d=2)=>Number.isFinite(n)?n.toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
export default function UtilidadesPage(){
 const [crop,setCrop]=useState("soja"),[bushels,setBushels]=useState(""),[priceBu,setPriceBu]=useState(""),[yieldBu,setYieldBu]=useState(""),[acres,setAcres]=useState(""),[area,setArea]=useState(""),[shrink,setShrink]=useState(""),[tons,setTons]=useState(""),[dryRate,setDryRate]=useState(""),[open,setOpen]=useState<string[]>(["Mercados y bolsas","Normativa y cumplimiento"]);
 const kg=bushelKg[crop];
 const tonResult=useMemo(()=>Number(bushels)*kg/1000,[bushels,kg]);
 const priceResult=useMemo(()=>Number(priceBu)*1000/kg,[priceBu,kg]);
 const yieldResult=useMemo(()=>Number(yieldBu)*kg/0.4046856422/100,[yieldBu,kg]);
 const hectareResult=useMemo(()=>Number(acres)*0.4046856422,[acres]);
 const acreResult=useMemo(()=>Number(area)/0.4046856422,[area]);
 const shrinkResult=useMemo(()=>Number(tons)*(Number(shrink)/100),[tons,shrink]);
 const dryingCost=useMemo(()=>shrinkResult*Number(dryRate),[shrinkResult,dryRate]);
 return <main style={{padding:"28px clamp(16px,3vw,36px) 60px",background:"#f5f7fa",minHeight:"100vh",color:"#0f172a"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap",marginBottom:24}}>
   <div><div style={{fontSize:12,fontWeight:800,letterSpacing:1.5,color:"#16834a"}}>CENTRO DE RECURSOS</div><h1 style={{fontSize:32,margin:"8px 0"}}>Utilidades Agro</h1><p style={{margin:0,color:"#64748b",maxWidth:760}}>Herramientas de consulta, normativa, mercados y conversiones para operaciones agrocomerciales.</p></div>
   <Link href="/dashboard" style={{textDecoration:"none",padding:"10px 14px",border:"1px solid #d7dee7",borderRadius:10,color:"#334155",background:"#fff"}}>← Volver al inicio</Link>
  </header>
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14,marginBottom:24}}>
   {[["Conversión de granos","Bushel, tonelada métrica y precio por tonelada"],["Rindes y superficies","Bushel/acre, quintales/hectárea y acres"],["Secada y mermas","Estimación con parámetros ingresados por el usuario"],["Fuentes sectoriales","Bolsas, mercados y organismos oficiales"]].map(([a,b])=><div key={a} style={{...styles.card,borderTop:"3px solid #15945a"}}><strong>{a}</strong><p style={{fontSize:13,color:"#64748b",marginBottom:0}}>{b}</p></div>)}
  </section>
  <h2 style={{fontSize:21,margin:"28px 0 14px"}}>Calculadoras de conversión</h2>
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:16}}>
   <div style={styles.card}><h3 style={{marginTop:0}}>Cantidades y precios</h3><label style={styles.label}>Grano<select style={styles.input} value={crop} onChange={e=>setCrop(e.target.value)}><option value="soja">Soja</option><option value="maiz">Maíz</option><option value="trigo">Trigo</option></select></label><div style={{marginTop:14}}><label style={styles.label}>Cantidad (bushels)<input style={styles.input} type="number" min="0" value={bushels} onChange={e=>setBushels(e.target.value)} placeholder="Ej. 1000"/></label><p style={{color:"#15803d",fontWeight:700}}>Toneladas métricas: {bushels?fmt(tonResult,4):"—"}</p></div><div style={{marginTop:14}}><label style={styles.label}>Precio (USD/bushel)<input style={styles.input} type="number" min="0" step="any" value={priceBu} onChange={e=>setPriceBu(e.target.value)} placeholder="Ej. 10,50"/></label><p style={{color:"#15803d",fontWeight:700}}>Equivalente (USD/tn): {priceBu?fmt(priceResult):"—"}</p></div><small style={{color:"#64748b"}}>Factores utilizados: trigo y soja 60 lb/bushel; maíz 56 lb/bushel.</small></div>
   <div style={styles.card}><h3 style={{marginTop:0}}>Rindes y superficie</h3><label style={styles.label}>Rinde (bushels/acre)<input style={styles.input} type="number" min="0" step="any" value={yieldBu} onChange={e=>setYieldBu(e.target.value)} placeholder="Ej. 50"/></label><p style={{color:"#15803d",fontWeight:700}}>Equivalente (qq/ha): {yieldBu?fmt(yieldResult):"—"}</p><div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,marginTop:14}}><label style={styles.label}>Superficie (acres)<input style={styles.input} type="number" min="0" step="any" value={acres} onChange={e=>setAcres(e.target.value)} placeholder="Ej. 100"/></label><p style={{color:"#15803d",fontWeight:700}}>Hectáreas: {acres?fmt(hectareResult,4):"—"}</p></div><div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,marginTop:14}}><label style={styles.label}>Superficie (hectáreas)<input style={styles.input} type="number" min="0" step="any" value={area} onChange={e=>setArea(e.target.value)} placeholder="Ej. 40,47"/></label><p style={{color:"#15803d",fontWeight:700}}>Acres: {area?fmt(acreResult,4):"—"}</p></div><small style={{color:"#64748b"}}>1 acre = 0,4046856422 ha. El factor de bushel cambia según el cultivo.</small></div>
   <div style={styles.card}><h3 style={{marginTop:0}}>Estimador de merma y secada</h3><p style={{fontSize:13,color:"#64748b"}}>Ingresá la merma porcentual y la tarifa acordada. La herramienta no reemplaza la tabla oficial de recibo.</p><label style={styles.label}>Toneladas recibidas<input style={styles.input} type="number" min="0" value={tons} onChange={e=>setTons(e.target.value)} placeholder="Ej. 500"/></label><label style={{...styles.label,marginTop:12}}>Merma aplicada (%)<input style={styles.input} type="number" min="0" max="100" step="any" value={shrink} onChange={e=>setShrink(e.target.value)} placeholder="Ingresar porcentaje confirmado"/></label><label style={{...styles.label,marginTop:12}}>Tarifa de secada ($/tn de merma)<input style={styles.input} type="number" min="0" step="any" value={dryRate} onChange={e=>setDryRate(e.target.value)} placeholder="Ingresar tarifa vigente"/></label><div style={{background:"#f0fdf4",borderRadius:10,padding:12,marginTop:14}}><p style={{margin:0}}>Merma estimada: <strong>{tons&&shrink?fmt(shrinkResult,3)+" tn":"—"}</strong></p><p style={{margin:"6px 0 0"}}>Costo estimado: <strong>{tons&&shrink&&dryRate? "$ "+fmt(dryingCost):"—"}</strong></p></div></div>
  </section>
  <div style={{marginTop:12,fontSize:12,color:"#64748b"}}>Las conversiones son matemáticas y orientativas. Verificá los factores contractuales, calidad, humedad y reglamentos aplicables antes de liquidar una operación.</div>
  <h2 style={{fontSize:21,margin:"34px 0 14px"}}>Recursos y referencias sectoriales</h2>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,440px),1fr))",gap:14}}>
   {links.map(group=><section key={group.group} style={styles.card}><button onClick={()=>setOpen(v=>v.includes(group.group)?v.filter(x=>x!==group.group):[...v,group.group])} aria-expanded={open.includes(group.group)} style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center",border:0,background:"transparent",padding:0,textAlign:"left",cursor:"pointer",fontSize:17,fontWeight:750,color:"#0f172a"}}>{group.group}<span style={{fontSize:22,color:"#15945a"}}>{open.includes(group.group)?"−":"+"}</span></button>{open.includes(group.group)&&<div style={{display:"grid",gap:0,marginTop:12}}>{group.items.map(([name,desc,url])=><div key={name} style={{padding:"11px 0",borderTop:"1px solid #edf1f5",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><strong style={{fontSize:14}}>{name}</strong><div style={{fontSize:12,color:"#64748b",marginTop:3}}>{desc}</div></div><a href={url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#16834a",fontWeight:700,whiteSpace:"nowrap"}}>Consultar ↗</a></div>)}</div>}</section>)}
  </div>
  <section style={{...styles.card,marginTop:16,borderColor:"#f2d19a",background:"#fffbeb"}}><strong>Tarifas de transporte CATAC</strong><p style={{margin:"6px 0",fontSize:13,color:"#78350f"}}>La referencia CATAC que aparece en el material compartido corresponde a noviembre de 2018. No se incorpora como tarifa vigente. Para calcular fletes actuales, cargá el valor actualizado informado por el transportista o la fuente oficial correspondiente.</p></section>
 </main>;
}
