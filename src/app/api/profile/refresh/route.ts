import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnedGames } from "@/lib/steam/api";
import { enrichGamesWithDetails } from "@/lib/steam/store-api";
import { buildGenreProfile } from "@/lib/recommendation/genre-analyzer";
import { getTagsForTopGames } from "@/lib/steamspy/api";
import { setCache } from "@/lib/cache/kv";

const TOTAL_BUDGET_MS = 9000; // Vercel 10秒制限に対して余裕を持たせた値
const ENRICH_BUDGET_MS = 7500; // enrichGamesWithDetails に使う最大時間

/**
 * ジャンルプロファイルを再構築してキャッシュに保存するAPI
 * Recommendations ページの「最適化」ボタンから呼ばれる
 *
 * Phase 3: SteamSpy タグを収集して tagScores をプロファイルに組み込む。
 * enrichGamesWithDetails は並列化済みなので高速。
 * キャッシュ済みゲームが多ければほぼ全件を 1-2 秒以内に処理できる。
 *
 * 時間バジェット管理:
 *   1. enrichGamesWithDetails: 最大 7500ms（並列10件ずつ）
 *   2. 残り時間でプレイ時間上位 20 件のタグ取得（並列、タイムアウト付き）
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steamId = session.user.id;
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "ja";
  const startTime = Date.now();

  try {
    // 所持ゲームを取得（キャッシュ利用）
    const games = await getOwnedGames(steamId);
    if (games.length === 0) {
      return NextResponse.json(
        { error: "No games found or profile is private" },
        { status: 404 }
      );
    }

    // ① 並列バッチでジャンル情報を追加取得（キャッシュ済みなら全件 1-2秒で完了）
    const { enriched, pendingAppIds } = await enrichGamesWithDetails(
      games,
      locale,
      ENRICH_BUDGET_MS
    );

    // ② 残り時間でプレイ時間上位 20 件のタグを取得
    // タイムアウトした場合は空オブジェクトを返し、tagScores={} のプロファイルになる
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startTime);
    const topAppIds = [...enriched]
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 20)
      .map((g) => g.appid);

    const tagsResult = await Promise.race([
      getTagsForTopGames(topAppIds, 5),
      new Promise<Record<number, Record<string, number>>>((resolve) =>
        setTimeout(() => resolve({}), Math.max(remaining - 500, 0))
      ),
    ]);

    // ③ プロファイルを再構築してキャッシュに保存
    const profile = buildGenreProfile(enriched, tagsResult);
    await setCache(`user:${steamId}:profile:v2`, profile, 3600);

    return NextResponse.json({
      success: true,
      analyzedGames: enriched.length,
      totalGames: games.length,
      pendingCount: pendingAppIds.length,
      topGenres: profile.topGenres,
      topTags: profile.topTags,
    });
  } catch (error) {
    console.error("Profile refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
