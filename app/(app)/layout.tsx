import { Header } from "@/components/layout/Header";
import { TabBar } from "@/components/layout/TabBar";
import { AuthGateProvider } from "@/components/auth/AuthGate";
import { PublishedCelebrationGate } from "@/components/PublishedCelebrationGate";

/**
 * ログイン後ページ共通レイアウト。
 * 公開レイアウトと同じスマホ枠・Header・TabBar・AuthGateProviderを提供する。
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGateProvider>
  <PublishedCelebrationGate />

  <div className="flex min-h-screen justify-center bg-[#EDF1F7] sm:py-6">
        <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-white sm:rounded-[40px] sm:shadow-[0_30px_80px_-20px_rgba(15,23,42,.35),0_0_0_10px_#0F172A,0_0_0_11px_#1E293B]">
          <Header />
          <main className="flex-1 pb-[calc(72px+env(safe-area-inset-bottom))]">
            {children}
          </main>
          <TabBar />
        </div>
      </div>
    </AuthGateProvider>
  );
}