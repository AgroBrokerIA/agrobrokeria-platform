type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function Input({
  value,
  onChange,
  placeholder,
}: Props) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
    />
  );
}