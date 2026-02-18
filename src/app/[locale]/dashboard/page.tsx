import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getOwnedGames } from "@/lib/steam/api";
import { enrichGamesWithDetails } from "@/lib/steam/store-api";
import { buildGenreProfile } from "@/lib/recommendation/genre-analyzer";
import { setCache } from "@/lib/cache/kv";
import PlaytimeStats from "@/components/dashboard/PlaytimeStats";
import EnrichProgress from "@/components/dashboard/EnrichProgress";
import OwnedGamesList from "@/components/dashboard/OwnedGamesList";

export default async function DashboardPage({
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

  // 所持ゲーム取得
  const games = await getOwnedGames(steamId);

  if (games.length === 0) {
    return <PrivateProfileMessage />;
  }

  // ジャンル情報を時間バジェット内で取得
  const { enriched, pendingAppIds } = await enrichGamesWithDetails(
    games,
    locale,
    7000
  );

  // ジャンルプロファイルを構築・キャッシュ
  const profile = buildGenreProfile(enriched);
  await setCache(`user:${steamId}:profile`, profile, 3600);

  // 統計計算
  const totalPlaytime = games.reduce(
    (sum, g) => sum + g.playtime_forever,
    0
  );
  const recentlyPlayed = games.filter(
    (g) => g.playtime_2weeks && g.playtime_2weeks > 0
  ).length;

  return (
    <DashboardContent
      totalGames={games.length}
      totalPlaytime={totalPlaytime}
      recentlyPlayed={recentlyPlayed}
      genreScores={profile.genreScores}
      games={games}
      pendingAppIds={pendingAppIds}
      locale={locale}
    />
  );
}

function DashboardContent({
  totalGames,
  totalPlaytime,
  recentlyPlayed,
  genreScores,
  games,
  pendingAppIds,
  locale,
}: {
  totalGames: number;
  totalPlaytime: number;
  recentlyPlayed: number;
  genreScores: Record<string, number>;
  games: Awaited<ReturnType<typeof getOwnedGames>>;
  pendingAppIds: number[];
  locale: string;
}) {
  const t = useTranslations("dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t("title")}</h1>

      <PlaytimeStats
        totalGames={totalGames}
        totalPlaytimeMinutes={totalPlaytime}
        recentlyPlayedCount={recentlyPlayed}
      />

      <div className="flex flex-col gap-6">
        <EnrichProgress
          pendingAppIds={pendingAppIds}
          games={games}
          locale={locale}
          initialGenreScores={genreScores}
        />
        <OwnedGamesList games={games} />
      </div>
    </div>
  );
}

function PrivateProfileMessage() {
  const t = useTranslations("dashboard");

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-yellow-800/50 bg-yellow-900/20 p-8 text-center">
        <p className="text-lg text-yellow-200">{t("privateProfile")}</p>
      </div>
    </div>
  );
}
