import Link from "next/link";

export default function OfflinePage() {
  return (
    <main style={{minHeight:"70vh",display:"grid",placeItems:"center",padding:"2rem"}}>
      <section style={{maxWidth:520,textAlign:"center",padding:"2rem",borderRadius:20,background:"var(--card, #fff)",boxShadow:"0 12px 40px rgba(0,0,0,.08)"}}>
        <div style={{fontSize:44,marginBottom:12}} aria-hidden="true">🌾</div>
        <h1 style={{fontSize:"1.8rem",marginBottom:12}}>Estás sin conexión</h1>
        <p style={{lineHeight:1.6,marginBottom:20}}>AgroBrokerIA necesita conexión a internet para consultar ofertas, cotizaciones, operaciones y contratos. Volvé a conectarte e intentá nuevamente.</p>
        <Link href="/" style={{display:"inline-block",padding:"12px 18px",borderRadius:10,background:"#173f2b",color:"#fff",textDecoration:"none",fontWeight:600}}>Reintentar</Link>
      </section>
    </main>
  );
}
