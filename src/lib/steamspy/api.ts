import { getCached } from "@/lib/cache/kv";
import type { SteamSpyGame } from "@/lib/recommendation/types";

const STEAMSPY_BASE = "https://steamspy.com/api.php";

interface SteamSpyRawGame {
  appid: number;
  name: string;
  owners: string; // "1,000,000 .. 2,000,000"
  players_2weeks: number;
  price: string | number; // セント単位（文字列の場合あり）
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
function normalizeSteamSpyGame(
  raw: SteamSpyRawGame
): SteamSpyGame {
  return {
    appid: raw.appid,
    name: raw.name,
    owners: parseOwnerRange(raw.owners),
    players_2weeks: raw.players_2weeks || 0,
    price: typeof raw.price === "string" ? parseInt(raw.price, 10) || 0 : raw.price || 0,
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
 * 直近2週間のトップ100ゲームを取得
 * キャッシュ: 24時間
 */
export async function getTopGames(): Promise<SteamSpyGame[]> {
  return getCached(
    "steamspy:top100",
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
 * 推薦候補プールを構築
 * ユーザーの上位ジャンル + トレンドから取得
 */
export async function getCandidatePool(
  topGenres: string[]
): Promise<SteamSpyGame[]> {
  try {
    // ジャンルごとに並行取得
    const genreResults = await Promise.all(
      topGenres.map((genre) => getGamesByGenre(genre))
    );

    const trending = await getTopGames();

    // 全候補を結合して重複除去
    const allCandidates = [...trending, ...genreResults.flat()];
    const seen = new Set<number>();

    return allCandidates.filter((game) => {
      if (seen.has(game.appid)) return false;
      seen.add(game.appid);
      return true;
    });
  } catch (error) {
    console.error("SteamSpy API error, returning empty pool:", error);
    return [];
  }
}
