"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Connection={estado:string;mp_user_id:string;token_expires_at:string|null;live_mode:boolean;public_key:string|null;actualizado_at:string};

export default function PagosConfigPage(){
 const[connection,setConnection]=useState<Connection|null>(null);
 const[loading,setLoading]=useState(true),[connecting,setConnecting]=useState(false),[error,setError]=useState(""),[msg,setMsg]=useState("");

 async function load(){
  setLoading(true);setError("");
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session) throw new Error("Sesión no disponible.");
   const response=await fetch("/api/pagos/mercadopago/status",{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
   const data=await response.json();
   if(!response.ok) throw new Error(data.error||"No se pudo consultar Mercado Pago.");
   setConnection(data.connection||null);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar pagos.");}
  finally{setLoading(false);}
 }

 useEffect(()=>{void load();const params=new URLSearchParams(window.location.search);if(params.get("mp")==="connected")setMsg("Mercado Pago quedó conectado correctamente.");if(params.get("mp")==="error")setError("No se pudo completar la vinculación con Mercado Pago.");},[]);

 async function connect(){
  setConnecting(true);setError("");setMsg("");
  try{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session) throw new Error("Sesión expirada.");
   const response=await fetch("/api/pagos/mercadopago/connect/start",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`}});
   const data=await response.json();
   if(!response.ok||!data.authorization_url) throw new Error(data.error||"No se pudo iniciar la vinculación.");
   window.location.assign(data.authorization_url);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo iniciar Mercado Pago.");setConnecting(false);}
 }

 if(loading)return <main className="module-page"><div className="module-hero"><h1>Configuración de pagos</h1></div></main>;

 return <main className="module-page">
  <div className="module-hero"><div><span className="eyebrow">PAGOS</span><h1>Configuración de pagos</h1><p>Vinculá Mercado Pago mediante OAuth. No ingreses Access Tokens ni claves privadas en AgroBrokerIA.</p></div><Link className="module-pill" href="/medios-cobro">← Volver a Métodos de pago</Link></div>
  {error&&<div className="module-alert module-alert-error">{error}</div>}{msg&&<div className="module-alert">{msg}</div>}
  <section className="settings-grid">
   <Link href="/cuentas-bancarias" className="settings-card"><div className="settings-icon">🏦</div><div><h2>Cuentas bancarias</h2><p>Agregar y gestionar bancos, CBU/CVU, alias y moneda.</p></div><span className="settings-arrow">→</span></Link>
   <section className="company-card">
    <h2>Mercado Pago</h2>
    <p>Conectá la cuenta que AgroBrokerIA utilizará como vendedor del marketplace. La autorización se realiza directamente en Mercado Pago.</p>
    {connection?<div className="settings-form-grid">
      <div><strong>Estado</strong><p>{connection.estado==="CONECTADA"?"🟢 Conectado":"🟠 "+connection.estado}</p></div>
      <div><strong>Cuenta Mercado Pago</strong><p>Usuario {connection.mp_user_id}</p></div>
      <div><strong>Ambiente</strong><p>{connection.live_mode?"Producción":"Prueba"}</p></div>
      <div><strong>Vencimiento de credenciales</strong><p>{connection.token_expires_at?new Date(connection.token_expires_at).toLocaleString("es-AR"):"—"}</p></div>
    </div>:<div className="module-alert">Mercado Pago todavía no está conectado para esta empresa.</div>}
    <button className="module-pill" onClick={connect} disabled={connecting}>{connecting?"Abriendo Mercado Pago…":connection?.estado==="CONECTADA"?"Volver a autorizar":"Conectar Mercado Pago"}</button>
    <p className="settings-help">AgroBrokerIA guarda las credenciales de terceros cifradas exclusivamente en el backend y utiliza OAuth para operar en nombre del vendedor.</p>
   </section>
  </section>
 </main>;
}
