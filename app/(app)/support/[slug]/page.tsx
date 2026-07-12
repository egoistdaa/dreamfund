import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getProjectBySlug } from "@/lib/data/projects";
import { achievementRate, formatManYen, formatYen } from "@/lib/format";
import { ReturnCard } from "@/components/project/ReturnCard";

export const metadata = {
  title: "支援方法を選ぶ",
  robots: {
    index: false,
  },
};

export default async function SupportPage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const selfPath = `/support/${params.slug}`;

  await requireAuth(selfPath);

  const project = await getProjectBySlug(params.slug);

  if (!project) {
    notFound();
  }

  const rate = achievementRate(project);
  const returns = project.returns ?? [];

  return (
    <div className="px-[18px] py-6">
      <Link
        href={`/projects/${project.slug}`}
        className="mb-4 inline-flex items-center gap-1 text-[12.5px] font-bold text-ink-sub"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        プロジェクトに戻る
      </Link>

      <h1 className="mb-1 text-xl font-black tracking-tight">
        支援方法を選ぶ
      </h1>

      <p className="mb-5 text-[12.5px] font-medium leading-relaxed text-ink-sub">
        応援したいリターンを選んでください。
        選択後、支援内容の確認画面へ進みます。
      </p>

      <div className="mb-6 rounded-card border border-line p-4">
        <div className="mb-1 text-[11px] font-bold text-primary">
          {project.category}
        </div>

        <div className="mb-3 text-[15px] font-extrabold leading-snug">
          {project.title}
        </div>

        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-[11px] font-bold text-ink-sub">現在の支援額</div>
            <div className="text-lg font-black text-brand">
              {formatYen(project.currentAmount)}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-bold text-ink-sub">目標金額</div>
            <div className="text-[13px] font-extrabold">
              {formatManYen(project.goalAmount)}
            </div>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-sub">
          <div
            className="h-full rounded-full bg-brand-135"
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>

        <div className="mt-2 text-right text-[12px] font-black text-brand">
          {rate}% 達成
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-black">
          リターンを選ぶ
        </h2>

        {returns.length > 0 ? (
          <div className="space-y-3">
            {returns.map((ret) => (
              <ReturnCard key={ret.id} ret={ret} slug={project.slug} />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-line p-5 text-center">
            <div className="mb-2 text-2xl">🌱</div>
            <div className="mb-1 text-[14px] font-extrabold">
              現在選べるリターンはありません
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-sub">
              リターンなしで応援できる機能を準備しています。
            </p>
          </div>
        )}
      </section>

      <div className="mt-5 rounded-lg bg-primary/5 px-3 py-3 text-[11.5px] font-bold leading-relaxed text-primary">
        決済はまだ行われません。現在は支援画面の動作確認中です。
      </div>
    </div>
  );
}