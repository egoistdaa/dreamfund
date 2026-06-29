import type { Config } from "tailwindcss";

/**
 * デザイントークンをTailwindに登録。
 * なぜ: 色や余白を「bg-primary」「rounded-card」など意味のある名前で使えるので、
 *       後でブランドカラーを変えてもここ1か所の修正で全画面に反映される。
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563EB",   // メイン（信頼の青）
        accent: "#7C3AED",    // アクセント（夢・未来の紫）
        sub: "#F8FAFC",       // サブ背景
        success: "#22C55E",   // 達成・成功・支援完了
        warning: "#F59E0B",   // 注意・残りわずか
        error: "#EF4444",     // エラー
        hot: "#FF3B5C",       // 急上昇・人気No.1・終了間近のアクセント
        ink: "#0F172A",       // 本文
        "ink-sub": "#64748B", // 補助テキスト
        line: "#E8EDF4",      // 罫線
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        "card-lg": "22px",
      },
      spacing: {
        section: "80px",  // セクション間の余白（多めに使う）
        tap: "48px",      // タップ領域の最小サイズ（親指操作）
      },
      backgroundImage: {
        // 青→紫のブランドグラデーション（達成率・CTA・ロゴで共通使用）
        brand: "linear-gradient(100deg, #2563EB, #7C3AED)",
        "brand-135": "linear-gradient(135deg, #2563EB, #7C3AED)",
        "brand-success": "linear-gradient(90deg, #22C55E, #16A34A)",
      },
    },
  },
  plugins: [],
};
export default config;
