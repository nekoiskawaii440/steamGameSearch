import type { GenreProfile, SteamSpyGame, ScoredGame } from "./types";

/** ユーザーの支配的なプレイスタイルを返す */
function getDominantPlaystyle(
  playstyle: GenreProfile["playstyle"]
): keyof GenreProfile["playstyle"] {
  const entries = Object.entries(playstyle) as [
    keyof GenreProfile["playstyle"],
    number
  ][];
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/**
 * 候補ゲームをスコアリング（100点満点）
 *
 * 配点:
 *   ジャンル一致度    0-30点  ← genreScores（合成済みスコア）との一致
 *   タグ一致度        0-15点  ← tagScores との一致（Phase 3 で有効化、現在は 0）
 *   プレイスタイル    0-10点  ← Single/Multi/Co-op/PvP マッチ
 *   人気度            0-15点  ← 所有者数（対数スケール）
 *   最近のトレンド    0-15点  ← 直近2週間プレイヤー比率
 *   価格適合度        0-10点  ← 価格帯に応じた加点
 *   レビュー評価      0- 5点  ← 好評率
 */
function scoreCandidate(
  candidate: SteamSpyGame,
  userProfile: GenreProfile,
  candidateCategories: number[] = [],
  candidateTags: string[] = []
): ScoredGame {
  const candidateGenres = candidate.genre
    ? candidate.genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  // --- ジャンル一致度 (0-30) ---
  let genreMatchRaw = 0;
  for (const genre of candidateGenres) {
    genreMatchRaw += userProfile.genreScores[genre] ?? 0;
  }
  const genreMatch = Math.min(
    30,
    candidateGenres.length > 0
      ? (genreMatchRaw / candidateGenres.length) * 30
      : 0
  );

  // --- タグ一致度 (0-15) ---
  // tagScores が空（Phase 3 以前）なら 0 点のまま
  let tagMatchRaw = 0;
  if (candidateTags.length > 0 && Object.keys(userProfile.tagScores).length > 0) {
    for (const tag of candidateTags) {
      tagMatchRaw += userProfile.tagScores[tag] ?? 0;
    }
    // タグが多い場合は上位5件相当でスケール（スパムタグによる希釈を防ぐ）
    tagMatchRaw = tagMatchRaw / Math.min(candidateTags.length, 5);
  }
  const tagMatch = Math.min(15, tagMatchRaw * 15);

  // --- プレイスタイルマッチ (0-10) ---
  // categories が空（補完前）なら中間値 5 点
  let playstyleMatch = 5;
  if (candidateCategories.length > 0) {
    const dominant = getDominantPlaystyle(userProfile.playstyle);
    const hasSingle = candidateCategories.includes(2);
    const hasMulti  = candidateCategories.includes(1);
    const hasCoop   = candidateCategories.includes(9) || candidateCategories.includes(36);
    const hasPvp    = candidateCategories.includes(49);

    if (dominant === "singlePlayer") {
      playstyleMatch = hasSingle ? (hasMulti ? 7 : 10) : 2;
    } else if (dominant === "multiPlayer") {
      playstyleMatch = (hasMulti || hasCoop || hasPvp) ? 10 : 2;
    } else if (dominant === "coop") {
      playstyleMatch = hasCoop ? 10 : (hasMulti ? 6 : 2);
    } else {
      // pvp dominant
      playstyleMatch = hasPvp ? 10 : (hasMulti ? 5 : 2);
    }
  }

  // --- 人気度 (0-15) ---
  // 新作（owners=0）は人気度0だが、ジャンル/タグ一致が高ければ上位に出る設計
  const popularityRaw =
    candidate.owners > 0 ? Math.log10(candidate.owners) / 8 : 0;
  const popularity = Math.min(15, popularityRaw * 15);

  // --- 最近のトレンド (0-15) ---
  const trendRatio =
    candidate.owners > 0
      ? candidate.players_2weeks / candidate.owners
      : 0;
  const recentTrend = Math.min(15, trendRatio * 150);

  // --- 価格適合度 (0-10) ---
  // candidate.price は円単位
  let priceValue: number;
  if (candidate.price === 0) {
    priceValue = 6;  // 無料ゲーム
  } else if (candidate.price <= 1000) {
    priceValue = 10; // ~1,000円
  } else if (candidate.price <= 2000) {
    priceValue = 9;  // ~2,000円
  } else if (candidate.price <= 4000) {
    priceValue = 7;  // ~4,000円
  } else if (candidate.price <= 6000) {
    priceValue = 5;  // ~6,000円
  } else {
    priceValue = 3;  // 6,000円超
  }

  // --- レビュー評価 (0-5) ---
  const totalReviews = candidate.positive + candidate.negative;
  const reviewScore =
    totalReviews > 0
      ? (candidate.positive / totalReviews) * 5
      : 2.5; // レビュー不明は中間値

  const totalScore =
    genreMatch + tagMatch + playstyleMatch + popularity + recentTrend + priceValue + reviewScore;

  return {
    appid: candidate.appid,
    name: candidate.name,
    score: Math.round(totalScore),
    scoreBreakdown: {
      genreMatch:     Math.round(genreMatch  * 10) / 10,
      tagMatch:       Math.round(tagMatch    * 10) / 10,
      playstyleMatch: Math.round(playstyleMatch * 10) / 10,
      popularity:     Math.round(popularity     * 10) / 10,
      recentTrend:    Math.round(recentTrend    * 10) / 10,
      priceValue:     Math.round(priceValue     * 10) / 10,
      reviewScore:    Math.round(reviewScore    * 10) / 10,
    },
    price: candidate.price,
    genres: candidateGenres,
    tags: [],
    categories: candidateCategories,
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
