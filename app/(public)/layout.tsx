import { Header } from "@/components/layout/Header";
import { TabBar } from "@/components/layout/TabBar";

/**
 * 公開ページ共通レイアウト。
 * スマホファースト確認のため、PCではスマホ枠の中に表示する。
 * 実機(≤430px)では枠を外して全画面になる。
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-[#EDF1F7] sm:py-6">
      <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-white sm:rounded-[40px] sm:shadow-[0_30px_80px_-20px_rgba(15,23,42,.35),0_0_0_10px_#0F172A,0_0_0_11px_#1E293B]">
        <Header />
        <main className="flex-1">{children}</main>
        <TabBar />
      </div>
    </div>
  );
}
