"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Check={ok:boolean;detail?:string}; type Result={ok:boolean;launchReady:boolean;checks:Record<string,Check>;duration_ms:number};
export default function AdminPage(){
 const [result,setResult]=useState<Result|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function run(){setLoading(true);setError("");try{const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error("Sesión no válida.");const r=await fetch("/api/health/launch",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"No autorizado.");setResult(d)}catch(e){setError(e instanceof Error?e.message:"No se pudo ejecutar el preflight.")}finally{setLoading(false)}}
 useEffect(()=>{void run()},[]);
 return <main className="module-page"><div className="module-hero"><div><span className="eyebrow">CONTROL DE LANZAMIENTO</span><h1>Administración</h1><p>Preflight técnico y operativo de AgroBrokerIA. Los controles consultan el estado real del sistema.</p></div><button className="module-pill" onClick={()=>void run()} disabled={loading}>{loading?"Verificando…":"Ejecutar preflight"}</button></div>
 {error&&<div className="module-alert error">{error}</div>}
 {result&&<><div className="document-summary"><div><strong>{result.launchReady?"LISTO":"PENDIENTE"}</strong><span>Estado de lanzamiento</span></div><div><strong>{Object.values(result.checks).filter(x=>x.ok).length}</strong><span>Controles correctos</span></div><div><strong>{Object.values(result.checks).filter(x=>!x.ok).length}</strong><span>Controles pendientes</span></div></div>
 <section className="document-section"><div className="document-section-head"><div><h2>Preflight</h2><p>Los pendientes externos quedan identificados sin simular credenciales ni respuestas.</p></div></div><div className="admin-check-grid">{Object.entries(result.checks).map(([key,c])=><div className="admin-check" key={key}><span className={c.ok?"admin-dot ok":"admin-dot pending"}></span><div><strong>{key.replaceAll("_"," ")}</strong><p>{c.detail|| (c.ok?"Correcto":"Pendiente")}</p></div></div>)}</div></section></>}
 <div className="module-links"><Link href="/configuracion">Configuración →</Link><Link href="/reportes">Reportes →</Link><Link href="/ayuda">Ayuda →</Link></div></main>
}