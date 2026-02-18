"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import type { OwnedGame } from "@/lib/steam/types";

interface OwnedGamesListProps {
  games: OwnedGame[];
  limit?: number;
}

export default function OwnedGamesList({
  games,
  limit = 12,
}: OwnedGamesListProps) {
  const t = useTranslations("dashboard");

  const sortedGames = [...games]
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("topGames")}</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sortedGames.map((game) => (
          <GameItem key={game.appid} game={game} />
        ))}
      </div>
    </Card>
  );
}

function GameItem({ game }: { game: OwnedGame }) {
  const t = useTranslations("dashboard");
  const hours = Math.round(game.playtime_forever / 60);
  const recentHours = game.playtime_2weeks
    ? Math.round(game.playtime_2weeks / 60)
    : 0;

  return (
    <a
      href={`https://store.steampowered.com/app/${game.appid}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-800/50"
    >
      <Image
        src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`}
        alt={game.name}
        width={92}
        height={35}
        className="rounded"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-200">
          {game.name}
        </p>
        <p className="text-xs text-gray-500">
          {hours.toLocaleString()} {t("hours")}
          {recentHours > 0 && (
            <span className="ml-1 text-[#66c0f4]">
              ({recentHours}h {t("recentlyPlayed").toLowerCase()})
            </span>
          )}
        </p>
      </div>
    </a>
  );
}
