import { getDictionary } from "@/i18n";

export type DashboardDictionary = ReturnType<typeof getDictionary>["dashboard"];

export function statusLabel(
  status: string,
  labels: DashboardDictionary["statusLabels"],
) {
  switch (status) {
    case "completed":
      return labels.completed;
    case "partial":
      return labels.partial;
    case "joker":
      return labels.joker;
    case "slack":
      return labels.slack;
    case "free":
      return labels.free;
    case "open":
      return labels.open;
    default:
      return labels.later;
  }
}

export function formatReviewStatus(
  reviewStatus: string | null | undefined,
  labels: DashboardDictionary["reviewStatusLabels"],
) {
  switch (reviewStatus) {
    case "PENDING":
      return labels.pending;
    case "ESCALATED":
      return labels.escalated;
    case "APPROVED":
      return labels.approved;
    case "REVISION_REQUESTED":
      return labels.revisionRequested;
    default:
      return null;
  }
}

export function getDayStatusLabel(
  status: string,
  labels: DashboardDictionary["statusLabels"],
) {
  switch (status) {
    case "sickPending":
      return labels.sickPending;
    case "sick":
      return labels.sick;
    default:
      return statusLabel(status, labels);
  }
}
