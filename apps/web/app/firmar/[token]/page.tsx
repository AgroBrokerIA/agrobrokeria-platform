"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";

type RequestData={documento_nombre:string;documento_tipo:string;documento_contenido:string;documento_hash:string;firmante_nombre:string;firmante_email:string;firmante_rol:string;expira_at:string};

export default function FirmarPage(){
 const params=useParams<{token:string}>(); const token=params.token;
 const [data,setData]=useState<RequestData|null>(null); const [nombre,setNombre]=useState(""); const [declaracion,setDeclaracion]=useState("Declaro que revisé el documento, comprendo su contenido y presto mi consentimiento expreso para firmarlo electrónicamente."); const [consent,setConsent]=useState(false); const [loading,setLoading]=useState(true); const [sending,setSending]=useState(false); const [error,setError]=useState(""); const [ok,setOk]=useState(false);
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 useEffect(()=>{if(!token||!base)return; (async()=>{try{const r=await fetch(base+"/functions/v1/firmar-documento?token="+encodeURIComponent(token),{cache:"no-store"});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"Solicitud no válida");setData(j.data);setNombre(j.data.firmante_nombre)}catch(e){setError(e instanceof Error?e.message:"No se pudo cargar la solicitud")}finally{setLoading(false)}})()},[token,base]);
 async function firmar(){setSending(true);setError("");try{const r=await fetch(base+"/functions/v1/firmar-documento?token="+encodeURIComponent(token),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({nombre,consentimiento:consent,declaracion})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||"No se pudo firmar");setOk(true)}catch(e){setError(e instanceof Error?e.message:"No se pudo firmar")}finally{setSending(false)}}
 if(loading)return <meta name="referrer" content="no-referrer" />
      <main style={{maxWidth:900,margin:"40px auto",padding:20}}>Cargando documento…</main>;
 if(error)return <main style={{maxWidth:900,margin:"40px auto",padding:20}}><h1>No se puede firmar</h1><p>{error}</p></main>;
 if(ok)return <main style={{maxWidth:900,margin:"40px auto",padding:20}}><h1>Firma registrada</h1><p>La firma electrónica quedó registrada junto con la evidencia técnica y la huella del documento.</p></main>;
 return <main style={{maxWidth:1000,margin:"24px auto",padding:20,fontFamily:"system-ui"}}>
  <div style={{border:"1px solid #e2e8f0",borderRadius:16,padding:24}}>
   <div style={{fontSize:12,fontWeight:800,color:"#64748b"}}>AGROBROKER IA · FIRMA ELECTRÓNICA</div>
   <h1>{data?.documento_nombre}</h1>
   <p><b>Firmante:</b> {data?.firmante_nombre} · {data?.firmante_email}</p>
   <p><b>Rol:</b> {data?.firmante_rol} · <b>Vencimiento:</b> {new Date(data!.expira_at).toLocaleString("es-AR")}</p>
   <div style={{whiteSpace:"pre-wrap",background:"#f8fafc",padding:20,borderRadius:12,maxHeight:420,overflow:"auto",border:"1px solid #e2e8f0"}}>{data?.documento_contenido}</div>
   <p style={{fontSize:12,color:"#64748b",wordBreak:"break-all"}}>Hash SHA-256 del documento: {data?.documento_hash}</p>
   <label style={{display:"block",marginTop:18,fontWeight:700}}>Nombre para firmar<input value={nombre} onChange={e=>setNombre(e.target.value)} style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:12,borderRadius:8,border:"1px solid #cbd5e1"}}/></label>
   <label style={{display:"block",marginTop:18,fontWeight:700}}>Declaración de consentimiento<textarea value={declaracion} onChange={e=>setDeclaracion(e.target.value)} rows={4} style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:6,padding:12,borderRadius:8,border:"1px solid #cbd5e1"}}/></label>
   <label style={{display:"flex",gap:10,marginTop:16,alignItems:"flex-start"}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Confirmo que soy la persona indicada, revisé el documento y acepto que esta acción constituya mi firma electrónica y que se genere evidencia de la operación.</span></label>
   {error&&<p style={{background:"#fee2e2",padding:12,borderRadius:8}}>{error}</p>}
   <button disabled={sending||!consent||!nombre.trim()} onClick={firmar} style={{marginTop:18,padding:"13px 20px",border:0,borderRadius:9,background:"#0f172a",color:"#fff",fontWeight:800}}>{sending?"Firmando…":"Firmar electrónicamente"}</button>
  </div>
 </main>
}