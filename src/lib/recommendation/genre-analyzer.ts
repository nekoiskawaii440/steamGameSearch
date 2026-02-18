import type { OwnedGameWithDetails } from "@/lib/steam/types";
import type { GenreProfile } from "./types";

/**
 * 所持ゲームのプレイデータからジャンルプロファイルを構築
 */
export function buildGenreProfile(
  games: OwnedGameWithDetails[]
): GenreProfile {
  const genreScoresRaw: Record<string, number> = {};
  const recentGenreScoresRaw: Record<string, number> = {};
  let totalPlaytime = 0;

  // ジャンル情報を持つゲームのみ処理
  const gamesWithGenres = games.filter(
    (g) => g.details?.genres && g.details.genres.length > 0
  );

  for (const game of gamesWithGenres) {
    const genres = game.details!.genres!;
    totalPlaytime += game.playtime_forever;

    // プレイ時間に基づく重み（対数スケール、逓減効果）
    const playtimeWeight = Math.log2(game.playtime_forever + 1);

    // 最近プレイされている場合のブースト
    const recencyBoost = game.playtime_2weeks && game.playtime_2weeks > 0
      ? 1.5
      : 1.0;

    for (const genre of genres) {
      const name = genre.description;
      // 総合スコア
      genreScoresRaw[name] =
        (genreScoresRaw[name] ?? 0) + playtimeWeight * recencyBoost;

      // 最近のスコア（直近2週間のプレイ時間ベース）
      if (game.playtime_2weeks && game.playtime_2weeks > 0) {
        const recentWeight = Math.log2(game.playtime_2weeks + 1);
        recentGenreScoresRaw[name] =
          (recentGenreScoresRaw[name] ?? 0) + recentWeight;
      }
    }
  }

  // 正規化 (0-1)
  const genreScores = normalizeScores(genreScoresRaw);
  const recentGenreScores = normalizeScores(recentGenreScoresRaw);

  // 上位5ジャンル
  const topGenres = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre]) => genre);

  return {
    genreScores,
    topGenres,
    avgPlaytimeMinutes:
      gamesWithGenres.length > 0
        ? Math.round(totalPlaytime / gamesWithGenres.length)
        : 0,
    totalGames: games.length,
    totalPlaytimeMinutes: totalPlaytime,
    recentGenreScores,
  };
}

/**
 * スコアを 0-1 に正規化
 */
function normalizeScores(
  scores: Record<string, number>
): Record<string, number> {
  const entries = Object.entries(scores);
  if (entries.length === 0) return {};

  const maxScore = Math.max(...entries.map(([, v]) => v));
  if (maxScore === 0) return {};

  const normalized: Record<string, number> = {};
  for (const [key, value] of entries) {
    normalized[key] = value / maxScore;
  }
  return normalized;
}
