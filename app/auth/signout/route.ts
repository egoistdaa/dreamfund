import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server-auth";

/** ログアウト。セッションCookieを破棄してトップへ。POSTで受ける。 */
export async function POST(request: Request) {
  const supabase = createServerSupabase();

  await supabase.auth.signOut();

  const origin = new URL(request.url).origin;

  return NextResponse.redirect(`${origin}/`, {
    status: 303,
  });
}