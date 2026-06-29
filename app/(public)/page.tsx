import Link from "next/link";
import { SearchBar } from "@/components/ui/SearchBar";
import { ProjectRow } from "@/components/project/ProjectRow";
import {
  getTrendingProjects, getPopularProjects, getNewProjects,
  getAlmostFundedProjects, CATEGORIES,
} from "@/lib/data/projects";
import { achievementRate } from "@/lib/format";

const SEARCH_CHIPS = [
  { label: "🔥 急上昇", query: "" },
  { label: "🏘️ 地域活性", query: "地域活性" },
  { label: "🐾 保護犬・猫", query: "動物" },
  { label: "🎓 学生の挑戦", query: "学生" },
  { label: "🍜 グルメ", query: "飲食" },
  { label: "🎵 音楽", query: "音楽" },
];

const FILTER_TABS = [
  { label: "✨ おすすめ", q: "" },
  { label: "🔥 急上昇", q: "trending" },
  { label: "👑 人気", q: "popular" },
  { label: "🆕 新着", q: "new" },
  { label: "⏰ まもなく終了", q: "ending" },
  { label: "🎯 達成間近", q: "almost" },
];

// 実DB接続時、60秒ごとに最新へ更新（静的の速さを保ちつつ最新化）。
export const revalidate = 60;

