import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server-auth";

/**
 * 確認メールのリンク先。
 * token_hash と type を検証して、成功したらredirect先へ戻す。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirect = searchParams.get("redirect") || "/mypage";

  if (token_hash && type) {
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}