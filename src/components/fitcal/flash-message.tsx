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
      className={`flex items-start gap-3 rounded-[var(--fc-radius-md)] border px-4 py-3.5 text-sm font-medium fc-rise ${
        error
          ? "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-red-400"
          : "border-[var(--fc-accent-border)] bg-[var(--fc-accent-soft)] text-[var(--fc-accent)]"
      }`}
    >
      <span className="mt-0.5 text-base leading-none" aria-hidden>
        {error ? "⚠" : "✓"}
      </span>
      <span>{error || success}</span>
    </div>
  );
}
