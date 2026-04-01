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
      className={`rounded-2xl border px-4 py-3 text-sm ${
        error
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-emerald-300 bg-emerald-50 text-emerald-900"
      }`}
    >
      {error || success}
    </div>
  );
}
