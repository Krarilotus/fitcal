"use client";

import type { AppDictionary } from "@/i18n";
import {
  DashboardActionButton,
  DashboardCardTitle,
  DashboardSectionHeader,
  DashboardStatBox,
} from "@/components/fitcal/dashboard/dashboard-primitives";
import { FeatureRequestCard } from "@/components/fitcal/feature-request-card";
import { DateTextInput } from "@/components/ui/date-text-input";
import { Button } from "@/components/ui/button";
import type { ProfileSummary } from "@/components/fitcal/dashboard-types";
import type { ActiveInviteSummary } from "@/lib/dashboard-data";
import type { Locale } from "@/lib/preferences";
import { replaceTemplate } from "@/lib/template";

export function DashboardProfileSection({
  activeInvites,
  canReview,
  commonLabels,
  featureRequestsEnabled,
  labels,
  locale,
  profile,
}: {
  activeInvites: ActiveInviteSummary[];
  canReview: boolean;
  commonLabels: AppDictionary["common"];
  featureRequestsEnabled: boolean;
  labels: AppDictionary["dashboard"];
  locale: Locale;
  profile: ProfileSummary;
}) {
  return (
    <section className="fc-section fc-rise" id="profile">
      <DashboardSectionHeader title={labels.tabs.profile} />
      <div className="space-y-6">
        <section className="fc-card">
          <DashboardCardTitle title={labels.tabs.profile} />
          {profile.motivation ? (
            <p className="mt-1 fc-text-muted">{profile.motivation}</p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <DashboardStatBox label={commonLabels.email} value={profile.email} />
            <DashboardStatBox
              label={labels.metastats.emailVerification}
              value={
                profile.emailVerified
                  ? labels.metastats.emailVerified
                  : labels.metastats.emailUnverified
              }
            />
            {profile.birthDateLabel ? (
              <DashboardStatBox
                label={labels.metastats.birthDate}
                value={profile.birthDateLabel}
              />
            ) : null}
            {profile.heightLabel ? (
              <DashboardStatBox
                label={labels.metastats.heightCm}
                value={profile.heightLabel}
              />
            ) : null}
          </div>
          <div className="mt-4 fc-info-box">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="fc-text-emphasis">
                  {profile.emailVerified
                    ? labels.metastats.emailVerified
                    : labels.metastats.emailUnverified}
                </p>
                <p className="mt-1 fc-text-muted">
                  {profile.emailVerified && profile.emailVerifiedAtLabel
                    ? replaceTemplate(labels.metastats.emailVerifiedAt, {
                        date: profile.emailVerifiedAtLabel,
                      })
                    : labels.metastats.emailVerificationHint}
                </p>
              </div>
              {!profile.emailVerified ? (
                <form action="/api/auth/request-verification" method="post">
                  <input name="email" type="hidden" value={profile.email} />
                  <input name="locale" type="hidden" value={locale} />
                  <input name="redirectTo" type="hidden" value="/dashboard" />
                  <DashboardActionButton type="submit" variant="secondary">
                    {labels.metastats.sendVerification}
                  </DashboardActionButton>
                </form>
              ) : null}
            </div>
          </div>
          <form action="/api/profile" className="mt-5 space-y-4" method="post">
            <div className="fc-grid-2">
              <label className="fc-input-group">
                <span className="fc-input-label">{labels.metastats.name}</span>
                <input
                  className="fc-input"
                  defaultValue={profile.name ?? ""}
                  name="name"
                  type="text"
                />
              </label>
              <label className="fc-input-group">
                <span className="fc-input-label">{labels.metastats.birthDate}</span>
                <DateTextInput
                  className="fc-input"
                  defaultValue={profile.birthDateInput}
                  name="birthDate"
                  placeholder={commonLabels.datePlaceholder}
                />
              </label>
              <label className="fc-input-group">
                <span className="fc-input-label">{labels.metastats.heightCm}</span>
                <input
                  className="fc-input"
                  defaultValue={profile.heightInput}
                  inputMode="decimal"
                  name="heightCm"
                  step="0.1"
                  type="number"
                />
              </label>
            </div>
            <label className="fc-input-group">
              <span className="fc-input-label">{labels.metastats.motivation}</span>
              <textarea
                className="fc-input min-h-20"
                defaultValue={profile.motivation ?? ""}
                maxLength={240}
                name="motivation"
                placeholder={labels.metastats.notes}
              />
            </label>
            <Button type="submit">{labels.metastats.saveProfile}</Button>
          </form>
        </section>

        {canReview ? (
          <section className="fc-card">
            <DashboardCardTitle title={labels.invite.title} />
            <form
              action="/api/invitations"
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              method="post"
            >
              <label className="fc-input-group flex-1">
                <span className="fc-input-label">{labels.invite.emailLabel}</span>
                <input
                  className="fc-input"
                  name="email"
                  placeholder={labels.invite.emailPlaceholder}
                  required
                  type="email"
                />
              </label>
              <div className="flex items-end">
                <Button type="submit">{labels.invite.submit}</Button>
              </div>
            </form>

            {activeInvites.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="fc-text-muted">{labels.invite.active}</p>
                {activeInvites.map((invite) => (
                  <div
                    className="flex flex-col gap-2 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    key={invite.id}
                  >
                    <p className="min-w-0 truncate fc-text-emphasis">
                      {invite.email}
                    </p>
                    <form action="/api/invitations/revoke" method="post">
                      <input name="inviteId" type="hidden" value={invite.id} />
                      <DashboardActionButton type="submit" variant="secondary">
                        {labels.invite.revoke}
                      </DashboardActionButton>
                    </form>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="fc-card">
          <FeatureRequestCard
            compact
            enabled={featureRequestsEnabled}
            labels={labels.featureRequest}
            locale={locale}
          />
        </section>
      </div>
    </section>
  );
}
