import { Header } from "@/components/layout/Header";
import { AppNavigationFrame } from "@/components/layout/AppNavigationFrame";
import { AuthGateProvider } from "@/components/auth/AuthGate";
import { PublishedCelebrationGate } from "@/components/PublishedCelebrationGate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGateProvider>
      <PublishedCelebrationGate />

      <div className="flex min-h-screen justify-center bg-[#EDF1F7] sm:py-6">
        <div className="relative flex w-full max-w-[390px] flex-col overflow-hidden bg-white sm:rounded-[40px] sm:shadow-[0_30px_80px_-20px_rgba(15,23,42,.35),0_0_0_10px_#0F172A,0_0_0_11px_#1E293B]">
          <Header />

          <AppNavigationFrame>
            {children}
          </AppNavigationFrame>
        </div>
      </div>
    </AuthGateProvider>
  );
}