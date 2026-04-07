"use client";

import { useState } from "react";
import type { AppDictionary } from "@/i18n";

type RegisterLabels = AppDictionary["auth"]["register"];
type ParticipationMode = "standard" | "student" | "light";

export function RegisterPlanSelector({ labels }: { labels: RegisterLabels }) {
  const [mode, setMode] = useState<ParticipationMode>("standard");

  return (
    <fieldset className="grid gap-3 sm:col-span-2">
      <legend className="fc-input-label">{labels.planTitle}</legend>
      <input
        name="isStudentDiscount"
        type="hidden"
        value={mode === "student" ? "true" : "false"}
      />
      <input
        name="isLightParticipant"
        type="hidden"
        value={mode === "light" ? "true" : "false"}
      />

      <label className="flex items-start gap-3 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3 text-sm text-[var(--fc-ink)]">
        <input
          checked={mode === "standard"}
          className="mt-1 h-4 w-4 accent-[var(--fc-accent)]"
          name="participationMode"
          onChange={() => setMode("standard")}
          type="radio"
          value="standard"
        />
        <span>
          <span className="block font-medium">{labels.standard}</span>
          <span className="mt-1 block text-[var(--fc-muted)]">{labels.standardHint}</span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3 text-sm text-[var(--fc-ink)]">
        <input
          checked={mode === "student"}
          className="mt-1 h-4 w-4 accent-[var(--fc-accent)]"
          name="participationMode"
          onChange={() => setMode("student")}
          type="radio"
          value="student"
        />
        <span>
          <span className="block font-medium">{labels.student}</span>
          <span className="mt-1 block text-[var(--fc-muted)]">{labels.studentHint}</span>
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-[var(--fc-radius)] border border-[var(--fc-border)] bg-[var(--fc-bg-raised)] px-4 py-3 text-sm text-[var(--fc-ink)]">
        <input
          checked={mode === "light"}
          className="mt-1 h-4 w-4 accent-[var(--fc-accent)]"
          name="participationMode"
          onChange={() => setMode("light")}
          type="radio"
          value="light"
        />
        <span>
          <span className="block font-medium">{labels.light}</span>
          <span className="mt-1 block text-[var(--fc-muted)]">{labels.lightHint}</span>
        </span>
      </label>
    </fieldset>
  );
}
