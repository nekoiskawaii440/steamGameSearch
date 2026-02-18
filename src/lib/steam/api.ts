import { getCached } from "@/lib/cache/kv";
import type {
  OwnedGame,
  OwnedGamesResponse,
  PlayerAchievementsResponse,
  GlobalAchievementPercentagesResponse,
} from "./types";

const STEAM_API_BASE = "https://api.steampowered.com";

function getApiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("STEAM_API_KEY is not configured");
  return key;
}

/**
 * ユーザーの所持ゲーム一覧を取得
 * キャッシュ: 1時間
 */
export async function getOwnedGames(
  steamId: string
): Promise<OwnedGame[]> {
  return getCached(
    `user:${steamId}:owned`,
    async () => {
      const key = getApiKey();
      const params = new URLSearchParams({
        key,
        steamid: steamId,
        format: "json",
        include_appinfo: "1",
        include_played_free_games: "1",
      });

      const res = await fetch(
        `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?${params}`,
        { next: { revalidate: 3600 } }
      );

      if (!res.ok) {
        throw new Error(`Steam API error: ${res.status}`);
      }

      const data: OwnedGamesResponse = await res.json();
      return data.response?.games ?? [];
    },
    3600 // 1時間キャッシュ
  );
}

/**
 * ゲームのプレイヤー実績を取得
 */
export async function getPlayerAchievements(
  steamId: string,
  appId: number
): Promise<PlayerAchievementsResponse["playerstats"] | null> {
  try {
    const key = getApiKey();
    const params = new URLSearchParams({
      key,
      steamid: steamId,
      appid: appId.toString(),
      format: "json",
    });

    const res = await fetch(
      `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?${params}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) return null;

    const data: PlayerAchievementsResponse = await res.json();
    return data.playerstats?.success ? data.playerstats : null;
  } catch {
    return null;
  }
}

/**
 * ゲームのグローバル実績取得率を取得
 */
export async function getGlobalAchievementPercentages(
  appId: number
): Promise<GlobalAchievementPercentagesResponse["achievementpercentages"]["achievements"] | null> {
  return getCached(
    `achievements:global:${appId}`,
    async () => {
      try {
        const params = new URLSearchParams({
          gameid: appId.toString(),
          format: "json",
        });

        const res = await fetch(
          `${STEAM_API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?${params}`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (!res.ok) return null;

        const data: GlobalAchievementPercentagesResponse = await res.json();
        return data.achievementpercentages?.achievements ?? null;
      } catch {
        return null;
      }
    },
    7 * 24 * 3600 // 7日キャッシュ
  );
}
