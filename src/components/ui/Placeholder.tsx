export default function Placeholder({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-slate-600 shadow-sm">
      {message}
    </div>
  );
}
