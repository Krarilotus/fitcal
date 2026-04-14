"use client";

import { useState } from "react";
import type { AppDictionary } from "@/i18n";
import type { OverviewSummary, ProfileSummary } from "@/components/fitcal/dashboard-types";
import {
  DashboardCardTitle,
  DashboardSectionHeader as SectionHeader,
  DashboardStatBox as StatBox,
} from "@/components/fitcal/dashboard/dashboard-primitives";
import {
  formatDashboardCurrency,
  formatDateKeyForInput,
  parseDateInputToDateKey,
  parseNumberInput,
} from "@/components/fitcal/dashboard-formatters";
import { DateTextInput } from "@/components/ui/date-text-input";
import type { Locale } from "@/lib/preferences";
import {
  CHALLENGE_END_DATE,
  CHALLENGE_START_DATE,
  getChallengeDayIndex,
  getRequiredReps,
  isWithinChallenge,
} from "@/lib/challenge";
import { replaceTemplate } from "@/lib/template";

type DashboardLabels = AppDictionary["dashboard"];

function formatCurrency(locale: Locale, cents: number) {
  return formatDashboardCurrency(locale, cents);
}

function formatLocalizedNumber(locale: Locale, value: number, digits = 1) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function DashboardCalculatorSection({
  commonLabels,
  labels,
  locale,
  overview,
  profile,
}: {
  commonLabels: AppDictionary["common"];
  labels: DashboardLabels;
  locale: Locale;
  overview: OverviewSummary;
  profile: ProfileSummary;
}) {
  const hasStudentPricing = overview.hasStudentDiscount && !overview.isLightParticipant;
  const slackBaseCents = hasStudentPricing ? 500 : 1000;
  const slackIncrementCents = hasStudentPricing ? 100 : 200;

  const [slackDaysInput, setSlackDaysInput] = useState("1");
  const [debtInput, setDebtInput] = useState((overview.outstandingDebtCents / 100).toFixed(2));
  const [pushupInput, setPushupInput] = useState(String(overview.currentTarget));
  const [situpInput, setSitupInput] = useState(String(overview.currentTarget));
  const [weightInput, setWeightInput] = useState(profile.latestWeightKg != null ? String(profile.latestWeightKg).replace(".", ",") : "75");
  const [targetDateInput, setTargetDateInput] = useState(formatDateKeyForInput(CHALLENGE_START_DATE));

  const additionalSlackDays = Math.max(0, Math.floor(parseNumberInput(slackDaysInput)));
  const totalSlackDebtCents = Array.from({ length: additionalSlackDays }, (_, index) => slackBaseCents + (overview.existingSlackDays + index) * slackIncrementCents).reduce((sum, value) => sum + value, 0);
  const nextSlackDayCostCents = slackBaseCents + overview.existingSlackDays * slackIncrementCents;
  const debtCents = Math.max(0, Math.round(parseNumberInput(debtInput) * 100));
  const pushupsForDebt = Math.ceil(debtCents / 10);
  const situpsForDebt = Math.ceil(debtCents / 5);
  const mixedPushups = Math.ceil(debtCents / 25);
  const mixedSitups = Math.max(0, Math.ceil((debtCents - mixedPushups * 10) / 5));
  const pushups = Math.max(0, Math.floor(parseNumberInput(pushupInput)));
  const situps = Math.max(0, Math.floor(parseNumberInput(situpInput)));
  const weightKg = Math.max(1, parseNumberInput(weightInput, profile.latestWeightKg ?? 75));
  const pushupCalories = pushups * 0.45 * (weightKg / 75);
  const situpCalories = situps * 0.3 * (weightKg / 75);
  const totalCalories = pushupCalories + situpCalories;
  const selectedDateKey = parseDateInputToDateKey(targetDateInput);
  const selectedDateInChallenge = selectedDateKey ? isWithinChallenge(selectedDateKey) : false;
  const selectedDateTarget = selectedDateKey && selectedDateInChallenge ? getRequiredReps(selectedDateKey) : null;
  const selectedChallengeDay = selectedDateKey && selectedDateInChallenge ? getChallengeDayIndex(selectedDateKey) + 1 : null;

  return (
    <section className="fc-section fc-rise" id="rechner">
      <SectionHeader title={labels.calculator.title} />
      <div className={`grid gap-4 md:grid-cols-2 ${overview.isLightParticipant ? "xl:grid-cols-2" : "xl:grid-cols-4"}`}>
        <section className="fc-card">
          <DashboardCardTitle title={labels.calculator.targetTitle} />
          <label className="fc-input-group mt-4"><span className="fc-input-label">{labels.calculator.date}</span><DateTextInput className="fc-input" onValueChange={setTargetDateInput} placeholder={commonLabels.datePlaceholder} value={targetDateInput} /></label>
          <div className="mt-4 grid gap-2">
            <StatBox label={labels.calculator.challengeDay} value={selectedChallengeDay ?? "-"} />
            <StatBox label={labels.calculator.perExercise} value={selectedDateTarget ?? "-"} />
          </div>
          {!selectedDateInChallenge ? <p className="mt-3 fc-text-muted">{replaceTemplate(labels.calculator.chooseDate, { startDate: formatDateKeyForInput(CHALLENGE_START_DATE), endDate: formatDateKeyForInput(CHALLENGE_END_DATE) })}</p> : null}
        </section>
        {!overview.isLightParticipant ? (
          <>
            <section className="fc-card">
              <DashboardCardTitle title={labels.calculator.slackTitle} />
              <div className="mt-4 fc-grid-2">
                <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.existingSlackDays}</span><input className="fc-input" readOnly type="number" value={overview.existingSlackDays} /></label>
                <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.additionalSlackDays}</span><input className="fc-input" inputMode="numeric" onChange={(event) => setSlackDaysInput(event.target.value)} type="number" value={slackDaysInput} /></label>
              </div>
              <div className="mt-4 grid gap-2">
                <StatBox label={labels.calculator.total} value={formatCurrency(locale, totalSlackDebtCents)} />
                <StatBox label={labels.calculator.nextSlackDay} value={formatCurrency(locale, nextSlackDayCostCents)} />
              </div>
              <p className="mt-3 fc-text-muted">{hasStudentPricing ? labels.calculator.slackFormulaStudent : labels.calculator.slackFormulaStandard}</p>
            </section>
            <section className="fc-card">
              <DashboardCardTitle title={labels.calculator.debtTitle} />
              <label className="fc-input-group mt-4"><span className="fc-input-label">{labels.calculator.debtEuro}</span><input className="fc-input" inputMode="decimal" onChange={(event) => setDebtInput(event.target.value)} type="number" value={debtInput} /></label>
              <div className="mt-4 grid gap-2">
                <StatBox label={labels.calculator.onlyPushups} value={pushupsForDebt} />
                <StatBox label={labels.calculator.onlySitups} value={situpsForDebt} />
                <StatBox label={labels.calculator.mixed} value={`${mixedPushups} L + ${mixedSitups} S`} />
              </div>
              <p className="mt-3 fc-text-muted">{labels.calculator.debtHint}</p>
            </section>
          </>
        ) : null}
        <section className="fc-card">
          <DashboardCardTitle title={labels.calculator.caloriesTitle} />
          <div className="mt-4 fc-grid-2">
            <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.totalPushups}</span><input className="fc-input" inputMode="numeric" onChange={(event) => setPushupInput(event.target.value)} type="number" value={pushupInput} /></label>
            <label className="fc-input-group"><span className="fc-input-label">{labels.calculator.totalSitups}</span><input className="fc-input" inputMode="numeric" onChange={(event) => setSitupInput(event.target.value)} type="number" value={situpInput} /></label>
            <label className="fc-input-group col-span-full"><span className="fc-input-label">{labels.calculator.weightKg}</span><input className="fc-input" inputMode="decimal" onChange={(event) => setWeightInput(event.target.value)} type="number" value={weightInput} /></label>
          </div>
          <div className="mt-4 grid gap-2">
            <StatBox label={labels.calculator.pushups} value={`${formatLocalizedNumber(locale, pushupCalories)} ${labels.calculator.kilocalories}`} />
            <StatBox label={labels.calculator.situps} value={`${formatLocalizedNumber(locale, situpCalories)} ${labels.calculator.kilocalories}`} />
            <StatBox label={labels.calculator.total} value={`${formatLocalizedNumber(locale, totalCalories)} ${labels.calculator.kilocalories}`} />
          </div>
          <p className="mt-3 fc-text-muted">{labels.calculator.roughEstimate}</p>
        </section>
      </div>
    </section>
  );
}
