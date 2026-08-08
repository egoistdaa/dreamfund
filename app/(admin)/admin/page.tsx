import Link from "next/link";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getAdminRefunds } from "@/lib/data/adminRefunds";
import { getAdminSettlements } from "@/lib/data/adminSettlements";
import { getPendingSubmissions } from "@/lib/data/adminSubmissions";
import { formatYen } from "@/lib/format";

export const metadata = {
  title: "管理ダッシュボード | DreamFund 管理",
  robots: {
    index: false,
    follow: false,
  },
};

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
        alert ? "ring-rose-200" : "ring-slate-200"
      }`}
    >
      <div
        className={`text-[12px] font-bold ${
          alert ? "text-rose-600" : "text-slate-500"
        }`}
      >
        {label}
      </div>

      <div
        className={`mt-2 text-2xl font-black tracking-tight ${
          alert ? "text-rose-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>

      <p className="mt-1 text-[11px] leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function ManagementCard({
  href,
  title,
  description,
  countText,
  alert = false,
}: {
  href: string;
  title: string;
  description: string;
  countText: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl bg-white p-6 ring-1 transition hover:-translate-y-0.5 hover:shadow-lg ${
        alert ? "ring-rose-200" : "ring-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            className={`text-lg font-black ${
              alert ? "text-rose-700" : "text-slate-900"
            }`}
          >
            {title}
          </h2>

          <p className="mt-2 text-[12.5px] leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <svg
          className={`mt-1 h-5 w-5 shrink-0 transition group-hover:translate-x-1 ${
            alert ? "text-rose-500" : "text-slate-400"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>

      <div
        className={`mt-5 inline-flex rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
          alert
            ? "bg-rose-100 text-rose-700"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        {countText}
      </div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [submissions, refundData, settlementData] =
    await Promise.all([
      getPendingSubmissions(),
      getAdminRefunds(),
      getAdminSettlements(),
    ]);

  const refundSummary = refundData.summary;
  const settlementSummary = settlementData.summary;

  const refundAttentionCount =
    refundSummary.approvedCount +
    refundSummary.processingCount +
    refundSummary.manualReviewCount;

  const settlementAttentionCount =
    settlementSummary.manualReviewCount;

  const needsAttention =
    submissions.length +
    refundAttentionCount +
    settlementAttentionCount;

  return (
    <div>
      <div className="mb-7">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          Administration
        </div>

        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          管理ダッシュボード
        </h1>

        <p className="mt-1 text-[13px] leading-6 text-slate-500">
          投稿審査、返金、精算など、運営上確認が必要な項目をまとめて確認できます。
        </p>
      </div>

      <div className="mb-7 rounded-2xl bg-slate-900 px-6 py-5 text-white">
        <div className="text-[12px] font-bold text-slate-300">
          現在確認が必要な項目
        </div>

        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-black tracking-tight">
            {needsAttention}
          </span>

          <span className="pb-1 text-[12px] font-bold text-slate-300">
            件
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          審査待ち、返金待ち・処理中・手動確認、精算の手動確認を合計しています。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="投稿審査待ち"
          value={`${submissions.length}件`}
          description="審査が必要なプロジェクト申請"
          alert={submissions.length > 0}
        />

        <SummaryCard
          label="返金 要確認"
          value={`${refundAttentionCount}件`}
          description={`待ち ${refundSummary.approvedCount}件・処理中 ${refundSummary.processingCount}件・手動確認 ${refundSummary.manualReviewCount}件`}
          alert={refundAttentionCount > 0}
        />

        <SummaryCard
          label="精算 手動確認"
          value={`${settlementSummary.manualReviewCount}件`}
          description="自動精算を止めて確認するプロジェクト"
          alert={settlementSummary.manualReviewCount > 0}
        />

        <SummaryCard
          label="未解決決済"
          value={`${settlementSummary.unresolvedPaymentCount}件`}
          description="最新最大100件の精算レコード内"
          alert={settlementSummary.unresolvedPaymentCount > 0}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="返金完了"
          value={`${refundSummary.completedCount}件`}
          description={`完了金額 ${formatYen(
            refundSummary.completedAmount
          )}`}
        />

        <SummaryCard
          label="返金レコード"
          value={`${refundSummary.totalCount}件`}
          description={`最新最大100件・合計 ${formatYen(
            refundSummary.totalAmount
          )}`}
        />

        <SummaryCard
          label="精算完了"
          value={`${settlementSummary.completedCount}件`}
          description="最新最大100件の精算レコード内"
        />

        <SummaryCard
          label="精算レコード"
          value={`${settlementSummary.totalCount}件`}
          description={`成立確定 ${settlementSummary.lockedSucceededCount}件・不成立確定 ${settlementSummary.lockedFailedCount}件`}
        />
      </div>

      <div className="mt-9">
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-900">
            管理メニュー
          </h2>

          <p className="mt-1 text-[12px] text-slate-500">
            確認したい管理項目を選択してください。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ManagementCard
            href="/admin/submissions"
            title="投稿審査"
            description="ユーザーから届いたプロジェクト申請の内容を確認します。"
            countText={`審査待ち ${submissions.length}件`}
            alert={submissions.length > 0}
          />

          <ManagementCard
            href="/admin/refunds"
            title="返金管理"
            description="返金状況、再試行、手動確認が必要なレコードを確認します。"
            countText={`要確認 ${refundAttentionCount}件`}
            alert={refundAttentionCount > 0}
          />

          <ManagementCard
            href="/admin/settlements"
            title="精算管理"
            description="プロジェクト終了後の成立判定、決済確認、返金連携などを確認します。"
            countText={`手動確認 ${settlementSummary.manualReviewCount}件`}
            alert={settlementSummary.manualReviewCount > 0}
          />
        </div>
      </div>
    </div>
  );
}
