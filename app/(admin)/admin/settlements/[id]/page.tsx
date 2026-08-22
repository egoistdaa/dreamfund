import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getAdminSettlementById,
  type AdminSettlement,
  type AdminSettlementPledge,
  type AdminSettlementRefund,
} from "@/lib/data/adminSettlements";
import { getAdminAuditLogsForTarget } from "@/lib/data/adminAuditLogs";
import { formatYen } from "@/lib/format";
import { SettlementRecheckActions } from "@/components/admin/SettlementRecheckActions";
import { SettlementAuditLogHistory } from "@/components/admin/SettlementAuditLogHistory";

export const metadata = {
  title: "精算詳細 | DreamFund 管理",
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

function getSettlementBadge(
  status: AdminSettlement["settlementStatus"]
) {
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

function getPledgeBadge(
  status: AdminSettlementPledge["status"]
) {
  switch (status) {
    case "pending":
      return {
        text: "決済待ち",
        className: "bg-amber-100 text-amber-800",
      };

    case "paid":
      return {
        text: "支払済み",
        className: "bg-emerald-100 text-emerald-800",
      };

    case "refunded":
      return {
        text: "返金済み",
        className: "bg-blue-100 text-blue-800",
      };

    case "failed":
      return {
        text: "失敗",
        className: "bg-rose-100 text-rose-800",
      };
  }
}

function getRefundBadge(
  status: AdminSettlementRefund["status"]
) {
  switch (status) {
    case "requested":
      return {
        text: "申請済み",
        className: "bg-slate-100 text-slate-700",
      };

    case "approved":
      return {
        text: "承認済み",
        className: "bg-amber-100 text-amber-800",
      };

    case "processing":
      return {
        text: "処理中",
        className: "bg-blue-100 text-blue-800",
      };

    case "done":
      return {
        text: "返金完了",
        className: "bg-emerald-100 text-emerald-800",
      };

    case "rejected":
      return {
        text: "却下",
        className: "bg-rose-100 text-rose-800",
      };
  }
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-bold text-slate-400">
        {label}
      </dt>

      <dd className="mt-1 break-words text-[13px] font-bold text-slate-700">
        {children}
      </dd>
    </div>
  );
}

export default async function AdminSettlementDetailPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  await requireAdmin();

  const detail =
    await getAdminSettlementById(params.id);

  if (!detail) {
    notFound();
  }

  const {
    settlement,
    pledges,
    refunds,
    paidPledgeCount,
    paidPledgeAmount,
    pendingPledgeCount,
    failedPledgeCount,
    refundedPledgeCount,
    displayedAmountDifference,
  } = detail;

  const auditLogs =
    await getAdminAuditLogsForTarget(
      "project_settlement",
      settlement.id,
      50
    );

  const settlementBadge =
    getSettlementBadge(
      settlement.settlementStatus
    );

  const hasAmountMismatch =
    displayedAmountDifference !== null &&
    displayedAmountDifference !== 0;

  const canRequestRecheck =
    settlement.settlementStatus === "manual_review" &&
    settlement.settlementLockedAt === null &&
    settlement.finalStatus === null &&
    settlement.lockedCurrentAmount === null &&
    settlement.lockedSupportersCount === null &&
    settlement.refundEligibleAt === null &&
    refunds.length === 0;

  return (
    <div>
      <Link
        href="/admin/settlements"
        className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-500 transition hover:text-slate-900"
      >
        <span aria-hidden="true">←</span>
        精算一覧に戻る
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${settlementBadge.className}`}
            >
              {settlementBadge.text}
            </span>

            <span className="text-[11px] font-bold text-slate-400">
              {settlement.fundingType ===
              "all_or_nothing"
                ? "All-or-Nothing"
                : settlement.fundingType === "all_in"
                  ? "All-In"
                  : "方式不明"}
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            {settlement.projectTitle}
          </h1>

          <div className="mt-1 font-mono text-[10.5px] text-slate-400">
            settlement: {settlement.id}
          </div>
        </div>
      </div>

      {settlement.lastError ? (
        <div className="mt-6 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200">
          <div className="text-[12px] font-black text-rose-700">
            精算エラー
          </div>

          <p className="mt-2 break-words text-[13px] leading-6 text-rose-700">
            {settlement.lastError}
          </p>
        </div>
      ) : null}

      {settlement.settlementStatus === "manual_review" ? (
        <section className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-rose-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-black text-slate-900">
                管理者アクション
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                手動確認中の精算です。状態を確認してから操作してください。
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-extrabold text-rose-700">
              要手動確認
            </span>
          </div>

          {canRequestRecheck ? (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <SettlementRecheckActions
                settlementId={settlement.id}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-[12px] leading-5 text-slate-600">
              この精算はロック済み・確定済み・返金レコードあり等のため、
              管理画面から再確認を開始できません。
            </div>
          )}
        </section>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="text-[11px] font-bold text-slate-400">
            プロジェクト表示金額
          </div>

          <div className="mt-2 text-xl font-black text-slate-900">
            {settlement.currentAmount === null
              ? "—"
              : formatYen(
                  settlement.currentAmount
                )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="text-[11px] font-bold text-slate-400">
            paid支援合計
          </div>

          <div className="mt-2 text-xl font-black text-slate-900">
            {formatYen(paidPledgeAmount)}
          </div>

          <div className="mt-1 text-[10.5px] text-slate-400">
            {paidPledgeCount}件
          </div>
        </div>

        <div
          className={`rounded-2xl bg-white p-5 ring-1 ${
            hasAmountMismatch
              ? "ring-rose-200"
              : "ring-slate-200"
          }`}
        >
          <div
            className={`text-[11px] font-bold ${
              hasAmountMismatch
                ? "text-rose-600"
                : "text-slate-400"
            }`}
          >
            金額差分
          </div>

          <div
            className={`mt-2 text-xl font-black ${
              hasAmountMismatch
                ? "text-rose-700"
                : "text-slate-900"
            }`}
          >
            {displayedAmountDifference === null
              ? "—"
              : formatYen(
                  displayedAmountDifference
                )}
          </div>

          <div className="mt-1 text-[10.5px] text-slate-400">
            表示金額 − paid支援合計
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div className="text-[11px] font-bold text-slate-400">
            未解決決済
          </div>

          <div className="mt-2 text-xl font-black text-slate-900">
            {settlement.unresolvedPaymentCount}件
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 lg:col-span-2">
          <h2 className="text-[15px] font-black text-slate-900">
            精算情報
          </h2>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <InfoItem label="プロジェクト状態">
              {settlement.projectStatus ?? "不明"}
            </InfoItem>

            <InfoItem label="最終判定">
              {settlement.finalStatus ?? "未確定"}
            </InfoItem>

            <InfoItem label="目標金額">
              {settlement.goalAmount === null
                ? "—"
                : formatYen(
                    settlement.goalAmount
                  )}
            </InfoItem>

            <InfoItem label="表示支援者数">
              {settlement.supportersCount === null
                ? "—"
                : `${settlement.supportersCount}人`}
            </InfoItem>

            <InfoItem label="ロック時金額">
              {settlement.lockedCurrentAmount ===
              null
                ? "—"
                : formatYen(
                    settlement.lockedCurrentAmount
                  )}
            </InfoItem>

            <InfoItem label="ロック時支援者数">
              {settlement.lockedSupportersCount ===
              null
                ? "—"
                : `${settlement.lockedSupportersCount}人`}
            </InfoItem>

            <InfoItem label="試行回数">
              {settlement.attemptCount}回
            </InfoItem>

            <InfoItem label="プロジェクト終了">
              {formatDateTime(settlement.endAt)}
            </InfoItem>

            <InfoItem label="最終確認">
              {formatDateTime(
                settlement.lastCheckedAt
              )}
            </InfoItem>

            <InfoItem label="次回確認">
              {formatDateTime(
                settlement.nextCheckAt
              )}
            </InfoItem>

            <InfoItem label="精算ロック">
              {formatDateTime(
                settlement.settlementLockedAt
              )}
            </InfoItem>

            <InfoItem label="返金可能日時">
              {formatDateTime(
                settlement.refundEligibleAt
              )}
            </InfoItem>
          </dl>
        </section>

        <section className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-[15px] font-black text-slate-900">
            支援ステータス集計
          </h2>

          <dl className="mt-5 space-y-4">
            <InfoItem label="支払済み">
              {paidPledgeCount}件
            </InfoItem>

            <InfoItem label="決済待ち">
              {pendingPledgeCount}件
            </InfoItem>

            <InfoItem label="失敗">
              {failedPledgeCount}件
            </InfoItem>

            <InfoItem label="返金済み">
              {refundedPledgeCount}件
            </InfoItem>

            <InfoItem label="支援レコード合計">
              {pledges.length}件
            </InfoItem>

            <InfoItem label="返金レコード合計">
              {refunds.length}件
            </InfoItem>
          </dl>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-[14px] font-black text-slate-900">
            支援・決済
          </h2>

          <p className="mt-1 text-[10.5px] text-slate-400">
            このプロジェクトに紐づく全支援
          </p>
        </div>

        {pledges.length === 0 ? (
          <div className="px-6 py-12 text-center text-[12px] text-slate-500">
            支援レコードはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-[10.5px] font-bold text-slate-500">
                  <th className="px-5 py-3">
                    状態
                  </th>
                  <th className="px-5 py-3">
                    金額
                  </th>
                  <th className="px-5 py-3">
                    支援者
                  </th>
                  <th className="px-5 py-3">
                    Stripe PaymentIntent
                  </th>
                  <th className="px-5 py-3">
                    日時
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {pledges.map((pledge) => {
                  const badge =
                    getPledgeBadge(pledge.status);

                  return (
                    <tr
                      key={pledge.id}
                      className="align-top hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${badge.className}`}
                        >
                          {badge.text}
                        </span>

                        <div className="mt-2 font-mono text-[9.5px] text-slate-400">
                          {pledge.id}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-[13px] font-black text-slate-900">
                          {formatYen(
                            pledge.amount
                          )}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-400">
                          手数料{" "}
                          {formatYen(
                            pledge.feeAmount
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-[10px] text-slate-500">
                        {pledge.backerId}
                      </td>

                      <td className="px-5 py-4 font-mono text-[10px] text-slate-500">
                        {pledge.stripePaymentIntentId ??
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-[10.5px] text-slate-500">
                        {formatDateTime(
                          pledge.createdAt
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-[14px] font-black text-slate-900">
            返金
          </h2>

          <p className="mt-1 text-[10.5px] text-slate-400">
            このプロジェクトに紐づく返金レコード
          </p>
        </div>

        {refunds.length === 0 ? (
          <div className="px-6 py-12 text-center text-[12px] text-slate-500">
            返金レコードはありません。
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {refunds.map((refund) => {
              const badge =
                getRefundBadge(refund.status);

              return (
                <div
                  key={refund.id}
                  className={`p-5 ${
                    refund.manualReviewRequired
                      ? "bg-rose-50/60"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${badge.className}`}
                        >
                          {badge.text}
                        </span>

                        {refund.manualReviewRequired ? (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-extrabold text-rose-700">
                            要手動確認
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-lg font-black text-slate-900">
                        {formatYen(refund.amount)}
                      </div>
                    </div>

                    <div className="text-[10.5px] text-slate-400">
                      作成{" "}
                      {formatDateTime(
                        refund.createdAt
                      )}
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoItem label="pledge_id">
                      <span className="font-mono text-[10px]">
                        {refund.pledgeId}
                      </span>
                    </InfoItem>

                    <InfoItem label="Stripe Refund">
                      <span className="font-mono text-[10px]">
                        {refund.stripeRefundId ??
                          "—"}
                      </span>
                    </InfoItem>

                    <InfoItem label="Stripe状態">
                      {refund.stripeStatus ?? "—"}
                    </InfoItem>

                    <InfoItem label="試行回数">
                      {refund.attemptCount}回
                    </InfoItem>

                    <InfoItem label="次回再試行">
                      {formatDateTime(
                        refund.nextRetryAt
                      )}
                    </InfoItem>

                    <InfoItem label="返金完了">
                      {formatDateTime(
                        refund.succeededAt
                      )}
                    </InfoItem>
                  </dl>

                  {refund.manualReviewReason ? (
                    <div className="mt-4 rounded-xl bg-rose-100/70 px-4 py-3 text-[11px] leading-5 text-rose-700">
                      手動確認理由：
                      {refund.manualReviewReason}
                    </div>
                  ) : null}

                  {refund.lastError ? (
                    <div className="mt-3 rounded-xl bg-rose-100/70 px-4 py-3 text-[11px] leading-5 text-rose-700">
                      エラー：
                      {refund.lastError}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SettlementAuditLogHistory logs={auditLogs} />
    </div>
  );
}
