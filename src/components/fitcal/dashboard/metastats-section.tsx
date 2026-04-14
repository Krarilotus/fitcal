import type { AppDictionary } from "@/i18n";
import type { MeasurementPoint, PerformancePoint, ProfileSummary } from "@/components/fitcal/dashboard-types";
import {
  DashboardCardTitle,
  DashboardSectionHeader as SectionHeader,
  DashboardStatBox as StatBox,
} from "@/components/fitcal/dashboard/dashboard-primitives";
import { MeasurementChart } from "@/components/fitcal/measurement-chart";
import { PerformanceChart } from "@/components/fitcal/performance-chart";
import { Button } from "@/components/ui/button";

type DashboardLabels = AppDictionary["dashboard"];

export function DashboardMetastatsSection({
  labels,
  measurementPoints,
  performancePoints,
  profile,
}: {
  labels: DashboardLabels;
  measurementPoints: MeasurementPoint[];
  performancePoints: PerformancePoint[];
  profile: ProfileSummary;
}) {
  return (
    <section className="fc-section fc-rise" id="metastats">
      <SectionHeader title={labels.metastats.title} />
      <div className="space-y-6">
        <PerformanceChart labels={labels.charts} points={performancePoints} />

        <section className="fc-card">
          <DashboardCardTitle title={labels.metastats.measurementsTitle} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {profile.weightLabel ? <StatBox label={labels.metastats.weight} value={profile.weightLabel} /> : null}
            {profile.waistLabel ? <StatBox label={labels.metastats.waist} value={profile.waistLabel} /> : null}
          </div>
          <form action="/api/measurements" className="mt-5 space-y-4" method="post">
            <div className="fc-grid-2">
              <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.weightKg}</span><input className="fc-input" inputMode="decimal" name="weightKg" step="0.1" type="number" /></label>
              <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.waistCm}</span><input className="fc-input" inputMode="decimal" name="waistCircumferenceCm" step="0.1" type="number" /></label>
              <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.restingPulse}</span><input className="fc-input" inputMode="numeric" name="restingPulseBpm" type="number" /></label>
            </div>
            <label className="fc-input-group"><span className="fc-input-label">{labels.metastats.notes}</span><textarea className="fc-input min-h-20" name="notes" /></label>
            <Button type="submit" variant="secondary">{labels.metastats.saveMeasurement}</Button>
          </form>
        </section>

        <MeasurementChart labels={labels.charts} points={measurementPoints} />
      </div>
    </section>
  );
}
