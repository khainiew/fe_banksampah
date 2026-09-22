export default function PageHeader({ title, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-['Poppins'] text-3xl font-bold text-emerald-900 break-words">
        {title}
      </h1>

      {action}
    </div>
  );
}