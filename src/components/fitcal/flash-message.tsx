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
      className={`flex items-start gap-3 rounded-[var(--fc-radius)] border px-4 py-3 text-sm font-medium fc-rise ${
        error
          ? "border-red-500/20 bg-red-500/10 text-red-400"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      }`}
    >
      <span className="mt-0.5 text-base leading-none" aria-hidden>
        {error ? "⚠" : "✓"}
      </span>
      <span>{error || success}</span>
    </div>
  );
}
