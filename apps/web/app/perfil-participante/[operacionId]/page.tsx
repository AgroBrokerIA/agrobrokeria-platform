"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {supabase} from "@/lib/supabase/client";

type ParticipantProfile={
 profile_id:string;nombre:string;nombre_usuario:string;email:string|null;telefono:string|null;rol:string;empresa_id:string;
 empresa_nombre:string;razon_social:string|null;cuit:string|null;tipo_empresa:string|null;tipo_operador:string|null;
 pais:string|null;provincia:string|null;ciudad:string|null;direccion:string|null;sitio_web:string|null;descripcion:string|null;
 verificada:boolean;estado_verificacion:string;empresa_verificada:boolean;score:number|null;score_label:string|null;
 score_color:string|null;cobertura_pct:number|null;operaciones_evaluadas:number|null;viajes_evaluados:number|null;
 perfil_creado_at:string|null;contacto_habilitado:boolean;contrato_numero:string|null;contrato_estado:string|null;
 cantidad_tn:number|null;precio_tn:number|null;importe_total:number|null;lugar_carga:string|null;destino:string|null;
 condicion_entrega:string|null;forma_pago:string|null;plazo_pago:string|null;calidad:string|null;flete:string|null;
};

const labels:Record<string,string>={VERIFICADO:"Verificado",APROBADO:"Aprobado",PENDIENTE:"Pendiente",EN_REVISION:"En revisión",OBSERVADO:"Observado",FALTA_DOCUMENTACION:"Falta documentación",NO_VERIFICADO:"No verificado"};
const card:React.CSSProperties={background:"#fff",border:"1px solid #dbe3e8",borderRadius:16,padding:22,boxShadow:"0 2px 8px rgba(15,23,42,.04)"};
const h3:React.CSSProperties={margin:"0 0 16px",fontSize:16};
function pill(background:string,color:string):React.CSSProperties{return {display:"inline-flex",alignItems:"center",padding:"7px 11px",borderRadius:999,background,color,fontSize:12,fontWeight:750};}
function Info({label,value}:{label:string;value:string}){return <div style={{padding:"9px 0",borderBottom:"1px solid #edf1f4"}}><div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</div><div style={{marginTop:4,fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{value}</div></div>}

export default function PerfilParticipanteOperacionPage(){
 const params=useParams<{operacionId:string}>();
 const operacionId=String(params.operacionId||"");
 const [profile,setProfile]=useState<ParticipantProfile|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setError("");
   const {data,error}=await supabase.rpc("obtener_perfil_participante_operacion",{p_operacion_id:operacionId});
   if(!active)return;
   if(error){
    setError(error.message==="NOT_OPERATION_PARTICIPANT"?"No tenés permisos para consultar el perfil de esta operación.":"No se pudo consultar el perfil. Verificá que tu empresa participe en la operación.");
    setLoading(false);return;
   }
   const row=Array.isArray(data)?data[0]:data;
   if(!row){setError("No hay un usuario registrado vinculado a la empresa contraparte. Administración debe completar la vinculación.");setLoading(false);return;}
   setProfile(row as ParticipantProfile);setLoading(false);
  })();
  return()=>{active=false};
 },[operacionId]);

 const status=profile?.estado_verificacion||"NO_VERIFICADO";
 const location=[profile?.ciudad,profile?.provincia,profile?.pais].filter(Boolean).join(", ");
 const scoreColor=profile?.score_color||"#64748b";
 const initials=(profile?.empresa_nombre||"Empresa").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();

 return <main style={{minHeight:"100vh",background:"#f3f6f8",padding:"28px 18px",color:"#142b2a"}}>
  <div style={{maxWidth:1100,margin:"0 auto"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:22,flexWrap:"wrap"}}>
    <div><p style={{margin:0,color:"#0b8b60",fontWeight:700,fontSize:13}}>AGROBROKERIA · PERFIL DE CONTRAPARTE</p><h1 style={{margin:"6px 0 0",fontSize:28}}>Perfil comercial</h1></div>
    <Link href="/mensajes" style={{padding:"10px 16px",border:"1px solid #cbd5e1",borderRadius:10,color:"#173b36",textDecoration:"none",fontWeight:650,background:"#fff"}}>← Volver a mensajes</Link>
   </div>
   {loading?<section style={card}><p>Consultando identidad, datos empresariales, verificación y scoring…</p></section>:error?<section role="alert" style={{...card,borderColor:"#fecaca",color:"#991b1b"}}><strong>No se pudo abrir el perfil</strong><p>{error}</p><Link href="/mensajes">Volver a la conversación</Link></section>:profile&&<>
    <section style={{...card,display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:20,alignItems:"center"}}>
     <div>
      <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
       <div style={{width:64,height:64,borderRadius:18,background:"#059669",color:"#fff",display:"grid",placeItems:"center",fontSize:22,fontWeight:800}}>{initials}</div>
       <div><h2 style={{margin:0,fontSize:23}}>{profile.empresa_nombre}</h2><p style={{margin:"5px 0",color:"#64748b"}}>{profile.nombre_usuario} · {profile.rol}</p><p style={{margin:0,color:"#64748b",fontSize:13}}>{location||"Ubicación no informada"}</p></div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:18}}>
       <span style={pill(profile.verificada?"#dcfce7":"#f1f5f9",profile.verificada?"#166534":"#475569")}>{profile.verificada?"✓ Usuario verificado":labels[status]||status}</span>
       <span style={pill(profile.empresa_verificada?"#dcfce7":"#f1f5f9",profile.empresa_verificada?"#166534":"#475569")}>{profile.empresa_verificada?"✓ Empresa verificada":"Empresa sin verificar"}</span>
       {profile.contacto_habilitado&&<span style={pill("#dcfce7","#166534")}>Contacto habilitado por contrato</span>}
      </div>
     </div>
     <div style={{minWidth:190,textAlign:"center",padding:18,borderRadius:16,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
      <div style={{fontSize:12,color:"#64748b",fontWeight:700}}>SCORING AGROBROKERIA</div>
      <div style={{fontSize:36,fontWeight:850,color:scoreColor,margin:"6px 0"}}>{profile.score!=null?profile.score+"/100":"—"}</div>
      <div style={{fontSize:13,fontWeight:700,color:scoreColor}}>{profile.score_label||"Historial insuficiente"}</div>
     </div>
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(245px,1fr))",gap:14,marginTop:16}}>
     <article style={card}><h3 style={h3}>Identidad del usuario registrado</h3><Info label="Nombre y apellido" value={profile.nombre_usuario}/><Info label="Rol en esta operación" value={profile.rol}/><Info label="Estado de verificación personal" value={labels[status]||status}/><Info label="Usuario registrado desde" value={profile.perfil_creado_at?new Date(profile.perfil_creado_at).toLocaleDateString("es-AR"):"No disponible"}/></article>
     <article style={card}><h3 style={h3}>Datos de la empresa / operador</h3><Info label="Nombre comercial" value={profile.empresa_nombre}/><Info label="Razón social" value={profile.razon_social||"No informada"}/><Info label="CUIT" value={profile.cuit||"No informado"}/><Info label="Tipo de empresa" value={profile.tipo_empresa||"No informado"}/><Info label="Actividad / operador" value={profile.tipo_operador||profile.rol}/><Info label="Verificación empresarial" value={profile.empresa_verificada?"Verificada":"No verificada"}/></article>
     <article style={card}><h3 style={h3}>Ubicación y presencia comercial</h3><Info label="País" value={profile.pais||"No informado"}/><Info label="Provincia / Estado" value={profile.provincia||"No informado"}/><Info label="Ciudad / Localidad" value={profile.ciudad||"No informada"}/><Info label="Dirección" value={profile.direccion||"No informada"}/><Info label="Sitio web" value={profile.sitio_web||"No informado"}/><Info label="Descripción comercial" value={profile.descripcion||"No informada"}/></article>
     <article style={card}><h3 style={h3}>Datos de contacto</h3>{profile.contacto_habilitado?<><Info label="Correo electrónico" value={profile.email||"No registrado"}/><Info label="Teléfono" value={profile.telefono||"No registrado"}/></>:<><p style={{fontSize:14,lineHeight:1.55,color:"#475569"}}>Por privacidad, el correo electrónico y el teléfono permanecen ocultos durante la negociación.</p><p style={{fontSize:14,lineHeight:1.55,color:"#047857",fontWeight:700}}>Se habilitan para ambas partes al llegar a Contrato Definitivo.</p></>}</article>
     <article style={card}><h3 style={h3}>Reputación y scoring</h3><Info label="Puntaje" value={profile.score!=null?profile.score+"/100":"Historial insuficiente"}/><Info label="Cobertura de evidencia" value={profile.cobertura_pct!=null?profile.cobertura_pct+"%":"No disponible"}/><Info label="Operaciones evaluadas" value={String(profile.operaciones_evaluadas??0)}/><Info label="Viajes evaluados" value={String(profile.viajes_evaluados??0)}/><p style={{fontSize:12,color:"#64748b",marginTop:12}}>El puntaje refleja registros disponibles en AgroBrokerIA; no constituye una garantía comercial ni sustituye verificaciones oficiales.</p></article>
     <article style={card}><h3 style={h3}>Contrato vinculado a esta operación</h3>{profile.contacto_habilitado?<><Info label="Número de contrato" value={profile.contrato_numero||"No informado"}/><Info label="Estado" value={profile.contrato_estado||"No informado"}/><Info label="Cantidad (TN)" value={profile.cantidad_tn!=null?Number(profile.cantidad_tn).toLocaleString("es-AR"):"No informada"}/><Info label="Precio por TN" value={profile.precio_tn!=null?Number(profile.precio_tn).toLocaleString("es-AR"):"No informado"}/><Info label="Importe total" value={profile.importe_total!=null?Number(profile.importe_total).toLocaleString("es-AR"):"No informado"}/><Info label="Lugar de carga" value={profile.lugar_carga||"No informado"}/><Info label="Destino" value={profile.destino||"No informado"}/><Info label="Condición de entrega" value={profile.condicion_entrega||"No informada"}/><Info label="Forma de pago" value={profile.forma_pago||"No informada"}/><Info label="Plazo de pago" value={profile.plazo_pago||"No informado"}/><Info label="Calidad" value={profile.calidad||"No informada"}/><Info label="Flete" value={profile.flete||"No informado"}/></>:<p style={{fontSize:14,lineHeight:1.55,color:"#475569"}}>Los datos contractuales se mostrarán cuando la operación llegue a Contrato Definitivo.</p>}</article>
    </section>
   </>}
  </div>
 </main>;
}
