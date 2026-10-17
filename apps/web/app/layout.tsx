import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./mobile-fixes.css";
import AppChrome from "../components/layout/AppChrome";
import LanguageBootstrap from "../components/i18n/LanguageBootstrap";
import PWARegister from "../components/pwa/PWARegister";

export const metadata: Metadata = {
  title: "AgroBrokerIA",
  applicationName: "AgroBrokerIA",
  description: "Plataforma inteligente de comercialización de commodities agrícolas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgroBrokerIA",
  },
  icons: {
    icon: "/icons/agrobrokeria.svg",
    apple: "/icons/agrobrokeria.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#173f2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <LanguageBootstrap />
        <AppChrome>{children}</AppChrome>
        <PWARegister />
      </body>
    </html>
  );
}
