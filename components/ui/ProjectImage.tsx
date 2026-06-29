/**
 * プロジェクト画像。
 * thumbnailUrl があれば画像、無ければカテゴリから決まるグラデーションを描く。
 * ★将来 Supabase Storage の URL が入れば自動で本物の写真に切り替わる
 *   （画面側の変更は不要）。
 */
const GRADIENTS = [
  "from-blue-700 to-violet-600",
  "from-cyan-600 to-emerald-500",
  "from-orange-600 to-pink-600",
  "from-indigo-600 to-purple-600",
  "from-pink-600 to-rose-500",
  "from-teal-600 to-blue-600",
  "from-yellow-600 to-orange-600",
  "from-violet-600 to-blue-600",
];

// 文字列から安定したインデックスを得る（同じカテゴリは常に同じ色）
function hashIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function ProjectImage({
  url,
  seed,
  className = "",
}: {
  url?: string | null;
  seed: string;        // カテゴリ名やslug。色を安定させるため
  className?: string;
}) {
  if (url) {
    // 将来用: next/image に置き換え可能
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`object-cover ${className}`} />;
  }
  const grad = GRADIENTS[hashIndex(seed, GRADIENTS.length)];
  return <div className={`bg-gradient-to-br ${grad} ${className}`} aria-hidden />;
}
