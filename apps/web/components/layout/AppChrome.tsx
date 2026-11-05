"use client";

import { ReactNode, useEffect } from "react";\nimport Link from "next/link";
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

  const footer=<footer className="legal-site-footer"><div><strong>AgroBrokerIA · Operatoria formal</strong><p>Plataforma tecnológica para vincular oferta y demanda agrocomercial. Las partes son responsables de la operación, calidad, pagos, documentación fiscal y cumplimiento normativo.</p><p>La plataforma exige identificación y controles documentales. Las verificaciones se informan según la fuente y fecha efectivamente consultadas.</p><nav><Link href="/terminos">Términos y Condiciones</Link><Link href="/privacidad">Política de Privacidad</Link><Link href="/como-verificamos">Verificación</Link></nav><small>© {new Date().getFullYear()} AgroBrokerIA. Todos los derechos reservados.</small></div></footer>;

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
