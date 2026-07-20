"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectStatus, Return } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { formatYen } from "@/lib/format";
import { useAuthGate } from "@/components/auth/AuthGate";

type SupportAvailability =
  | "checking"
  | "available"
  | "not_started"
  | "ended";

type ReturnCardProps = {
  ret: Return;
  slug: string;
  projectStatus: ProjectStatus;
  startAt?: string | null;
  endAt?: string | null;
};

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

export function ReturnCard({
  ret,
  slug,
  projectStatus,
  startAt,
  endAt,
}: ReturnCardProps) {
  const router = useRouter();
  const { requireLogin, loadingUser } = useAuthGate();

  const [availability, setAvailability] =
    useState<SupportAvailability>("checking");

  useEffect(() => {
    function updateAvailability() {
      setAvailability(
        getSupportAvailability(
          projectStatus,
          startAt,
          endAt
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
  }, [projectStatus, startAt, endAt]);

  const limited = ret.stockTotal != null;
  const remaining = limited
    ? Math.max(
        0,
        (ret.stockTotal as number) - ret.stockSold
      )
    : null;
  const soldOut = remaining === 0;
  const canSupport = availability === "available";

  const confirmPath =
    `/support/${slug}/confirm?return=${ret.id}`;

  function handleSupport() {
    if (soldOut || loadingUser || !canSupport) {
      return;
    }

    if (!requireLogin(confirmPath)) {
      return;
    }

    router.push(confirmPath);
  }

  function getButtonLabel(): string {
    if (soldOut) {
      return "売り切れ";
    }

    if (availability === "checking") {
      return "受付状況を確認中";
    }

    if (availability === "not_started") {
      return "募集開始前です";
    }

    if (availability === "ended") {
      return "募集は終了しました";
    }

    return "このコースで応援する";
  }

  const isDisabled =
    soldOut || loadingUser || !canSupport;

  return (
    <div
      className={`rounded-card border border-line p-4 ${
        isDisabled ? "opacity-60" : ""
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg font-black text-brand">
          {formatYen(ret.price)}
        </span>

        {limited && !soldOut && (
          <Badge kind="limited">
            残り{remaining}個
          </Badge>
        )}

        {soldOut && (
          <Badge kind="cat">売り切れ</Badge>
        )}
      </div>

      <div className="mb-1 text-[14px] font-extrabold">
        {ret.title}
      </div>

      {ret.description && (
        <p className="mb-2 text-[12.5px] leading-relaxed text-ink-sub">
          {ret.description}
        </p>
      )}

      <div className="mb-3 flex items-center gap-3 text-[11px] font-bold text-ink-sub">
        {limited && (
          <span>限定 {ret.stockTotal}個</span>
        )}

        <span>{ret.stockSold}人が支援</span>

        {ret.estimatedDelivery && (
          <span>
            お届け: {ret.estimatedDelivery}
          </span>
        )}
      </div>

      <button
        onClick={handleSupport}
        disabled={isDisabled}
        className={`flex min-h-[44px] w-full items-center justify-center rounded-xl text-[14px] font-extrabold ${
          isDisabled
            ? "cursor-not-allowed bg-sub text-ink-sub"
            : "bg-primary/10 text-primary ring-1 ring-primary/30"
        }`}
      >
        {getButtonLabel()}
      </button>
    </div>
  );
}