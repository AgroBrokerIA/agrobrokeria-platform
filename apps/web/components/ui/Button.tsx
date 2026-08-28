type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
};

export default function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
}: ButtonProps) {
  const colors =
    variant === "primary"
      ? "bg-green-600 hover:bg-green-700"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${colors} text-white px-4 py-2 rounded-lg font-semibold transition`}
    >
      {children}
    </button>
  );
}