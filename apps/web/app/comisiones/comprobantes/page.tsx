"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Pago = {
  id: string; operacion_comision_id: string; operacion_id: string; pagador_profile_id: string;
  importe_declarado: number; moneda_id: number; fecha_transferencia: string | null;
  referencia_transferencia: string | null; archivo_path: string; archivo_nombre: string;
  archivo_mime: string; estado: string; importe_confirmado: number; motivo_rechazo: string | null;
  creado_en: string; revisor_profile_id: string | null;
};
type Comision = { id: string; operacion_id: string; concepto: string; saldo_pendiente: number; moneda_id: number; profile_id: string | null; estado: string; empresa_id: string | null };
const fmt = (n: number, currency: string) => new Intl.NumberFormat("es-AR", {style:"currency",currency: currency === "USD" ? "USD" : "ARS",maximumFractionDigits:2}).format(Number(n || 0));
const date = (v: string | null) => v ? new Date(v).toLocaleString("es-AR") : "—";
const allowed = ["application/pdf","image/jpeg","image/png","image/webp"];
const maxBytes = 10 * 1024 * 1024;

export default function ComprobantesComisionesPage() {
  const [userId, setUserId] = useState("");
  const [isReviewer, setIsReviewer] = useState(false);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [commissions, setCommissions] = useState<Comision[]>([]);
  const [selectedCommission, setSelectedCommission] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [currencies, setCurrencies] = useState<Record<number,string>>({});
  const [transferDate, setTransferDate] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Pago | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [audit, setAudit] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("Iniciá sesión para gestionar comprobantes."); setLoading(false); return; }
    setUserId(user.id);
    const reviewer = await supabase.from("comision_comprobante_revisores").select("profile_id").eq("profile_id", user.id).eq("activo", true).maybeSingle();
    setIsReviewer(Boolean(reviewer.data?.profile_id));
    const [paymentsResult, commissionsResult] = await Promise.all([
      supabase.from("comision_pagos").select("*").order("creado_en", { ascending: false }).limit(100),
      supabase.from("operacion_comisiones").select("id,operacion_id,concepto,saldo_pendiente,moneda_id,profile_id,estado,empresa_id")
        .gt("saldo_pendiente", 0).limit(200)
    ]);
    if (paymentsResult.error) setError("No se pudieron cargar los pagos. Verificá que la migración esté instalada en Preview.");
    else setPayments((paymentsResult.data || []) as Pago[]);
    if (!commissionsResult.error) setCommissions((commissionsResult.data || []) as Comision[]);
    const currencyResult = await supabase.from("monedas").select("id,codigo");
    if (!currencyResult.error) setCurrencies(Object.fromEntries((currencyResult.data || []).map((m: {id:number;codigo:string}) => [m.id, m.codigo])));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function uploadProof(e: React.FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (!file || !selectedCommission || !amount) { setError("Seleccioná una comisión, el archivo y el importe."); return; }
    if (!allowed.includes(file.type) || file.size <= 0 || file.size > maxBytes) { setError("Archivo no permitido. Usá PDF, JPG, PNG o WEBP de hasta 10 MB."); return; }
    const commission = commissions.find(c => c.id === selectedCommission);
    const value = Number(amount);
    if (!commission || !Number.isFinite(value) || value <= 0) { setError("El importe debe ser mayor que cero y corresponder a una comisión válida."); return; }
    if (value > Number(commission.saldo_pendiente)) { setError("El importe supera el saldo pendiente de la comisión."); return; }
    setBusy(true);
    try {
      const paymentId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "comprobante";
      const path = paymentId + "/" + userId + "/" + safeName;
      const { error: insertError } = await supabase.from("comision_pagos").insert({
        id: paymentId, operacion_comision_id: commission.id, operacion_id: commission.operacion_id,
        pagador_profile_id: userId, pagador_empresa_id: null, importe_declarado: value, moneda_id: commission.moneda_id,
        fecha_transferencia: transferDate || null, referencia_transferencia: reference.trim() || null,
        archivo_path: path, archivo_nombre: safeName, archivo_mime: file.type, archivo_bytes: file.size,
        estado: "COMPROBANTE_SUBIDO", importe_confirmado: 0
      });
      if (insertError) throw insertError;
      const { error: storageError } = await supabase.storage.from("comprobantes-comisiones").upload(path, file, {contentType:file.type, upsert:false});
      if (storageError) {
        throw new Error("No se pudo guardar el archivo privado. El registro quedó sin acreditar y requiere limpieza administrativa; no vuelvas a enviarlo hasta que se revise.");
      }
      const { error: finalizeError } = await supabase.rpc("confirmar_subida_comprobante", { p_pago_id: paymentId });
      if (finalizeError) throw finalizeError;
      setFile(null); setAmount(""); setReference(""); setTransferDate("");
      setNotice("Comprobante enviado. La comisión sigue pendiente hasta que administración confirme el ingreso bancario.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el comprobante.");
    } finally { setBusy(false); }
  }

  async function openProof(payment: Pago) {
    setError(""); setNotice(""); setSelected(payment); setPreviewUrl("");
    const { data, error: signedError } = await supabase.storage.from("comprobantes-comisiones").createSignedUrl(payment.archivo_path, 60);
    if (signedError || !data?.signedUrl) { setError("No se pudo abrir el comprobante. Revisá tus permisos."); return; }
    setPreviewUrl(data.signedUrl);
    const { data: auditRows } = await supabase.from("comision_pagos_auditoria").select("*").eq("pago_id", payment.id).order("creado_en", {ascending:false}).limit(50);
    setAudit((auditRows || []) as Record<string, unknown>[]);
  }

  async function review(payment: Pago, action: "PAGADO"|"RECHAZADO"|"EN_REVISION"|"PAGO_PARCIAL") {
    setError(""); setNotice("");
    if (!isReviewer) { setError("No tenés permisos para revisar pagos."); return; }
    const reasonText = reason.trim();
    if (action === "RECHAZADO" && !reasonText) { setError("Indicá el motivo del rechazo."); return; }
    let confirmed = Number(payment.importe_declarado);
    if (action === "PAGO_PARCIAL") {
      const input = window.prompt("Ingresá el importe efectivamente acreditado, no el declarado:");
      confirmed = Number(input);
      if (!Number.isFinite(confirmed) || confirmed <= 0 || confirmed >= Number(payment.importe_declarado)) { setError("El importe parcial debe ser mayor que cero y menor que el declarado."); return; }
    }
    if (action === "PAGADO") {
      if (!window.confirm("Confirmás que verificaste el ingreso real del dinero en la cuenta bancaria? Esta acción registra el importe como recibido.")) return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.rpc("revisar_pago_comision", { p_pago_id: payment.id, p_accion: action, p_importe_confirmado: action === "PAGADO" || action === "PAGO_PARCIAL" ? confirmed : null, p_motivo: action === "RECHAZADO" ? reasonText : null });
      if (updateError) throw updateError;
      setNotice(action === "PAGADO" ? "Pago marcado como recibido. Revisá el saldo contable antes de utilizarlo." : "Revisión guardada.");
      setReason(""); await load();
      const updated = (await supabase.from("comision_pagos").select("*").eq("id", payment.id).maybeSingle()).data as Pago | null;
      if (updated) await openProof(updated);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar la revisión."); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm text-slate-500">AgroBrokerIA / Comisiones</p><h1 className="text-2xl font-bold">Comprobantes de comisiones</h1><p className="mt-1 text-sm text-slate-600">Subida privada, revisión manual y trazabilidad de pagos.</p></div>
      <Link href="/comisiones" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50">Volver a comisiones</Link>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border p-4"><p className="text-sm text-slate-500">Comprobantes recibidos</p><p className="mt-1 text-2xl font-semibold">{payments.length}</p></div>
      <div className="rounded-xl border p-4"><p className="text-sm text-slate-500">Por revisar</p><p className="mt-1 text-2xl font-semibold">{payments.filter(p=>["COMPROBANTE_SUBIDO","EN_REVISION"].includes(p.estado)).length}</p></div>
      <div className="rounded-xl border p-4"><p className="text-sm text-slate-500">Confirmados</p><p className="mt-1 text-2xl font-semibold">{payments.filter(p=>p.estado==="PAGADO").length}</p></div>
    </section>
    {!isReviewer && <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Subir comprobante de transferencia</h2>
      <p className="mt-1 text-sm text-slate-600">El comprobante no confirma el pago. Administración verificará el ingreso real y actualizará el estado.</p>
      <form onSubmit={uploadProof} className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Comisión pendiente<select className="rounded-lg border p-2" value={selectedCommission} onChange={e=>setSelectedCommission(e.target.value)} required><option value="">Seleccionar comisión</option>{commissions.map(c=><option key={c.id} value={c.id}>{c.concepto} · {c.operacion_id.slice(0,8)} · saldo {fmt(Number(c.saldo_pendiente),currencies[c.moneda_id] || "ARS")}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-medium">Importe transferido<input className="rounded-lg border p-2" type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required /></label>
        <label className="grid gap-1 text-sm font-medium">Fecha de transferencia<input className="rounded-lg border p-2" type="date" value={transferDate} onChange={e=>setTransferDate(e.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium md:col-span-2">Referencia o número de operación (opcional)<input className="rounded-lg border p-2" maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium md:col-span-2">Comprobante (PDF, JPG, PNG o WEBP; máximo 10 MB)<input className="rounded-lg border p-2" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} required /><span className="text-xs text-slate-500">No subas claves, contraseñas ni datos que no sean necesarios para identificar la transferencia.</span></label>
        <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-2">{busy?"Enviando…":"Subir comprobante"}</button>
      </form>
    </section>}
    <section className="rounded-xl border">
      <div className="border-b p-4"><h2 className="text-lg font-semibold">{isReviewer?"Comprobantes para revisar":"Mis comprobantes"}</h2><p className="text-sm text-slate-500">La acreditación bancaria se confirma manualmente.</p></div>
      {loading ? <p className="p-4 text-sm">Cargando…</p> : payments.length===0 ? <p className="p-4 text-sm text-slate-500">Todavía no hay comprobantes visibles.</p> : <div className="divide-y">{payments.map(p=><article key={p.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div><div className="flex flex-wrap items-center gap-2"><strong>{p.archivo_nombre}</strong><span className="rounded-full border px-2 py-1 text-xs">{p.estado}</span></div><p className="mt-1 text-sm text-slate-600">{fmt(Number(p.importe_declarado),currencies[p.moneda_id] || "ARS")} · transferencia {date(p.fecha_transferencia)} · cargado {date(p.creado_en)}</p><p className="text-xs text-slate-500">Operación {p.operacion_id.slice(0,8)} · Referencia: {p.referencia_transferencia||"—"}</p>{p.motivo_rechazo&&<p className="mt-1 text-sm text-red-700">Motivo: {p.motivo_rechazo}</p>}</div>
        <button onClick={()=>void openProof(p)} className="rounded-lg border px-3 py-2 text-sm font-medium">Ver y revisar</button>
      </article>)}</div>}
    </section>
    {selected && <section className="rounded-xl border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Revisión del comprobante</h2><p className="text-sm text-slate-500">Estado: {selected.estado} · Declarado: {fmt(Number(selected.importe_declarado),currencies[selected.moneda_id] || "ARS")} · Confirmado: {fmt(Number(selected.importe_confirmado),currencies[selected.moneda_id] || "ARS")}</p></div><button className="rounded-lg border px-3 py-2 text-sm" onClick={()=>{setSelected(null);setPreviewUrl("");setAudit([])}}>Cerrar</button></div>
      {previewUrl ? selected.archivo_mime==="application/pdf" ? <iframe title="Vista privada del comprobante" src={previewUrl} className="h-[650px] w-full rounded-lg border" sandbox="allow-same-origin" /> : <img src={previewUrl} alt="Comprobante de transferencia" className="max-h-[650px] max-w-full rounded-lg border object-contain" /> : <p className="text-sm text-slate-500">Preparando vista privada…</p>}
      {isReviewer && ["COMPROBANTE_SUBIDO","EN_REVISION"].includes(selected.estado) && <div className="space-y-3 rounded-lg bg-slate-50 p-3">
        <label className="grid gap-1 text-sm font-medium">Motivo de rechazo (obligatorio para rechazar)<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} className="rounded-lg border p-2" /></label>
        <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void review(selected,"EN_REVISION")} className="rounded-lg border px-3 py-2 text-sm">Marcar en revisión</button><button disabled={busy} onClick={()=>void review(selected,"PAGO_PARCIAL")} className="rounded-lg border px-3 py-2 text-sm">Registrar pago parcial</button><button disabled={busy} onClick={()=>void review(selected,"RECHAZADO")} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">Rechazar comprobante</button><button disabled={busy} onClick={()=>void review(selected,"PAGADO")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Confirmar dinero recibido</button></div>
      </div>}
      {audit.length>0 && <div><h3 className="font-semibold">Auditoría</h3><div className="mt-2 divide-y rounded-lg border">{audit.map((a,i)=><div key={String(a.id||i)} className="p-3 text-sm"><strong>{String(a.accion||"Evento")}</strong><p className="text-slate-500">{date(String(a.creado_en||""))} · {String(a.estado_anterior||"—")} → {String(a.estado_nuevo||"—")}</p><p>{String(a.motivo||"")}</p></div>)}</div></div>}
    </section>}
  </main>;
}
