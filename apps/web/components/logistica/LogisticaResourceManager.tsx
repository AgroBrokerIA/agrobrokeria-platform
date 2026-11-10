"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";
type Company={id:string;razon_social:string};
type Truck={id:string;empresa_id:string;patente_chasis:string;patente_acoplado:string|null;marca_modelo:string|null;estado_disponibilidad:boolean;activo:boolean};
type Driver={id:string;empresa_id:string;cuil_chofer:string;nombre_apellido:string;telefono_celular:string;numero_licencia_linti:string|null;activo:boolean};
type Kind="camiones"|"choferes";
const field:React.CSSProperties={width:"100%",padding:10,border:"1px solid #cbd5e1",borderRadius:9,background:"#fff",color:"#0f172a"};
const action:React.CSSProperties={border:0,borderRadius:8,padding:"9px 12px",fontWeight:700,cursor:"pointer"};
function validCuil(value:string){const d=value.replace(/\D/g,"");if(d.length!==11)return false;const w=[5,4,3,2,7,6,5,4,3,2];let sum=0;for(let i=0;i<10;i++)sum+=Number(d[i])*w[i];let c=11-sum%11;if(c===11)c=0;else if(c===10)c=9;return Number(d[10])===c;}
export default function LogisticaResourceManager({kind}:{kind:Kind}){
 const[companies,setCompanies]=useState<Company[]>([]),[companyId,setCompanyId]=useState("");
 const[trucks,setTrucks]=useState<Truck[]>([]),[drivers,setDrivers]=useState<Driver[]>([]);
 const[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[editing,setEditing]=useState("");
 const[plate,setPlate]=useState(""),[trailer,setTrailer]=useState(""),[model,setModel]=useState("");
 const[cuil,setCuil]=useState(""),[name,setName]=useState(""),[phone,setPhone]=useState(""),[license,setLicense]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Iniciá sesión para continuar.");setLoading(false);return;}
  const {data:members,error:memberError}=await supabase.from("company_users").select("company_id").eq("profile_id",user.id).eq("activo",true);
  if(memberError){setError(memberError.message);setLoading(false);return;}
  const ids=[...new Set((members||[]).map((x:any)=>String(x.company_id)))];
  if(!ids.length){setError("Tu usuario no está vinculado a una empresa activa.");setLoading(false);return;}
  const {data:rows,error:companyError}=await supabase.from("empresas").select("id,razon_social").in("id",ids).eq("tipo_operador","logistica").eq("activa",true);
  if(companyError){setError(companyError.message);setLoading(false);return;}
  const list=(rows||[]) as Company[];setCompanies(list);
  if(!list.length){setError("Este módulo es exclusivo para empresas registradas con actividad Logística.");setLoading(false);return;}
  const selected=companyId&&list.some(x=>x.id===companyId)?companyId:list[0].id;setCompanyId(selected);
  if(kind==="camiones"){
   const {data,error}=await supabase.from("logistica_flota_camiones").select("id,empresa_id,patente_chasis,patente_acoplado,marca_modelo,estado_disponibilidad,activo").eq("empresa_id",selected).order("creado_at",{ascending:false});
   if(error)setError(error.message);else setTrucks((data||[]) as Truck[]);
  }else{
   const {data,error}=await supabase.from("logistica_choferes").select("id,empresa_id,cuil_chofer,nombre_apellido,telefono_celular,numero_licencia_linti,activo").eq("empresa_id",selected).order("creado_at",{ascending:false});
   if(error)setError(error.message);else setDrivers((data||[]) as Driver[]);
  }
  setLoading(false);
 },[kind,companyId]);
 useEffect(()=>{void load()},[load]);
 function reset(){setEditing("");setPlate("");setTrailer("");setModel("");setCuil("");setName("");setPhone("");setLicense("");}
 async function save(e:React.FormEvent){
  e.preventDefault();setError("");setNotice("");if(!companyId)return;
  setBusy(true);
  if(kind==="camiones"){
   const p=plate.toUpperCase().replace(/\s/g,""),a=trailer.toUpperCase().replace(/\s/g,"");
   if(!/^[A-Z0-9]{6,7}$/.test(p)||(a&&!/^[A-Z0-9]{6,7}$/.test(a))||!model.trim()){setError("Revisá patente (6–7 caracteres) y marca/modelo.");setBusy(false);return;}
   const payload={empresa_id:companyId,patente_chasis:p,patente_acoplado:a||null,marca_modelo:model.trim()};
   const result=editing?await supabase.from("logistica_flota_camiones").update(payload).eq("id",editing).eq("empresa_id",companyId):await supabase.from("logistica_flota_camiones").insert(payload);
   if(result.error)setError(result.error.message);else{setNotice(editing?"Camión actualizado.":"Camión agregado.");reset();await load();}
  }else{
   const d=cuil.replace(/\D/g,"");
   if(!validCuil(d)||name.trim().length<3||phone.trim().length<6){setError("Ingresá CUIL válido, nombre completo y teléfono.");setBusy(false);return;}
   const payload={empresa_id:companyId,cuil_chofer:d,nombre_apellido:name.trim(),telefono_celular:phone.trim(),numero_licencia_linti:license.trim()||null};
   const result=editing?await supabase.from("logistica_choferes").update(payload).eq("id",editing).eq("empresa_id",companyId):await supabase.from("logistica_choferes").insert(payload);
   if(result.error)setError(result.error.message);else{setNotice(editing?"Chofer actualizado.":"Chofer agregado.");reset();await load();}
  }
  setBusy(false);
 }
 async function toggle(id:string,active:boolean){
  if(!window.confirm(active?"¿Desactivar este recurso? Se conservará el historial.":"¿Reactivar este recurso?"))return;
  setBusy(true);const table=kind==="camiones"?"logistica_flota_camiones":"logistica_choferes";
  const {error}=await supabase.from(table).update({activo:!active,actualizado_at:new Date().toISOString()}).eq("id",id).eq("empresa_id",companyId);
  if(error)setError(error.message);else{setNotice(active?"Recurso desactivado.":"Recurso reactivado.");await load();}setBusy(false);
 }
 const title=kind==="camiones"?"Mi flota de camiones":"Mis choferes habilitados";
 return <main className="module-page" style={{maxWidth:1100,margin:"0 auto",padding:24}}>
  <header style={{marginBottom:20}}><small style={{fontWeight:800,color:"#64748b"}}>PANEL DE EMPRESA · LOGÍSTICA</small><h1 style={{fontSize:30,fontWeight:850,margin:"6px 0"}}>{title}</h1><p style={{color:"#64748b"}}>Administrá los recursos propios. Los camiones asignados quedan bloqueados hasta la confirmación de descarga registrada por la integración.</p></header>
  {companies.length>1&&<label style={{display:"grid",gap:6,maxWidth:450,marginBottom:16}}>Empresa activa<select style={field} value={companyId} onChange={e=>setCompanyId(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.razon_social}</option>)}</select></label>}
  {error&&<p role="alert" style={{padding:12,background:"#fef2f2",color:"#991b1b",borderRadius:8}}>{error}</p>}{notice&&<p role="status" style={{padding:12,background:"#f0fdf4",color:"#166534",borderRadius:8}}>{notice}</p>}
  <nav style={{display:"flex",gap:8,marginBottom:16}}><a href="/dashboard/flota">Camiones</a><a href="/dashboard/choferes">Choferes</a></nav>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18,alignItems:"start"}}>
   <form onSubmit={save} style={{border:"1px solid #dbe3ec",borderRadius:13,padding:16,display:"grid",gap:11}}>
    <h2 style={{fontSize:19,fontWeight:800}}>{editing?"Modificar recurso":kind==="camiones"?"Agregar camión":"Agregar chofer"}</h2>
    {kind==="camiones"?<><label>Patente chasis<input style={field} value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} maxLength={7} placeholder="AF123AA" required/></label><label>Patente acoplado (opcional)<input style={field} value={trailer} onChange={e=>setTrailer(e.target.value.toUpperCase())} maxLength={7}/></label><label>Marca y modelo<input style={field} value={model} onChange={e=>setModel(e.target.value)} maxLength={100} placeholder="Mercedes-Benz Axor 2035" required/></label></>:<><label>Nombre y apellido<input style={field} value={name} onChange={e=>setName(e.target.value)} maxLength={150} required/></label><label>CUIL (11 dígitos)<input style={field} value={cuil} onChange={e=>setCuil(e.target.value.replace(/\D/g,"").slice(0,11))} inputMode="numeric" maxLength={11} required/></label><label>Teléfono celular<input style={field} value={phone} onChange={e=>setPhone(e.target.value)} maxLength={30} required/></label><label>Licencia LINTI (opcional)<input style={field} value={license} onChange={e=>setLicense(e.target.value)} maxLength={30}/></label></>}
    <div style={{display:"flex",gap:8}}><button type="submit" disabled={busy||loading||!companyId} style={{...action,background:"#0f766e",color:"#fff"}}>{busy?"Guardando…":editing?"Guardar cambios":kind==="camiones"?"+ Agregar camión":"+ Agregar chofer"}</button>{editing&&<button type="button" onClick={reset} style={{...action,background:"#e2e8f0"}}>Cancelar</button>}</div>
   </form>
   <section style={{border:"1px solid #dbe3ec",borderRadius:13,padding:16,minWidth:0}}><h2 style={{fontSize:19,fontWeight:800}}>Recursos registrados</h2>
    {loading?<p>Cargando…</p>:kind==="camiones"?(trucks.length?trucks.map(x=><article key={x.id} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0",display:"grid",gap:7}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b>{x.patente_chasis}{x.patente_acoplado?" / "+x.patente_acoplado:""}</b><b style={{fontSize:12,color:!x.activo?"#64748b":x.estado_disponibilidad?"#166534":"#b45309"}}>{!x.activo?"INACTIVO":x.estado_disponibilidad?"DISPONIBLE":"ASIGNADO"}</b></div><span>{x.marca_modelo||"Modelo no informado"}</span><div style={{display:"flex",gap:8}}><button disabled={busy||!x.estado_disponibilidad} onClick={()=>{setEditing(x.id);setPlate(x.patente_chasis);setTrailer(x.patente_acoplado||"");setModel(x.marca_modelo||"");}} style={{...action,background:"#e2e8f0"}}>Editar</button><button disabled={busy||!x.estado_disponibilidad} onClick={()=>void toggle(x.id,x.activo)} style={{...action,background:"#f1f5f9"}}>{x.activo?"Desactivar":"Reactivar"}</button></div></article>):<p>No hay camiones cargados.</p>):(drivers.length?drivers.map(x=><article key={x.id} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0",display:"grid",gap:7}}><b>{x.nombre_apellido} · {x.activo?"ACTIVO":"INACTIVO"}</b><span>CUIL: {x.cuil_chofer} · Tel.: {x.telefono_celular}</span>{x.numero_licencia_linti&&<small>LINTI: {x.numero_licencia_linti}</small>}<div style={{display:"flex",gap:8}}><button disabled={busy} onClick={()=>{setEditing(x.id);setCuil(x.cuil_chofer);setName(x.nombre_apellido);setPhone(x.telefono_celular);setLicense(x.numero_licencia_linti||"");}} style={{...action,background:"#e2e8f0"}}>Editar</button><button disabled={busy} onClick={()=>void toggle(x.id,x.activo)} style={{...action,background:"#f1f5f9"}}>{x.activo?"Desactivar":"Reactivar"}</button></div></article>):<p>No hay choferes cargados.</p>)}
   </section>
  </div>
  <p style={{fontSize:12,color:"#64748b",marginTop:16}}>RLS restringe los registros a miembros de la empresa. Los recursos se desactivan para conservar trazabilidad. La asignación exige comisión logística aprobada y validación transaccional en base de datos.</p>
 </main>;
}
