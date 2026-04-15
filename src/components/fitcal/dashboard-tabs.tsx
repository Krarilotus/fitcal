"use client";

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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

/* ── Tab & animation types ── */

type DashboardLabels = AppDictionary["dashboard"];
type TabKey =
  | "overview"
  | "uploads"
  | "timeline"
  | "metastats"
  | "review"
  | "regeln"
  | "rechner"
  | "profile";

type PanelTransitionDirection = "forward" | "backward";

/* ── Scroll-driven crossfade configuration ── */

/**
 * Height of the invisible sentinel zone at the bottom of each active panel.
 * Scrolling into this zone drives the forward tab transition.  Native scroll
 * momentum is fully preserved because no `preventDefault` is needed — the
 * browser simply scrolls through this extra space while the scroll handler
 * maps the position to fade progress.
 */
const SCROLL_SENTINEL_HEIGHT = 400;

/** Accumulated-delta distance for **backward** (wheel / touch) transitions. */
const FADE_SCROLL_DISTANCE = 1500;

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * 32;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function outgoingOpacity(p: number) {
  return p <= 0 ? 1 : p >= 0.35 ? 0 : 1 - p / 0.35;
}

function incomingOpacity(p: number) {
  return p <= 0.65 ? 0 : p >= 1 ? 1 : (p - 0.65) / 0.35;
}

type ClaimEditorReplacementState = Record<string, string | null>;

/* ── Helpers ── */

function handleVideoReplaceSelection(event: ChangeEvent<HTMLInputElement>) {
  if (event.currentTarget.files?.length) {
    event.currentTarget.form?.requestSubmit();
  }
}

