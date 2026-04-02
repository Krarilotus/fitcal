export function FlashMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (!error && !success) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium fc-rise ${
        error
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <span className="mt-0.5 text-base leading-none" aria-hidden>
        {error ? "⚠" : "✓"}
      </span>
      <span>{error || success}</span>
    </div>
  );
}
