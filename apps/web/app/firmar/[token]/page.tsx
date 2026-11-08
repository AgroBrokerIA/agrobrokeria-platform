export default function FirmaDeshabilitadaPage(){
  return (
    <main style={{maxWidth:760,margin:"48px auto",padding:24,fontFamily:"system-ui",color:"#172033"}}>
      <section style={{border:"1px solid #dbe3ed",borderRadius:16,padding:24,background:"#fff"}}>
        <p style={{fontSize:12,fontWeight:800,color:"#64748b",letterSpacing:1}}>AGROBROKERIA · DOCUMENTACIÓN</p>
        <h1 style={{fontSize:28,fontWeight:850}}>Firma digital integrada: próximamente</h1>
        <p>La firma electrónica dentro de AgroBrokerIA está deshabilitada. Para completar el contrato, descargá el PDF, hacelo firmar fuera de la plataforma y cargá las copias firmadas del vendedor y del comprador desde la pestaña <strong>Firmas</strong> del contrato.</p>
        <a href="/contratos" style={{display:"inline-block",marginTop:14,padding:"11px 16px",borderRadius:9,background:"#078b58",color:"#fff",fontWeight:800,textDecoration:"none"}}>Ir a Contratos</a>
      </section>
    </main>
  );
}
