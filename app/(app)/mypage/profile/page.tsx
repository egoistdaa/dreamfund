import { requireAuth } from "@/lib/auth/requireAuth";
import { createServerSupabase } from "@/lib/supabase/server-auth";
import { ProfileForm } from "@/components/profile/ProfileForm";

export const metadata = {
  title: "プロフィール編集",
  robots: { index: false },
};

export default async function ProfileEditPage() {
  const user = await requireAuth("/mypage/profile");

  const supabase = createServerSupabase();

  const { data } = await supabase
    .from("public_profiles")
    .select("display_name, avatar_url, bio")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as {
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
  } | null;

  return (
    <ProfileForm
      initialDisplayName={profile?.display_name ?? ""}
      initialBio={profile?.bio ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? null}
    />
  );
}