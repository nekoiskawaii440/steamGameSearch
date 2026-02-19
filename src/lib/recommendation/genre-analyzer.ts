import type { OwnedGameWithDetails } from "@/lib/steam/types";
import type { GenreProfile } from "./types";

/**
 * 所持ゲームのプレイデータからジャンルプロファイルを構築
 *
 * スコアリング方針:
 *   直近2週間プレイ時間の比重 × 0.5  ← 「今」を最重視
 *   プレイ集中度               × 0.3  ← 所持数に対して実際に遊んでいるか
 *   総プレイ時間の比重          × 0.2  ← 過去の嗜好（参考）
 */
export function buildGenreProfile(
  games: OwnedGameWithDetails[]
): GenreProfile {
  // ジャンル情報を持つゲームのみ処理
  const gamesWithGenres = games.filter(
    (g) => g.details?.genres && g.details.genres.length > 0
  );

  // --- ① 総プレイ時間スコア（対数スケール、逓減効果） ---
  const totalPlaytimeScoresRaw: Record<string, number> = {};
  for (const game of gamesWithGenres) {
    const weight = Math.log2(game.playtime_forever + 1);
    for (const genre of game.details!.genres!) {
      totalPlaytimeScoresRaw[genre.description] =
        (totalPlaytimeScoresRaw[genre.description] ?? 0) + weight;
    }
  }

  // --- ② 直近2週間プレイ時間スコア ---
  const recentPlaytimeScoresRaw: Record<string, number> = {};
  for (const game of gamesWithGenres) {
    if (!game.playtime_2weeks || game.playtime_2weeks <= 0) continue;
    const weight = Math.log2(game.playtime_2weeks + 1);
    for (const genre of game.details!.genres!) {
      recentPlaytimeScoresRaw[genre.description] =
        (recentPlaytimeScoresRaw[genre.description] ?? 0) + weight;
    }
  }

  // --- ③ プレイ集中度スコア ---
  // ジャンルごとに「平均プレイ時間 / 最大プレイ時間」を算出
  // → 多くのゲームを均等に遊んでいるジャンルほどスコアが高い
  // → 1本だけ突出して遊んでいるジャンルはスコアが低くなる
  const genreGamePlaytimes: Record<string, number[]> = {};
  for (const game of gamesWithGenres) {
    for (const genre of game.details!.genres!) {
      if (!genreGamePlaytimes[genre.description]) {
        genreGamePlaytimes[genre.description] = [];
      }
      genreGamePlaytimes[genre.description].push(game.playtime_forever);
    }
  }

  const concentrationScoresRaw: Record<string, number> = {};
  for (const [genre, playtimes] of Object.entries(genreGamePlaytimes)) {
    if (playtimes.length === 0) continue;
    const maxPlaytime = Math.max(...playtimes);
    if (maxPlaytime === 0) {
      concentrationScoresRaw[genre] = 0;
      continue;
    }
    const avgPlaytime =
      playtimes.reduce((a, b) => a + b, 0) / playtimes.length;
    // 集中度 = 平均 / 最大（0〜1）
    // 所持数が多いほど平均は下がりやすいが、均等に遊んでいれば高い値を保つ
    const concentration = avgPlaytime / maxPlaytime;
    // 所持数が少なくても最近たくさん遊んでいれば集中度を補正
    // → 所持1本でも100時間なら集中度=1.0になる（正常な動作）
    concentrationScoresRaw[genre] = concentration;
  }

  // --- ④ 3要素を合成して最終スコアを計算 ---
  const allGenres = new Set([
    ...Object.keys(totalPlaytimeScoresRaw),
    ...Object.keys(recentPlaytimeScoresRaw),
    ...Object.keys(concentrationScoresRaw),
  ]);

  // 各スコアを正規化してから合成
  const totalNorm = normalizeScores(totalPlaytimeScoresRaw);
  const recentNorm = normalizeScores(recentPlaytimeScoresRaw);
  // 集中度は既に0〜1なので正規化不要だが、最大値が1未満のこともあるため正規化
  const concentrationNorm = normalizeScores(concentrationScoresRaw);

  const compositeScoresRaw: Record<string, number> = {};
  for (const genre of allGenres) {
    const total = totalNorm[genre] ?? 0;
    const recent = recentNorm[genre] ?? 0;
    const concentration = concentrationNorm[genre] ?? 0;

    compositeScoresRaw[genre] =
      recent * 0.5 + concentration * 0.3 + total * 0.2;
  }

  // 最終スコアを正規化（0〜1）
  const genreScores = normalizeScores(compositeScoresRaw);

  // 上位5ジャンル（候補プール生成に使用）
  const topGenres = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre]) => genre);

  const totalPlaytime = gamesWithGenres.reduce(
    (sum, g) => sum + g.playtime_forever,
    0
  );

  return {
    genreScores,
    topGenres,
    avgPlaytimeMinutes:
      gamesWithGenres.length > 0
        ? Math.round(totalPlaytime / gamesWithGenres.length)
        : 0,
    totalGames: games.length,
    totalPlaytimeMinutes: totalPlaytime,
    recentGenreScores: recentNorm,
  };
}

/**
 * スコアを 0〜1 に正規化
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
