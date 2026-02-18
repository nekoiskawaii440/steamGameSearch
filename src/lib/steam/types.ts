// Steam Web API レスポンス型

export interface OwnedGame {
  appid: number;
  name: string;
  playtime_forever: number; // 総プレイ時間（分）
  playtime_2weeks?: number; // 直近2週間プレイ時間（分）
  img_icon_url: string;
  has_community_visible_stats?: boolean;
}

export interface OwnedGamesResponse {
  response: {
    game_count: number;
    games: OwnedGame[];
  };
}

export interface PlayerAchievement {
  apiname: string;
  achieved: number; // 0 or 1
  unlocktime: number;
}

export interface PlayerAchievementsResponse {
  playerstats: {
    steamID: string;
    gameName: string;
    achievements: PlayerAchievement[];
    success: boolean;
  };
}

export interface GlobalAchievementPercentage {
  name: string;
  percent: number;
}

export interface GlobalAchievementPercentagesResponse {
  achievementpercentages: {
    achievements: GlobalAchievementPercentage[];
  };
}

// Steam Store API レスポンス型

export interface SteamGenre {
  id: string;
  description: string;
}

export interface SteamCategory {
  id: number;
  description: string;
}

export interface SteamPriceOverview {
  currency: string;
  initial: number; // セント単位
  final: number;
  discount_percent: number;
  initial_formatted: string;
  final_formatted: string;
}

export interface AppDetails {
  type: string;
  name: string;
  steam_appid: number;
  is_free: boolean;
  short_description: string;
  header_image: string;
  genres?: SteamGenre[];
  categories?: SteamCategory[];
  price_overview?: SteamPriceOverview;
  release_date?: {
    coming_soon: boolean;
    date: string;
  };
}

export interface AppDetailsResponse {
  [appid: string]: {
    success: boolean;
    data: AppDetails;
  };
}

// ゲーム詳細付き所持ゲーム

export interface OwnedGameWithDetails extends OwnedGame {
  details?: AppDetails;
}

// プレイヤーサマリー

export interface PlayerSummary {
  steamid: string;
  communityvisibilitystate: number; // 3 = public
  personaname: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  profileurl: string;
}