/* ── Component ── */

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
  /* ── Tab definitions ── */

  const baseTabs = useMemo<ReadonlyArray<{ key: TabKey; label: string }>>(
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

  const tabs = useMemo(() => {
    const nextTabs = [...baseTabs];

    if (!overview.isLightParticipant) {
      nextTabs.splice(4, 0, { key: "review", label: labels.tabs.review });
    }

    return nextTabs as readonly { key: TabKey; label: string }[];
  }, [baseTabs, labels.tabs.review, overview.isLightParticipant]);

  /* ── State ── */

  const hasStudentPricing = overview.hasStudentDiscount && !overview.isLightParticipant;
  const rules = overview.isLightParticipant ? labels.rules.lightRules : hasStudentPricing ? labels.rules.studentRules : labels.rules.fullRules;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedUploadVideos, setSelectedUploadVideos] = useState<Record<string, SelectedUploadVideo[]>>({});
  const [uploadActivities, setUploadActivities] = useState<Record<string, UploadActivity | null>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
  const [claimEditorReplacementTargets, setClaimEditorReplacementTargets] =
    useState<ClaimEditorReplacementState>({});
  const [expandedClaimEditors, setExpandedClaimEditors] = useState<Record<string, boolean>>({});
  const [focusedClaimEditor, setFocusedClaimEditor] =
    useState<FocusedClaimEditorState>(null);
  const [transitionTarget, setTransitionTarget] = useState<TabKey | null>(null);
  const [fadeProgress, setFadeProgress] = useState(0);

  const uploadSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const uploadFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadPrimaryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const touchLastYRef = useRef<number | null>(null);
  const activeTabRef = useRef(activeTab);
  const fadeProgressRef = useRef(0);
  const fadeDirectionRef = useRef<PanelTransitionDirection | null>(null);
  const transitionTargetRef = useRef<TabKey | null>(null);
  const scrollCommitGuardRef = useRef(false);
  const claimEditorFocusTokenRef = useRef(0);

  /* ── Tab switching ── */

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  function cancelFade() {
    setTransitionTarget(null);
    setFadeProgress(0);
    transitionTargetRef.current = null;
    fadeDirectionRef.current = null;
    fadeProgressRef.current = 0;
  }

  function switchToTab(nextTab: TabKey, options?: { preserveScroll?: boolean }) {
    if (nextTab === activeTab) return;
    if (fadeDirectionRef.current) cancelFade();

    scrollCommitGuardRef.current = true;
    activeTabRef.current = nextTab;
    setActiveTab(nextTab);

    if (!options?.preserveScroll) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    requestAnimationFrame(() => {
      scrollCommitGuardRef.current = false;
    });
  }

  /* ── Upload claim editor focus ── */

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
      switchToTab("uploads", { preserveScroll: true });
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
    });

    document
      .getElementById("uploads")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

    const stickyOffset = 112;
    window.setTimeout(() => {
      const target = uploadSectionRefs.current[challengeDate];

      if (!target) {
        return;
      }

      if (shouldOpenFilePicker) {
        const fileInput = uploadFileInputRefs.current[challengeDate];
        fileInput?.focus();
        fileInput?.click();
      } else {
        uploadPrimaryInputRefs.current[challengeDate]?.focus();
      }

      const targetTop = target.getBoundingClientRect().top + window.scrollY - stickyOffset;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    }, 40);
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

  function submitDashboardPostAction(
    action: string,
    fields: Record<string, string>,
  ) {
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

  /* ── Effects ── */

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

  useEffect(() => {
    function commitTransition() {
      const target = transitionTargetRef.current;
      if (!target) return;

      scrollCommitGuardRef.current = true;
      activeTabRef.current = target;
      fadeDirectionRef.current = null;
      transitionTargetRef.current = null;
      fadeProgressRef.current = 0;
      setActiveTab(target);
      setTransitionTarget(null);
      setFadeProgress(0);

      /* After React renders the new panel we need to place the scroll so the
         user doesn't land inside the new panel's bottom sentinel.  Using two
         rAF frames ensures the DOM has been updated. */
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "auto" });
        requestAnimationFrame(() => {
          scrollCommitGuardRef.current = false;
        });
      });
    }

    function cancelTransition() {
      fadeDirectionRef.current = null;
      transitionTargetRef.current = null;
      fadeProgressRef.current = 0;
      setTransitionTarget(null);
      setFadeProgress(0);
    }

    /* ── Forward transitions: scroll-sentinel-based ── */

    function getNeighborTab(direction: PanelTransitionDirection): TabKey | null {
      const idx = tabs.findIndex((t) => t.key === activeTabRef.current);
      const next = direction === "forward" ? idx + 1 : idx - 1;
      return tabs[next]?.key ?? null;
    }

    let scrollRafPending = false;

    function handleScroll() {
      if (scrollCommitGuardRef.current) return;

      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      const maxScroll = docHeight - viewHeight;

      /* Only activate when the active tab has a next neighbor (sentinel exists). */
      const activeIdx = tabs.findIndex((t) => t.key === activeTabRef.current);
      const hasNext = activeIdx >= 0 && activeIdx < tabs.length - 1;

      if (!hasNext) {
        if (fadeDirectionRef.current === "forward") cancelTransition();
        return;
      }

      const sentinelStart = maxScroll - SCROLL_SENTINEL_HEIGHT;

      if (scrollY <= sentinelStart) {
        /* Scrolled back out of the sentinel — cancel any active forward fade. */
        if (fadeDirectionRef.current === "forward") cancelTransition();
        return;
      }

      /* We're inside the sentinel zone. */
      const progress = Math.min(1, (scrollY - sentinelStart) / SCROLL_SENTINEL_HEIGHT);

      if (!fadeDirectionRef.current) {
        const next = getNeighborTab("forward");
        if (!next) return;
        fadeDirectionRef.current = "forward";
        transitionTargetRef.current = next;
        setTransitionTarget(next);
      }

      if (fadeDirectionRef.current !== "forward") return;
      fadeProgressRef.current = progress;

      if (!scrollRafPending) {
        scrollRafPending = true;
        requestAnimationFrame(() => {
          scrollRafPending = false;
          if (fadeProgressRef.current >= 1) {
            commitTransition();
          } else {
            setFadeProgress(fadeProgressRef.current);
          }
        });
      }
    }

    /* ── Backward transitions: wheel + touch delta based ── */

    function startBackwardTransition(targetKey: TabKey, initialDelta: number) {
      fadeDirectionRef.current = "backward";
      transitionTargetRef.current = targetKey;
      fadeProgressRef.current = Math.abs(initialDelta) / FADE_SCROLL_DISTANCE;
      setTransitionTarget(targetKey);
      setFadeProgress(fadeProgressRef.current);
    }

    function advanceBackwardTransition(deltaY: number) {
      if (fadeDirectionRef.current !== "backward") return;
      /* deltaY < 0 means scrolling up → advance backward transition */
      if (deltaY < 0) {
        fadeProgressRef.current = Math.min(1, fadeProgressRef.current + Math.abs(deltaY) / FADE_SCROLL_DISTANCE);
      } else {
        fadeProgressRef.current = Math.max(0, fadeProgressRef.current - Math.abs(deltaY) / FADE_SCROLL_DISTANCE);
      }
      if (fadeProgressRef.current >= 1) { commitTransition(); return; }
      if (fadeProgressRef.current <= 0) { cancelTransition(); return; }
      setFadeProgress(fadeProgressRef.current);
    }

    function shouldIgnoreGesture(target: EventTarget | null) {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          [
            "input",
            "textarea",
            "select",
            "button",
            "a",
            "video",
            "summary",
            "[contenteditable='true']",
            ".fc-scroll-x",
            ".fc-scroll-y",
            "[data-fitcal-no-panel-swipe]",
          ].join(","),
        ),
      );
    }

    function handleWheel(event: WheelEvent) {
      if (shouldIgnoreGesture(event.target) || Math.abs(event.deltaY) < 5) return;

      const delta = normalizeWheelDelta(event);

      /* Forward transitions are handled by the scroll handler (sentinel). */
      if (fadeDirectionRef.current === "forward") return;

      const isFadingBackward = fadeDirectionRef.current === "backward";

      if (!isFadingBackward) {
        /* Only start backward (scroll-up at page top). */
        if (delta < 0 && window.scrollY <= 20) {
          const prev = getNeighborTab("backward");
          if (!prev) return;
          event.preventDefault();
          startBackwardTransition(prev, Math.abs(delta));
        }
        return;
      }

      event.preventDefault();
      advanceBackwardTransition(delta);
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1 || shouldIgnoreGesture(event.target)) {
        touchLastYRef.current = null;
        return;
      }
      touchLastYRef.current = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      if (touchLastYRef.current == null) return;
      const currentY = event.touches[0]?.clientY;
      if (typeof currentY !== "number") return;

      const delta = touchLastYRef.current - currentY;
      touchLastYRef.current = currentY;

      /* Forward transitions are fully handled by the scroll handler. */
      if (fadeDirectionRef.current === "forward") return;

      if (fadeDirectionRef.current === "backward") {
        event.preventDefault();
        advanceBackwardTransition(delta);
        return;
      }

      /* Start a backward transition when dragging down from the page top. */
      if (delta < 0 && window.scrollY <= 20) {
        const prev = getNeighborTab("backward");
        if (!prev) return;
        event.preventDefault();
        startBackwardTransition(prev, Math.abs(delta));
      }
    }

    function handleTouchEnd() {
      touchLastYRef.current = null;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [tabs]);

  /* ── Panel rendering ── */

  function renderPanel(tabKey: TabKey, content: ReactNode) {
    const isActive = activeTab === tabKey;
    const isTarget = transitionTarget === tabKey;

    let panelOpacity: number;
    if (isActive && transitionTarget !== null) {
      panelOpacity = outgoingOpacity(fadeProgress);
    } else if (isTarget) {
      panelOpacity = incomingOpacity(fadeProgress);
    } else if (isActive) {
      panelOpacity = 1;
    } else {
      panelOpacity = 0;
    }

    const tabIndex = tabs.findIndex((t) => t.key === tabKey);
    const hasNext = tabIndex >= 0 && tabIndex < tabs.length - 1;

    return (
      <div
        aria-hidden={!isActive}
        className={`fc-panel-view${isActive ? " is-active" : ""}${isTarget ? " is-transition-target" : ""}`}
        data-panel-key={tabKey}
        style={{ opacity: panelOpacity }}
      >
        {content}
        {isActive && hasNext && (
          <div aria-hidden className="fc-scroll-sentinel" style={{ height: SCROLL_SENTINEL_HEIGHT }} />
        )}
      </div>
    );
  }

  /* ── Render ── */

  return (
    <div className="grid gap-6 fc-has-bottom-nav">
      <nav className="fc-tab-bar">
        {tabs.map((tab) => (
          <button
            className={`fc-tab ${activeTab === tab.key ? "is-active" : ""}`}
            key={tab.key}
            onClick={() => switchToTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="fc-panel-stage">
        {renderPanel("overview", (
          <DashboardOverviewSection
            canReview={canReview}
            labels={labels}
            overview={overview}
            pendingApprovals={pendingApprovals}
          />
        ))}

        {renderPanel("uploads", (
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
        ))}

        {renderPanel("timeline", (
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
        ))}

        {renderPanel("metastats", (
          <DashboardMetastatsSection
            labels={labels}
            measurementPoints={measurementPoints}
            performancePoints={performancePoints}
            profile={profile}
          />
        ))}

        {renderPanel("profile", (
          <DashboardProfileSection
            activeInvites={activeInvites}
            canReview={canReview}
            commonLabels={commonLabels}
            featureRequestsEnabled={featureRequestsEnabled}
            labels={labels}
            locale={locale}
            profile={profile}
          />
        ))}

        {!overview.isLightParticipant ? renderPanel("review", (
          <DashboardReviewSection
            commonLabels={commonLabels}
            escalationReviewItems={escalationReviewItems}
            labels={labels}
            participantRows={participantRows}
            reviewFeedbackItems={reviewFeedbackItems}
            primaryReviewItems={primaryReviewItems}
            sicknessReviewItems={sicknessReviewItems}
          />
        )) : null}

        {renderPanel("regeln", (
          <DashboardRulesSection
            labels={labels}
            overview={overview}
            rules={rules}
          />
        ))}

        {renderPanel("rechner", (
          <DashboardCalculatorSection
            commonLabels={commonLabels}
            labels={labels}
            locale={locale}
            overview={overview}
            profile={profile}
          />
        ))}
      </div>
    </div>
  );
}
