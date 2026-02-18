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
  limit = 15,
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
      <div className="flex flex-col divide-y divide-gray-800">
        {sortedGames.map((game, index) => (
          <GameItem key={game.appid} game={game} rank={index + 1} />
        ))}
      </div>
    </Card>
  );
}

function GameItem({ game, rank }: { game: OwnedGame; rank: number }) {
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
      className="flex items-center gap-3 px-1 py-2.5 transition-colors hover:bg-gray-800/50 rounded-lg"
    >
      {/* 順位 */}
      <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-600">
        {rank}
      </span>

      {/* サムネイル */}
      <Image
        src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`}
        alt={game.name}
        width={80}
        height={30}
        className="rounded shrink-0"
        unoptimized
      />

      {/* タイトル（余白を全部使う） */}
      <p className="flex-1 min-w-0 text-sm font-medium text-gray-200 leading-snug line-clamp-2">
        {game.name}
      </p>

      {/* プレイ時間（右寄せ・固定幅） */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-gray-300">
          {hours.toLocaleString()}
          <span className="ml-0.5 text-xs font-normal text-gray-500">
            {t("hours")}
          </span>
        </p>
        {recentHours > 0 && (
          <p className="text-xs text-[#66c0f4]">
            {recentHours}h / 2wk
          </p>
        )}
      </div>
    </a>
  );
}
