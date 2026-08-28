import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function PageContainer({ children }: Props) {
  return (
    <main
      style={{
        flex: 1,
        padding: "30px",
        background: "#f8fafc",
        minHeight: "calc(100vh - 70px)",
      }}
    >
      {children}
    </main>
  );
}