"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {supabase} from "@/lib/supabase/client";

type ParticipantProfile={
 profile_id:string;nombre:string;email:string|null;telefono:string|null;rol:string;empresa_id:string;empresa_nombre:string;
 pais:string|null;provincia:string|null;ciudad:string|null;verificada:boolean;estado_verificacion:string;
 empresa_verificada:boolean;score:number|null;score_label:string|null;score_color:string|null;cobertura_pct:number|null;
 operaciones_evaluadas:number|null;viajes_evaluados:number|null;perfil_creado_at:string|null;
};

const labels:Record<string,string>={
 VERIFICADO:"Verificado",APROBADO:"Aprobado",PENDIENTE:"Pendiente",EN_REVISION:"En revisión",
 OBSERVADO:"Observado",FALTA_DOCUMENTACION:"Falta documentación",NO_VERIFICADO:"No verificado"
};

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
   if(error){setError(error.message==="PROFILE_AVAILABLE_AFTER_DEFINITIVE_CONTRACT"?"El perfil estará disponible cuando la operación llegue a Contrato Definitivo.":error.message==="NOT_OPERATION_PARTICIPANT"?"No tenés permisos para consultar el perfil de esta operación.":"No se pudo consultar el perfil del participante. Verificá que tu empresa participe en la operación.");setLoading(false);return;}
   const row=Array.isArray(data)?data[0]:data;
   if(!row){setError("No hay un usuario registrado vinculado a la empresa contraparte. Administración debe completar la vinculación de la cuenta.");setLoading(false);return;}
   setProfile(row as ParticipantProfile);setLoading(false);
  })();
  return()=>{active=false};
 },[operacionId]);

 const status=profile?.estado_verificacion||"NO_VERIFICADO";
 const location=[profile?.ciudad,profile?.provincia,profile?.pais].filter(Boolean).join(", ");
 const scoreColor=profile?.score_color||"#64748b";

 return <main style={{minHeight:"100vh",background:"#f3f6f8",padding:"28px 18px",color:"#142b2a"}}>
  <div style={{maxWidth:1040,margin:"0 auto"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:22,flexWrap:"wrap"}}>
    <div><p style={{margin:0,color:"#0b8b60",fontWeight:700,fontSize:13}}>AGROBROKERIA · PERFIL DE CONTRAPARTE</p><h1 style={{margin:"6px 0 0",fontSize:28}}>Perfil del participante</h1></div>
    <Link href="/mensajes" style={{padding:"10px 16px",border:"1px solid #cbd5e1",borderRadius:10,color:"#173b36",textDecoration:"none",fontWeight:650,background:"#fff"}}>← Volver a mensajes</Link>
   </div>
   {loading?<section style={card}><p>Consultando identidad, verificación y scoring del participante…</p></section>:error?<section role="alert" style={{...card,borderColor:"#fecaca",color:"#991b1b"}}><strong>No se pudo abrir el perfil</strong><p>{error}</p><Link href="/mensajes">Volver a la conversación</Link></section>:profile&&<>
    <section style={{...card,display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:20,alignItems:"center"}}>
     <div><div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}><div style={{width:64,height:64,borderRadius:18,background:"#059669",color:"#fff",display:"grid",placeItems:"center",fontSize:22,fontWeight:800}}>{profile.nombre.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div><h2 style={{margin:0,fontSize:23}}>{profile.nombre}</h2><p style={{margin:"5px 0",color:"#64748b"}}>{profile.rol} · {profile.empresa_nombre}</p><p style={{margin:0,color:"#64748b",fontSize:13}}>{location||"Ubicación no informada"}</p></div></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:18}}>
       <span style={pill(profile.verificada?"#dcfce7":"#f1f5f9",profile.verificada?"#166534":"#475569")}>{profile.verificada?"✓ Usuario verificado":labels[status]||status}</span>
       <span style={pill(profile.empresa_verificada?"#dcfce7":"#f1f5f9",profile.empresa_verificada?"#166534":"#475569")}>{profile.empresa_verificada?"✓ Empresa verificada":"Empresa sin verificar"}</span>
      </div>
     </div>
     <div style={{minWidth:190,textAlign:"center",padding:18,borderRadius:16,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
      <div style={{fontSize:12,color:"#64748b",fontWeight:700}}>SCORING AGROBROKERIA</div>
      <div style={{fontSize:36,fontWeight:850,color:scoreColor,margin:"6px 0"}}>{profile.score!=null?profile.score+"/100":"—"}</div>
      <div style={{fontSize:13,fontWeight:700,color:scoreColor}}>{profile.score_label||"Historial insuficiente"}</div>
     </div>
    </section>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:16}}>
     <article style={card}><h3 style={h3}>Datos del usuario</h3><Info label="Nombre registrado" value={profile.nombre}/><Info label="Rol en la operación" value={profile.rol}/><Info label="Correo" value={profile.email||"No informado"}/><Info label="Teléfono" value={profile.telefono||"No informado"}/><Info label="Alta en la plataforma" value={profile.perfil_creado_at?new Date(profile.perfil_creado_at).toLocaleDateString("es-AR"):"No disponible"}/></article>
     <article style={card}><h3 style={h3}>Datos empresariales</h3><Info label="Empresa" value={profile.empresa_nombre}/><Info label="País" value={profile.pais||"No informado"}/><Info label="Provincia" value={profile.provincia||"No informada"}/><Info label="Localidad" value={profile.ciudad||"No informada"}/><Info label="Estado de verificación" value={labels[status]||status}/></article>
     <article style={card}><h3 style={h3}>Evidencia del scoring</h3><Info label="Puntaje" value={profile.score!=null?profile.score+"/100":"Sin datos suficientes"}/><Info label="Cobertura de evidencia" value={profile.cobertura_pct!=null?profile.cobertura_pct+"%":"No disponible"}/><Info label="Operaciones evaluadas" value={String(profile.operaciones_evaluadas??0)}/><Info label="Viajes evaluados" value={String(profile.viajes_evaluados??0)}/><p style={{fontSize:12,color:"#64748b",marginTop:12}}>El puntaje refleja los registros disponibles en AgroBrokerIA; no constituye una garantía comercial ni sustituye las verificaciones oficiales.</p></article>
    </section>
   </>}
  </div>
 </main>;
}

const card:React.CSSProperties={background:"#fff",border:"1px solid #dbe3e8",borderRadius:16,padding:22,boxShadow:"0 2px 8px rgba(15,23,42,.04)"};
const h3:React.CSSProperties={margin:"0 0 16px",fontSize:16};
function pill(background:string,color:string):React.CSSProperties{return {display:"inline-flex",alignItems:"center",padding:"7px 11px",borderRadius:999,background,color,fontSize:12,fontWeight:750};}
function Info({label,value}:{label:string;value:string}){return <div style={{padding:"9px 0",borderBottom:"1px solid #edf1f4"}}><div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</div><div style={{marginTop:4,fontSize:14,fontWeight:600,overflowWrap:"anywhere"}}>{value}</div></div>}
