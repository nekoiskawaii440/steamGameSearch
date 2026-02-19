import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOwnedGames } from "@/lib/steam/api";
import { enrichGamesWithDetails } from "@/lib/steam/store-api";
import { buildGenreProfile } from "@/lib/recommendation/genre-analyzer";
import { setCache } from "@/lib/cache/kv";

/**
 * ジャンルプロファイルを再構築してキャッシュに保存するAPI
 * Recommendations ページの「最適化」ボタンから呼ばれる
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steamId = session.user.id;
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "ja";

  try {
    // 所持ゲームを取得（キャッシュ利用）
    const games = await getOwnedGames(steamId);
    if (games.length === 0) {
      return NextResponse.json(
        { error: "No games found or profile is private" },
        { status: 404 }
      );
    }

    // 時間バジェット内でジャンル情報を追加取得
    // （既にキャッシュされているゲームは高速で通過する）
    const { enriched, pendingAppIds } = await enrichGamesWithDetails(
      games,
      locale,
      8000 // API ルートなので 8 秒まで使える
    );

    // プロファイルを再構築してキャッシュに保存
    const profile = buildGenreProfile(enriched);
    await setCache(`user:${steamId}:profile`, profile, 3600);

    return NextResponse.json({
      success: true,
      analyzedGames: enriched.length,
      totalGames: games.length,
      pendingCount: pendingAppIds.length,
      topGenres: profile.topGenres,
    });
  } catch (error) {
    console.error("Profile refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
