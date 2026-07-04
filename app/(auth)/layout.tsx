import Link from "next/link";

/** 認証ページ用レイアウト。スマホ枠を踏襲しつつ TabBar は出さない。 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-[#EDF1F7] sm:py-6">
      <div className="relative flex min-h-screen w-full max-w-[390px] flex-col bg-white sm:min-h-0 sm:rounded-[40px] sm:shadow-[0_30px_80px_-20px_rgba(15,23,42,.35),0_0_0_10px_#0F172A,0_0_0_11px_#1E293B]">
        <div className="flex items-center justify-center border-b border-line py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="grid h-[27px] w-[27px] place-items-center rounded-[9px] bg-brand-135 shadow-[0_4px_12px_-2px_rgba(37,99,235,.5)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3z"
                  fill="#fff"
                />
              </svg>
            </span>
            DreamFund
          </Link>
        </div>

        <div className="flex-1 px-5 py-8">{children}</div>
      </div>
    </div>
  );
}