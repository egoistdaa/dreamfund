import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (
    !cronSecret ||
    authorization !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const adminSupabase = createAdminSupabase();

    const { data, error } = await adminSupabase.rpc(
      "finalize_expired_projects"
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      finalizedCount: data?.length ?? 0,
      finalizedProjects: data ?? [],
    });
  } catch (error) {
    console.error(
      "DreamFund project finalization failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "プロジェクトの終了処理に失敗しました",
      },
      { status: 500 }
    );
  }
}