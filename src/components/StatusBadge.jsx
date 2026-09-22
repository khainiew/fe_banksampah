export default function StatusBadge({
  children = "Aktif",
  tone = "green",
}) {
  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center rounded-full px-3 py-1 text-xs font-bold break-words ${
        tone === "green"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}