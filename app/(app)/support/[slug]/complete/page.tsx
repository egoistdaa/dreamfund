import Link from "next/link";
import { SupportMessagePrompt } from "@/components/support/SupportMessagePrompt";

export const metadata = {
  title: "支援のお申し込み完了",
  robots: {
    index: false,
  },
};

export default function SupportCompletePage({
  params,
  searchParams,
}: {
  params: {
    slug: string;
  };
  searchParams: {
    redirect_status?: string;
    pledge?: string;
  };
}) {
  const succeeded = searchParams.redirect_status === "succeeded";
  const pledgeId = searchParams.pledge;

  return (
    <div className="px-[18px] py-10 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
        {succeeded ? "🎉" : "⏳"}
      </div>

      <h1 className="mb-2 text-xl font-black tracking-tight">
        {succeeded
          ? "支援のお申し込みを受け付けました！"
          : "決済状況を確認しています"}
      </h1>

      <p className="mb-6 text-[12.5px] font-medium leading-relaxed text-ink-sub">
        {succeeded ? (
          <>
            DreamFundでの応援ありがとうございます。
            <br />
            決済結果を確認後、支援内容へ反映されます。
          </>
        ) : (
          <>
            決済結果の反映まで少し時間がかかる場合があります。
            <br />
            しばらくしてからご確認ください。
          </>
        )}
      </p>

      {succeeded && pledgeId && (
        <SupportMessagePrompt
          pledgeId={pledgeId}
          projectSlug={params.slug}
        />
      )}

      <div className="mb-6 rounded-card border border-line bg-white p-4 text-left">
        <div className="mb-2 text-[13px] font-black">
          今後の流れ
        </div>

        <div className="space-y-2 text-[12px] font-medium leading-relaxed text-ink-sub">
          <p>1. Stripeから決済結果を確認します</p>
          <p>2. 支援が確定するとプロジェクトへ反映されます</p>
          <p>3. 支援履歴やメールでも確認できるようになります</p>
        </div>
      </div>

      <Link
        href={`/projects/${params.slug}`}
        className="flex min-h-tap w-full items-center justify-center rounded-[14px] bg-brand-135 text-[15px] font-extrabold text-white"
      >
        プロジェクトへ戻る
      </Link>

      <Link
        href="/projects"
        className="mt-3 inline-flex min-h-[44px] items-center justify-center px-4 text-[13px] font-bold text-primary"
      >
        他のプロジェクトを見る
      </Link>

      <p className="mt-6 text-[10.5px] font-medium text-ink-sub">
        現在はStripeのサンドボックスです。実際の請求は発生しません。
      </p>
    </div>
  );
}