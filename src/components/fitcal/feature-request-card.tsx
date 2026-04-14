"use client";

import { useState } from "react";
import type { AppDictionary } from "@/i18n";
import { DashboardCardTitle } from "@/components/fitcal/dashboard/dashboard-primitives";
import { Button } from "@/components/ui/button";

export function FeatureRequestCard({
  compact = false,
  enabled,
  labels,
  locale,
}: {
  compact?: boolean;
  enabled: boolean;
  labels: AppDictionary["dashboard"]["featureRequest"];
  locale: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className={compact ? "" : "border-b border-[var(--fc-border)] pb-5"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {compact ? null : (
          <div>
            <DashboardCardTitle title={labels.title} />
            <p className="mt-1 fc-text-muted">
              {enabled ? labels.description : labels.unavailable}
            </p>
          </div>
        )}
        <Button
          disabled={!enabled}
          onClick={() => setIsOpen((current) => !current)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {isOpen ? labels.close : labels.open}
        </Button>
      </div>

      {compact && !enabled ? (
        <p className="mt-2 fc-text-muted">{labels.unavailable}</p>
      ) : null}

      {enabled && isOpen ? (
        <form
          action="/api/feature-requests"
          className={compact ? "grid gap-3" : "mt-4 grid gap-3"}
          method="post"
        >
          <input name="locale" type="hidden" value={locale} />
          <label className="fc-input-group">
            <span className="fc-input-label">{labels.titleLabel}</span>
            <input
              className="fc-input"
              maxLength={120}
              name="title"
              placeholder={labels.titlePlaceholder}
              type="text"
            />
          </label>
          <label className="fc-input-group">
            <span className="fc-input-label">{labels.detailsLabel}</span>
            <textarea
              className="fc-input min-h-28"
              maxLength={4000}
              minLength={10}
              name="details"
              placeholder={labels.detailsPlaceholder}
              required
            />
          </label>
          <div className="flex justify-end">
            <Button type="submit">{labels.submit}</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
