"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function FlashMessage({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function dismissMessage() {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("error");
    nextParams.delete("success");

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;

    setDismissed(true);
    router.replace(nextUrl, { scroll: false });
  }

  if ((!error && !success) || dismissed) {
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
        {error ? "!" : "✓"}
      </span>
      <span className="min-w-0 flex-1">{error || success}</span>
      <button
        aria-label="Meldung schliessen"
        className="shrink-0 rounded-full px-2 py-1 text-base leading-none text-current/70 transition hover:bg-black/10 hover:text-current"
        onClick={dismissMessage}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
