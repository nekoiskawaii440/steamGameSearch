import { getCached } from "@/lib/cache/kv";
import type { AppDetails, AppDetailsResponse, OwnedGame, OwnedGameWithDetails } from "./types";
import type { ScoredGame } from "@/lib/recommendation/types";

const STORE_API_BASE = "https://store.steampowered.com/api";

/**
 * Steam Store API からゲーム詳細を取得（ジャンル・価格情報）
 *
 * ジャンル名は SteamSpy と一致させるため英語固定（l=english）。
 * 価格は日本円で取得するため cc=jp を固定。
 * キャッシュキーは appId のみ（言語非依存）。
 * キャッシュ: 7日
 */
export async function getAppDetails(
  appId: number,
  _locale: string = "ja" // 後方互換のため引数は残すが使用しない
): Promise<AppDetails | null> {
  return getCached(
    `appdetails:${appId}:en_jp`, // en=英語ジャンル名, jp=円価格
    async () => {
      try {
        const res = await fetch(
          // l=english: ジャンル名をSteamSpyと一致する英語で取得
          // cc=jp: 価格を日本円で取得
          `${STORE_API_BASE}/appdetails?appids=${appId}&l=english&cc=jp`,
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
 * スコアリング済みの推薦ゲームに Steam Store appdetails からジャンルを補完する。
 *
 * top100forever / top100in2weeks は SteamSpy が genre="" で返すため
 * スコアリング後も genres[] が空になる。
 * 上位N件に限定して getAppDetails を並行フェッチし genres を埋める。
 * getAppDetails は 7日キャッシュ付きなので初回のみ fetch、以降は即座に返る。
 */
export async function enrichScoredGameGenres(
  games: ScoredGame[]
): Promise<ScoredGame[]> {
  return Promise.all(
    games.map(async (game) => {
      // genres が既に入っていれば何もしない
      if (game.genres.length > 0) return game;

      const details = await getAppDetails(game.appid);
      if (!details?.genres?.length) return game;

      return {
        ...game,
        genres: details.genres.map((g) => g.description),
      };
    })
  );
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
