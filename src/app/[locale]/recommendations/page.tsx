import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getOwnedGames } from "@/lib/steam/api";
import { enrichGamesWithDetails } from "@/lib/steam/store-api";
import { buildGenreProfile } from "@/lib/recommendation/genre-analyzer";
import { getRecommendations } from "@/lib/recommendation/scoring";
import { getCandidatePool } from "@/lib/steamspy/api";
import { getCache } from "@/lib/cache/kv";
import type { GenreProfile } from "@/lib/recommendation/types";
import RecommendationList from "@/components/recommendations/RecommendationList";
import ProfileSummary from "@/components/recommendations/ProfileSummary";
import RefreshProfileButton from "@/components/recommendations/RefreshProfileButton";

export default async function RecommendationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user) {
    redirect({ href: "/", locale });
    return; // TypeScript narrowing
  }

  const steamId = session.user.id;

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

  // SteamSpy から候補を取得
  const candidates = await getCandidatePool(profile.topGenres);

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
    />
  );
}

function RecommendationsContent({
  recommendations,
  profile,
  analyzedGameCount,
}: {
  recommendations: Awaited<ReturnType<typeof getRecommendations>>;
  profile: GenreProfile;
  analyzedGameCount: number;
}) {
  const t = useTranslations("recommendations");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t("title")}</h1>

      {/* 趣向分析サマリー */}
      <ProfileSummary profile={profile} analyzedGameCount={analyzedGameCount} />

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
