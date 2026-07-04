import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createServerSupabase } from "@/lib/supabase/server-auth";

export const metadata = {
  title: "マイページ",
  robots: {
    index: false,
  },
};

export default async function MyPage() {
  const user = await requireAuth("/mypage");

  const supabase = createServerSupabase();

  const { data: profileData } = await supabase
    .from("public_profiles")
    .select("display_name, avatar_url, bio")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as {
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
  } | null;

  const name = profile?.display_name ?? "名称未設定";

  return (
    <div className="px-[18px] py-6">
      <div className="mb-6 flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-135 text-2xl font-black text-white">
          {name[0] ?? "?"}
        </span>

        <div className="min-w-0">
          <div className="truncate text-lg font-black">{name}</div>
          <div className="truncate text-[12.5px] text-ink-sub">{user.email}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {[
          {
            label: "支援したプロジェクト",
            href: "#",
          },
          {
            label: "投稿したプロジェクト",
            href: "#",
          },
          {
            label: "お気に入り",
            href: "/favorites",
          },
          {
            label: "通知",
            href: "#",
          },
          {
            label: "設定",
            href: "#",
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between rounded-card border border-line px-4 py-4 text-[14px] font-bold"
          >
            {item.label}
            <svg
              className="h-4 w-4 text-ink-sub"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </div>

      <form action="/auth/signout" method="post" className="mt-8">
        <button
          type="submit"
          className="w-full rounded-[14px] border border-line py-3.5 text-[14px] font-extrabold text-ink-sub transition active:scale-[.99]"
        >
          ログアウト
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] text-ink-sub">
        支援履歴・投稿・通知は今後のフェーズで実装予定です。
      </p>
    </div>
  );
}