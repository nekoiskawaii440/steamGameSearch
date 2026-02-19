import type { GenreProfile, SteamSpyGame, ScoredGame } from "./types";

/**
 * 候補ゲームをスコアリング（100点満点）
 *
 * 配点:
 *   ジャンル一致度  0-40点  ← genreScores（合成済みスコア）との一致
 *   人気度          0-20点  ← 所有者数（対数スケール）
 *   最近のトレンド  0-15点  ← 直近2週間プレイヤー比率
 *   価格適合度      0-15点  ← 価格帯に応じた加点
 *   レビュー評価    0-10点  ← 好評率
 */
function scoreCandidate(
  candidate: SteamSpyGame,
  userProfile: GenreProfile
): ScoredGame {
  const candidateGenres = candidate.genre
    ? candidate.genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  // --- ジャンル一致度 (0-40) ---
  // genreScores は「直近×0.5 + 集中度×0.3 + 総合×0.2」で合成済みのスコア
  let genreMatchRaw = 0;
  for (const genre of candidateGenres) {
    genreMatchRaw += userProfile.genreScores[genre] ?? 0;
  }
  const genreMatch = Math.min(
    40,
    candidateGenres.length > 0
      ? (genreMatchRaw / candidateGenres.length) * 40
      : 0
  );

  // --- 人気度 (0-20) ---
  // 新作（owners=0）は人気度0だが、ジャンル一致が高ければ上位に出る設計
  const popularityRaw =
    candidate.owners > 0 ? Math.log10(candidate.owners) / 8 : 0;
  const popularity = Math.min(20, popularityRaw * 20);

  // --- 最近のトレンド (0-15) ---
  // 新作（players_2weeks=0）はトレンド0。新作はジャンル一致で勝負させる
  const trendRatio =
    candidate.owners > 0
      ? candidate.players_2weeks / candidate.owners
      : 0;
  const recentTrend = Math.min(15, trendRatio * 150);

  // --- 価格適合度 (0-15) ---
  // candidate.price は円単位（SteamSpy はセント→円変換済み、Store API は元から円）
  let priceValue: number;
  if (candidate.price === 0) {
    priceValue = 8; // 無料ゲーム
  } else if (candidate.price <= 1000) {
    priceValue = 15; // ~1,000円
  } else if (candidate.price <= 2000) {
    priceValue = 13; // ~2,000円
  } else if (candidate.price <= 4000) {
    priceValue = 10; // ~4,000円
  } else if (candidate.price <= 6000) {
    priceValue = 7;  // ~6,000円
  } else {
    priceValue = 5;  // 6,000円超
  }

  // --- レビュー評価 (0-10) ---
  const totalReviews = candidate.positive + candidate.negative;
  const reviewScore =
    totalReviews > 0
      ? (candidate.positive / totalReviews) * 10
      : 5; // レビュー不明（新作など）は中間値

  const totalScore =
    genreMatch + popularity + recentTrend + priceValue + reviewScore;

  return {
    appid: candidate.appid,
    name: candidate.name,
    score: Math.round(totalScore),
    scoreBreakdown: {
      genreMatch: Math.round(genreMatch * 10) / 10,
      popularity: Math.round(popularity * 10) / 10,
      recentTrend: Math.round(recentTrend * 10) / 10,
      priceValue: Math.round(priceValue * 10) / 10,
      reviewScore: Math.round(reviewScore * 10) / 10,
    },
    price: candidate.price,
    genres: candidateGenres,
    headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${candidate.appid}/header.jpg`,
  };
}

/**
 * 推薦ゲームリストを生成
 */
export function getRecommendations(
  candidates: SteamSpyGame[],
  userProfile: GenreProfile,
  ownedAppIds: Set<number>,
  maxPrice?: number, // 円単位
  limit: number = 20
): ScoredGame[] {
  return candidates
    .filter((c) => !ownedAppIds.has(c.appid))
    .filter((c) => maxPrice == null || c.price <= maxPrice)
    .map((c) => scoreCandidate(c, userProfile))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
