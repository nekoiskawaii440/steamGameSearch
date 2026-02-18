"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import type { OwnedGame } from "@/lib/steam/types";

interface OwnedGamesListProps {
  games: OwnedGame[];
  limit?: number;
}

type SortMode = "most" | "recent";

export default function OwnedGamesList({
  games,
  limit = 15,
}: OwnedGamesListProps) {
  const t = useTranslations("dashboard");
  const [mode, setMode] = useState<SortMode>("most");

  const sortedGames = [...games]
    .filter((g) => mode === "recent" ? (g.playtime_2weeks ?? 0) > 0 : true)
    .sort((a, b) =>
      mode === "most"
        ? b.playtime_forever - a.playtime_forever
        : (b.playtime_2weeks ?? 0) - (a.playtime_2weeks ?? 0)
    )
    .slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>{mode === "most" ? t("topGames") : t("recentGames")}</CardTitle>
        <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
          <button
            onClick={() => setMode("most")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === "most"
                ? "bg-[#66c0f4] text-gray-900"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("topGames")}
          </button>
          <button
            onClick={() => setMode("recent")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              mode === "recent"
                ? "bg-[#66c0f4] text-gray-900"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("recentGames")}
          </button>
        </div>
      </CardHeader>

      {sortedGames.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          {t("noRecentGames")}
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-800">
          {sortedGames.map((game, index) => (
            <GameItem key={game.appid} game={game} rank={index + 1} mode={mode} />
          ))}
        </div>
      )}
    </Card>
  );
}

function GameItem({
  game,
  rank,
  mode,
}: {
  game: OwnedGame;
  rank: number;
  mode: SortMode;
}) {
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

      {/* タイトル */}
      <p className="flex-1 min-w-0 text-sm font-medium text-gray-200 leading-snug line-clamp-2">
        {game.name}
      </p>

      {/* プレイ時間（右寄せ） */}
      <div className="shrink-0 text-right">
        {mode === "recent" ? (
          <>
            <p className="text-sm font-semibold text-[#66c0f4]">
              {recentHours.toLocaleString()}
              <span className="ml-0.5 text-xs font-normal text-gray-500">
                {t("hours")}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              {hours.toLocaleString()}{t("hours")} {t("totalShort")}
            </p>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </a>
  );
}
