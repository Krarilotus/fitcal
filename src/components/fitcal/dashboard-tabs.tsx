"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { AppDictionary } from "@/i18n";
import { DashboardHistorySection } from "@/components/fitcal/dashboard/history-section";
import { DashboardProfileSection } from "@/components/fitcal/dashboard/profile-section";
import { DashboardReviewSection } from "@/components/fitcal/dashboard/review-section";
import { DashboardOverviewSection } from "@/components/fitcal/dashboard/overview-section";
import {
  DashboardUploadSection,
  type FocusedClaimEditorState,
  type SelectedUploadVideo,
  type UploadActivity,
} from "@/components/fitcal/dashboard/upload-section";
import { DashboardMetastatsSection } from "@/components/fitcal/dashboard/metastats-section";
import { DashboardRulesSection } from "@/components/fitcal/dashboard/rules-section";
import { DashboardCalculatorSection } from "@/components/fitcal/dashboard/calculator-section";
import type {
  EscalationReviewItem,
  MeasurementPoint,
  OpenDay,
  OverviewSummary,
  ParticipantRow,
  PerformancePoint,
  PrimaryReviewItem,
  ProfileSummary,
  ReviewFeedbackItem,
  SicknessReviewItem,
  TimelineEntry,
} from "@/components/fitcal/dashboard-types";
import type { ActiveInviteSummary, PendingApprovalSummary } from "@/lib/dashboard-data";
import type { Locale } from "@/lib/preferences";

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
}: {
  activeInvites: ActiveInviteSummary[];
  canReview: boolean;
  commonLabels: AppDictionary["common"];
  escalationReviewItems: EscalationReviewItem[];
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

  const sections = useMemo(() => {
    const nextSections = [...baseSections];

    if (!overview.isLightParticipant) {
      nextSections.splice(4, 0, { key: "review", label: labels.tabs.review });
    }

    return nextSections as readonly { key: SectionKey; label: string }[];
  }, [baseSections, labels.tabs.review, overview.isLightParticipant]);

  const hasStudentPricing = overview.hasStudentDiscount && !overview.isLightParticipant;
  const rules = overview.isLightParticipant
    ? labels.rules.lightRules
    : hasStudentPricing
      ? labels.rules.studentRules
      : labels.rules.fullRules;

  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [selectedUploadVideos, setSelectedUploadVideos] = useState<
    Record<string, SelectedUploadVideo[]>
  >({});
  const [uploadActivities, setUploadActivities] = useState<Record<string, UploadActivity | null>>(
    {},
  );
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [claimEditorReplacementTargets, setClaimEditorReplacementTargets] =
    useState<ClaimEditorReplacementState>({});
  const [expandedClaimEditors, setExpandedClaimEditors] = useState<Record<string, boolean>>({});
  const [focusedClaimEditor, setFocusedClaimEditor] =
    useState<FocusedClaimEditorState>(null);

  const uploadSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const uploadFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadPrimaryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const claimEditorFocusTokenRef = useRef(0);

  useEffect(() => {
    function updateActiveSection() {
      const threshold = window.scrollY + getSectionScrollOffset() + 24;

      let nextActiveSection = sections[0]?.key ?? "overview";

      for (const section of sections) {
        const element = document.getElementById(section.key);

        if (!element) {
          continue;
        }

        if (element.offsetTop <= threshold) {
          nextActiveSection = section.key;
        } else {
          break;
        }
      }

      setActiveSection((current) =>
        current === nextActiveSection ? current : nextActiveSection,
      );
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sections]);

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

    flushSync(() => {
      setExpandedClaimEditors((current) => ({
        ...current,
        [challengeDate]: true,
      }));
      setFocusedClaimEditor({
        challengeDate,
        token: ++claimEditorFocusTokenRef.current,
      });
      setClaimEditorReplacementTargets((current) => ({
        ...current,
        [challengeDate]: replaceVideoId,
      }));
      setSelectedUploadVideos((current) => ({
        ...current,
        [challengeDate]: [],
      }));
      setUploadErrors((current) => ({
        ...current,
        [challengeDate]: null,
      }));
      setActiveSection("uploads");
    });

    scrollSectionIntoView("uploads");

    window.setTimeout(() => {
      const target = uploadSectionRefs.current[challengeDate];

      if (!target) {
        return;
      }

      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - getSectionScrollOffset();

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });

      window.setTimeout(() => {
        if (shouldOpenFilePicker) {
          const fileInput = uploadFileInputRefs.current[challengeDate];
          focusElementWithoutScrolling(fileInput);
          fileInput?.click();
          return;
        }

        focusElementWithoutScrolling(uploadPrimaryInputRefs.current[challengeDate]);
      }, 180);
    }, 60);
  }

  function clearClaimEditorReplacementTarget(challengeDate: string) {
    setClaimEditorReplacementTargets((current) => ({
      ...current,
      [challengeDate]: null,
    }));
    setSelectedUploadVideos((current) => ({
      ...current,
      [challengeDate]: [],
    }));
  }

  function openVideo(videoId: string) {
    window.open(`/api/videos/${videoId}`, "_blank", "noopener,noreferrer");
  }

  function submitDashboardPostAction(action: string, fields: Record<string, string>) {
    const form = document.createElement("form");
    form.method = "post";
    form.action = action;
    form.style.display = "none";

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.requestSubmit();
    window.setTimeout(() => {
      form.remove();
    }, 0);
  }

  return (
    <div className="grid gap-6 fc-has-bottom-nav">
      <nav aria-label="Dashboard sections" className="fc-tab-bar">
        {sections.map((section) => (
          <button
            aria-current={activeSection === section.key ? "page" : undefined}
            className={`fc-tab ${activeSection === section.key ? "is-active" : ""}`}
            key={section.key}
            onClick={() => {
              setActiveSection(section.key);
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
          pendingApprovals={pendingApprovals}
        />

        <DashboardUploadSection
          claimEditorReplacementTargets={claimEditorReplacementTargets}
          commonLabels={commonLabels}
          expandedClaimEditors={expandedClaimEditors}
          focusedClaimEditor={focusedClaimEditor}
          labels={labels}
          locale={locale}
          onClearReplacementTarget={clearClaimEditorReplacementTarget}
          onFocusClaimEditor={focusClaimEditor}
          onSubmitPostAction={submitDashboardPostAction}
          onVideoOpen={openVideo}
          openDays={openDays}
          overview={overview}
          selectedUploadVideos={selectedUploadVideos}
          setSelectedUploadVideos={setSelectedUploadVideos}
          setUploadActivities={setUploadActivities}
          setUploadErrors={setUploadErrors}
          uploadActivities={uploadActivities}
          uploadErrors={uploadErrors}
          uploadFileInputRefs={uploadFileInputRefs}
          uploadPrimaryInputRefs={uploadPrimaryInputRefs}
          uploadSectionRefs={uploadSectionRefs}
        />

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
          timelineEntries={timelineEntries}
        />

        <DashboardMetastatsSection
          labels={labels}
          measurementPoints={measurementPoints}
          performancePoints={performancePoints}
          profile={profile}
        />

        {!overview.isLightParticipant ? (
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

        <DashboardProfileSection
          activeInvites={activeInvites}
          canReview={canReview}
          commonLabels={commonLabels}
          featureRequestsEnabled={featureRequestsEnabled}
          labels={labels}
          locale={locale}
          profile={profile}
        />

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
