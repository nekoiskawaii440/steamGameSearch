import type { GenreProfile, SteamSpyGame, ScoredGame } from "./types";

/**
 * 候補ゲームをスコアリング
 */
function scoreCandidate(
  candidate: SteamSpyGame,
  userProfile: GenreProfile
): ScoredGame {
  const candidateGenres = candidate.genre
    ? candidate.genre.split(",").map((g) => g.trim())
    : [];

  // ジャンル一致度 (0-40)
  let genreMatchRaw = 0;
  for (const genre of candidateGenres) {
    // 総合嗜好との一致
    const baseScore = userProfile.genreScores[genre] ?? 0;
    // 最近の傾向との一致（ブースト）
    const recentScore = userProfile.recentGenreScores[genre] ?? 0;
    genreMatchRaw += baseScore * 0.7 + recentScore * 0.3;
  }
  const genreMatch = Math.min(
    40,
    candidateGenres.length > 0
      ? (genreMatchRaw / candidateGenres.length) * 40
      : 0
  );

  // 人気度 (0-20): 所有者数の対数スケール
  const popularityRaw =
    candidate.owners > 0 ? Math.log10(candidate.owners) / 8 : 0;
  const popularity = Math.min(20, popularityRaw * 20);

  // 最近のトレンド (0-15): 直近2週間のプレイヤー比率
  const trendRatio =
    candidate.owners > 0
      ? candidate.players_2weeks / candidate.owners
      : 0;
  const recentTrend = Math.min(15, trendRatio * 150);

  // 価格適合度 (0-15)
  let priceValue: number;
  if (candidate.price === 0) {
    priceValue = 8; // 無料ゲーム
  } else if (candidate.price <= 1000) {
    priceValue = 15; // ~$10 / ~1000円
  } else if (candidate.price <= 2000) {
    priceValue = 13;
  } else if (candidate.price <= 4000) {
    priceValue = 10;
  } else if (candidate.price <= 6000) {
    priceValue = 7;
  } else {
    priceValue = 5;
  }

  // レビュー評価 (0-10)
  const totalReviews = candidate.positive + candidate.negative;
  const reviewScore =
    totalReviews > 0
      ? (candidate.positive / totalReviews) * 10
      : 5; // レビュー不明は中間

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
  maxPrice?: number, // セント単位
  limit: number = 20
): ScoredGame[] {
  return candidates
    .filter((c) => !ownedAppIds.has(c.appid)) // 所持済みを除外
    .filter((c) => maxPrice == null || c.price <= maxPrice) // 価格フィルタ
    .map((c) => scoreCandidate(c, userProfile))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
