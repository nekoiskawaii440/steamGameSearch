import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getOwnedGames } from "@/lib/steam/api";
import { enrichGamesWithDetails, fillMissingGenres } from "@/lib/steam/store-api";
import { buildGenreProfile } from "@/lib/recommendation/genre-analyzer";
import { getRecommendations } from "@/lib/recommendation/scoring";
import {
  getCandidatePool,
  DEFAULT_POOL_SOURCES,
  type PoolSource,
} from "@/lib/steamspy/api";
import { getCache } from "@/lib/cache/kv";
import type { GenreProfile } from "@/lib/recommendation/types";
import RecommendationList from "@/components/recommendations/RecommendationList";
import ProfileSummary from "@/components/recommendations/ProfileSummary";
import RefreshProfileButton from "@/components/recommendations/RefreshProfileButton";
import PoolSelector from "@/components/recommendations/PoolSelector";

/** URLの ?pool=genre,classic,... を解析して PoolSource[] に変換 */
function parsePoolSources(poolParam: string | undefined): PoolSource[] {
  if (!poolParam) return DEFAULT_POOL_SOURCES;
  const valid = new Set<PoolSource>(["genre", "classic", "new", "trend", "sale"]);
  const parsed = poolParam
    .split(",")
    .map((s) => s.trim() as PoolSource)
    .filter((s) => valid.has(s));
  return parsed.length > 0 ? parsed : DEFAULT_POOL_SOURCES;
}

export default async function RecommendationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  if (!session?.user) {
    redirect({ href: "/", locale });
    return; // TypeScript narrowing
  }

  const steamId = session.user.id;

  // URLから候補プールソースを解析
  const poolParam = typeof resolvedSearchParams.pool === "string"
    ? resolvedSearchParams.pool
    : undefined;
  const enabledSources = parsePoolSources(poolParam);

  // キャッシュからプロファイルを取得、なければ再構築
  let profile = await getCache<GenreProfile>(
    `user:${steamId}:profile`
  );

  let analyzedGameCount = 0;

  if (!profile) {
    const games = await getOwnedGames(steamId);
    const { enriched } = await enrichGamesWithDetails(
      games,
      locale,
      7000
    );
    profile = buildGenreProfile(enriched);
    analyzedGameCount = enriched.filter((g) => g.details?.genres?.length).length;
  } else {
    // キャッシュから取得した場合は totalGames を使って近似値を表示
    analyzedGameCount = profile.totalGames;
  }

  if (profile.topGenres.length === 0) {
    return <NoDataMessage />;
  }

  // 所持ゲームのappid一覧
  const ownedGames = await getOwnedGames(steamId);
  const ownedAppIds = new Set(ownedGames.map((g) => g.appid));

  // 有効なソースで候補を取得
  const rawCandidates = await getCandidatePool(profile.topGenres, enabledSources);

  // genre="" の候補（top100forever/top100in2weeks/new_releases 由来）に
  // appdetails キャッシュ or SteamSpy 個別 API からジャンルを補完
  // ※ 所持済みを先に除外してリクエスト数を削減
  const unowned = rawCandidates.filter((c) => !ownedAppIds.has(c.appid));
  const candidates = await fillMissingGenres(unowned);

  // スコアリング
  const recommendations = getRecommendations(
    candidates,
    profile,
    ownedAppIds
  );

  return (
    <RecommendationsContent
      recommendations={recommendations}
      profile={profile}
      analyzedGameCount={analyzedGameCount}
      currentSources={enabledSources}
    />
  );
}

function RecommendationsContent({
  recommendations,
  profile,
  analyzedGameCount,
  currentSources,
}: {
  recommendations: Awaited<ReturnType<typeof getRecommendations>>;
  profile: GenreProfile;
  analyzedGameCount: number;
  currentSources: PoolSource[];
}) {
  const t = useTranslations("recommendations");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t("title")}</h1>

      {/* 趣向分析サマリー */}
      <ProfileSummary profile={profile} analyzedGameCount={analyzedGameCount} />

      {/* 候補プール選択 */}
      <PoolSelector currentSources={currentSources} />

      {/* プロファイル最適化ボタン */}
      <RefreshProfileButton />

      <RecommendationList games={recommendations} />
    </div>
  );
}

function NoDataMessage() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
        <p className="text-lg text-gray-400">{t("noData")}</p>
      </div>
    </div>
  );
}
