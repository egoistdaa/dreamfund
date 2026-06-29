import type { Project } from "@/types";

/**
 * ダミーデータ。型は本番(Supabase)と完全に同じ Project[]。
 * ★差し替え方: このファイルを使わず lib/data/projects.ts の関数内で
 *   Supabaseを呼ぶように変えるだけ。画面側は一切変更不要。
 *
 * 画像は将来Storageのurlが入る想定。今は thumbnailUrl=null とし、
 * コンポーネント側でカテゴリ別のグラデーションを描く。
 */

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const DUMMY_PROJECTS: Project[] = [
  {
    id: "p1", ownerId: "u1", owner: { id: "u1", displayName: "昭和横丁再生委員会" },
    title: "商店街の灯を未来へ。昭和レトロ横丁を復活させたい",
    slug: "showa-yokocho", category: "地域活性",
    tags: ["商店街", "まちづくり", "レトロ"], thumbnailUrl: null, gallery: [],
    story: "閉店が続く商店街に、もう一度人の流れを取り戻したい。昔ながらの横丁を改装し、若い世代の出店も募りながら、世代を超えて集える場所をつくります。",
    goalAmount: 2_000_000, currentAmount: 2_847_000, supportersCount: 284,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(18), endAt: inDays(12), createdAt: ago(18),
  },
  {
    id: "p2", ownerId: "u2", owner: { id: "u2", displayName: "みかん農家 山田園" },
    title: "無農薬みかん農家の、こだわりクラフトジュース",
    slug: "mikan-juice", category: "飲食",
    tags: ["無農薬", "ジュース", "農業"], thumbnailUrl: null, gallery: [],
    story: "三代続くみかん農園が、規格外で捨てられていた実を活かしたクラフトジュースを開発しました。",
    goalAmount: 1_500_000, currentAmount: 1_305_000, supportersCount: 156,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(25), endAt: inDays(3), createdAt: ago(25),
  },
  {
    id: "p3", ownerId: "u3", owner: { id: "u3", displayName: "日本車いすバスケ協会" },
    title: "車いすバスケ日本代表を、世界の舞台へ送り出したい",
    slug: "wheelchair-basketball", category: "スポーツ",
    tags: ["パラスポーツ", "遠征費", "日本代表"], thumbnailUrl: null, gallery: [],
    story: "世界選手権への遠征費を、みんなの力で。選手たちが最高の環境で戦えるよう応援してください。",
    goalAmount: 3_000_000, currentAmount: 6_540_000, supportersCount: 892,
    fundingType: "all_in", status: "live",
    startAt: ago(20), endAt: inDays(3), createdAt: ago(20),
  },
  {
    id: "p4", ownerId: "u4", owner: { id: "u4", displayName: "まちの音楽ホール実行委員会" },
    title: "廃校の体育館を、町みんなの音楽ホールに変える",
    slug: "school-music-hall", category: "音楽",
    tags: ["廃校活用", "音楽", "コミュニティ"], thumbnailUrl: null, gallery: [],
    story: "使われなくなった体育館を、誰もが演奏や鑑賞を楽しめる音楽ホールへ改装します。",
    goalAmount: 2_000_000, currentAmount: 3_520_000, supportersCount: 514,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(15), endAt: inDays(9), createdAt: ago(15),
  },
  {
    id: "p5", ownerId: "u5", owner: { id: "u5", displayName: "保護犬猫シェルターの会" },
    title: "保護犬・保護猫のためのシェルターを建てたい",
    slug: "animal-shelter", category: "動物",
    tags: ["保護動物", "シェルター"], thumbnailUrl: null, gallery: [],
    story: "行き場のない犬や猫が安心して過ごせる、あたたかいシェルターをつくります。",
    goalAmount: 4_000_000, currentAmount: 3_720_000, supportersCount: 421,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(22), endAt: inDays(6), createdAt: ago(22),
  },
  {
    id: "p6", ownerId: "u6", owner: { id: "u6", displayName: "こどもプログラミング教室" },
    title: "子どもが自由に学べるプログラミング教室をつくる",
    slug: "kids-programming", category: "教育",
    tags: ["教育", "プログラミング", "こども"], thumbnailUrl: null, gallery: [],
    story: "経済状況に関わらず、すべての子どもがプログラミングに触れられる場所を。",
    goalAmount: 2_000_000, currentAmount: 1_760_000, supportersCount: 203,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(10), endAt: inDays(4), createdAt: ago(10),
  },
  {
    id: "p7", ownerId: "u7", owner: { id: "u7", displayName: "まちなかギャラリー" },
    title: "地元の若手作家だけの、まちなかギャラリーを開く",
    slug: "machinaka-gallery", category: "アート",
    tags: ["アート", "若手作家", "ギャラリー"], thumbnailUrl: null, gallery: [],
    story: "発表の場が少ない若手作家のための、開かれたギャラリーを空き店舗につくります。",
    goalAmount: 2_000_000, currentAmount: 420_000, supportersCount: 38,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(2), endAt: inDays(30), createdAt: ago(2),
  },
  {
    id: "p8", ownerId: "u8", owner: { id: "u8", displayName: "海洋部 高校生チーム" },
    title: "高校生が開発した、海洋ごみを集めるロボット",
    slug: "ocean-cleanup-robot", category: "学生",
    tags: ["学生", "環境", "ロボット"], thumbnailUrl: null, gallery: [],
    story: "海のごみ問題を解決したい。高校生が設計したロボットを実用化します。",
    goalAmount: 1_500_000, currentAmount: 690_000, supportersCount: 97,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(7), endAt: inDays(22), createdAt: ago(7),
  },
  {
    id: "p9", ownerId: "u9", owner: { id: "u9", displayName: "村の本屋プロジェクト" },
    title: "過疎の村に、みんなが集える小さな本屋を開きたい",
    slug: "village-bookstore", category: "社会貢献",
    tags: ["本屋", "地域", "居場所"], thumbnailUrl: null, gallery: [],
    story: "本がきっかけで人が集まる、村の新しい居場所をつくります。",
    goalAmount: 1_500_000, currentAmount: 1_215_000, supportersCount: 168,
    fundingType: "all_or_nothing", status: "live",
    startAt: ago(12), endAt: inDays(8), createdAt: ago(12),
  },
];
