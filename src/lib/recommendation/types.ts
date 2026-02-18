// ジャンルプロファイル型

export interface GenreProfile {
  /** ジャンル名 → 正規化スコア (0-1) */
  genreScores: Record<string, number>;
  /** 上位5ジャンル */
  topGenres: string[];
  /** 平均プレイ時間（分） */
  avgPlaytimeMinutes: number;
  /** 総ゲーム数 */
  totalGames: number;
  /** 総プレイ時間（分） */
  totalPlaytimeMinutes: number;
  /** 最近2週間のジャンルスコア */
  recentGenreScores: Record<string, number>;
}

// SteamSpy ゲーム型

export interface SteamSpyGame {
  appid: number;
  name: string;
  owners: number; // 所有者数（中央値推定）
  players_2weeks: number;
  price: number; // セント単位
  positive: number;
  negative: number;
  genre: string; // カンマ区切り
}

// スコア付き推薦ゲーム

export interface ScoredGame {
  appid: number;
  name: string;
  score: number; // 0-100
  scoreBreakdown: {
    genreMatch: number; // 0-40
    popularity: number; // 0-20
    recentTrend: number; // 0-15
    priceValue: number; // 0-15
    reviewScore: number; // 0-10
  };
  price: number | null; // セント単位, null = 不明
  genres: string[];
  headerImage: string;
}
