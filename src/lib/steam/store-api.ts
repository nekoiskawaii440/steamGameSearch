import { getCached } from "@/lib/cache/kv";
import type { AppDetails, AppDetailsResponse, OwnedGame, OwnedGameWithDetails } from "./types";
import type { ScoredGame } from "@/lib/recommendation/types";
import { getGameTagsSpy } from "@/lib/steamspy/api";

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
 *
 * 並列バッチ処理でキャッシュ済みゲームを高速に処理する。
 * timeBudgetMs 内に完了した分を返し、残りは pendingAppIds に格納する。
 *
 * キャッシュヒット時: 並列 20 件でも ~50ms → ほぼ全件処理できる
 * キャッシュミス時: Steam API は ~200ms/件 → concurrency=10 で ~200ms/batch
 */
export async function enrichGamesWithDetails(
  games: OwnedGame[],
  locale: string = "ja",
  timeBudgetMs: number = 7000,
  concurrency: number = 10
): Promise<{ enriched: OwnedGameWithDetails[]; pendingAppIds: number[] }> {
  const startTime = Date.now();
  const enriched: OwnedGameWithDetails[] = [];
  const pendingAppIds: number[] = [];

  // プレイ時間順にソート（多い順）
  const sorted = [...games].sort(
    (a, b) => b.playtime_forever - a.playtime_forever
  );

  // concurrency 件ずつ並列処理
  for (let i = 0; i < sorted.length; i += concurrency) {
    if (Date.now() - startTime > timeBudgetMs) {
      // 時間切れ: 残りを pending に追加
      for (const game of sorted.slice(i)) {
        pendingAppIds.push(game.appid);
      }
      break;
    }

    const batch = sorted.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (game) => {
        const details = await getAppDetails(game.appid, locale);
        return { ...game, details: details ?? undefined };
      })
    );
    enriched.push(...results);
  }

  return { enriched, pendingAppIds };
}

/**
 * スコアリング済みの推薦ゲームに Steam Store appdetails から
 * ジャンル・カテゴリを並行補完する。
 *
 * top100forever / top100in2weeks は SteamSpy が genre="" で返すため
 * スコアリング後も genres[] が空になる。
 * 上位N件に限定して getAppDetails を並行フェッチし genres/categories を埋める。
 * getAppDetails は 7日キャッシュ付きなので初回のみ fetch、以降は即座に返る。
 * SteamSpy タグの補完は Phase 2 で追加予定。
 */
export async function enrichScoredGameTags(
  games: ScoredGame[]
): Promise<ScoredGame[]> {
  return Promise.all(
    games.map(async (game) => {
      const needsDetails = game.genres.length === 0 || game.categories.length === 0;
      const needsTags = game.tags.length === 0;

      // 全て揃っていれば何もしない
      if (!needsDetails && !needsTags) return game;

      // appdetails と SteamSpy タグを並行取得（7日キャッシュ済みなら即座に返る）
      const [details, rawTags] = await Promise.all([
        needsDetails ? getAppDetails(game.appid) : Promise.resolve(null),
        needsTags    ? getGameTagsSpy(game.appid) : Promise.resolve(null),
      ]);

      // タグを投票数順に上位8件まで抽出
      const topTags = rawTags
        ? Object.entries(rawTags)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([tag]) => tag)
        : game.tags;

      return {
        ...game,
        genres: game.genres.length > 0
          ? game.genres
          : (details?.genres?.map((g) => g.description) ?? []),
        categories: game.categories.length > 0
          ? game.categories
          : (details?.categories?.map((c) => c.id) ?? []),
        tags: topTags,
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
