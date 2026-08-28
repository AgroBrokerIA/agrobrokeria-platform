"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function MarketplaceSearch({
  value,
  onChange,
}: Props) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Buscar..."
      style={{
        width: "100%",
        padding: 15,
        fontSize: 18,
        marginBottom: 25,
        borderRadius: 10,
        border: "1px solid #ccc",
      }}
    />
  );
}