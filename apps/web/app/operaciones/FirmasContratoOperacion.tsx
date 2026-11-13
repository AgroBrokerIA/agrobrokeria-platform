"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";

type Copy = {
  id: string;
  rol: "VENDEDOR" | "COMPRADOR";
  version_contrato: number;
  estado: string;
  nombre_archivo: string;
  storage_path: string;
  subido_at: string;
  observaciones: string | null;
};

export default function FirmasContratoOperacion({ operacionId, onWorkflowAdvanced }: { operacionId: string; onWorkflowAdvanced?: () => Promise<void> }) {
  const uploadCounter = useRef(0);
  const [contractId, setContractId] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [contractContent, setContractContent] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Iniciá sesión para gestionar las copias firmadas.");
      const { data: signatureData, error: signatureDataError } = await (supabase.rpc as any)(
        "obtener_datos_firma_contrato",
        { p_operacion_id: operacionId }
      );
      if (signatureDataError) throw signatureDataError;
      if (!signatureData?.contract_id) throw new Error("No se encontró el contrato definitivo confirmado.");
      setIsAdmin(Boolean(signatureData.is_admin));
      setContractId(String(signatureData.contract_id));
      setContractNumber(String(signatureData.contract_number || "Contrato"));
      setContractContent(String(signatureData.contract_content || "").trim());
      setRoles(Array.isArray(signatureData.roles) ? signatureData.roles : []);

      const { data: copyRows, error: copyError } = await supabase.from("contrato_copias_firmadas")
        .select("id,rol,version_contrato,estado,nombre_archivo,storage_path,subido_at,observaciones")
        .eq("contrato_id", String(signatureData.contract_id)).order("version_contrato", { ascending: false }).order("subido_at", { ascending: false });
      if (copyError) throw copyError;
      setCopies((copyRows || []) as Copy[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el estado de las firmas.");
    } finally { setLoading(false); }
  }, [operacionId]);

  useEffect(() => { void load(); }, [load]);

  function downloadContract() {
    if (!contractContent.trim()) { setError("El contrato confirmado no contiene texto guardado. Volvé a abrir la operación y, si persiste, regenerá el PDF desde el contrato definitivo."); return; }
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(contractContent, 180);
    let y = 18;
    for (const line of lines) {
      if (y > 278) { pdf.addPage(); y = 18; }
      pdf.text(line, 15, y);
      y += 5;
    }
    pdf.save(`${contractNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}-para-firma-externa.pdf`);
  }

  async function upload(role: "VENDEDOR" | "COMPRADOR") {
    const file = files[role];
    if (!file) { setError("Seleccioná el PDF firmado antes de cargarlo."); return; }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Solo se admiten copias firmadas en formato PDF."); return;
    }
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
      setError("El PDF debe pesar entre 1 byte y 20 MB."); return;
    }
    setUploading(role); setError(""); setMessage("");
    let path: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("La sesión expiró. Volvé a iniciar sesión.");
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      path = `${operacionId}/contratos/${contractId}/${role}/${auth.user.id}-${file.lastModified}-${file.size}-${++uploadCounter.current}-${safeName}`;
      const { error: storageError } = await supabase.storage.from("documentos-operacion")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (storageError) throw storageError;
      const rpcName = isAdmin
        ? "registrar_copia_firmada_contrato_admin"
        : "registrar_copia_firmada_contrato";
      const { error: rpcError } = await supabase.rpc(rpcName, {
        p_contrato_id: contractId, p_rol: role, p_storage_path: path,
        p_nombre_archivo: file.name, p_sha256: hash
      });
      if (rpcError) throw rpcError;
      setFiles((current) => ({ ...current, [role]: null }));
      setMessage("Copia PDF cargada y registrada. Queda pendiente de revisión administrativa; no se ha aplicado una firma digital.");
      await load();
    } catch (e) {
      if (path) await supabase.storage.from("documentos-operacion").remove([path]);
      setError(e instanceof Error ? e.message : "No se pudo cargar la copia firmada.");
    } finally { setUploading(null); }
  }

  async function openCopy(copy: Copy) {
    if (!isAdmin) { setError("Solo Administración puede abrir las copias para revisión."); return; }
    const { data, error: urlError } = await supabase.storage.from("documentos-operacion").createSignedUrl(copy.storage_path, 300);
    if (urlError || !data?.signedUrl) { setError(urlError?.message || "No se pudo abrir el PDF."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function review(copy: Copy, result: "APROBADA" | "RECHAZADA") {
    let observations: string | null = null;
    if (result === "RECHAZADA") {
      observations = window.prompt("Indicá el motivo del rechazo:")?.trim() || null;
      if (!observations) { setError("El motivo de rechazo es obligatorio."); return; }
    }
    if (!window.confirm(result === "APROBADA" ? "¿Verificaste que esta copia corresponde al contrato y está firmada por la parte indicada?" : "¿Confirmás el rechazo de esta copia?")) return;
    setReviewing(copy.id); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("revisar_copia_firmada_contrato", {
      p_copia_id: copy.id, p_resultado: result, p_observaciones: observations as string
    });
    if (rpcError) {
      setError("No se pudo revisar la copia: " + rpcError.message);
    } else if (result === "RECHAZADA") {
      setMessage("Copia rechazada; la parte deberá cargar una nueva versión.");
      await load();
    } else {
      const { data: versionCopies, error: copiesError } = await supabase.from("contrato_copias_firmadas")
        .select("rol,estado").eq("contrato_id", contractId).eq("version_contrato", copy.version_contrato);
      if (copiesError) {
        setMessage("Copia validada. No se pudo comprobar si ambas partes ya completaron la revisión.");
      } else {
        const sellerApproved = (versionCopies || []).some((item:any)=>item.rol==="VENDEDOR" && item.estado==="APROBADA");
        const buyerApproved = (versionCopies || []).some((item:any)=>item.rol==="COMPRADOR" && item.estado==="APROBADA");
        if (sellerApproved && buyerApproved) {
          const { data: syncResult, error: syncError } = await supabase.rpc("sincronizar_workflow_firmas_contrato", { p_contrato_id: contractId });
          const syncData = typeof syncResult === "object" && syncResult !== null && !Array.isArray(syncResult)
            ? syncResult as Record<string, unknown>
            : null;
          const advanced = syncData?.avanzada === true || syncData?.ya_avanzada === true;
          setMessage(syncError
            ? "Las dos copias están aprobadas, pero no se pudo avanzar el workflow: " + syncError.message
            : advanced
              ? "Las dos copias firmadas fueron aprobadas. La operación avanzó automáticamente a Logística / Entrega."
              : "Las dos copias están aprobadas. El workflow verificó las condiciones y permanece pendiente de otro requisito.");
          if (!syncError && advanced && onWorkflowAdvanced) await onWorkflowAdvanced();
        } else {
          setMessage("Copia validada por Administración. Falta aprobar la copia de la otra parte.");
        }
      }
      await load();
    }
    setReviewing(null);
  }

  if (loading) return <section style={{padding:16,border:"1px solid #dbeafe",borderRadius:12,background:"#fff"}}>Cargando firmas y copias del contrato…</section>;

  return <section style={{display:"grid",gap:14,padding:18,border:"1px solid #bfdbfe",borderRadius:12,background:"#fff"}}>
    <div>
      <h3 style={{margin:"0 0 6px"}}>Firma digital: próximamente</h3>
      <button type="button" onClick={downloadContract} style={{marginTop:8,padding:"9px 13px",border:0,borderRadius:8,background:"#1d4ed8",color:"#fff",fontWeight:700}}>Descargar contrato para firma externa</button>
      <p style={{margin:0,color:"#475569",fontSize:13}}>El contrato se firma fuera de AgroBrokerIA. Cada parte carga aquí su copia PDF firmada. Administración revisa la autenticidad documental y aprueba o rechaza cada archivo. Esta carga no constituye firma digital.</p>
    </div>
    {(["VENDEDOR","COMPRADOR"] as const).map((role) => {
      const copy = copies.find((item) => item.rol === role);
      const canUpload = (roles.includes(role) || isAdmin) && (!copy || copy.estado === "RECHAZADA");
      return <div key={role} style={{padding:13,border:"1px solid #e2e8f0",borderRadius:10,display:"grid",gap:9}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
          <strong>{role === "VENDEDOR" ? "Vendedor / Productor" : "Comprador"}</strong>
          <strong style={{color:copy?.estado==="APROBADA"?"#166534":copy?.estado==="RECHAZADA"?"#b91c1c":"#92400e"}}>{copy?.estado || "PENDIENTE"}</strong>
        </div>
        {copy && <div style={{fontSize:12,color:"#475569"}}>{copy.nombre_archivo} · {new Date(copy.subido_at).toLocaleString("es-AR")}{copy.observaciones ? " · " + copy.observaciones : ""}</div>}
        {canUpload && <div style={{display:"grid",gap:8}}>
          <label style={{fontSize:13}}>{isAdmin ? "Adjuntar PDF recibido de la parte (máximo 20 MB)" : "Seleccionar PDF firmado (máximo 20 MB)"}
            <input type="file" accept="application/pdf,.pdf" onChange={(e)=>setFiles((current)=>({...current,[role]:e.target.files?.[0]||null}))} style={{display:"block",marginTop:6}}/>
          </label>
          <button type="button" disabled={uploading!==null || !files[role]} onClick={()=>void upload(role)} style={{justifySelf:"start",padding:"9px 13px",border:0,borderRadius:8,background:"#0f766e",color:"#fff",fontWeight:700}}>{uploading===role?"Cargando…":(isAdmin?"Registrar PDF recibido — ":"Cargar copia firmada del ")+(role==="VENDEDOR"?"vendedor":"comprador")}</button>
          {isAdmin && <small style={{color:"#64748b"}}>Carga asistida por Administración. El archivo queda pendiente de revisión y aprobación; no equivale a firma digital.</small>}
        </div>}
        {roles.includes(role) && copy?.estado==="PENDIENTE" && <p style={{margin:0,fontSize:12,color:"#92400e"}}>Archivo recibido. Esperando revisión de Administración.</p>}
        {isAdmin && copy && <button type="button" onClick={()=>void openCopy(copy)} style={{justifySelf:"start",padding:"8px 12px",border:"1px solid #94a3b8",borderRadius:8,background:"#fff"}}>Abrir PDF para revisar</button>}
        {isAdmin && copy?.estado==="PENDIENTE" && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button type="button" disabled={reviewing!==null} onClick={()=>void review(copy,"APROBADA")} style={{padding:"8px 12px",border:0,borderRadius:8,background:"#047857",color:"#fff"}}>{reviewing===copy.id?"Procesando…":"Aprobar copia"}</button>
          <button type="button" disabled={reviewing!==null} onClick={()=>void review(copy,"RECHAZADA")} style={{padding:"8px 12px",border:"1px solid #b91c1c",borderRadius:8,background:"#fff",color:"#b91c1c"}}>Rechazar copia</button>
        </div>}
      </div>;
    })}
    {!roles.length && !isAdmin && <p style={{margin:0,color:"#64748b",fontSize:13}}>La empresa activa no figura como vendedor ni comprador de esta operación; por seguridad no puede cargar copias de firma.</p>}
    {message && <p role="status" style={{margin:0,padding:10,background:"#ecfdf5",color:"#166534",borderRadius:8}}>{message}</p>}
    {error && <p role="alert" style={{margin:0,padding:10,background:"#fee2e2",color:"#991b1b",borderRadius:8}}>{error}</p>}
    <button type="button" onClick={()=>void load()} style={{justifySelf:"start",padding:"8px 12px",border:"1px solid #cbd5e1",borderRadius:8,background:"#fff"}}>Actualizar estado de firmas</button>
  </section>;
}