export default async function HomePage() {
  const [trending, popular, fresh, almost] = await Promise.all([
    getTrendingProjects(6),
    getPopularProjects(6),
    getNewProjects(6),
    getAlmostFundedProjects(6),
  ]);

  // 構造化データ（SEO: 組織情報）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DreamFund",
    description: "夢を、みんなで応援する。日本最大級を目指すクラウドファンディング。",
    slogan: "夢を、みんなで応援する。",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero + 検索 */}
      <section className="relative overflow-hidden px-5 pb-6 pt-8
        [background:radial-gradient(120%_90%_at_92%_-10%,rgba(124,58,237,.18),transparent_60%),radial-gradient(110%_80%_at_-10%_8%,rgba(37,99,235,.16),transparent_55%),#fff]">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#EEF3FF] px-3 py-1.5 text-[11px] font-extrabold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          日本最大級を目指すクラウドファンディング
        </span>
        <h1 className="mb-5 text-[31px] font-black leading-[1.34] tracking-tight">
          応援したい夢が、<br /><span className="text-brand">きっと見つかる。</span>
        </h1>
        <SearchBar chips={SEARCH_CHIPS} />
      </section>

      {/* 社会的証明 */}
      <div className="relative mx-3.5 mb-1.5 grid grid-cols-4 gap-1 overflow-hidden rounded-[20px] bg-brand-135 p-4 text-white shadow-[0_16px_36px_-14px_rgba(37,99,235,.55)]">
        {[
          { n: "¥4.8", u: "億", l: "累計応援額" },
          { n: "12,400", u: "人", l: "挑戦者" },
          { n: "38万", u: "人", l: "応援した人" },
          { n: "82", u: "%", l: "成功率" },
        ].map((s, i) => (
          <div key={s.l} className={`relative z-[1] text-center ${i > 0 ? "border-l border-white/20" : ""}`}>
            <div className="text-[19px] font-black leading-tight tracking-tight">
              {s.n}<small className="text-[11px] font-extrabold">{s.u}</small>
            </div>
            <div className="mt-1 text-[9.5px] font-bold leading-tight opacity-90">{s.l}</div>
          </div>
        ))}
      </div>

      {/* フィルタタブ（回遊） */}
      <div className="no-scrollbar sticky top-[57px] z-40 flex gap-1.5 overflow-x-auto border-b border-line bg-white/92 px-[18px] py-3 backdrop-blur-md">
        {FILTER_TABS.map((t, i) => (
          <Link
            key={t.label}
            href={t.q ? `/projects?sort=${t.q}` : "/projects"}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold ring-1 ring-line ${
              i === 0 ? "bg-brand-135 text-white ring-0" : "bg-sub text-ink-sub"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* カテゴリ */}
      <section className="pt-5">
        <div className="mb-3 px-[18px]"><h2 className="text-lg font-black tracking-tight">カテゴリから探す</h2></div>
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-[18px] pb-1.5">
          {CATEGORIES.map((c) => (
            <Link key={c.name} href={`/projects?q=${encodeURIComponent(c.name)}`} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="grid h-[60px] w-[60px] place-items-center rounded-[19px] bg-sub text-2xl ring-1 ring-line transition hover:-translate-y-0.5">{c.emoji}</span>
              <span className="text-[11.5px] font-bold text-ink-sub">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 行: 急上昇 */}
      <ProjectRow
        title="いま急上昇" pill={{ kind: "hot", label: "🔥 HOT" }} projects={trending}
        href="/projects?sort=trending"
        cardBadge={(p, i) => (i === 0 ? { kind: "hot", label: "🔥 急上昇1位" } : undefined)}
      />

      {/* 行: 人気 */}
      <ProjectRow
        title="みんなが応援中" pill={{ kind: "no1", label: "👑 人気" }} projects={popular}
        href="/projects?sort=popular"
        cardBadge={(p, i) => (i === 0 ? { kind: "no1", label: "👑 人気No.1" } : undefined)}
      />

      {/* 行: 達成間近 */}
      <ProjectRow
        title="達成まであと少し" pill={{ kind: "soon", label: "🎯 応援求む" }} projects={almost}
        href="/projects?sort=almost"
        cardBadge={(p) => {
          const r = achievementRate(p);
          return r >= 90 ? { kind: "soon", label: `🎯 ${r}%` } : undefined;
        }}
      />

      {/* 行: 新着 */}
      <ProjectRow
        title="新着の挑戦" pill={{ kind: "new", label: "🆕 NEW" }} projects={fresh}
        href="/projects?sort=new"
        cardBadge={() => ({ kind: "new", label: "🆕 新着" })}
      />

      {/* 3ステップ */}
      <section className="mt-8 bg-gradient-to-b from-[#F3F6FF] to-[#FAF6FF] px-5 py-8">
        <h2 className="text-center text-lg font-black">DreamFundとは</h2>
        <p className="mb-5 mt-1 text-center text-[12.5px] font-semibold text-ink-sub">夢を実現する、3つのステップ</p>
        <div className="flex flex-col gap-3.5">
          {[
            { n: 1, t: "夢を投稿する", d: "あなたの挑戦をプロジェクトとして公開します。" },
            { n: 2, t: "みんなに応援される", d: "共感した全国の仲間が、あなたの夢を支援します。" },
            { n: 3, t: "夢を実現する", d: "集まった支援で、夢を現実のかたちにします。" },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-4 rounded-card bg-white p-4 shadow-[0_6px_18px_-10px_rgba(37,99,235,.25)]">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-brand-135 text-lg font-black text-white">{s.n}</span>
              <div>
                <div className="text-[14.5px] font-extrabold">{s.t}</div>
                <div className="text-xs font-medium leading-relaxed text-ink-sub">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 大型CTA */}
      <section className="relative mx-[18px] my-8 overflow-hidden rounded-[26px] bg-brand-135 px-6 py-9 text-center shadow-[0_20px_44px_-16px_rgba(37,99,235,.6)]">
        <div className="absolute -right-14 -top-20 h-52 w-52 rounded-full bg-white/12" />
        <h2 className="relative mb-2 text-[22px] font-black leading-relaxed text-white">あなたの夢を、<br />今日から始めよう。</h2>
        <p className="relative mb-5 text-[12.5px] font-medium leading-relaxed text-white/90">挑戦に、大きさは関係ありません。<br />最初の一歩を、DreamFundが応援します。</p>
        <Link href="/submit" className="relative flex min-h-tap items-center justify-center gap-2 rounded-[14px] bg-white text-[15.5px] font-extrabold text-primary shadow-[0_8px_20px_-6px_rgba(0,0,0,.25)]">
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
          夢を投稿する
        </Link>
      </section>

      {/* フッター */}
      <footer className="bg-sub px-5 pb-8 pt-7">
        <div className="text-base font-black">DreamFund</div>
        <div className="mb-4 text-xs text-ink-sub">夢を、みんなで応援する。</div>
        <div className="mb-4 flex flex-wrap gap-x-[18px] gap-y-2">
          {["夢を探す", "始め方", "よくある質問", "運営会社", "利用規約", "プライバシー"].map((l) => (
            <Link key={l} href="#" className="text-xs font-bold text-ink-sub">{l}</Link>
          ))}
        </div>
        <div className="border-t border-line pt-3.5 text-[10.5px] text-slate-400">© 2026 DreamFund. All rights reserved.</div>
      </footer>
    </>
  );
}
