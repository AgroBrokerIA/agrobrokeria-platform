"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase/client";
type Profile={name:string;email:string;phone:string;city:string;country:string;avatar:string;role:string;company:string;verified:boolean};
export default function PerfilPage(){
 const [p,setP]=useState<Profile>({name:"Usuario AgroBrokerIA",email:"",phone:"",city:"",country:"",avatar:"",role:"",company:"",verified:false});
 const [loading,setLoading]=useState(true);
 const router=useRouter();
 const goEdit=()=>router.push("/configuracion?seccion=perfil");
 const openDocument=(name:string)=>router.push(`/documentos?documento=${encodeURIComponent(name)}`);
 const exportData=()=>{const blob=new Blob([JSON.stringify({perfil:p,exportado_en:new Date().toISOString()},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="agrobrokeria-perfil.json";a.click();URL.revokeObjectURL(url)};
 const requestDeletion=()=>{window.location.href="mailto:soporte@agrobrokeria.com?subject=Solicitud%20de%20eliminacion%20de%20cuenta&body=Solicito%20iniciar%20el%20proceso%20de%20eliminacion%20de%20mi%20cuenta%20AgroBrokerIA.";};
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}const m=user.user_metadata||{};setP({name:m.nombre||m.full_name||m.name||user.email?.split("@")[0]||"Usuario AgroBrokerIA",email:user.email||"",phone:m.telefono||m.phone||"",city:m.ciudad||m.city||"",country:m.pais||m.country||"",avatar:m.avatar_url||m.picture||"",role:m.rol||m.role||"",company:m.empresa||m.company||"",verified:Boolean(m.verificada||m.verified)});setLoading(false)})()},[]);
 if(loading)return <main className="profile-reference"><div className="profile-loading">Cargando perfil...</div></main>;
 const initials=p.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
 return <main className="profile-reference">
  <header className="profile-head"><div><h1>Mi Perfil</h1><p>Gestiona tu información personal, empresarial y preferencias de la plataforma</p></div><button className="profile-edit" onClick={goEdit}>✎ &nbsp; Editar perfil</button></header>
  <nav className="profile-tabs">{[["Información general","/perfil"],["Empresa","/empresas"],["Verificación","/verificaciones"],["Preferencias","/configuracion"],["Seguridad","/seguridad"],["Facturación","/facturas"],["Notificaciones","/notificaciones"],["Actividad","/historial"]].map(([x,h],i)=><Link className={i===0?"active":""} href={h} key={x}>{x}</Link>)}</nav>
  <section className="profile-top">
   <div className="profile-card identity"><div className="profile-avatar">{p.avatar?<img src={p.avatar} alt="Perfil"/>:initials}</div><div><h2>{p.name}<span className="verified">✓</span></h2><p className="profile-role">{p.role} | {p.company}</p><div className="profile-tags"><b>{p.role}</b><b className="green">● Verificada</b><b className="green">Perfil completo</b></div><p className="bio">Gestoría y intermediación en operaciones de granos.<br/>Conectando productores, acopios y compradores en el mercado global.</p></div></div>
   <div className="profile-card contact"><h2>Información de contacto <button onClick={goEdit}>Editar</button></h2><p>✉ <span>{p.email||"Correo no registrado"}</span></p><p>⌕ <span>{p.phone}</span></p><p>⌖ <span>{p.city}</span></p><p>▣ <span>Sitio web no registrado</span></p></div>
   <div className="profile-card reputation"><h2>Nivel y reputación</h2><div className="gold-badge">♛</div><div className="rep-copy"><strong>Nivel Oro</strong><span>Usuario verificado y confiable</span><div className="rep-bar"><i/></div><small>850 / 1.000 puntos</small></div><div className="stars">★ ★ ★ ★ ★ <b>4.9</b> <span>(48 evaluaciones)</span></div></div>
  </section>
  <section className="profile-kpis"><K icon="▤" value="152" label="Operaciones totales"/><K icon="▥" value="USD 185.420" label="Comisiones generadas"/><K icon="♧" value="32" label="Empresas con las que has operado"/><K icon="▦" value="2 años" label="En la plataforma"/><K icon="▥" value="Nivel Alto" label="Reputación"/></section>
  <section className="profile-columns">
   <Card title="Información personal" edit onEdit={goEdit}><Rows rows={[[ "♙","Nombre completo",p.name],["▦","Fecha de nacimiento","No registrada"],["⊕","País",p.country],["♧","Ciudad",p.city],["◉","Idioma principal","Español"],["◉","Idiomas adicionales","Inglés, Português"],["◷","Zona horaria","GMT-3 (Buenos Aires)"]]}/></Card>
   <Card title="Información empresarial" edit onEdit={goEdit}><Rows rows={[["♜","Nombre comercial",p.company],["▣","CUIT","No registrada"],["▤","Tipo de empresa","Gestoría / Intermediaria"],["▤","País",p.country],["⌖","Dirección",p.city],["▤","Sitio web","No registrado"],["♙","Actividad principal","Intermediación de granos"],["▦","Productos de interés","Soja, Maíz, Trigo, Girasol"],["◎","Mercados","No registrados"]]}/></Card>
   <Card title="Documentación y verificación"><div className="docs">{["Documento de identidad","CUIT / Constancia fiscal","Comprobante de domicilio","Certificación de empresa","Referencias comerciales","Verificación KYC","Cuenta bancaria"].map(x=><div key={x}><span>●</span>{x}<b>Verificado</b><button onClick={()=>openDocument(x)}>Ver</button></div>)}</div></Card>
  </section>
  <section className="profile-bottom">
   <Card title="Mis intereses" edit onEdit={goEdit}><h4>Productos</h4><div className="chips"><span>No registrados</span></div><h4>Tipos de operación</h4><div className="chips"><span>No registrados</span></div><h4>Países de interés</h4><div className="chips"><span>No registrados</span><span className="add" role="button" tabIndex={0} onClick={goEdit} onKeyDown={e=>e.key==="Enter"&&goEdit()}>＋ Agregar</span></div></Card>
   <Card title="Preferencias de la plataforma" edit onEdit={goEdit}><Rows rows={[["⊕","Idioma de la plataforma","Español"],["◉","Tema visual","Claro"],["♧","Notificaciones por email","Activadas"],["♧","Notificaciones push","Activadas"],["✉","Alertas de oportunidades IA","Activadas"],["▥","Resumen diario del mercado","Activado"]]}/></Card>
   <Card title="Acciones rápidas"><div className="quick-profile"><Link href="/configuracion">🔒 <b>Cambiar contraseña</b><small>Mantén tu cuenta segura →</small></Link><Link href="/notificaciones">⚙ <b>Configurar notificaciones</b><small>Personaliza tus alertas →</small></Link><button onClick={exportData}>⇩ <b>Exportar mis datos</b><small>Descarga tu información →</small></button><button className="danger" onClick={requestDeletion}>♜ <b>Eliminar cuenta</b><small>Solicitar eliminación →</small></button></div></Card>
  </section>
 </main>
}
function K({icon,value,label}:{icon:string;value:string;label:string}){return <div><i>{icon}</i><strong>{value}</strong><span>{label}</span></div>}
function Card({title,children,edit,onEdit}:{title:string;children:React.ReactNode;edit?:boolean;onEdit?:()=>void}){return <div className="profile-card info-card"><h2>{title}{edit&&<button onClick={onEdit}>Editar</button>}</h2>{children}</div>}
function Rows({rows}:{rows:string[][]}){return <div className="profile-rows">{rows.map(r=><div key={r[1]}><i>{r[0]}</i><span>{r[1]}</span><b>{r[2]}</b></div>)}</div>}