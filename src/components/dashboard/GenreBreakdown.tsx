"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import type { OwnedGame, AppDetails } from "@/lib/steam/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface GenreBreakdownProps {
  genreScores: Record<string, number>;
  games?: OwnedGame[];
  gameDetails?: Record<number, AppDetails>;
}

const COLORS = [
  "#66c0f4",
  "#4fa3d7",
  "#3886ba",
  "#2b6a9e",
  "#1e4d82",
  "#1b3a66",
  "#17294a",
  "#132030",
];

export default function GenreBreakdown({
  genreScores,
  games = [],
  gameDetails = {},
}: GenreBreakdownProps) {
  const t = useTranslations("dashboard");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const data = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([genre, score]) => ({
      genre,
      score: Math.round(score * 100),
    }));

  if (data.length === 0) {
    return null;
  }

  // 選択ジャンルに属するゲームをプレイ時間順で抽出
  const genreGames = selectedGenre
    ? games
        .filter((g) => {
          const d = gameDetails[g.appid];
          return d?.genres?.some((genre) => genre.description === selectedGenre);
        })
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
    : [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("genreBreakdown")}</CardTitle>
          {selectedGenre && (
            <span className="text-xs text-gray-500">{t("clickToClose")}</span>
          )}
        </CardHeader>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="genre"
                width={120}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f3f4f6",
                }}
                formatter={(value) => [`${value}%`, "Score"]}
              />
              <Bar
                dataKey="score"
                radius={[0, 4, 4, 0]}
                barSize={24}
                style={{ cursor: games.length > 0 ? "pointer" : "default" }}
                onClick={(data: unknown) => {
                  const genre = (data as { genre?: string })?.genre;
                  if (genre) {
                    setSelectedGenre((prev) => (prev === genre ? null : genre));
                  }
                }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      selectedGenre === entry.genre
                        ? "#ffffff"
                        : COLORS[index % COLORS.length]
                    }
                    opacity={
                      selectedGenre && selectedGenre !== entry.genre ? 0.4 : 1
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {games.length > 0 && !selectedGenre && (
          <p className="mt-2 text-center text-xs text-gray-600">
            {t("clickGenreHint")}
          </p>
        )}
      </Card>

      {/* ジャンル別ゲーム一覧 */}
      {selectedGenre && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>
              {selectedGenre}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({genreGames.length}{t("gamesCount")})
              </span>
            </CardTitle>
            <button
              onClick={() => setSelectedGenre(null)}
              className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white"
              aria-label="close"
            >
              ✕
            </button>
          </CardHeader>
          {genreGames.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              {t("noGenreGames")}
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-800">
              {genreGames.map((game, index) => {
                const hours = Math.round(game.playtime_forever / 60);
                const recentHours = game.playtime_2weeks
                  ? Math.round(game.playtime_2weeks / 60)
                  : 0;
                return (
                  <a
                    key={game.appid}
                    href={`https://store.steampowered.com/app/${game.appid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-gray-800/50"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-600">
                      {index + 1}
                    </span>
                    <Image
                      src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/capsule_184x69.jpg`}
                      alt={game.name}
                      width={80}
                      height={30}
                      className="rounded shrink-0"
                      unoptimized
                    />
                    <p className="flex-1 min-w-0 text-sm font-medium text-gray-200 leading-snug line-clamp-2">
                      {game.name}
                    </p>
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
              })}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
