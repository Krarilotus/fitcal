import Link from "next/link";
import { ArrowRight, PlayCircle, Zap, Upload, BarChart3 } from "lucide-react";
import type { AppDictionary } from "@/i18n";
import {
  calculateDebtForMissedDays,
  type ChallengeSnapshot,
} from "@/components/fitcal/challenge-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/preferences";

type LandingLabels = AppDictionary["landing"];
type CommonLabels = AppDictionary["common"];

export function FitcalLandingPage({
  snapshot,
  labels,
  commonLabels,
  locale,
  controls,
}: {
  snapshot: ChallengeSnapshot;
  labels: LandingLabels;
  commonLabels: CommonLabels;
  locale: Locale;
  controls?: React.ReactNode;
}) {
  const debtExamples = [1, 3, 5].map((missedDays) => ({
    missedDays,
    amount: calculateDebtForMissedDays(missedDays),
  }));

  const moneyFormatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  const flowIcons = [Zap, Upload, BarChart3] as const;

  return (
    <div className="fc-shell min-h-screen text-[var(--fc-ink)]">
      <div className="fc-noise pointer-events-none absolute inset-0 -z-20" />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 pb-20 pt-5 sm:px-6 sm:pt-8">
        <header className="flex flex-wrap items-center justify-between gap-3 fc-rise">
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fc-muted)] transition-colors hover:text-[var(--fc-ink)]" href="/">
            <span className="fc-brand-dot" />
            {commonLabels.brand}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {controls}
            <Button asChild variant="ghost"><Link href="#regeln">{labels.headerRules}</Link></Button>
            <Button asChild><Link href="/login">{commonLabels.login}</Link></Button>
          </div>
        </header>

        <section className="grid items-start gap-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="fc-rise">
            <h1 className="fc-display text-[clamp(2.5rem,6vw,4.5rem)]">
              {labels.heroTitleLead}
              <br />
              <span className="text-[var(--fc-muted)]">{labels.heroTitleAccent}</span>
            </h1>
            <p className="mt-5 max-w-md text-[var(--fc-muted)] sm:text-lg leading-relaxed">{labels.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/register">{labels.createAccount}<ArrowRight className="size-4" /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/login">{labels.openDashboard}</Link></Button>
            </div>
          </div>

          <div className="fc-rise fc-rise-delay-1">
            <div className="rounded-[var(--fc-radius-xl)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="fc-kicker">{labels.todayPerExercise}</span>
                <Badge variant="warm">{labels.dayPrefix} {snapshot.challengeDay}</Badge>
              </div>
              <p className="fc-display fc-count-animated mt-4 text-[clamp(4rem,10vw,7rem)] text-[var(--fc-accent)]">{snapshot.targetReps}</p>
              <p className="mt-3 fc-text-muted">{snapshot.todayLabel}</p>
            </div>
          </div>
        </section>

        <section className="fc-rise fc-rise-delay-2">
          <p className="fc-kicker mb-6">{labels.flowKicker}</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {labels.flow.map((item, index) => {
              const Icon = flowIcons[index] ?? Zap;
              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center gap-2.5">
                    <div className="fc-step-num"><Icon className="size-3.5" /></div>
                    <h2 className="fc-heading text-base">{item.title}</h2>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--fc-muted)]">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="fc-rise fc-rise-delay-3" id="regeln">
          <p className="fc-kicker mb-6">{commonLabels.rules}</p>
          <div className="grid gap-8 lg:grid-cols-2">
            <ol className="fc-rule-list">{labels.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
            <details className="fc-details">
              <summary>{labels.debtFormulaSummary}</summary>
              <div className="grid gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <p className="mb-1 text-sm font-medium">{labels.targetFormula}</p>
                  <code className="inline-block rounded-[var(--fc-radius-sm)] bg-[var(--fc-surface)] px-2 py-1 text-xs font-mono text-[var(--fc-accent-2)]">{labels.targetFormulaExpression}</code>
                  <p className="mt-1.5 fc-text-muted">{labels.todayPerExerciseShort}: <strong className="text-[var(--fc-ink)]">{snapshot.targetReps}</strong> {labels.todayPerExercise.toLowerCase()}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">{labels.debtExamples}</p>
                  <div className="space-y-1">
                    {debtExamples.map((entry) => (
                      <p className="flex items-center justify-between fc-text-muted" key={entry.missedDays}>
                        <span>{entry.missedDays} {entry.missedDays > 1 ? labels.slackDaysLabel : labels.slackDayLabel}</span>
                        <strong className="text-[var(--fc-ink)]">{moneyFormatter.format(entry.amount)}</strong>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>

        <section className="fc-rise fc-rise-delay-3">
          <p className="fc-kicker mb-3">{labels.referenceVideos}</p>
          <p className="mb-4 fc-text-muted">{labels.videoMeta}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <a className="fc-video-link" href="https://www.youtube.com/watch?v=JvX0ilRCBrU" rel="noreferrer" target="_blank"><PlayCircle className="size-5" /><span>{labels.pushupReference}</span></a>
            <a className="fc-video-link" href="https://www.youtube.com/watch?v=czKvGbo5zAo" rel="noreferrer" target="_blank"><PlayCircle className="size-5" /><span>{labels.situpReference}</span></a>
          </div>
        </section>
      </div>
    </div>
  );
}
