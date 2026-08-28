type Props = {
  children: React.ReactNode;
  color?: "green" | "blue";
};

export default function Badge({
  children,
  color = "green",
}: Props) {
  const style =
    color === "green"
      ? "bg-green-600"
      : "bg-blue-600";

  return (
    <span
      className={`${style} text-white px-3 py-1 rounded-full text-sm font-bold`}
    >
      {children}
    </span>
  );
}