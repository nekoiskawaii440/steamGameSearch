// ジャンルプロファイル型

export interface PlaystyleProfile {
  singlePlayer: number; // Single-player (id:2) のplaytime加重比率 (0-1)
  multiPlayer: number;  // Multi-player (id:1) のplaytime加重比率 (0-1)
  coop: number;         // Co-op (id:9 or id:36) のplaytime加重比率 (0-1)
  pvp: number;          // PvP (id:49) のplaytime加重比率 (0-1)
}

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
  /** プレイスタイル傾向 */
  playstyle: PlaystyleProfile;
  /** SteamSpyタグ → 正規化スコア (0-1)（Phase 3で有効化、初期は{}） */
  tagScores: Record<string, number>;
  /** 上位タグ（Phase 3で有効化、初期は[]） */
  topTags: string[];
}

// SteamSpy ゲーム型

export interface SteamSpyGame {
  appid: number;
  name: string;
  owners: number; // 所有者数（中央値推定）
  players_2weeks: number;
  price: number; // 円単位（SteamSpy はセント→円変換済み、Store API は元から円）
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
    genreMatch: number;     // 0-30
    tagMatch: number;       // 0-15（Phase 3で有効化、それまでは0）
    playstyleMatch: number; // 0-10
    popularity: number;     // 0-15
    recentTrend: number;    // 0-15
    priceValue: number;     // 0-10
    reviewScore: number;    // 0-5
  };
  price: number | null; // 円単位, null = 不明
  genres: string[];
  tags: string[];       // SteamSpyコミュニティタグ（Phase 2で有効化、初期は[]）
  categories: number[]; // Steam category id[]（初期は[]）
  headerImage: string;
}
