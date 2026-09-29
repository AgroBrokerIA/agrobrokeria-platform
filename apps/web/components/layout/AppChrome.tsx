"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageContainer from "./PageContainer";
import { supabase } from "@/lib/supabase/client";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/reset-password"];

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

  if (isPublic) return <>{children}</>;

  return (
    <>
      <Header />
      <div className="app-body">
        <Sidebar />
        <PageContainer>{children}</PageContainer>
      </div>
    </>
  );
}
