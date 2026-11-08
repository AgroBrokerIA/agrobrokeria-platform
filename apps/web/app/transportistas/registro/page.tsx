"use client";

import { useEffect, useState, type FormEvent, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase/client";

const field: CSSProperties = { width: "100%", height: 44, border: "1px solid #cbd5e1", borderRadius: 9, padding: "9px 12px", boxSizing: "border-box", color: "#0f172a", background: "#fff" };
type PerfilTransportista={nombre_completo:string;verificacion_estado:string;activo:boolean};
type VehiculoRegistrado={id:string;patente:string;tipo:string;capacidad_tn:number|null;habilitado:boolean};

export default function RegistroTransportistaPage() {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [cuit, setCuit] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [patenteCamion,setPatenteCamion]=useState("");
  const [patenteAcoplado,setPatenteAcoplado]=useState("");
  const [capacidadTn,setCapacidadTn]=useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [perfilExistente,setPerfilExistente]=useState<PerfilTransportista|null>(null);
  const [vehiculosExistentes,setVehiculosExistentes]=useState<VehiculoRegistrado[]>([]);
  const [perfilLoading,setPerfilLoading]=useState(true);
  const [nuevoTipo,setNuevoTipo]=useState("CAMION");
  const [nuevaPatente,setNuevaPatente]=useState("");
  const [nuevaCapacidad,setNuevaCapacidad]=useState("");
  const [agregandoVehiculo,setAgregandoVehiculo]=useState(false);
  const [mensajeVehiculo,setMensajeVehiculo]=useState("");

  async function cargarPerfilTransportista(){
    setPerfilLoading(true);
    const {data:userData}=await supabase.auth.getUser();
    if(!userData.user){setPerfilExistente(null);setVehiculosExistentes([]);setPerfilLoading(false);return;}
    const {data:perfil}=await supabase.from("transportistas").select("nombre_completo,verificacion_estado,activo").eq("profile_id",userData.user.id).maybeSingle();
    setPerfilExistente(perfil as PerfilTransportista|null);
    if(perfil){
      const {data:vehiculos,error:vehiculosError}=await supabase.rpc("listar_mis_vehiculos_transportista");
      if(vehiculosError)setMensajeVehiculo("No se pudieron consultar los dominios: "+vehiculosError.message);
      else setVehiculosExistentes((vehiculos||[]) as VehiculoRegistrado[]);
    }
    setPerfilLoading(false);
  }

  useEffect(()=>{void cargarPerfilTransportista();},[ok]);

  async function agregarVehiculo(){
    setMensajeVehiculo("");
    if(nuevaPatente.replace(/[^A-Z0-9]/gi,"").length<6){setMensajeVehiculo("Ingresá una patente válida.");return;}
    setAgregandoVehiculo(true);
    const {error:vehicleError}=await supabase.rpc("registrar_vehiculo_transportista",{p_patente:nuevaPatente,p_tipo:nuevoTipo,p_capacidad_tn:nuevoTipo==="CAMION"&&nuevaCapacidad?Number(nuevaCapacidad):null});
    if(vehicleError)setMensajeVehiculo("No se pudo registrar el dominio: "+vehicleError.message);
    else{
      setMensajeVehiculo("Dominio registrado correctamente.");
      setNuevaPatente("");setNuevaCapacidad("");
      const {data}=await supabase.rpc("listar_mis_vehiculos_transportista");
      setVehiculosExistentes((data||[]) as VehiculoRegistrado[]);
    }
    setAgregandoVehiculo(false);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    if (cuit.replace(/\D/g,"").length!==11) { setError("Ingresá un CUIT válido de 11 dígitos del transportista. Es necesario para emitir Cartas de Porte en ARCA."); return; }
    if (!patenteCamion.trim()) { setError("Registrá la patente del camión para poder recibir asignaciones."); return; }
    if (!foto) {
      setError("Adjuntá una fotografía actual del conductor para la verificación de identidad.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(foto.type)) {
      setError("La fotografía debe estar en formato JPG, PNG o WEBP.");
      return;
    }
    if (documento && documento.type !== "application/pdf" && !documento.type.startsWith("image/")) {
      setError("El DNI debe adjuntarse como imagen o PDF.");
      return;
    }
    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError("Iniciá sesión antes de registrar el perfil de transportista.");
      setLoading(false);
      return;
    }
    const uid = userData.user.id;
    const stamp = Date.now();
    const fotoPath = `transportistas/${uid}/foto/${stamp}-foto.${foto.name.split(".").pop() || "jpg"}`;
    const dniPath = documento ? `transportistas/${uid}/dni/${stamp}-dni.${documento.name.split(".").pop() || "pdf"}` : null;
    const fotoUpload = await supabase.storage.from("agrobroker-private").upload(fotoPath, foto, { contentType: foto.type, upsert: false });
    if (fotoUpload.error) {
      setError("No se pudo cargar la fotografía: " + fotoUpload.error.message);
      setLoading(false);
      return;
    }
    if (documento && dniPath) {
      const dniUpload = await supabase.storage.from("agrobroker-private").upload(dniPath, documento, { contentType: documento.type, upsert: false });
      if (dniUpload.error) {
        await supabase.storage.from("agrobroker-private").remove([fotoPath]);
        setError("No se pudo cargar el DNI: " + dniUpload.error.message);
        setLoading(false);
        return;
      }
    }
    const { error: rpcError } = await supabase.rpc("registrar_transportista", {
      p_nombre: nombre,
      p_dni: dni,
      p_cuit: cuit || null,
      p_empresa: empresa || null,
      p_telefono: telefono || null,
      p_dni_path: dniPath,
      p_foto_path: fotoPath,
    });
    if (rpcError) {
      await supabase.storage.from("agrobroker-private").remove(dniPath ? [fotoPath, dniPath] : [fotoPath]);
      setError("No se pudo registrar el perfil: " + rpcError.message);
    } else {
      const truckResult=await supabase.rpc("registrar_vehiculo_transportista",{p_patente:patenteCamion,p_tipo:"CAMION",p_capacidad_tn:capacidadTn?Number(capacidadTn):null});
      let vehicleError=truckResult.error;
      if(!vehicleError && patenteAcoplado.trim()){
        const trailerResult=await supabase.rpc("registrar_vehiculo_transportista",{p_patente:patenteAcoplado,p_tipo:"ACOPLADO",p_capacidad_tn:null});
        vehicleError=trailerResult.error;
      }
      setOk(true);
      setError(vehicleError?"El perfil se registró, pero no se pudo guardar uno de los dominios: "+vehicleError.message+" . Volvé a cargar el vehículo desde tu perfil o contactá Administración.":"");
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 760, margin: "30px auto", padding: 20, color: "#0f172a" }}>
      <div style={{ border: "1px solid #dbe3ed", borderRadius: 16, padding: 24, background: "#fff", display: "grid", gap: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 850 }}>Registro de transportista</div>
          <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>Creá tu perfil para recibir asignaciones de viajes y actualizar el seguimiento de tus camiones en AgroBrokerIA.</p>
        </div>
        {perfilLoading?<p style={{color:"#64748b"}}>Consultando tu perfil de transportista…</p>:perfilExistente?(
          <section style={{display:"grid",gap:14}}>
            <div style={{padding:15,borderRadius:10,background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
              <strong>Perfil de transportista: {perfilExistente.nombre_completo}</strong>
              <p style={{margin:"6px 0 0",fontSize:13}}>Verificación: {perfilExistente.verificacion_estado} · Estado: {perfilExistente.activo?"Activo":"Inactivo"}</p>
            </div>
            <div style={{display:"grid",gap:8}}>
              <strong>Dominios registrados</strong>
              {vehiculosExistentes.length?vehiculosExistentes.map(v=><div key={v.id} style={{padding:"10px 12px",border:"1px solid #dbe3ed",borderRadius:9,display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                <span><strong>{v.patente}</strong> · {v.tipo==="CAMION"?"Camión":"Acoplado"}{v.capacidad_tn?" · "+v.capacidad_tn+" TN":""}</span>
                <span style={{fontSize:12,color:v.habilitado?"#047857":"#b45309"}}>{v.habilitado?"Habilitado":"Pendiente de habilitación"}</span>
              </div>):<p style={{fontSize:13,color:"#64748b"}}>Todavía no registraste dominios. Agregá el camión y el acoplado que utilizás.</p>}
            </div>
            <div style={{borderTop:"1px solid #e2e8f0",paddingTop:14,display:"grid",gap:10}}>
              <strong>Agregar otro vehículo</strong>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>Tipo
                  <select value={nuevoTipo} onChange={e=>setNuevoTipo(e.target.value)} style={field}><option value="CAMION">Camión</option><option value="ACOPLADO">Acoplado</option></select>
                </label>
                <label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>Patente
                  <input value={nuevaPatente} onChange={e=>setNuevaPatente(e.target.value.toUpperCase())} placeholder="AB123CD" style={field}/>
                </label>
              </div>
              {nuevoTipo==="CAMION"&&<label style={{display:"grid",gap:5,fontSize:13,fontWeight:700}}>Capacidad (TN)
                <input type="number" min="1" step="0.1" value={nuevaCapacidad} onChange={e=>setNuevaCapacidad(e.target.value)} style={field}/>
              </label>}
              {mensajeVehiculo&&<p role="status" style={{fontSize:13,color:mensajeVehiculo.startsWith("No se")?"#b91c1c":"#047857",margin:0}}>{mensajeVehiculo}</p>}
              <button type="button" disabled={agregandoVehiculo} onClick={()=>void agregarVehiculo()} style={{height:43,border:0,borderRadius:9,background:"#078b58",color:"#fff",fontWeight:800}}>{agregandoVehiculo?"Guardando dominio…":"Agregar dominio al perfil"}</button>
            </div>
          </section>
        ):ok?(
          <div role="status" style={{ padding: 16, borderRadius: 10, background: "#ecfdf5", color: "#166534", border: "1px solid #a7f3d0" }}>
            <strong>Solicitud enviada.</strong>
            <p style={{ marginBottom: 0 }}>Tu perfil y los dominios registrados quedaron pendientes de verificación por AgroBrokerIA. Hasta que se verifique no podrás recibir asignaciones de viajes.</p>
            {error&&<p style={{marginBottom:0,color:"#92400e"}}>{error}</p>}
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: "grid", gap: 13 }}>
            <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Nombre y apellido
              <input required value={nombre} onChange={e => setNombre(e.target.value)} style={field} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>DNI
                <input required inputMode="numeric" value={dni} onChange={e => setDni(e.target.value)} style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>CUIT del transportista (obligatorio)
                <input required inputMode="numeric" maxLength={13} value={cuit} onChange={e => setCuit(e.target.value)} placeholder="20-12345678-9" style={field} />
                <small style={{color:"#64748b",fontWeight:400}}>Se utilizará para completar automáticamente los datos de transporte de la Carta de Porte.</small>
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Empresa de transporte (opcional)
                <input value={empresa} onChange={e => setEmpresa(e.target.value)} style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Teléfono
                <input value={telefono} onChange={e => setTelefono(e.target.value)} style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Patente del camión (obligatoria)
                <input required value={patenteCamion} onChange={e=>setPatenteCamion(e.target.value.toUpperCase())} placeholder="Ej. AB123CD" style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Patente del acoplado (opcional)
                <input value={patenteAcoplado} onChange={e=>setPatenteAcoplado(e.target.value.toUpperCase())} placeholder="Ej. AC123EF" style={field} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Capacidad del camión (TN)
                <input type="number" min="1" step="0.1" value={capacidadTn} onChange={e=>setCapacidadTn(e.target.value)} style={field} />
              </label>
            </div>
            <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>Fotografía actual del conductor
              <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFoto(e.target.files?.[0] || null)} />
              <span style={{ color: "#64748b", fontSize: 11, fontWeight: 400 }}>La fotografía podrá ser consultada por los participantes autorizados de los viajes que te asignen.</span>
            </label>
            <label style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 700 }}>DNI — imagen o PDF
              <input type="file" accept="image/*,application/pdf" onChange={e => setDocumento(e.target.files?.[0] || null)} />
              <span style={{ color: "#64748b", fontSize: 11, fontWeight: 400 }}>El documento será privado: solo vos y Administración podrán abrir el archivo completo.</span>
            </label>
            <div style={{ background: "#f8fafc", borderRadius: 9, padding: 12, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
              Los documentos se guardan en almacenamiento privado. Los vendedores, productores y compradores podrán comprobar tu fotografía y estado de verificación, pero no tendrán acceso a la imagen completa del DNI.
            </div>
            {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
            <button disabled={loading} type="submit" style={{ height: 45, border: 0, borderRadius: 9, background: "#078b58", color: "#fff", fontWeight: 800, cursor: "pointer" }}>{loading ? "Enviando solicitud…" : "Registrar perfil de transportista"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
