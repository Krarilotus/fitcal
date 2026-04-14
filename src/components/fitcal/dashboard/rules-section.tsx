import type { AppDictionary } from "@/i18n";
import type { OverviewSummary } from "@/components/fitcal/dashboard-types";
import { DashboardSectionHeader as SectionHeader } from "@/components/fitcal/dashboard/dashboard-primitives";

type DashboardLabels = AppDictionary["dashboard"];

export function DashboardRulesSection({
  labels,
  overview,
  rules,
}: {
  labels: DashboardLabels;
  overview: OverviewSummary;
  rules: readonly string[];
}) {
  return (
    <section className="fc-section fc-rise" id="regeln">
      <SectionHeader title={labels.rules.title} />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ol className="fc-rule-list">{rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
        <div>
          {!overview.isLightParticipant ? (
            <>
              <p className="text-sm leading-relaxed text-[var(--fc-muted)]">{labels.rules.fullDescription}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <a className="fc-video-link" href="https://www.youtube.com/watch?v=JvX0ilRCBrU" rel="noreferrer" target="_blank">{labels.rules.referencePushups}</a>
                <a className="fc-video-link" href="https://www.youtube.com/watch?v=czKvGbo5zAo" rel="noreferrer" target="_blank">{labels.rules.referenceSitups}</a>
              </div>
            </>
          ) : <p className="text-sm leading-relaxed text-[var(--fc-muted)]">{labels.rules.lightDescription}</p>}
        </div>
      </div>
    </section>
  );
}
