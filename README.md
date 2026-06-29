# DreamFund (MVP)

Next.js 14 + TypeScript + Tailwind。スマホファースト・SEO・静的生成重視。

## セットアップ
    npm install
    npm run dev      # http://localhost:3000
    npm run build    # 本番ビルド（全ページ静的生成）

## 後からSupabaseに差し替えやすい設計
- types/index.ts      ドメイン型。ダミーも本番(Supabase)も同じ型。
- lib/data/projects.ts ★データ取得の唯一の窓口。ここをSupabaseに変えるだけで画面は無修正。
- lib/data/dummy.ts    現在のダミーデータ。
- lib/format.ts        達成率・残り日数・金額整形・手数料計算。
- components/ui        Badge / ProgressBar / SearchBar / ProjectImage
- components/project   ProjectCard / ProjectRow
- components/layout    Header / TabBar
- app/(public)         公開ページ（トップ・一覧・詳細）
- app/(app)            ログイン後（MVPはダミー）
- tailwind.config.ts   ブランドカラー等のデザイントークン
- schema.sql           Supabase用DBスキーマ（RLS含む）

## Supabaseへの差し替え方
lib/data/projects.ts の各関数内で、DUMMY_PROJECTS の代わりに
supabase.from("projects").select(...) を返すよう変更するだけ。
戻り値の型(Project)が同じなので、ページ・コンポーネントは変更不要。

## Supabase接続
SUPABASE_SETUP.md を参照。未設定でもダミーで動作し、設定すると実DBへ自動切替。
- lib/supabase/   接続クライアント(server/client)
- lib/data/mappers.ts  DB行→ドメイン型の変換
- supabase_seed.sql    デモデータ
