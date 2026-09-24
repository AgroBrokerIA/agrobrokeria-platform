"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Company={id:string;razon_social:string|null;nombre_comercial:string|null;cuit:string|null;email:string|null;telefono:string|null;pais:string|null;provincia:string|null;ciudad:string|null;estado:string};

export default function EmpresasPage(){
 const [companies,setCompanies]=useState<Company[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{(async()=>{try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Necesitás iniciar sesión.");const {data,error}=await supabase.from("company_users").select("company_id, companies(id,razon_social,nombre_comercial,cuit,email,telefono,pais,provincia,ciudad,estado)").eq("profile_id",user.id).eq("activo",true);if(error)throw new Error(error.message);const rows=(data||[]).map((x:any)=>x.companies).filter(Boolean) as Company[];setCompanies(rows);}catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar las empresas.");}finally{setLoading(false);}})()},[]);
 return <main className="module-page"><div className="module-hero"><div><span className="eyebrow">CUENTA</span><h1>Empresas</h1><p>Empresas vinculadas y datos comerciales de tu cuenta.</p></div><Link href="/configuracion" className="module-pill">← Configuración</Link></div>
 {error&&<div className="module-alert module-alert-error">{error}</div>}
 {loading?<div className="loading-card">Cargando empresas...</div>:companies.length===0?<div className="module-empty"><div className="module-empty-icon">🏢</div><h2>No hay empresas vinculadas</h2><p>Tu usuario todavía no tiene una empresa activa asociada.</p></div>:<div className="company-grid">{companies.map(c=><article key={c.id} className="company-card"><div className="company-card-head"><div className="company-icon">🏢</div><div><h2>{c.nombre_comercial||c.razon_social||"Empresa"}</h2>{c.razon_social&&c.nombre_comercial&&<p>{c.razon_social}</p>}</div><span className="company-status">{c.estado||"—"}</span></div><div className="company-details"><div><span>CUIT</span><strong>{c.cuit||"—"}</strong></div><div><span>Ubicación</span><strong>{[c.ciudad,c.provincia,c.pais].filter(Boolean).join(", ")||"—"}</strong></div><div><span>Email</span><strong>{c.email||"—"}</strong></div><div><span>Teléfono</span><strong>{c.telefono||"—"}</strong></div></div></article>)}</div>}
 </main>;
}