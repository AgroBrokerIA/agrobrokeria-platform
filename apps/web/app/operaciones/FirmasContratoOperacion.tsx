"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Copy = {
  id: string;
  rol: "VENDEDOR" | "COMPRADOR";
  estado: string;
  nombre_archivo: string;
  subido_at: string;
  observaciones: string | null;
};

export default function FirmasContratoOperacion({ operacionId }: { operacionId: string }) {
  const [contractId, setContractId] = useState("");
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
      const [{ data: profile }, { data: admin }] = await Promise.all([
        supabase.from("profiles").select("active_company_id").eq("id", auth.user.id).maybeSingle(),
        supabase.from("platform_admins").select("user_id").eq("user_id", auth.user.id).maybeSingle()
      ]);
      setIsAdmin(Boolean(admin));
      const { data: contract, error: contractError } = await supabase
        .from("contratos").select("id").eq("operacion_id", operacionId)
        .eq("estado", "CONFIRMADO").order("confirmado_at", { ascending: false }).limit(1).maybeSingle();
      if (contractError) throw contractError;
      if (!contract?.id) throw new Error("Todavía no existe un contrato definitivo confirmado para esta operación.");
      setContractId(contract.id);

      let companyIds: string[] = [];
      if (profile?.active_company_id) {
        const { data: mapped } = await supabase.from("company_empresa_map")
          .select("empresa_id").eq("company_id", profile.active_company_id);
        companyIds = (mapped || []).map((x: any) => x.empresa_id);
        companyIds.push(profile.active_company_id);
      }
      let participantRows: any[] = [];
      if (companyIds.length) {
        const { data, error: participantError } = await supabase.from("operacion_participantes")
          .select("empresa_id,rol").eq("operacion_id", operacionId).in("empresa_id", [...new Set(companyIds)]);
        if (participantError) throw participantError;
        participantRows = data || [];
      }
      const allowed = participantRows.map((p) => {
        const role = String(p.rol || "").toUpperCase();
        if (["VENDEDOR", "PRODUCTOR", "SELLER"].includes(role)) return "VENDEDOR";
        if (["COMPRADOR", "BUYER"].includes(role)) return "COMPRADOR";
        return "";
      }).filter(Boolean);
      setRoles([...new Set(allowed)]);

      const { data: copyRows, error: copyError } = await supabase.from("contrato_copias_firmadas")
        .select("id,rol,estado,nombre_archivo,subido_at,observaciones")
        .eq("contrato_id", contract.id).order("subido_at", { ascending: true });
      if (copyError) throw copyError;
      setCopies((copyRows || []) as Copy[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el estado de las firmas.");
    } finally { setLoading(false); }
  }, [operacionId]);

  useEffect(() => { void load(); }, [load]);

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
      path = `${operacionId}/contratos/${contractId}/${role}/${auth.user.id}-${Date.now()}-${safeName}`;
      const { error: storageError } = await supabase.storage.from("documentos-operacion")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (storageError) throw storageError;
      const { error: rpcError } = await supabase.rpc("registrar_copia_firmada_contrato", {
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

  async function review(copy: Copy, result: "APROBADA" | "RECHAZADA") {
    let observations: string | null = null;
    if (result === "RECHAZADA") {
      observations = window.prompt("Indicá el motivo del rechazo:")?.trim() || null;
      if (!observations) { setError("El motivo de rechazo es obligatorio."); return; }
    }
    if (!window.confirm(result === "APROBADA" ? "¿Verificaste que esta copia corresponde al contrato y está firmada por la parte indicada?" : "¿Confirmás el rechazo de esta copia?")) return;
    setReviewing(copy.id); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("revisar_copia_firmada_contrato", {
      p_copia_id: copy.id, p_resultado: result, p_observaciones: observations
    });
    if (rpcError) setError("No se pudo revisar la copia: " + rpcError.message);
    else { setMessage(result === "APROBADA" ? "Copia validada por Administración." : "Copia rechazada; la parte deberá cargar una nueva versión."); await load(); }
    setReviewing(null);
  }

  if (loading) return <section style={{padding:16,border:"1px solid #dbeafe",borderRadius:12,background:"#fff"}}>Cargando firmas y copias del contrato…</section>;

  return <section style={{display:"grid",gap:14,padding:18,border:"1px solid #bfdbfe",borderRadius:12,background:"#fff"}}>
    <div>
      <h3 style={{margin:"0 0 6px"}}>Firma digital: próximamente</h3>
      <p style={{margin:0,color:"#475569",fontSize:13}}>El contrato se firma fuera de AgroBrokerIA. Cada parte carga aquí su copia PDF firmada. Administración revisa la autenticidad documental y aprueba o rechaza cada archivo. Esta carga no constituye firma digital.</p>
    </div>
    {(["VENDEDOR","COMPRADOR"] as const).map((role) => {
      const copy = copies.find((item) => item.rol === role);
      const canUpload = roles.includes(role) && (!copy || copy.estado === "RECHAZADA");
      return <div key={role} style={{padding:13,border:"1px solid #e2e8f0",borderRadius:10,display:"grid",gap:9}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
          <strong>{role === "VENDEDOR" ? "Vendedor / Productor" : "Comprador"}</strong>
          <strong style={{color:copy?.estado==="APROBADA"?"#166534":copy?.estado==="RECHAZADA"?"#b91c1c":"#92400e"}}>{copy?.estado || "PENDIENTE"}</strong>
        </div>
        {copy && <div style={{fontSize:12,color:"#475569"}}>{copy.nombre_archivo} · {new Date(copy.subido_at).toLocaleString("es-AR")}{copy.observaciones ? " · " + copy.observaciones : ""}</div>}
        {canUpload && <div style={{display:"grid",gap:8}}>
          <label style={{fontSize:13}}>Seleccionar PDF firmado (máximo 20 MB)
            <input type="file" accept="application/pdf,.pdf" onChange={(e)=>setFiles((current)=>({...current,[role]:e.target.files?.[0]||null}))} style={{display:"block",marginTop:6}}/>
          </label>
          <button type="button" disabled={uploading!==null || !files[role]} onClick={()=>void upload(role)} style={{justifySelf:"start",padding:"9px 13px",border:0,borderRadius:8,background:"#0f766e",color:"#fff",fontWeight:700}}>{uploading===role?"Cargando…":"Cargar copia firmada del "+(role==="VENDEDOR"?"vendedor":"comprador")}</button>
        </div>}
        {roles.includes(role) && copy?.estado==="PENDIENTE" && <p style={{margin:0,fontSize:12,color:"#92400e"}}>Archivo recibido. Esperando revisión de Administración.</p>}
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
