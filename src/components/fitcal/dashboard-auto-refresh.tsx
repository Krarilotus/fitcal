"use client";

import { useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";

export function DashboardAutoRefresh({
  enabled,
  intervalMs = 15000,
}: {
  enabled: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  const refreshIfVisible = useEffectEvent(() => {
    if (!enabled) return;
    if (document.visibilityState !== "visible") return;
    if (!window.document.hasFocus()) return;
    router.refresh();
  });

  useEffect(() => {
    if (!enabled) return;

    const intervalId = window.setInterval(() => {
      refreshIfVisible();
    }, intervalMs);

    const handleVisibilityChange = () => {
      refreshIfVisible();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs]);

  return null;
}
