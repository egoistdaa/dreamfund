import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getAdminSettlements,
  type AdminSettlement,
} from "@/lib/data/adminSettlements";
import { formatYen } from "@/lib/format";

export const metadata = {
  title: "精算管理 | DreamFund 管理",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

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

function getSettlementStatusBadge(
  status: AdminSettlement["settlementStatus"]
): {
  text: string;
  className: string;
} {
  switch (status) {
    case "checking":
      return {
        text: "確認中",
        className: "bg-slate-100 text-slate-700",
      };

    case "waiting_for_payments":
      return {
        text: "決済確認待ち",
        className: "bg-amber-100 text-amber-800",
      };

    case "locked_succeeded":
      return {
        text: "成立確定",
        className: "bg-emerald-100 text-emerald-800",
      };

    case "locked_failed":
      return {
        text: "不成立確定",
        className: "bg-rose-100 text-rose-800",
      };

    case "refunding":
      return {
        text: "返金中",
        className: "bg-blue-100 text-blue-800",
      };

    case "completed":
      return {
        text: "精算完了",
        className: "bg-emerald-100 text-emerald-800",
      };

    case "manual_review":
      return {
        text: "手動確認",
        className: "bg-rose-100 text-rose-800",
      };
  }
}

function formatFundingType(
  value: AdminSettlement["fundingType"]
): string {
  switch (value) {
    case "all_or_nothing":
      return "All-or-Nothing";

    case "all_in":
      return "All-In";

    default:
      return "不明";
  }
}

function SummaryCard({
  label,
  value,
  description,
  alert = false,
}: {
  label: string;
  value: string;
  description: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 ring-1 ${
        alert
          ? "ring-rose-200"
          : "ring-slate-200"
      }`}
    >
      <div
        className={`text-[12px] font-bold ${
          alert
            ? "text-rose-600"
            : "text-slate-500"
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-2 text-2xl font-black tracking-tight ${
          alert
            ? "text-rose-700"
            : "text-slate-900"
        }`}
      >
        {value}
      </div>

      <div className="mt-1 text-[11px] leading-5 text-slate-400">
        {description}
      </div>
    </div>
  );
}

export default async function AdminSettlementsPage() {
  await requireAdmin();

  const { settlements, summary } =
    await getAdminSettlements();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          精算管理
        </h1>

        <p className="mt-1 text-[13px] leading-6 text-slate-500">
          プロジェクト終了後の成立判定、決済確認、返金、
          手動確認などの精算状態を確認できます。
          この画面から精算処理は実行されません。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="精算レコード"
          value={`${summary.totalCount}件`}
          description="新しいものから最大100件"
        />

        <SummaryCard
          label="確認・決済待ち"
          value={`${
            summary.checkingCount +
            summary.waitingForPaymentsCount
          }件`}
          description={`確認中 ${summary.checkingCount}件・決済待ち ${summary.waitingForPaymentsCount}件`}
        />

        <SummaryCard
          label="返金中"
          value={`${summary.refundingCount}件`}
          description={`不成立確定 ${summary.lockedFailedCount}件`}
        />

        <SummaryCard
          label="手動確認"
          value={`${summary.manualReviewCount}件`}
          description={`未解決決済 ${summary.unresolvedPaymentCount}件`}
          alert={summary.manualReviewCount > 0}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="成立確定"
          value={`${summary.lockedSucceededCount}件`}
          description="成立判定がロックされたプロジェクト"
        />

        <SummaryCard
          label="精算完了"
          value={`${summary.completedCount}件`}
          description="精算処理が完了したプロジェクト"
        />
      </div>

      <div className="mt-7">
        {settlements.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-20 text-center ring-1 ring-slate-200">
            <div className="text-3xl">✓</div>

            <p className="mt-3 text-sm font-bold text-slate-700">
              精算レコードはありません
            </p>

            <p className="mt-1 text-xs text-slate-500">
              精算対象が作成されると、ここに表示されます。
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[13px] font-black text-slate-900">
                精算一覧
              </div>

              <div className="mt-0.5 text-[11px] text-slate-400">
                更新日時が新しい精算から最大100件を表示
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-[11px] font-bold text-slate-500">
                    <th className="px-5 py-3">
                      プロジェクト
                    </th>

                    <th className="px-5 py-3">
                      精算状態
                    </th>

                    <th className="px-5 py-3">
                      支援状況
                    </th>

                    <th className="px-5 py-3">
                      決済確認
                    </th>

                    <th className="px-5 py-3">
                      試行
                    </th>

                    <th className="px-5 py-3">
                      日時
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {settlements.map((settlement) => {
                    const badge =
                      getSettlementStatusBadge(
                        settlement.settlementStatus
                      );

                    const needsManualReview =
                      settlement.settlementStatus ===
                      "manual_review";

                    return (
                      <tr
                        key={settlement.id}
                        className={
                          needsManualReview
                            ? "bg-rose-50/60 align-top"
                            : "align-top hover:bg-slate-50/60"
                        }
                      >
                        <td className="px-5 py-4">
                          <div className="max-w-[300px]">
                            <div className="line-clamp-2 text-[13px] font-bold text-slate-900">
                              {settlement.projectTitle}
                            </div>

                            <div className="mt-1 font-mono text-[10px] text-slate-400">
                              {settlement.projectSlug ??
                                settlement.projectId}
                            </div>

                            <div className="mt-2 text-[10.5px] text-slate-500">
                              {formatFundingType(
                                settlement.fundingType
                              )}
                            </div>

                            <div className="mt-1 text-[10.5px] text-slate-500">
                              プロジェクト状態：
                              <span className="font-bold text-slate-700">
                                {settlement.projectStatus ??
                                  "不明"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${badge.className}`}
                          >
                            {badge.text}
                          </span>

                          <div className="mt-2 text-[10.5px] text-slate-500">
                            最終結果：
                            <span className="font-bold text-slate-700">
                              {settlement.finalStatus ??
                                "未確定"}
                            </span>
                          </div>

                          {settlement.lastError ? (
                            <div className="mt-2 max-w-[240px] rounded-lg bg-rose-50 px-2.5 py-2 text-[10.5px] leading-5 text-rose-700">
                              {settlement.lastError}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[13px] font-black text-slate-900">
                            {settlement.currentAmount === null
                              ? "—"
                              : formatYen(
                                  settlement.currentAmount
                                )}
                          </div>

                          <div className="mt-1 text-[10.5px] text-slate-500">
                            目標：
                            {settlement.goalAmount === null
                              ? "—"
                              : formatYen(
                                  settlement.goalAmount
                                )}
                          </div>

                          <div className="mt-1 text-[10.5px] text-slate-500">
                            支援者：
                            {settlement.supportersCount ??
                              "—"}
                            人
                          </div>

                          {settlement.lockedCurrentAmount !==
                          null ? (
                            <div className="mt-2 text-[10px] text-slate-400">
                              ロック時：
                              {formatYen(
                                settlement.lockedCurrentAmount
                              )}
                              ・
                              {settlement.lockedSupportersCount ??
                                0}
                              人
                            </div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[14px] font-black text-slate-900">
                            {settlement.unresolvedPaymentCount}
                            件
                          </div>

                          <div className="mt-1 text-[10.5px] text-slate-500">
                            未解決決済
                          </div>

                          <div className="mt-3 text-[10px] text-slate-400">
                            次回確認：
                            {formatDateTime(
                              settlement.nextCheckAt
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[14px] font-black text-slate-900">
                            {settlement.attemptCount}回
                          </div>

                          <div className="mt-2 text-[10px] text-slate-400">
                            終了：
                            {formatDateTime(
                              settlement.endAt
                            )}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-400">
                            ロック：
                            {formatDateTime(
                              settlement.settlementLockedAt
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[11px] font-bold text-slate-700">
                            更新：
                            {formatDateTime(
                              settlement.updatedAt
                            )}
                          </div>

                          <div className="mt-2 text-[10px] text-slate-400">
                            最終確認：
                            {formatDateTime(
                              settlement.lastCheckedAt
                            )}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-400">
                            返金可能：
                            {formatDateTime(
                              settlement.refundEligibleAt
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
