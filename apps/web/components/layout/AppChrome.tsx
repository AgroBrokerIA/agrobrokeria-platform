"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import PageContainer from "./PageContainer";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/reset-password"];

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/reset-password/");
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
