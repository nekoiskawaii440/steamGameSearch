import { getCached } from "@/lib/cache/kv";
import type { SteamSpyGame } from "@/lib/recommendation/types";

const STEAMSPY_BASE = "https://steamspy.com/api.php";

interface SteamSpyRawGame {
  appid: number;
  name: string;
  owners: string; // "1,000,000 .. 2,000,000"
  players_2weeks: number;
  price: string | number;
  positive: number;
  negative: number;
  genre: string;
}

/**
 * "1,000,000 .. 2,000,000" 形式の所有者数を中央値に変換
 */
function parseOwnerRange(owners: string): number {
  const parts = owners.replace(/,/g, "").split(" .. ");
  if (parts.length === 2) {
    const low = parseInt(parts[0], 10) || 0;
    const high = parseInt(parts[1], 10) || 0;
    return Math.round((low + high) / 2);
  }
  return parseInt(owners.replace(/,/g, ""), 10) || 0;
}

/**
 * SteamSpy のレスポンスを正規化
 *
 * SteamSpy の price はセント単位（例: 198000 = 1,980円）なので
 * ÷100 して円単位に変換する。
 * Steam Store API 系（new_releases, specials）は最初から円単位で格納するため変換不要。
 */
function normalizeSteamSpyGame(raw: SteamSpyRawGame): SteamSpyGame {
  const priceRaw =
    typeof raw.price === "string"
      ? parseInt(raw.price, 10) || 0
      : raw.price || 0;

  return {
    appid: raw.appid,
    name: raw.name,
    owners: parseOwnerRange(raw.owners),
    players_2weeks: raw.players_2weeks || 0,
    price: Math.round(priceRaw / 100), // セント → 円
    positive: raw.positive || 0,
    negative: raw.negative || 0,
    genre: raw.genre || "",
  };
}

/**
 * ジャンル別ゲーム一覧を取得
 * キャッシュ: 24時間
 */
export async function getGamesByGenre(
  genre: string
): Promise<SteamSpyGame[]> {
  return getCached(
    `steamspy:genre:${genre}`,
    async () => {
      try {
        const res = await fetch(
          `${STEAMSPY_BASE}?request=genre&genre=${encodeURIComponent(genre)}`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) return [];
        const data: Record<string, SteamSpyRawGame> = await res.json();
        return Object.values(data).map(normalizeSteamSpyGame);
      } catch {
        return [];
      }
    },
    24 * 3600
  );
}

/**
 * 直近2週間のトップ100ゲームを取得（トレンド枠）
 * キャッシュ: 24時間
 */
export async function getTopGamesRecent(): Promise<SteamSpyGame[]> {
  return getCached(
    "steamspy:top100in2weeks",
    async () => {
      try {
        const res = await fetch(
          `${STEAMSPY_BASE}?request=top100in2weeks`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) return [];
        const data: Record<string, SteamSpyRawGame> = await res.json();
        return Object.values(data).map(normalizeSteamSpyGame);
      } catch {
        return [];
      }
    },
    24 * 3600
  );
}

/**
 * 歴史的名作トップ100を取得（名作枠）
 * ニッチなインディーゲームも含まれやすく、top100in2weeks との差別化になる
 * キャッシュ: 24時間
 */
export async function getTopGamesAllTime(): Promise<SteamSpyGame[]> {
  return getCached(
    "steamspy:top100forever",
    async () => {
      try {
        const res = await fetch(
          `${STEAMSPY_BASE}?request=top100forever`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) return [];
        const data: Record<string, SteamSpyRawGame> = await res.json();
        return Object.values(data).map(normalizeSteamSpyGame);
      } catch {
        return [];
      }
    },
    24 * 3600
  );
}

/**
 * Steam Store の新着ゲームを取得（新作枠）
 * featuredcategories API の new_releases を利用
 * キャッシュ: 6時間（新作は更新頻度が高い）
 */
export async function getNewReleases(): Promise<SteamSpyGame[]> {
  return getCached(
    "steam:new_releases:v2", // v2: price÷100修正済み
    async () => {
      try {
        const res = await fetch(
          "https://store.steampowered.com/api/featuredcategories?cc=jp&l=japanese",
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) return [];

        const data = await res.json();
        const items: Array<{ id: number; name: string; final_price?: number }> =
          data?.new_releases?.items ?? [];

        // Steam Store の新作情報を SteamSpyGame 形式に変換
        // owners / players_2weeks は不明なので 0 にしておく（スコアリング側で扱う）
        // final_price は cc=jp でもセント単位（例: 198000 = 1,980円）なので ÷100 する
        return items.map((item) => ({
          appid: item.id,
          name: item.name,
          owners: 0,
          players_2weeks: 0,
          price: Math.round((item.final_price ?? 0) / 100), // セント → 円
          positive: 0,
          negative: 0,
          genre: "", // ジャンル情報なし（fillMissingGenres で補完）
        }));
      } catch {
        return [];
      }
    },
    6 * 3600
  );
}

/**
 * Steam Store のセール中ゲームを取得（セール枠）
 * featuredcategories API の specials を利用
 * キャッシュ: 1時間（セール情報は頻繁に変わる可能性がある）
 */
