import { NextRequest, NextResponse } from "next/server";
import { enrichBatch } from "@/lib/steam/store-api";

/**
 * バックグラウンドでゲーム詳細（ジャンル・価格）を取得するAPI
 * クライアントからポーリングで呼ばれる
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appidsParam = searchParams.get("appids");
  const locale = searchParams.get("locale") || "ja";

  if (!appidsParam) {
    return NextResponse.json(
      { error: "appids parameter required" },
      { status: 400 }
    );
  }

  const appIds = appidsParam
    .split(",")
    .map(Number)
    .filter((id) => !isNaN(id) && id > 0);

  if (appIds.length === 0) {
    return NextResponse.json(
      { error: "No valid appids provided" },
      { status: 400 }
    );
  }

  const results = await enrichBatch(appIds, locale, 5);

  return NextResponse.json({
    results,
    processed: Object.keys(results).length,
    remaining: Math.max(0, appIds.length - 5),
  });
}
