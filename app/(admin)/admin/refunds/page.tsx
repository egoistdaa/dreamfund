import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getAdminRefunds,
  type AdminRefund,
} from "@/lib/data/adminRefunds";
import { formatYen } from "@/lib/format";

export const metadata = {
  title: "返金管理 | DreamFund 管理",
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

function shortenId(
  value: string | null,
  length = 14
): string {
  if (!value) {
    return "—";
  }

  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length)}…`;
}

function getRefundStatusBadge(
  status: AdminRefund["refundStatus"]
): {
  text: string;
  className: string;
} {
  switch (status) {
    case "requested":
      return {
        text: "申請中",
        className:
          "bg-slate-100 text-slate-700",
      };

    case "approved":
      return {
        text: "返金待ち",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "processing":
      return {
        text: "処理中",
        className:
          "bg-blue-100 text-blue-800",
      };

    case "done":
      return {
        text: "返金完了",
        className:
          "bg-emerald-100 text-emerald-800",
      };

    case "rejected":
      return {
        text: "要確認",
        className:
          "bg-rose-100 text-rose-800",
      };

    default:
      return {
        text: status,
        className:
          "bg-slate-100 text-slate-700",
      };
  }
}

function getSettlementStatusBadge(
  status: AdminRefund["settlementStatus"]
): {
  text: string;
  className: string;
} {
  switch (status) {
    case "checking":
      return {
        text: "確認中",
        className:
          "bg-slate-100 text-slate-700",
      };

    case "waiting_for_payments":
      return {
        text: "決済確認待ち",
        className:
          "bg-amber-100 text-amber-800",
      };

    case "locked_succeeded":
      return {
        text: "成立確定",
        className:
          "bg-emerald-100 text-emerald-800",
      };

    case "locked_failed":
      return {
        text: "不成立確定",
        className:
          "bg-rose-100 text-rose-800",
      };

    case "refunding":
      return {
        text: "返金中",
        className:
          "bg-blue-100 text-blue-800",
      };

    case "completed":
      return {
        text: "精算完了",
        className:
          "bg-emerald-100 text-emerald-800",
      };

    case "manual_review":
      return {
        text: "手動確認",
        className:
          "bg-rose-100 text-rose-800",
      };

    default:
      return {
        text: status ?? "未登録",
        className:
          "bg-slate-100 text-slate-600",
      };
  }
}

function SummaryCard({
  label,
  value,
  subText,
  alert = false,
}: {
  label: string;
  value: string | number;
  subText?: string;
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

      {subText ? (
        <div className="mt-1 text-[11px] text-slate-400">
          {subText}
        </div>
      ) : null}
    </div>
  );
}

export default async function AdminRefundsPage() {
  await requireAdmin();

  const { refunds, summary } =
    await getAdminRefunds();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          返金管理
        </h1>

        <p className="mt-1 text-[13px] leading-6 text-slate-500">
          Stripe返金、再試行、手動確認が必要な返金を確認できます。
          この画面から返金処理は実行されません。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="返金レコード"
          value={`${summary.totalCount}件`}
          subText={`合計 ${formatYen(
            summary.totalAmount
          )}`}
        />

        <SummaryCard
          label="返金完了"
          value={`${summary.completedCount}件`}
          subText={formatYen(
            summary.completedAmount
          )}
        />

        <SummaryCard
          label="処理待ち・処理中"
          value={`${
            summary.approvedCount +
            summary.processingCount
          }件`}
          subText={`待ち ${summary.approvedCount}件・処理中 ${summary.processingCount}件`}
        />

        <SummaryCard
          label="手動確認"
          value={`${summary.manualReviewCount}件`}
          subText={`拒否 ${summary.rejectedCount}件`}
          alert={summary.manualReviewCount > 0}
        />
      </div>

      <div className="mt-7">
        {refunds.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-20 text-center ring-1 ring-slate-200">
            <div className="text-3xl">✓</div>

            <p className="mt-3 text-sm font-bold text-slate-700">
              返金レコードはありません
            </p>

            <p className="mt-1 text-xs text-slate-500">
              返金対象が作成されると、ここに表示されます。
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-[13px] font-black text-slate-900">
                返金一覧
              </div>

              <div className="mt-0.5 text-[11px] text-slate-400">
                新しい返金から最大100件を表示
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-[11px] font-bold text-slate-500">
                    <th className="px-5 py-3">
                      プロジェクト
                    </th>

                    <th className="px-5 py-3">
                      返金額
                    </th>

                    <th className="px-5 py-3">
                      返金状態
                    </th>

                    <th className="px-5 py-3">
                      精算状態
                    </th>

                    <th className="px-5 py-3">
                      Stripe
                    </th>

                    <th className="px-5 py-3">
                      試行
                    </th>

                    <th className="px-5 py-3">
                      更新日時
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {refunds.map((refund) => {
                    const refundBadge =
                      getRefundStatusBadge(
                        refund.refundStatus
                      );

                    const settlementBadge =
                      getSettlementStatusBadge(
                        refund.settlementStatus
                      );

                    return (
                      <tr
                        key={refund.id}
                        className={
                          refund.manualReviewRequired
                            ? "bg-rose-50/60 align-top"
                            : "align-top hover:bg-slate-50/60"
                        }
                      >
                        <td className="px-5 py-4">
                          <div className="max-w-[300px]">
                            <div className="line-clamp-2 text-[13px] font-bold text-slate-900">
                              {refund.projectTitle}
                            </div>

                            <div className="mt-1 font-mono text-[10px] text-slate-400">
                              {refund.projectSlug ??
                                shortenId(
                                  refund.projectId
                                )}
                            </div>

                            <div className="mt-2 text-[11px] text-slate-500">
                              支援状態：
                              <span className="font-bold text-slate-700">
                                {refund.pledgeStatus ??
                                  "不明"}
                              </span>
                            </div>

                            {refund.manualReviewRequired ? (
                              <div className="mt-2 rounded-lg bg-rose-100 px-2.5 py-2 text-[11px] font-bold leading-5 text-rose-800">
                                手動確認が必要です
                                {refund.manualReviewReason
                                  ? `：${refund.manualReviewReason}`
                                  : ""}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[15px] font-black text-slate-900">
                            {formatYen(refund.amount)}
                          </div>

                          <div className="mt-1 max-w-[210px] text-[10.5px] leading-5 text-slate-400">
                            {refund.reason ??
                              "理由未登録"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${refundBadge.className}`}
                          >
                            {refundBadge.text}
                          </span>

                          <div className="mt-2 text-[10.5px] text-slate-500">
                            Stripe：
                            <span className="font-bold text-slate-700">
                              {refund.stripeStatus ??
                                "未作成"}
                            </span>
                          </div>

                          {refund.lastError ? (
                            <div className="mt-2 max-w-[230px] rounded-lg bg-rose-50 px-2.5 py-2 text-[10.5px] leading-5 text-rose-700">
                              {refund.lastError}
                            </div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${settlementBadge.className}`}
                          >
                            {settlementBadge.text}
                          </span>

                          <div className="mt-2 text-[10.5px] text-slate-500">
                            最終結果：
                            <span className="font-bold text-slate-700">
                              {refund.settlementFinalStatus ??
                                "未確定"}
                            </span>
                          </div>

                          {refund.settlementLastError ? (
                            <div className="mt-2 max-w-[230px] text-[10px] leading-5 text-rose-600">
                              {
                                refund.settlementLastError
                              }
                            </div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[10.5px] font-bold text-slate-600">
                            Refund ID
                          </div>

                          <div
                            className="mt-1 font-mono text-[10px] text-slate-400"
                            title={
                              refund.stripeRefundId ??
                              undefined
                            }
                          >
                            {shortenId(
                              refund.stripeRefundId,
                              18
                            )}
                          </div>

                          <div className="mt-3 text-[10.5px] font-bold text-slate-600">
                            PaymentIntent
                          </div>

                          <div
                            className="mt-1 font-mono text-[10px] text-slate-400"
                            title={
                              refund.stripePaymentIntentId ??
                              undefined
                            }
                          >
                            {shortenId(
                              refund.stripePaymentIntentId,
                              18
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[14px] font-black text-slate-900">
                            {refund.attemptCount}回
                          </div>

                          <div className="mt-2 text-[10.5px] text-slate-500">
                            次回：
                            <span className="font-bold text-slate-700">
                              {formatDateTime(
                                refund.nextRetryAt
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[11px] font-bold text-slate-700">
                            {formatDateTime(
                              refund.updatedAt
                            )}
                          </div>

                          <div className="mt-2 text-[10px] text-slate-400">
                            承認：
                            {formatDateTime(
                              refund.approvedAt
                            )}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-400">
                            完了：
                            {formatDateTime(
                              refund.succeededAt
                            )}
                          </div>

                          <div
                            className="mt-3 font-mono text-[9.5px] text-slate-300"
                            title={refund.id}
                          >
                            {shortenId(refund.id, 16)}
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