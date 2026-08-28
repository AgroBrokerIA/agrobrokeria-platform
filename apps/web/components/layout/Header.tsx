export default function Header() {
  return (
    <header
      style={{
        height: "70px",
        background: "#0f172a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        borderBottom: "1px solid #1e293b",
      }}
    >
      <h2
        style={{
          color: "#22c55e",
          margin: 0,
        }}
      >
        AgroBroker IA
      </h2>

      <div
        style={{
          display: "flex",
          gap: "15px",
        }}
      >
        <span>🔔</span>
        <span>💬</span>
        <span>👤 Samanta</span>
      </div>
    </header>
  );
}