import "./globals.css";
import AppChrome from "../components/layout/AppChrome";
import LanguageBootstrap from "../components/i18n/LanguageBootstrap";

export const metadata = {
  title: "AgroBroker IA",
  description: "Plataforma inteligente de comercialización de commodities agrícolas.",
};

// Deployment marker: keep this file in the main production path so Git integrations
// that deploy from main can detect the latest validated source revision.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body><LanguageBootstrap />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
