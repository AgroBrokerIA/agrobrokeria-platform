"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageContainer from "./PageContainer";
import { supabase } from "@/lib/supabase/client";

const ADMIN_ROUTES = ["/admin", "/administracion", "/verificaciones", "/retiros-comisiones", "/medios-cobro", "/cuentas-bancarias", "/comisiones"];
const PUBLIC_ROUTES = ["/", "/login", "/register", "/reset-password", "/terminos", "/privacidad", "/ayuda", "/como-verificamos"];

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [accessReady,setAccessReady] = useState(false);
  const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/reset-password/");
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname === route || pathname.startsWith(route + "/"));
  useEffect(() => {
    if (isPublic) { setAccessReady(true); return; }
    let activo = true;
    setAccessReady(false);
    supabase.auth.getUser().then(async ({ data }) => {
      if (!activo) return;
      if (!data.user) { router.replace("/login?next=" + encodeURIComponent(pathname)); return; }
      if (isAdminRoute) {
        const { data: isAdmin, error } = await supabase.rpc("es_administrador_plataforma");
        if (!activo) return;
        if (error || isAdmin !== true) { router.replace("/dashboard?acceso=administrativo"); return; }
      }
      if (activo) setAccessReady(true);
    }).catch(() => {
      if (activo) router.replace("/login?next=" + encodeURIComponent(pathname));
    });
    return () => { activo = false; };
  }, [isPublic, isAdminRoute, pathname, router]);

  const footer=<footer className="legal-site-footer"><div><strong>AgroBrokerIA · Operatoria formal</strong><p><strong>Exclusividad formal:</strong> AgroBrokerIA admite operaciones reales, declaradas y documentadas. Se prohíben las operatorias marginales, simuladas o destinadas a evadir obligaciones fiscales.</p><p><strong>Corretaje digital:</strong> la Plataforma es un canal tecnológico. Comprador, vendedor, acopio y transportista responden por la mercadería, calidad, pagos, entrega, representación y documentación que aportan, dentro de los límites de la ley.</p><p><strong>KYC / SISA:</strong> las cuentas empresariales deben informar CUIT y aportar la documentación registral aplicable. Las empresas alcanzadas por SISA quedan bloqueadas para operar hasta la revisión administrativa de su estado.</p><p><strong>Fondos y auditoría:</strong> las comisiones facturadas corresponden a servicios tecnológicos sobre operaciones lícitas. Los usuarios deben justificar el origen de los fondos cuando la normativa lo requiera. Los accesos, aceptaciones, mensajes, operaciones y documentos pueden conservarse para auditoría y requerimientos legales.</p><nav><Link href="/terminos">Términos y Condiciones</Link><Link href="/privacidad">Política de Privacidad</Link><Link href="/como-verificamos">Verificación</Link></nav><small>© {new Date().getFullYear()} AgroBrokerIA. Todos los derechos reservados.</small></div></footer>;

  if (isPublic) return <>{children}{footer}</>;
  if (!accessReady) return <main className="module-page" aria-live="polite"><p>Comprobando acceso…</p></main>;

  return (
    <>
      <Header />
      <div className="app-body">
        <Sidebar />
        <PageContainer>{children}{footer}</PageContainer>
      </div>
    </>
  );
}
