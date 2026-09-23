"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Company={id:string;razon_social:string|null;nombre_comercial:string|null;cuit:string|null;email:string|null;telefono:string|null;pais:string|null;provincia:string|null;ciudad:string|null;estado:string};

export default function EmpresasPage(){
 const [companies,setCompanies]=useState<Company[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{(async()=>{try{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Necesitás iniciar sesión.");const {data,error}=await supabase.from("company_users").select("company_id, companies(id,razon_social,nombre_comercial,cuit,email,telefono,pais,provincia,ciudad,estado)").eq("profile_id",user.id).eq("activo",true);if(error)throw new Error(error.message);const rows=(data||[]).map((x:any)=>x.companies).filter(Boolean) as Company[];setCompanies(rows);}catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar las empresas.");}finally{setLoading(false);}})()},[]);
 return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-6xl space-y-6">
  <header className="flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Empresas</h1><p className="text-slate-600">Empresas vinculadas a tu usuario.</p></div><Link href="/configuracion" className="rounded-xl border bg-white px-4 py-3 font-semibold">Volver a configuración</Link></header>
  {error&&<div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}
  {loading?<div className="rounded-2xl bg-white p-8">Cargando empresas...</div>:companies.length===0?<div className="rounded-2xl bg-white p-10 text-center"><h2 className="text-xl font-bold">No hay empresas vinculadas</h2><p className="mt-2 text-slate-500">Tu usuario todavía no tiene una empresa activa asociada.</p></div>:<div className="grid gap-4 md:grid-cols-2">{companies.map(c=><article key={c.id} className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{c.nombre_comercial||c.razon_social||"Empresa"}</h2>{c.razon_social&&c.nombre_comercial&&<p className="text-slate-500">{c.razon_social}</p>}<div className="mt-4 space-y-2 text-sm"><div><b>CUIT:</b> {c.cuit||"—"}</div><div><b>Ubicación:</b> {[c.ciudad,c.provincia,c.pais].filter(Boolean).join(", ")||"—"}</div><div><b>Email:</b> {c.email||"—"}</div><div><b>Teléfono:</b> {c.telefono||"—"}</div><div><b>Estado:</b> {c.estado||"—"}</div></div></article>)}</div>}
 </div></main>;
}