import { getCached, getCache } from "@/lib/cache/kv";
import type { AppDetails, AppDetailsResponse, OwnedGame, OwnedGameWithDetails } from "./types";
import type { SteamSpyGame } from "@/lib/recommendation/types";

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
 * SteamSpy 候補ゲームのうち genre が空のものにジャンル文字列を補完する。
 *
 * top100forever / top100in2weeks は SteamSpy が genre="" で返すため、
 * カード表示とスコアリングのジャンルマッチに使えない。
 *
 * 補完の優先順位:
 *   1. Steam Store appdetails キャッシュ（既にユーザー所持ゲームで取得済み）
 *   2. SteamSpy 個別 API（?request=appdetails&appid=XXX）— 24h キャッシュ
 */
export async function fillMissingGenres(
  candidates: SteamSpyGame[]
): Promise<SteamSpyGame[]> {
  return Promise.all(
    candidates.map(async (game) => {
      // genre が既に入っていれば何もしない
      if (game.genre) return game;

      // ① Steam Store appdetails キャッシュを参照（fetch なし）
      const cached = await getCache<AppDetails>(`appdetails:${game.appid}:en_jp`);
      if (cached?.genres?.length) {
        const genreStr = cached.genres.map((g) => g.description).join(", ");
        return { ...game, genre: genreStr };
      }

      // ② SteamSpy 個別 API からジャンルを取得（24h キャッシュ）
      const spyGenre = await getCached<string>(
        `steamspy:genre_str:${game.appid}`,
        async () => {
          try {
            const res = await fetch(
              `https://steamspy.com/api.php?request=appdetails&appid=${game.appid}`,
              { signal: AbortSignal.timeout(4000) }
            );
            if (!res.ok) return "";
            const data = await res.json();
            return (data?.genre as string) ?? "";
          } catch {
            return "";
          }
        },
        24 * 3600
      );

      if (spyGenre) return { ...game, genre: spyGenre };
      return game;
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
