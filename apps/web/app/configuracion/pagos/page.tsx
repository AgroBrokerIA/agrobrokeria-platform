"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase/client";

type Account={id:string;bank_name:string;account_holder:string;holder_tax_id:string|null;account_type:string|null;currency:string;cbu:string;alias:string|null;notes:string|null;active:boolean};
const input:React.CSSProperties={width:"100%",padding:"11px 12px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff",color:"#142b3e"};
const button:React.CSSProperties={border:0,borderRadius:8,padding:"11px 15px",background:"#087f5b",color:"#fff",fontWeight:800,cursor:"pointer"};
const field=(label:string,control:React.ReactNode)=><label style={{display:"grid",gap:6,fontSize:12,fontWeight:700,color:"#34495e"}}>{label}{control}</label>;

export default function PagosConfigPage(){
 const[admin,setAdmin]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[accounts,setAccounts]=useState<Account[]>([]),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const[bank,setBank]=useState(""),[holder,setHolder]=useState(""),[taxId,setTaxId]=useState(""),[kind,setKind]=useState("Cuenta corriente"),[currency,setCurrency]=useState("ARS"),[cbu,setCbu]=useState(""),[alias,setAlias]=useState(""),[notes,setNotes]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();if(authError||!user)throw new Error("Iniciá sesión.");
   const {data:flag,error:flagError}=await supabase.rpc("es_administrador_plataforma");if(flagError)throw flagError;
   const isAdmin=flag===true;setAdmin(isAdmin);
   if(!isAdmin)throw new Error("Acceso exclusivo para Administración.");
   const {data,error:e}=await supabase.from("platform_payment_accounts").select("id,bank_name,account_holder,holder_tax_id,account_type,currency,cbu,alias,notes,active").order("created_at",{ascending:false});
   if(e)throw e;setAccounts((data||[]) as Account[]);
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cargar la configuración.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function addAccount(e:React.FormEvent){
  e.preventDefault();setError("");setNotice("");
  const cleanCbu=cbu.replace(/\s/g,"");
  if(!bank.trim()||!holder.trim()||!cleanCbu||cleanCbu.length<10){setError("Completá banco, titular y un CBU/IBAN válido.");return;}
  setSaving(true);
  try{
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error("Sesión vencida.");
   const {error:e}=await supabase.from("platform_payment_accounts").insert({bank_name:bank.trim(),account_holder:holder.trim(),holder_tax_id:taxId.replace(/\D/g,"")||null,account_type:kind,currency,cbu:cleanCbu,alias:alias.trim()||null,notes:notes.trim()||"Pendiente de verificación documental",active:false,created_by:user.id});
   if(e)throw e;
   setBank("");setHolder("");setTaxId("");setCbu("");setAlias("");setNotes("");setNotice("Cuenta registrada como INACTIVA. Antes de habilitarla, Administración debe comprobar titularidad y CBU con documentación bancaria.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar la cuenta.");}
  finally{setSaving(false);}
 }
 async function setActive(a:Account,active:boolean){
  const confirmation=active?"Confirmo que verifiqué documentalmente la titularidad y el CBU de esta cuenta.":"Desactivar esta cuenta para nuevos pagos?";
  if(!window.confirm(confirmation))return;
  setSaving(true);setError("");setNotice("");
  try{
   const {error:e}=await supabase.from("platform_payment_accounts").update({active}).eq("id",a.id);if(e)throw e;
   setNotice(active?"Cuenta activada tras confirmación administrativa.":"Cuenta desactivada.");await load();
  }catch(e){setError(e instanceof Error?e.message:"No se pudo cambiar el estado.");}
  finally{setSaving(false);}
 }
 return <main className="module-page" style={{maxWidth:1180,margin:"0 auto"}}>
  <div className="module-hero"><div><span className="eyebrow">PAGOS</span><h1>Configuración de cobros de AgroBrokerIA</h1><p>AgroBrokerIA utiliza transferencias bancarias como único medio de pago.</p></div><Link className="module-pill" href="/medios-cobro">← Volver a Métodos de pago</Link></div>
  {error&&<div role="alert" style={{padding:12,margin:"12px 0",borderRadius:8,background:"#fff1f2",color:"#9f1239"}}>{error}</div>}
  {notice&&<div role="status" style={{padding:12,margin:"12px 0",borderRadius:8,background:"#ecfdf5",color:"#065f46"}}>{notice}</div>}
  {loading?<p>Cargando configuración…</p>:!admin?<section className="company-card">Esta sección es exclusiva de Administración.</section>:<>
   <section className="company-card" style={{marginBottom:16}}><h2>Cuentas bancarias oficiales · AgroBrokerIA y AgroComercio Santa Fe</h2><p>Registrá por separado la cuenta receptora de comisiones de AgroBrokerIA y la cuenta de AgroComercio Santa Fe destinada a pagos logísticos. No reutilices una cuenta para ambos circuitos salvo que Administración haya verificado expresamente su titularidad y uso. Toda cuenta nueva queda inactiva hasta comprobar titularidad, CUIT y CBU con documentación bancaria.</p>
    <form onSubmit={addAccount} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:14}}>
     {field("Banco",<input style={input} value={bank} onChange={e=>setBank(e.target.value)} placeholder="Banco / entidad financiera" required/>)}
     {field("Titular exacto",<input style={input} value={holder} onChange={e=>setHolder(e.target.value)} placeholder="AgroComercio Santa Fe" required/>)}
     {field("CUIT del titular",<input style={input} value={taxId} onChange={e=>setTaxId(e.target.value)} placeholder="CUIT sin guiones"/>)}
     {field("Tipo de cuenta",<select style={input} value={kind} onChange={e=>setKind(e.target.value)}><option>Cuenta corriente</option><option>Caja de ahorro</option><option>Cuenta especial</option></select>)}
     {field("Moneda",<select style={input} value={currency} onChange={e=>setCurrency(e.target.value)}><option value="ARS">ARS</option><option value="USD">USD</option></select>)}
     {field("CBU / IBAN",<input style={input} value={cbu} onChange={e=>setCbu(e.target.value)} placeholder="Ingresar sin espacios" required/>)}
     {field("Alias",<input style={input} value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Alias bancario"/>)}
     {field("Notas de verificación",<input style={input} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Documentación revisada / pendiente"/>)}
     <div style={{gridColumn:"1/-1",display:"flex",justifyContent:"flex-end"}}><button style={button} disabled={saving}>{saving?"Guardando…":"Registrar cuenta inactiva"}</button></div>
    </form>
   </section>
   <section className="company-card"><h2>Registro de cuentas ({accounts.length})</h2>{accounts.length===0?<p>No hay cuentas oficiales cargadas. No se mostrarán datos bancarios ficticios ni se habilitarán transferencias.</p>:<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}><thead><tr>{["Banco / Titular","CUIT","CBU / Alias","Moneda","Estado","Acción"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #dbe4eb"}}>{x}</th>)}</tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td style={{padding:9,borderBottom:"1px solid #edf2f5"}}><b>{a.bank_name}</b><small style={{display:"block"}}>{a.account_holder}</small></td><td style={{padding:9,borderBottom:"1px solid #edf2f5"}}>{a.holder_tax_id||"—"}</td><td style={{padding:9,borderBottom:"1px solid #edf2f5"}}>{a.cbu}<small style={{display:"block"}}>{a.alias||"—"}</small></td><td style={{padding:9,borderBottom:"1px solid #edf2f5"}}>{a.currency}</td><td style={{padding:9,borderBottom:"1px solid #edf2f5",fontWeight:800,color:a.active?"#087f5b":"#b45309"}}>{a.active?"ACTIVA":"INACTIVA"}</td><td style={{padding:9,borderBottom:"1px solid #edf2f5"}}><button type="button" disabled={saving} style={{...button,background:a.active?"#b91c1c":"#087f5b"}} onClick={()=>void setActive(a,!a.active)}>{a.active?"Desactivar":"Activar tras verificar"}</button></td></tr>)}</tbody></table></div>}</section>
  </>}
  <section className="company-card" style={{marginTop:16}}><h2>Retención de comisión AgroBrokerIA</h2><p>Luego del acuerdo comercial, la comisión de plataforma se abona por transferencia bancaria. Una vez verificado el ingreso, queda retenida y no se libera hasta que la operación y el contrato estén cerrados.</p><p>La liberación se registra al cierre de la operación. Los pagos se concilian mediante comprobante y validación administrativa.</p></section>
 </main>;
}