export async function getSaleGames(): Promise<SteamSpyGame[]> {
  return getCached(
    "steam:sale_games:v2", // v2: price÷100修正済み
    async () => {
      try {
        const res = await fetch(
          "https://store.steampowered.com/api/featuredcategories?cc=jp&l=japanese",
          { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) return [];

        const data = await res.json();
        const items: Array<{ id: number; name: string; final_price?: number; original_price?: number }> =
          data?.specials?.items ?? [];

        // final_price は cc=jp でもセント単位なので ÷100 する
        return items.map((item) => ({
          appid: item.id,
          name: item.name,
          owners: 0,
          players_2weeks: 0,
          price: Math.round((item.final_price ?? 0) / 100), // セント → 円
          positive: 0,
          negative: 0,
          genre: "", // ジャンル情報なし（fillMissingGenres で補完）
        }));
      } catch {
        return [];
      }
    },
    1 * 3600
  );
}

/**
 * SteamSpy の個別 appdetails API でコミュニティタグを取得
 *
 * レスポンスの tags フィールド: Record<タグ名, 投票数>
 * 例: { "Free to Play": 7088, "MOBA": 6788, "Multiplayer": 6724, ... }
 * キャッシュ: 7日（getAppDetails と同じTTL）
 * タイムアウト: 3秒
 */
export async function getGameTagsSpy(
  appid: number
): Promise<Record<string, number>> {
  return getCached(
    `steamspy:tags:${appid}`,
    async () => {
      try {
        const res = await fetch(
          `${STEAMSPY_BASE}?request=appdetails&appid=${appid}`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (!res.ok) return {};
        const data = await res.json();
        return (data.tags as Record<string, number>) ?? {};
      } catch {
        return {};
      }
    },
    7 * 24 * 3600 // 7日キャッシュ
  );
}

/**
 * プレイ時間上位ゲームのタグをバッチ並列取得
 *
 * SteamSpy 無料版は ~1req/sec の制限あり。
 * キャッシュヒット時は HTTP リクエスト不発生なので待機不要。
 * キャッシュミス時（初回）のみ concurrency 件ずつバッチ実行 + 350ms 待機でレート制限対応。
 *
 * @param appids - 取得対象の appid リスト（プレイ時間上位順推奨）
 * @param concurrency - 並列数（デフォルト 5）
 */
export async function getTagsForTopGames(
  appids: number[],
  concurrency: number = 5
): Promise<Record<number, Record<string, number>>> {
  const results: Record<number, Record<string, number>> = {};

  for (let i = 0; i < appids.length; i += concurrency) {
    const batch = appids.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (appid) => ({ appid, tags: await getGameTagsSpy(appid) }))
    );
    for (const { appid, tags } of batchResults) {
      results[appid] = tags;
    }
    // レート制限対策: バッチ間 350ms 待機（キャッシュヒット時は実質無視できる）
    if (i + concurrency < appids.length) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  return results;
}

/** 有効な候補ソース種別 */
export type PoolSource = "genre" | "classic" | "new" | "trend" | "sale";

/** デフォルトで有効にするソース */
export const DEFAULT_POOL_SOURCES: PoolSource[] = ["genre", "classic", "new", "trend"];

/**
 * 推薦候補プールを構築
 *
 * 構成（enabledSources で制御）:
 *   - genre  : ユーザーの上位5ジャンル別リスト（ジャンル適合の核）
 *   - classic: top100forever（名作・ニッチ枠）
 *   - trend  : top100in2weeks（トレンド枠）
 *   - new    : new_releases（新作枠）
 *   - sale   : specials（セール中枠）
 */
export async function getCandidatePool(
  topGenres: string[],
  enabledSources: PoolSource[] = DEFAULT_POOL_SOURCES
): Promise<SteamSpyGame[]> {
  const enabled = new Set(enabledSources);

  try {
    // 有効なソースのみ並行取得
    const [genreResults, allTime, trending, newReleases, saleGames] =
      await Promise.all([
        enabled.has("genre")
          ? Promise.all(topGenres.map((genre) => getGamesByGenre(genre)))
          : Promise.resolve([[] as SteamSpyGame[]]),
        enabled.has("classic") ? getTopGamesAllTime() : Promise.resolve([] as SteamSpyGame[]),
        enabled.has("trend")   ? getTopGamesRecent()  : Promise.resolve([] as SteamSpyGame[]),
        enabled.has("new")     ? getNewReleases()      : Promise.resolve([] as SteamSpyGame[]),
        enabled.has("sale")    ? getSaleGames()        : Promise.resolve([] as SteamSpyGame[]),
      ]);

    // 優先度順に結合（ジャンル一致 > 名作 > トレンド > 新作 > セール）
    // 重複除去時は先に出てきた方を優先するため順序が重要
    const allCandidates = [
      ...genreResults.flat(), // ① ジャンル別（最優先）
      ...allTime,             // ② 名作（ニッチ枠）
      ...trending,            // ③ トレンド
      ...newReleases,         // ④ 新作
      ...saleGames,           // ⑤ セール中
    ];

    const seen = new Set<number>();
    return allCandidates.filter((game) => {
      if (seen.has(game.appid)) return false;
      seen.add(game.appid);
      return true;
    });
  } catch (error) {
    console.error("Candidate pool fetch error:", error);
    return [];
  }
}
