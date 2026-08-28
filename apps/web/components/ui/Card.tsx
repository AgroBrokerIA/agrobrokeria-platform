type Props = {
  children: React.ReactNode;
};

export default function Card({ children }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
      {children}
    </div>
  );
}