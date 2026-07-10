"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AppDictionary } from "@/i18n";
import { DashboardHistorySection } from "@/components/fitcal/dashboard/history-section";
import { DashboardProfileSection } from "@/components/fitcal/dashboard/profile-section";
import { DashboardReviewSection } from "@/components/fitcal/dashboard/review-section";
import { DashboardOverviewSection } from "@/components/fitcal/dashboard/overview-section";
import {
  DashboardUploadSection,
  type FocusedClaimEditorState,
} from "@/components/fitcal/dashboard/upload-section";
import { DashboardMetastatsSection } from "@/components/fitcal/dashboard/metastats-section";
import { DashboardRulesSection } from "@/components/fitcal/dashboard/rules-section";
import { DashboardCalculatorSection } from "@/components/fitcal/dashboard/calculator-section";
import type {
  EscalationReviewItem,
  ActiveInviteSummary,
  MeasurementPoint,
  OpenDay,
  OverviewSummary,
  ParticipantRow,
  PerformancePoint,
  PrimaryReviewItem,
  PendingApprovalSummary,
  ProfileSummary,
  ReviewFeedbackItem,
  SicknessReviewItem,
  TimelineEntry,
} from "@/components/fitcal/dashboard-types";
import type { Locale } from "@/lib/preferences";
import {
  canAccrueChallengeDebt,
  canReviewPlatformContent,
} from "@/lib/participation-policy";

type DashboardLabels = AppDictionary["dashboard"];
type SectionKey =
  | "overview"
  | "uploads"
  | "timeline"
  | "metastats"
  | "review"
  | "regeln"
  | "rechner"
  | "profile";

type ClaimEditorReplacementState = Record<string, string | null>;

function handleVideoReplaceSelection(event: ChangeEvent<HTMLInputElement>) {
  if (event.currentTarget.files?.length) {
    event.currentTarget.form?.requestSubmit();
  }
}

function getSectionScrollOffset() {
  return window.innerWidth < 640 ? 24 : 104;
}

function scrollSectionIntoView(sectionId: SectionKey, behavior: ScrollBehavior = "smooth") {
  const section = document.getElementById(sectionId);

  if (!section) {
    return;
  }

  const targetTop =
    section.getBoundingClientRect().top + window.scrollY - getSectionScrollOffset();

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior,
  });
}

