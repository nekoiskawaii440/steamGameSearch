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
 */
function normalizeSteamSpyGame(raw: SteamSpyRawGame): SteamSpyGame {
  return {
    appid: raw.appid,
    name: raw.name,
    owners: parseOwnerRange(raw.owners),
    players_2weeks: raw.players_2weeks || 0,
    price:
      typeof raw.price === "string"
        ? parseInt(raw.price, 10) || 0
        : raw.price || 0,
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
    "steam:new_releases",
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
        return items.map((item) => ({
          appid: item.id,
          name: item.name,
          owners: 0,
          players_2weeks: 0,
          price: item.final_price ?? 0, // セント単位（JPYの場合は円単位）
          positive: 0,
          negative: 0,
          genre: "", // ジャンル情報なし（スコアリング時に0点になる）
        }));
      } catch {
        return [];
      }
    },
    6 * 3600
  );
}

/**
 * 推薦候補プールを構築
 *
 * 構成:
 *   - ユーザーの上位5ジャンル別リスト（ジャンル適合の核）
 *   - top100in2weeks（トレンド枠）
 *   - top100forever（名作・ニッチ枠）
 *   - new_releases（新作枠）
 */
export async function getCandidatePool(
  topGenres: string[]
): Promise<SteamSpyGame[]> {
  try {
    // 全ソースを並行取得
    const [genreResults, trending, allTime, newReleases] =
      await Promise.all([
        Promise.all(topGenres.map((genre) => getGamesByGenre(genre))),
        getTopGamesRecent(),
        getTopGamesAllTime(),
        getNewReleases(),
      ]);

    // 優先度順に結合（ジャンル一致 > 名作 > トレンド > 新作）
    // 重複除去時は先に出てきた方を優先するため順序が重要
    const allCandidates = [
      ...genreResults.flat(), // ① ジャンル別（最優先）
      ...allTime,             // ② 名作（ニッチ枠）
      ...trending,            // ③ トレンド
      ...newReleases,         // ④ 新作
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
