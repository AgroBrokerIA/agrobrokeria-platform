import "./globals.css";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import PageContainer from "../components/layout/PageContainer";

export const metadata = {
  title: "AgroBroker IA",
  description: "Plataforma Inteligente de Comercialización de Granos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Header />

        <div
          style={{
            display: "flex",
            minHeight: "100vh",
          }}
        >
          <Sidebar />

          <PageContainer>
            {children}
          </PageContainer>
        </div>
      </body>
    </html>
  );
}