function focusElementWithoutScrolling(element: HTMLInputElement | null) {
  if (!element) {
    return;
  }

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

export function DashboardTabs({
  activeInvites,
  canReview,
  commonLabels,
  escalationReviewItems,
  extraCategorySuggestions,
  featureRequestsEnabled,
  labels,
  locale,
  measurementPoints,
  openDays,
  overview,
  pendingApprovals,
  participantRows,
  performancePoints,
  reviewFeedbackItems,
  primaryReviewItems,
  profile,
  sicknessReviewItems,
  timelineEntries,
  initialTimelineDate,
  previewMode,
}: {
  activeInvites: ActiveInviteSummary[];
  canReview: boolean;
  commonLabels: AppDictionary["common"];
  escalationReviewItems: EscalationReviewItem[];
  extraCategorySuggestions: string[];
  featureRequestsEnabled: boolean;
  labels: DashboardLabels;
  locale: Locale;
  measurementPoints: MeasurementPoint[];
  openDays: OpenDay[];
  overview: OverviewSummary;
  pendingApprovals: PendingApprovalSummary[];
  participantRows: ParticipantRow[];
  performancePoints: PerformancePoint[];
  reviewFeedbackItems: ReviewFeedbackItem[];
  primaryReviewItems: PrimaryReviewItem[];
  profile: ProfileSummary;
  sicknessReviewItems: SicknessReviewItem[];
  timelineEntries: TimelineEntry[];
  initialTimelineDate?: string;
  previewMode?: boolean;
}) {
  const baseSections = useMemo<ReadonlyArray<{ key: SectionKey; label: string }>>(
    () => [
      { key: "overview", label: labels.tabs.overview },
      { key: "uploads", label: labels.tabs.uploads },
      { key: "timeline", label: labels.tabs.timeline },
      { key: "metastats", label: labels.tabs.metastats },
      { key: "profile", label: labels.tabs.profile },
      { key: "regeln", label: labels.tabs.rules },
      { key: "rechner", label: labels.tabs.calculator },
    ],
    [
      labels.tabs.calculator,
      labels.tabs.metastats,
      labels.tabs.overview,
      labels.tabs.profile,
      labels.tabs.rules,
      labels.tabs.timeline,
      labels.tabs.uploads,
    ],
  );

  const canShowReviewSection = canReviewPlatformContent(overview);
  const hasStudentPricing = overview.hasStudentDiscount && canAccrueChallengeDebt(overview);

  const sections = useMemo(() => {
    const nextSections = previewMode
      ? baseSections.filter(
          (section) => section.key !== "uploads" && section.key !== "profile",
        )
      : [...baseSections];

    if (canShowReviewSection) {
      nextSections.splice(4, 0, { key: "review", label: labels.tabs.review });
    }

    return nextSections as readonly { key: SectionKey; label: string }[];
  }, [baseSections, canShowReviewSection, labels.tabs.review, previewMode]);

  const rules = overview.isLightParticipant
    ? labels.rules.lightRules
    : hasStudentPricing
      ? labels.rules.studentRules
      : labels.rules.fullRules;

  const [claimEditorReplacementTargets, setClaimEditorReplacementTargets] =
    useState<ClaimEditorReplacementState>({});
  const [expandedClaimEditors, setExpandedClaimEditors] = useState<Record<string, boolean>>({});
  const [focusedClaimEditor, setFocusedClaimEditor] =
    useState<FocusedClaimEditorState>(null);

  const uploadSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const uploadFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadPrimaryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const claimEditorFocusTokenRef = useRef(0);
  const claimEditorFocusFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!focusedClaimEditor) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setFocusedClaimEditor((current) =>
        current?.token === focusedClaimEditor.token ? null : current,
      );
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [focusedClaimEditor]);

  function focusClaimEditor(
    challengeDate: string,
    options: {
      openFilePicker?: boolean;
      replaceVideoId?: string | null;
    } = {},
  ) {
    const replaceVideoId = options.replaceVideoId ?? null;
    const shouldOpenFilePicker = Boolean(options.openFilePicker || replaceVideoId);

    setExpandedClaimEditors({ [challengeDate]: true });
    setFocusedClaimEditor({
      challengeDate,
      openFilePicker: shouldOpenFilePicker,
      token: ++claimEditorFocusTokenRef.current,
    });
    setClaimEditorReplacementTargets((current) => ({
      ...current,
      [challengeDate]: replaceVideoId,
    }));
  }

  useEffect(() => {
    if (!focusedClaimEditor) return;

    const frame = window.requestAnimationFrame(() => {
      const target = uploadSectionRefs.current[focusedClaimEditor.challengeDate];
      target?.scrollIntoView({ behavior: "smooth", block: "start" });

      const focusFrame = window.requestAnimationFrame(() => {
        if (focusedClaimEditor.openFilePicker) {
          const fileInput = uploadFileInputRefs.current[focusedClaimEditor.challengeDate];
          focusElementWithoutScrolling(fileInput);
          fileInput?.click();
        } else {
          focusElementWithoutScrolling(
            uploadPrimaryInputRefs.current[focusedClaimEditor.challengeDate],
          );
        }
      });

      claimEditorFocusFrameRef.current = focusFrame;
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (claimEditorFocusFrameRef.current != null) {
        window.cancelAnimationFrame(claimEditorFocusFrameRef.current);
      }
    };
  }, [focusedClaimEditor, uploadFileInputRefs, uploadPrimaryInputRefs, uploadSectionRefs]);

  function clearClaimEditorReplacementTarget(challengeDate: string) {
    setClaimEditorReplacementTargets((current) => ({
      ...current,
      [challengeDate]: null,
    }));
  }

  function openVideo(videoId: string) {
    window.open(`/api/videos/${videoId}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-6 fc-has-bottom-nav">
      <nav aria-label="Dashboard sections" className="fc-tab-bar">
        {sections.map((section) => (
          <button
            className="fc-tab"
            key={section.key}
            onClick={() => {
              window.history.replaceState(null, "", `#${section.key}`);
              scrollSectionIntoView(section.key);
            }}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="fc-dashboard-flow">
        <DashboardOverviewSection
          canReview={canReview}
          labels={labels}
          overview={overview}
          participantRows={participantRows}
          pendingApprovals={pendingApprovals}
        />

        {!previewMode ? <DashboardUploadSection
          claimEditorReplacementTargets={claimEditorReplacementTargets}
          commonLabels={commonLabels}
          expandedClaimEditors={expandedClaimEditors}
          extraCategorySuggestions={extraCategorySuggestions}
          focusedClaimEditor={focusedClaimEditor}
          labels={labels}
          locale={locale}
          onClearReplacementTarget={clearClaimEditorReplacementTarget}
          onFocusClaimEditor={focusClaimEditor}
          onVideoOpen={openVideo}
          openDays={openDays}
          overview={overview}
          uploadFileInputRefs={uploadFileInputRefs}
          uploadPrimaryInputRefs={uploadPrimaryInputRefs}
          uploadSectionRefs={uploadSectionRefs}
        /> : null}

        <DashboardHistorySection
          commonLabels={commonLabels}
          labels={labels}
          onClaimEdit={(challengeDate) => focusClaimEditor(challengeDate)}
          onClaimAddVideos={(challengeDate) =>
            focusClaimEditor(challengeDate, { openFilePicker: true })
          }
          onEditableVideoReplace={(challengeDate, videoId) =>
            focusClaimEditor(challengeDate, {
              openFilePicker: true,
              replaceVideoId: videoId,
            })
          }
          onVideoReplaceSelection={handleVideoReplaceSelection}
          readOnly={previewMode}
          initialTimelineDate={initialTimelineDate}
          timelineEntries={timelineEntries}
        />

        <DashboardMetastatsSection
          labels={labels}
          measurementPoints={measurementPoints}
          performancePoints={performancePoints}
          profile={profile}
        />

        {canShowReviewSection ? (
          <DashboardReviewSection
            commonLabels={commonLabels}
            escalationReviewItems={escalationReviewItems}
            labels={labels}
            participantRows={participantRows}
            reviewFeedbackItems={reviewFeedbackItems}
            primaryReviewItems={primaryReviewItems}
            sicknessReviewItems={sicknessReviewItems}
          />
        ) : null}

        {!previewMode ? <DashboardProfileSection
          activeInvites={activeInvites}
          canReview={canReview}
          commonLabels={commonLabels}
          featureRequestsEnabled={featureRequestsEnabled}
          labels={labels}
          locale={locale}
          profile={profile}
        /> : null}

        <DashboardRulesSection labels={labels} overview={overview} rules={rules} />

        <DashboardCalculatorSection
          commonLabels={commonLabels}
          labels={labels}
          locale={locale}
          overview={overview}
          profile={profile}
        />
      </div>
    </div>
  );
}
