import Link from "next/link";
import { requireAuth } from "@/lib/auth/requireAuth";
import { createServerSupabase } from "@/lib/supabase/server-auth";

export const metadata = {
  title: "\u30de\u30a4\u30da\u30fc\u30b8",
  robots: { index: false },
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

  const name = profile?.display_name ?? "\u540d\u79f0\u672a\u8a2d\u5b9a";
  const avatarUrl = profile?.avatar_url ?? null;

  const menuItems = [
    { label: "\u652f\u63f4\u3057\u305f\u30d7\u30ed\u30b8\u30a7\u30af\u30c8", href: "#" },
    { label: "\u6295\u7a3f\u3057\u305f\u30d7\u30ed\u30b8\u30a7\u30af\u30c8", href: "/mypage/submissions" },
    { label: "\u304a\u6c17\u306b\u5165\u308a", href: "/favorites" },
    { label: "\u901a\u77e5", href: "#" },
    { label: "\u8a2d\u5b9a", href: "#" },
  ];

  return (
    <div className="px-[18px] py-6">
      <div className="mb-4 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u753b\u50cf"
            className="h-16 w-16 rounded-full object-cover ring-2 ring-line"
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-135 text-2xl font-black text-white">
            {name[0] ?? "?"}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-black">{name}</div>
          <div className="truncate text-[12.5px] text-ink-sub">
            {user.email}
          </div>
        </div>
      </div>

      {profile?.bio && (
        <p className="mb-4 whitespace-pre-wrap rounded-card bg-sub px-4 py-3 text-[13px] leading-relaxed">
          {profile.bio}
        </p>
      )}

      <Link
        href="/mypage/profile"
        className="mb-6 flex min-h-tap items-center justify-center gap-2 rounded-[14px] bg-primary/10 text-[14px] font-extrabold text-primary ring-1 ring-primary/30 transition active:scale-[.99]"
      >
        {"\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u3092\u7de8\u96c6"}
      </Link>

      <div className="flex flex-col gap-3">
        {menuItems.map((item) => (
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
          {"\u30ed\u30b0\u30a2\u30a6\u30c8"}
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] text-ink-sub">
        {"\u652f\u63f4\u5c65\u6b74\u30fb\u6295\u7a3f\u30fb\u901a\u77e5\u306f\u4eca\u5f8c\u306e\u30d5\u30a7\u30fc\u30ba\u3067\u5b9f\u88c5\u4e88\u5b9a\u3067\u3059\u3002"}
      </p>
    </div>
  );
}