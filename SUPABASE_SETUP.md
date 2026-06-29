# Supabase 接続手順

現在はSupabase未設定でも**ダミーデータで動作**します（フォールバック）。
以下を行うと、同じ画面が実DBから表示されるようになります。画面コードの変更は不要です。

## 1. Supabaseプロジェクト作成
supabase.com でプロジェクトを作成。

## 2. スキーマとシードを投入
SQL Editor で順に実行:
1. `schema.sql`        … テーブル・RLS・トリガー
2. `supabase_seed.sql` … デモ用のプロジェクト/リターン/コメント

## 3. 環境変数を設定
`.env.local` に以下を記入（Project Settings > API）:

    NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public key）
    SUPABASE_SERVICE_ROLE_KEY=（service role key・サーバー専用）

## 4. 起動
    npm run dev

設定が検出されると lib/data が自動で実DBへ切り替わります
（lib/supabase/server.ts の isSupabaseConfigured で判定）。

## 仕組み（なぜ画面を変えずに切り替わるか）
- 画面/コンポーネントは lib/data/projects.ts の関数だけを呼ぶ。
- その関数が「設定済みならSupabase / 未設定ならダミー」を返す。
- DB行→ドメイン型の変換は lib/data/mappers.ts に集約。
  → カラム名が変わってもmappersだけ直せば画面は無傷。

## 補足
- 一覧の status=live 絞り込み・カテゴリ・検索はSQL側で実行。
- 達成率に依存する並び(急上昇/達成間近)はlive集合をJSでソート。
  将来DBに生成カラム/ビューを足せばSQLソートに移行可能。
- 詳細・トップは revalidate=60 のISR。静的の速さ＋最新性を両立。
