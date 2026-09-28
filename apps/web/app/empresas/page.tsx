"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCompanyBadge } from "@/lib/company-badges";

type Company = {
  id: string;
  razon_social: string | null;
  nombre_comercial: string | null;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  pais: string | null;
  provincia: string | null;
  ciudad: string | null;
  estado: string | null;
  tipo_empresa: string | null;
  verificada: boolean;
  reputacion_score: number;
  operaciones_realizadas: number;
  operaciones_exitosas: number;
  operaciones_canceladas: number;
  toneladas_operadas: number;
  rol: string | null;
};

export default function EmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Necesitás iniciar sesión.");

        const { data: memberships, error: membershipsError } = await supabase
          .from("company_users")
          .select("company_id, rol")
          .eq("profile_id", user.id)
          .eq("activo", true);

        if (membershipsError) throw new Error(membershipsError.message);

        const companyIds = [...new Set((memberships || []).map((row) => row.company_id).filter(Boolean))];
        if (companyIds.length === 0) {
          setCompanies([]);
          return;
        }

        const [{ data: baseCompanies, error: companiesError }, { data: mappings, error: mappingsError }] =
          await Promise.all([
            supabase
              .from("companies")
              .select("id,razon_social,nombre_comercial,cuit,email,telefono,pais,provincia,ciudad,estado")
              .in("id", companyIds),
            supabase
              .from("company_empresa_map")
              .select("company_id,empresa_id,verified,confidence")
              .in("company_id", companyIds),
          ]);

        if (companiesError) throw new Error(companiesError.message);
        if (mappingsError) throw new Error(mappingsError.message);

        const empresaIds = [...new Set((mappings || []).map((row) => row.empresa_id).filter(Boolean))];
        const { data: empresas, error: empresasError } = empresaIds.length
          ? await supabase
              .from("empresas")
              .select("id,tipo_empresa,verificada,reputacion_score,operaciones_realizadas,operaciones_exitosas,operaciones_canceladas,toneladas_operadas,localidad,provincia,pais,cuit,razon_social,nombre_comercial")
              .in("id", empresaIds)
          : { data: [], error: null };

        if (empresasError) throw new Error(empresasError.message);

        const membershipMap = new Map((memberships || []).map((row) => [row.company_id, row.rol]));
        const companyMap = new Map((baseCompanies || []).map((row) => [row.id, row]));
        const empresaMap = new Map((empresas || []).map((row) => [row.id, row]));
        const mappingMap = new Map((mappings || []).map((row) => [row.company_id, row]));

        const merged = companyIds
          .map((companyId) => {
            const base = companyMap.get(companyId);
            if (!base) return null;
            const mapping = mappingMap.get(companyId);
            const empresa = mapping?.empresa_id ? empresaMap.get(mapping.empresa_id) : null;

            return {
              id: base.id,
              razon_social: empresa?.razon_social ?? base.razon_social,
              nombre_comercial: empresa?.nombre_comercial ?? base.nombre_comercial,
              cuit: empresa?.cuit ?? base.cuit,
              email: base.email,
              telefono: base.telefono,
              pais: empresa?.pais ?? base.pais,
              provincia: empresa?.provincia ?? base.provincia,
              ciudad: empresa?.localidad ?? base.ciudad,
              estado: base.estado,
              tipo_empresa: empresa?.tipo_empresa ?? null,
              verificada: Boolean(empresa?.verificada ?? mapping?.verified ?? false),
              reputacion_score: Number(empresa?.reputacion_score ?? 0),
              operaciones_realizadas: Number(empresa?.operaciones_realizadas ?? 0),
              operaciones_exitosas: Number(empresa?.operaciones_exitosas ?? 0),
              operaciones_canceladas: Number(empresa?.operaciones_canceladas ?? 0),
              toneladas_operadas: Number(empresa?.toneladas_operadas ?? 0),
              rol: membershipMap.get(companyId) ?? null,
            } satisfies Company;
          })
          .filter(Boolean) as Company[];

        setCompanies(merged);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudieron cargar las empresas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="module-page">
      <div className="module-hero">
        <div>
          <span className="eyebrow">CUENTA</span>
          <h1>Empresas</h1>
          <p>Empresas vinculadas y datos comerciales de tu cuenta.</p>
        </div>
        <Link href="/configuracion" className="module-pill">← Configuración</Link>
      </div>

      {error && <div className="module-alert module-alert-error">{error}</div>}

      {loading ? (
        <div className="loading-card">Cargando empresas...</div>
      ) : companies.length === 0 ? (
        <div className="module-empty">
          <div className="module-empty-icon">🏢</div>
          <h2>No hay empresas vinculadas</h2>
          <p>Tu usuario todavía no tiene una empresa activa asociada.</p>
        </div>
      ) : (
        <div className="company-grid">
          {companies.map((company) => {
            const badge = getCompanyBadge(company.tipo_empresa || company.rol, company.verificada);
            return (
              <article key={company.id} className="company-card">
                <div className="company-card-head">
                  <div className="company-icon">🏢</div>
                  <div>
                    <h2>{company.nombre_comercial || company.razon_social || "Empresa"}</h2>
                    {company.razon_social && company.nombre_comercial && <p>{company.razon_social}</p>}
                  </div>
                  <div className="company-badge-stack">
                    <span className="company-status">{company.estado || "—"}</span>
                    <span
                      className="company-role-badge"
                      style={{ color: badge.color, background: badge.background, borderColor: badge.border }}
                    >
                      <i />
                      {badge.label}{badge.verified ? " · Verificada" : " · Sin verificar"}
                    </span>
                  </div>
                </div>

                <div className="company-reputation">
                  <div><strong>{company.operaciones_exitosas}</strong><span>Negocios cerrados</span></div>
                  <div><strong>{company.toneladas_operadas.toLocaleString("es-AR", { maximumFractionDigits: 0 })}</strong><span>TN operadas</span></div>
                  <div><strong>{company.operaciones_realizadas ? company.reputacion_score + "%" : "—"}</strong><span>Historial de cumplimiento</span></div>
                </div>

                <div className="company-details">
                  <div><span>CUIT</span><strong>{company.cuit || "—"}</strong></div>
                  <div><span>Ubicación</span><strong>{[company.ciudad, company.provincia, company.pais].filter(Boolean).join(", ") || "—"}</strong></div>
                  <div><span>Email</span><strong>{company.email || "—"}</strong></div>
                  <div><span>Teléfono</span><strong>{company.telefono || "—"}</strong></div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
