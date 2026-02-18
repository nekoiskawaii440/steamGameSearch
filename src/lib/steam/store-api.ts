import { getCached } from "@/lib/cache/kv";
import type { AppDetails, AppDetailsResponse, OwnedGame, OwnedGameWithDetails } from "./types";

const STORE_API_BASE = "https://store.steampowered.com/api";

/**
 * Steam Store API からゲーム詳細を取得（ジャンル・価格情報）
 * キャッシュ: 7日
 */
export async function getAppDetails(
  appId: number,
  locale: string = "ja"
): Promise<AppDetails | null> {
  return getCached(
    `appdetails:${appId}:${locale}`,
    async () => {
      try {
        const lang = locale === "ja" ? "japanese" : "english";
        const cc = locale === "ja" ? "jp" : "us";

        const res = await fetch(
          `${STORE_API_BASE}/appdetails?appids=${appId}&l=${lang}&cc=${cc}`,
          { signal: AbortSignal.timeout(5000) }
        );

        if (!res.ok) return null;

        const data: AppDetailsResponse = await res.json();
        const entry = data[appId.toString()];

        if (!entry?.success) return null;
        return entry.data;
      } catch {
        return null;
      }
    },
    7 * 24 * 3600 // 7日キャッシュ
  );
}

/**
 * 所持ゲームにジャンル・価格情報を付加
 * 時間バジェット内で可能な限り取得し、残りは pending として返す
 */
export async function enrichGamesWithDetails(
  games: OwnedGame[],
  locale: string = "ja",
  timeBudgetMs: number = 7000
): Promise<{ enriched: OwnedGameWithDetails[]; pendingAppIds: number[] }> {
  const startTime = Date.now();
  const enriched: OwnedGameWithDetails[] = [];
  const pendingAppIds: number[] = [];

  // プレイ時間順にソート（多い順）
  const sorted = [...games].sort(
    (a, b) => b.playtime_forever - a.playtime_forever
  );

  for (const game of sorted) {
    if (Date.now() - startTime > timeBudgetMs) {
      // 時間切れ: 残りを pending に追加
      pendingAppIds.push(game.appid);
      continue;
    }

    const details = await getAppDetails(game.appid, locale);
    enriched.push({ ...game, details: details ?? undefined });
  }

  return { enriched, pendingAppIds };
}

/**
 * バッチでゲーム詳細を取得（enrich API 用）
 */
export async function enrichBatch(
  appIds: number[],
  locale: string = "ja",
  batchSize: number = 5
): Promise<Record<number, AppDetails>> {
  const results: Record<number, AppDetails> = {};
  const batch = appIds.slice(0, batchSize);

  for (const appId of batch) {
    const details = await getAppDetails(appId, locale);
    if (details) {
      results[appId] = details;
    }
  }

  return results;
}
