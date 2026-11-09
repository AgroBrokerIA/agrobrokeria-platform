"use client";
import {useCallback,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase/client";
type Truck={id:string;patente_chasis:string;patente_acoplado:string|null;marca_modelo:string|null;estado_disponibilidad:boolean};
type Driver={id:string;nombre_apellido:string;cuil_chofer:string;telefono_celular:string;numero_licencia_linti:string|null};
const field:React.CSSProperties={width:"100%",padding:9,border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",color:"#0f172a"};
export default function LogisticaAsignacionRecursos({viajeId}:{viajeId:string}){
 const[allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const[trucks,setTrucks]=useState<Truck[]>([]),[drivers,setDrivers]=useState<Driver[]>([]);
 const[truckId,setTruckId]=useState(""),[driverId,setDriverId]=useState(""),[assigned,setAssigned]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");setAllowed(false);
  const{data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return;}
  const{data:trip,error:tripError}=await supabase.from("viajes").select("cierre_logistica_id,logistica_camion_id,logistica_chofer_id").eq("id",viajeId).maybeSingle();
  if(tripError||!trip?.cierre_logistica_id){setLoading(false);return;}
  const{data:closure,error:closureError}=await supabase.from("cierres_logistica").select("empresa_transportista_id,estado_cierre,estado_pago_comision_logistica").eq("id",trip.cierre_logistica_id).maybeSingle();
  if(closureError||!closure||closure.estado_cierre!=="cerrado_formal"||closure.estado_pago_comision_logistica!=="aprobado"){setLoading(false);return;}
  const companyId=String(closure.empresa_transportista_id);
  const{data:membership}=await supabase.from("company_users").select("company_id").eq("profile_id",user.id).eq("company_id",companyId).eq("activo",true).maybeSingle();
  if(!membership){setLoading(false);return;}
  const{data:company}=await supabase.from("empresas").select("id").eq("id",companyId).eq("tipo_operador","logistica").maybeSingle();
  if(!company){setLoading(false);return;}
  setAllowed(true);
  if(trip.logistica_camion_id&&trip.logistica_chofer_id){setAssigned(String(trip.logistica_camion_id));setLoading(false);return;}
  const[{data:truckRows,error:truckError},{data:driverRows,error:driverError}]=await Promise.all([
   supabase.from("logistica_flota_camiones").select("id,patente_chasis,patente_acoplado,marca_modelo,estado_disponibilidad").eq("empresa_id",companyId).eq("activo",true).eq("estado_disponibilidad",true).order("patente_chasis"),
   supabase.from("logistica_choferes").select("id,nombre_apellido,cuil_chofer,telefono_celular,numero_licencia_linti").eq("empresa_id",companyId).eq("activo",true).order("nombre_apellido")
  ]);
  if(truckError||driverError)setError((truckError||driverError)?.message||"No se pudieron cargar los recursos.");
  setTrucks((truckRows||[]) as Truck[]);setDrivers((driverRows||[]) as Driver[]);
  setLoading(false);
 },[viajeId]);
 useEffect(()=>{void load()},[load]);
 async function assign(){
  if(!truckId||!driverId){setError("Seleccioná camión y chofer.");return;}
  setBusy(true);setError("");setNotice("");
  const{error}=await supabase.rpc("asignar_recursos_flota_a_viaje",{p_viaje_id:viajeId,p_camion_id:truckId,p_chofer_id:driverId});
  if(error)setError("No se pudo asignar la flota: "+error.message);
  else{setNotice("Camión y chofer asignados. El camión quedó bloqueado como no disponible.");setAssigned(truckId);await load();}
  setBusy(false);
 }
 if(loading)return null;
 if(!allowed)return null;
 return <div style={{border:"1px solid #cbd5e1",borderRadius:10,padding:12,display:"grid",gap:9,marginTop:10}}>
  <strong style={{fontSize:13}}>🚚 Recursos de la empresa logística</strong>
  {assigned?<p style={{fontSize:12,color:"#166534",fontWeight:700}}>Recursos de flota asignados a este viaje. El camión permanece no disponible hasta la confirmación de descarga.</p>:<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
    <label style={{display:"grid",gap:4,fontSize:12,fontWeight:700}}>Camión disponible<select style={field} value={truckId} onChange={e=>setTruckId(e.target.value)}><option value="">Seleccionar de mi flota</option>{trucks.map(x=><option key={x.id} value={x.id}>{x.patente_chasis}{x.patente_acoplado?" / "+x.patente_acoplado:""} · "+(x.marca_modelo||"Camión")}</option>)}</select></label>
    <label style={{display:"grid",gap:4,fontSize:12,fontWeight:700}}>Chofer responsable<select style={field} value={driverId} onChange={e=>setDriverId(e.target.value)}><option value="">Seleccionar de mis choferes</option>{drivers.map(x=><option key={x.id} value={x.id}>{x.nombre_apellido} · CUIL {x.cuil_chofer}</option>)}</select></label>
   </div>
   {!trucks.length&&<small style={{color:"#92400e"}}>No hay camiones disponibles. Revisá Mi flota.</small>}
   {!drivers.length&&<small style={{color:"#92400e"}}>No hay choferes activos. Revisá Mis choferes.</small>}
   <button type="button" disabled={busy||!truckId||!driverId} onClick={()=>void assign()} style={{justifySelf:"start",border:0,borderRadius:8,padding:"9px 12px",background:"#0f766e",color:"#fff",fontWeight:800,cursor:"pointer"}}>{busy?"Asignando…":"Confirmar camión y chofer"}</button>
  </>}
  {error&&<small role="alert" style={{color:"#b91c1c"}}>{error}</small>}{notice&&<small role="status" style={{color:"#166534"}}>{notice}</small>}
 </div>;
}
