import "server-only";

import type { AdminAuditLog } from "@/lib/data/adminAuditLogs";

type DisplayableDetailKey =
  | "reason"
  | "previous_status"
  | "requested_status"
  | "previous_last_checked_at";

const settlementStatusLabels = new Map<string, string>([
  ["checking", "確認中"],
  ["waiting_for_payments", "決済確認待ち"],
  ["locked_succeeded", "成立確定"],
  ["locked_failed", "不成立確定"],
  ["refunding", "返金中"],
  ["completed", "精算完了"],
  ["manual_review", "手動確認"],
]);

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStringDetail(
  details: unknown,
  key: DisplayableDetailKey
): string | null {
  if (
    typeof details !== "object" ||
    details === null ||
    Array.isArray(details)
  ) {
    return null;
  }

  const value = (
    details as Record<string, unknown>
  )[key];

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0
    ? normalizedValue
    : null;
}

function getStatusLabel(status: string): string {
  return settlementStatusLabels.get(status) ?? status;
}

export function SettlementAuditLogHistory({
  logs,
}: {
  logs: AdminAuditLog[];
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-[14px] font-black text-slate-900">
          管理操作履歴
        </h2>

        <p className="mt-1 text-[10.5px] text-slate-400">
          この精算に対して行われた直近50件の管理操作
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="px-6 py-12 text-center text-[12px] text-slate-500">
          管理操作の履歴はありません。
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map((log) => {
            const reason = getStringDetail(
              log.details,
              "reason"
            );

            const previousStatus = getStringDetail(
              log.details,
              "previous_status"
            );

            const requestedStatus = getStringDetail(
              log.details,
              "requested_status"
            );

            const previousLastCheckedAt = getStringDetail(
              log.details,
              "previous_last_checked_at"
            );

            const hasStatusTransition =
              previousStatus !== null ||
              requestedStatus !== null;

            const actionLabel =
              log.action === "settlement.recheck_requested"
                ? "精算の再確認を依頼"
                : log.action;

            return (
              <article key={log.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex max-w-full break-all rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-extrabold text-slate-700">
                      {actionLabel}
                    </div>

                    <div className="mt-2 break-all font-mono text-[9.5px] text-slate-400">
                      actor: {log.actorUserId}
                    </div>
                  </div>

                  <time
                    dateTime={log.createdAt}
                    className="shrink-0 text-[10.5px] text-slate-400"
                  >
                    {formatDateTime(log.createdAt)}
                  </time>
                </div>

                {reason ? (
                  <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="text-[10.5px] font-bold text-slate-400">
                      実行理由
                    </div>

                    <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-slate-700">
                      {reason}
                    </p>
                  </div>
                ) : null}

                {hasStatusTransition ||
                previousLastCheckedAt ? (
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    {hasStatusTransition ? (
                      <div>
                        <dt className="text-[10.5px] font-bold text-slate-400">
                          状態変更
                        </dt>

                        <dd className="mt-1 break-words text-[12px] font-bold text-slate-700">
                          {previousStatus
                            ? getStatusLabel(
                                previousStatus
                              )
                            : "—"}
                          <span
                            className="mx-2 text-slate-300"
                            aria-hidden="true"
                          >
                            →
                          </span>
                          {requestedStatus
                            ? getStatusLabel(
                                requestedStatus
                              )
                            : "—"}
                        </dd>
                      </div>
                    ) : null}

                    {previousLastCheckedAt ? (
                      <div>
                        <dt className="text-[10.5px] font-bold text-slate-400">
                          変更前の最終確認
                        </dt>

                        <dd className="mt-1 text-[12px] font-bold text-slate-700">
                          {formatDateTime(
                            previousLastCheckedAt
                          )}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
