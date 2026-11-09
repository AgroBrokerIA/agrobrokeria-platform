"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";

type Categoria="puerto_exportacion"|"molino_industrial"|"acopio_cooperativa"|"consumo_feedlot";
type Destino={id_destino:number;tipo:Categoria;nombre_establecimiento:string;localidad:string;provincia:string;direccion:string|null;cuit_operador:string|null;verificado:boolean;activo:boolean;fuente_datos:string};
const labels:Record<Categoria,string>={puerto_exportacion:"Puerto de exportación",molino_industrial:"Molino industrial",acopio_cooperativa:"Acopio / Cooperativa",consumo_feedlot:"Feedlot / Consumo animal"};
export default function DestinosAdminPage(){
 const[rows,setRows]=useState<Destino[]>([]),[admin,setAdmin]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState<number|null>(null),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function load(){
  setLoading(true);setError("");
  const{data:ok,error:authError}=await supabase.rpc("es_administrador_plataforma");
  if(authError||ok!==true){setAdmin(false);setLoading(false);return;}
  setAdmin(true);
  const{data,error}=await supabase.from("destinos_homologados").select("id_destino,tipo,nombre_establecimiento,localidad,provincia,direccion,cuit_operador,verificado,activo,fuente_datos").order("tipo").order("nombre_establecimiento");
  if(error)setError(error.message);else setRows((data||[]) as Destino[]);
  setLoading(false);
 }
 useEffect(()=>{void load()},[]);
 function edit(id:number,key:keyof Destino,value:string|boolean){setRows(old=>old.map(row=>row.id_destino===id?{...row,[key]:value}:row));}
 async function save(row:Destino,verify:boolean){
  setBusy(row.id_destino);setError("");setMessage("");
  const cuit=(row.cuit_operador||"").replace(/\D/g,"");
  if(cuit&&cuit.length!==11){setError("El CUIT del operador debe contener 11 dígitos o quedar vacío.");setBusy(null);return;}
  if(!row.nombre_establecimiento.trim()||!row.localidad.trim()||!row.provincia.trim()){setError("Completá establecimiento, localidad y provincia.");setBusy(null);return;}
  if(verify&&!window.confirm("Confirmás que verificaste la identidad del establecimiento, su domicilio y que recibe el producto/categoría correspondiente?")){setBusy(null);return;}
  const{error}=await supabase.from("destinos_homologados").update({
   nombre_establecimiento:row.nombre_establecimiento.trim(),localidad:row.localidad.trim(),provincia:row.provincia.trim(),direccion:(row.direccion||"").trim()||null,
   cuit_operador:cuit||null,verificado:verify?true:row.verificado,activo:row.activo,actualizado_en:new Date().toISOString()
  }).eq("id_destino",row.id_destino);
  if(error)setError(error.message);else{setMessage(verify?"Destino actualizado y marcado como verificado.":"Cambios guardados.");await load();}
  setBusy(null);
 }
 const field:React.CSSProperties={width:"100%",padding:8,border:"1px solid #cbd5e1",borderRadius:7,background:"transparent",color:"inherit"};
 return <main style={{maxWidth:1200,margin:"0 auto",padding:22}}>
  <p style={{fontSize:12,color:"#64748b",fontWeight:700}}>ADMINISTRACIÓN · CATÁLOGOS</p>
  <h1 style={{fontSize:28,fontWeight:800}}>Destinos homologados de granos</h1>
  <p style={{color:"#64748b",maxWidth:850}}>Verificá identidad, localidad, provincia y CUIT del operador antes de marcar un destino como homologado. Solo los destinos verificados podrán utilizarse para confirmar contratos F1.</p>
  {error&&<p role="alert" style={{color:"#b91c1c",padding:10,background:"#fef2f2",borderRadius:8}}>{error}</p>}
  {message&&<p role="status" style={{color:"#166534",padding:10,background:"#f0fdf4",borderRadius:8}}>{message}</p>}
  {!loading&&!admin?<p>Acceso exclusivo para administración de AgroBrokerIA.</p>:null}
  {loading?<p>Cargando catálogo…</p>:admin&&<section style={{display:"grid",gap:12}}>
   <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><span><b>{rows.length}</b> destinos</span><span><b>{rows.filter(x=>x.verificado).length}</b> verificados</span><span><b>{rows.filter(x=>!x.verificado).length}</b> pendientes</span></div>
   {rows.map(row=><article key={row.id_destino} style={{border:"1px solid #dbe3ec",borderRadius:12,padding:14,display:"grid",gap:10}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><strong>{labels[row.tipo]}</strong><span style={{fontSize:12,fontWeight:700,color:row.verificado?"#166534":"#92400e"}}>{row.verificado?"VERIFICADO":"PENDIENTE DE VERIFICACIÓN"} · {row.activo?"ACTIVO":"INACTIVO"}</span></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9}}>
     <label>Establecimiento<input style={field} value={row.nombre_establecimiento} onChange={e=>edit(row.id_destino,"nombre_establecimiento",e.target.value)}/></label>
     <label>Localidad<input style={field} value={row.localidad} onChange={e=>edit(row.id_destino,"localidad",e.target.value)}/></label>
     <label>Provincia<input style={field} value={row.provincia} onChange={e=>edit(row.id_destino,"provincia",e.target.value)}/></label>
     <label>Dirección exacta (opcional)<input style={field} value={row.direccion||""} onChange={e=>edit(row.id_destino,"direccion",e.target.value)}/></label>
     <label>CUIT operador (opcional)<input style={field} value={row.cuit_operador||""} maxLength={11} inputMode="numeric" onChange={e=>edit(row.id_destino,"cuit_operador",e.target.value.replace(/\D/g,"").slice(0,11))}/></label>
    </div>
    <small style={{color:"#64748b"}}>Origen: {row.fuente_datos||"—"} · ID {row.id_destino}</small>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
     <button disabled={busy===row.id_destino} onClick={()=>void save(row,false)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #94a3b8"}}>Guardar cambios</button>
     {!row.verificado&&<button disabled={busy===row.id_destino} onClick={()=>void save(row,true)} style={{padding:"8px 12px",borderRadius:8,border:0,background:"#166534",color:"white",fontWeight:700}}>Verificar establecimiento</button>}
     <button disabled={busy===row.id_destino} onClick={()=>{edit(row.id_destino,"activo",!row.activo);}} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #94a3b8"}}>{row.activo?"Desactivar":"Activar"}</button>
    </div>
   </article>)}
  </section>}
 </main>;
}
