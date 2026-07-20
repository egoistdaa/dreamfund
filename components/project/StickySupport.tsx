"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, ProjectStatus } from "@/types";
import {
  achievementRate,
  daysLeft,
  formatYen,
} from "@/lib/format";
import { useAuthGate } from "@/components/auth/AuthGate";

type SupportAvailability =
  | "checking"
  | "available"
  | "not_started"
  | "ended";

function getSupportAvailability(
  projectStatus: ProjectStatus,
  startAt?: string | null,
  endAt?: string | null
): SupportAvailability {
  if (projectStatus !== "live") {
    return "ended";
  }

  const now = Date.now();
  const startTime = startAt
    ? new Date(startAt).getTime()
    : null;
  const endTime = endAt
    ? new Date(endAt).getTime()
    : null;

  if (
    startTime !== null &&
    !Number.isNaN(startTime) &&
    startTime > now
  ) {
    return "not_started";
  }

  if (
    endTime !== null &&
    !Number.isNaN(endTime) &&
    endTime <= now
  ) {
    return "ended";
  }

  return "available";
}

export function StickySupport({
  project,
}: {
  project: Project;
}) {
  const router = useRouter();
  const { requireLogin, loadingUser } = useAuthGate();

  const [availability, setAvailability] =
    useState<SupportAvailability>("checking");

  useEffect(() => {
    function updateAvailability() {
      setAvailability(
        getSupportAvailability(
          project.status,
          project.startAt,
          project.endAt
        )
      );
    }

    updateAvailability();

    const timer = window.setInterval(
      updateAvailability,
      30_000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    project.status,
    project.startAt,
    project.endAt,
  ]);

  const rate = achievementRate(project);
  const days = Math.max(0, daysLeft(project.endAt));
  const supportPath = `/support/${project.slug}`;
  const canSupport = availability === "available";
  const isDisabled = loadingUser || !canSupport;

  function handleSupport() {
    if (isDisabled) {
      return;
    }

    if (!requireLogin(supportPath)) {
      return;
    }

    router.push(supportPath);
  }

  function getButtonLabel(): string {
    if (availability === "checking") {
      return "受付状況を確認中";
    }

    if (availability === "not_started") {
      return "募集開始前です";
    }

    if (availability === "ended") {
      return "募集は終了しました";
    }

    return "このプロジェクトを応援する";
  }

  function getPeriodLabel(): string {
    if (availability === "checking") {
      return "確認中";
    }

    if (availability === "not_started") {
      return "開始前";
    }

    if (availability === "ended") {
      return "募集終了";
    }

    return `残り${days}日`;
  }

  return (
    <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t border-line bg-white/95 px-4 pb-3 pt-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-ink-sub">
        <span>
          <span className="text-sm font-black text-brand">
            {rate}%
          </span>{" "}
          達成
        </span>

        <span>
          {formatYen(project.currentAmount)}
          {" "}集まっています
        </span>

        <span
          className={
            canSupport && days <= 3 ? "text-hot" : ""
          }
        >
          {getPeriodLabel()}
        </span>
      </div>

      <button
        type="button"
        onClick={handleSupport}
        disabled={isDisabled}
        className={`flex min-h-tap w-full items-center justify-center gap-2 rounded-[14px] text-base font-extrabold transition active:scale-[.99] ${
          isDisabled
            ? "cursor-not-allowed bg-sub text-ink-sub"
            : "bg-brand-135 text-white shadow-[0_12px_26px_-8px_rgba(37,99,235,.6)]"
        }`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M12 21C5.5 16.5 2 12.5 2 8.5 2 5.4 4.4 3 7.5 3 9.3 3 11 3.9 12 5.3 13 3.9 14.7 3 16.5 3 19.6 3 22 5.4 22 8.5c0 4-3.5 8-10 12.5z" />
        </svg>

        {getButtonLabel()}
      </button>
    </div>
  );
}