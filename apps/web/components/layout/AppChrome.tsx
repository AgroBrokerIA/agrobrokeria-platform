"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageContainer from "./PageContainer";
import { supabase } from "@/lib/supabase/client";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/reset-password", "/terminos", "/privacidad", "/ayuda", "/como-verificamos"];

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/reset-password/");
  useEffect(() => {
    if (isPublic) return;
    let activo = true;
    supabase.auth.getUser().then(({ data }) => {
      if (activo && !data.user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    });
    return () => { activo = false; };
  }, [isPublic, pathname, router]);

  const footer=<footer className="legal-site-footer"><div><strong>AgroBrokerIA · Operatoria formal</strong><p><strong>Exclusividad formal:</strong> AgroBrokerIA admite operaciones reales, declaradas y documentadas. Se prohíben las operatorias marginales, simuladas o destinadas a evadir obligaciones fiscales.</p><p><strong>Corretaje digital:</strong> la Plataforma es un canal tecnológico. Comprador, vendedor, acopio y transportista responden por la mercadería, calidad, pagos, entrega, representación y documentación que aportan, dentro de los límites de la ley.</p><p><strong>KYC / SISA:</strong> las cuentas empresariales deben informar CUIT y aportar la documentación registral aplicable. Las empresas alcanzadas por SISA quedan bloqueadas para operar hasta la revisión administrativa de su estado.</p><p><strong>Fondos y auditoría:</strong> las comisiones facturadas corresponden a servicios tecnológicos sobre operaciones lícitas. Los usuarios deben justificar el origen de los fondos cuando la normativa lo requiera. Los accesos, aceptaciones, mensajes, operaciones y documentos pueden conservarse para auditoría y requerimientos legales.</p><nav><Link href="/terminos">Términos y Condiciones</Link><Link href="/privacidad">Política de Privacidad</Link><Link href="/como-verificamos">Verificación</Link></nav><small>© {new Date().getFullYear()} AgroBrokerIA. Todos los derechos reservados.</small></div></footer>;

  if (isPublic) return <>{children}{footer}</>;

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
