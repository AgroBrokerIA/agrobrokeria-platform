"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";
type Profile={name:string;email:string;phone:string;city:string;country:string;avatar:string;role:string;company:string;verified:boolean};
export default function PerfilPage(){
 const [p,setP]=useState<Profile>({name:"Usuario AgroBrokerIA",email:"",phone:"",city:"",country:"Argentina",avatar:"",role:"Intermediaria",company:"AgroBrokerIA",verified:false});
 const [loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}const m=user.user_metadata||{};setP({name:m.nombre||m.full_name||m.name||user.email?.split("@")[0]||"Usuario AgroBrokerIA",email:user.email||"",phone:m.telefono||m.phone||"+54 9 341 123-4567",city:m.ciudad||m.city||"Rosario, Santa Fe",country:m.pais||m.country||"Argentina",avatar:m.avatar_url||m.picture||"",role:m.rol||m.role||"Intermediaria",company:m.empresa||m.company||"AgroBrokerIA",verified:Boolean(m.verificada||m.verified)});setLoading(false)})()},[]);
 if(loading)return <main className="profile-reference"><div className="profile-loading">Cargando perfil...</div></main>;
 const initials=p.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
 return <main className="profile-reference">
  <header className="profile-head"><div><h1>Mi Perfil</h1><p>Gestiona tu información personal, empresarial y preferencias de la plataforma</p></div><button className="profile-edit">✎ &nbsp; Editar perfil</button></header>
  <nav className="profile-tabs">{["Información general","Empresa","Verificación","Preferencias","Seguridad","Facturación","Notificaciones","Actividad"].map((x,i)=><button className={i===0?"active":""} key={x}>{x}</button>)}</nav>
  <section className="profile-top">
   <div className="profile-card identity"><div className="profile-avatar">{p.avatar?<img src={p.avatar} alt="Perfil"/>:initials}</div><div><h2>{p.name}<span className="verified">✓</span></h2><p className="profile-role">{p.role} | {p.company}</p><div className="profile-tags"><b>{p.role}</b><b className="green">● Verificada</b><b className="green">Perfil completo</b></div><p className="bio">Gestoría y intermediación en operaciones de granos.<br/>Conectando productores, acopios y compradores en el mercado global.</p></div></div>
   <div className="profile-card contact"><h2>Información de contacto <button>Editar</button></h2><p>✉ <span>{p.email||"Correo no registrado"}</span></p><p>⌕ <span>{p.phone}</span></p><p>⌖ <span>{p.city}</span></p><p>▣ <span>www.agrobrokeria.com</span></p><p>◉ <span>{p.phone}</span></p></div>
   <div className="profile-card reputation"><h2>Nivel y reputación</h2><div className="gold-badge">♛</div><div className="rep-copy"><strong>Nivel Oro</strong><span>Usuario verificado y confiable</span><div className="rep-bar"><i/></div><small>850 / 1.000 puntos</small></div><div className="stars">★ ★ ★ ★ ★ <b>4.9</b> <span>(48 evaluaciones)</span></div></div>
  </section>
  <section className="profile-kpis"><K icon="▤" value="152" label="Operaciones totales"/><K icon="▥" value="USD 185.420" label="Comisiones generadas"/><K icon="♧" value="32" label="Empresas con las que has operado"/><K icon="▦" value="2 años" label="En la plataforma"/><K icon="▥" value="Nivel Alto" label="Reputación"/></section>
  <section className="profile-columns">
   <Card title="Información personal" edit><Rows rows={[[ "♙","Nombre completo",p.name],["▦","Fecha de nacimiento","29/11/1995"],["⊕","País",p.country],["♧","Ciudad",p.city],["◉","Idioma principal","Español"],["◉","Idiomas adicionales","Inglés, Português"],["◷","Zona horaria","GMT-3 (Buenos Aires)"]]}/></Card>
   <Card title="Información empresarial" edit><Rows rows={[["♜","Nombre comercial",p.company],["▣","CUIT","30-12345678-9"],["▤","Tipo de empresa","Gestoría / Intermediaria"],["▤","País",p.country],["⌖","Dirección",p.city],["▤","Sitio web","www.agrobrokeria.com"],["♙","Actividad principal","Intermediación de granos"],["▦","Productos de interés","Soja, Maíz, Trigo, Girasol"],["◎","Mercados","FAS, FOB, CIF, Futuros"]]}/></Card>
   <Card title="Documentación y verificación"><div className="docs">{["Documento de identidad","CUIT / Constancia fiscal","Comprobante de domicilio","Certificación de empresa","Referencias comerciales","Verificación KYC","Cuenta bancaria"].map(x=><div key={x}><span>●</span>{x}<b>Verificado</b><button>Ver</button></div>)}</div></Card>
  </section>
  <section className="profile-bottom">
   <Card title="Mis intereses" edit><h4>Productos</h4><div className="chips">{["🌱 Soja","🌽 Maíz","🌾 Trigo","🌻 Girasol"].map(x=><span key={x}>{x}</span>)}</div><h4>Tipos de operación</h4><div className="chips">{["FAS","FOB","CIF","↕ Futuros"].map(x=><span key={x}>{x}</span>)}</div><h4>Países de interés</h4><div className="chips">{["🇦🇷 Argentina","🇧🇷 Brasil","🇺🇸 Estados Unidos","🇨🇳 China"].map(x=><span key={x}>{x}</span>)}<span className="add">＋ Agregar</span></div></Card>
   <Card title="Preferencias de la plataforma" edit><Rows rows={[["⊕","Idioma de la plataforma","Español"],["◉","Tema visual","Claro"],["♧","Notificaciones por email","Activadas"],["♧","Notificaciones push","Activadas"],["✉","Alertas de oportunidades IA","Activadas"],["▥","Resumen diario del mercado","Activado"]]}/></Card>
   <Card title="Acciones rápidas"><div className="quick-profile"><Link href="/configuracion">🔒 <b>Cambiar contraseña</b><small>Mantén tu cuenta segura →</small></Link><Link href="/notificaciones">⚙ <b>Configurar notificaciones</b><small>Personaliza tus alertas →</small></Link><button>⇩ <b>Exportar mis datos</b><small>Descarga tu información →</small></button><button className="danger">♜ <b>Eliminar cuenta</b><small>Solicitar eliminación →</small></button></div></Card>
  </section>
 </main>
}
function K({icon,value,label}:{icon:string;value:string;label:string}){return <div><i>{icon}</i><strong>{value}</strong><span>{label}</span></div>}
function Card({title,children,edit}:{title:string;children:React.ReactNode;edit?:boolean}){return <div className="profile-card info-card"><h2>{title}{edit&&<button>Editar</button>}</h2>{children}</div>}
function Rows({rows}:{rows:string[][]}){return <div className="profile-rows">{rows.map(r=><div key={r[1]}><i>{r[0]}</i><span>{r[1]}</span><b>{r[2]}</b></div>)}</div>}