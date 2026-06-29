import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

/**
 * SEO土台（最優先要件）。各ページは generateMetadata で上書き可能。
 * OGP / Twitter Card / robots をここで既定設定。
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://dreamfund.example.com"),
  title: {
    default: "DreamFund | 夢を、みんなで応援する。",
    template: "%s | DreamFund",
  },
  description:
    "応援したい夢が、きっと見つかる。DreamFundは挑戦する人とそれを応援する人をつなぐ、日本最大級を目指すクラウドファンディングです。",
  keywords: ["クラウドファンディング", "支援", "プロジェクト", "DreamFund", "寄付", "応援"],
  openGraph: {
    type: "website",
    siteName: "DreamFund",
    title: "DreamFund | 夢を、みんなで応援する。",
    description: "応援したい夢が、きっと見つかる。",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "DreamFund | 夢を、みんなで応援する。",
    description: "応援したい夢が、きっと見つかる。",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
