interface Props {
  titulo: string;
  valor: string;
}

export default function DashboardCard({
  titulo,
  valor,
}: Props) {
  return (
    <div
      style={{
        background: "white",
        padding: 25,
        borderRadius: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,.08)",
      }}
    >
      <h3>{titulo}</h3>

      <h1
        style={{
          color: "#22c55e",
        }}
      >
        {valor}
      </h1>
    </div>
  );
}