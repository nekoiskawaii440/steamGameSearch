"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ScoredGame } from "@/lib/recommendation/types";
import { useState } from "react";

interface RecommendationCardProps {
  game: ScoredGame;
}

export default function RecommendationCard({
  game,
}: RecommendationCardProps) {
  const t = useTranslations("recommendations");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const priceDisplay =
    game.price === null
      ? "?"
      : game.price === 0
        ? t("free")
        : `\u00a5${game.price.toLocaleString()}`;

  return (
    <div className="group rounded-xl border border-gray-800 bg-gray-900/50 p-4 transition-all hover:border-gray-700 hover:bg-gray-900">
      <a
        href={`https://store.steampowered.com/app/${game.appid}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={game.headerImage}
          alt={game.name}
          width={460}
          height={215}
          className="mb-3 rounded-lg object-cover"
          unoptimized
        />
      </a>

      <h3 className="mb-1.5 truncate text-base font-semibold text-gray-100">
        {game.name}
      </h3>

      {/* ジャンルタグ（粗いカテゴリ） */}
      {game.genres.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {game.genres.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500"
            >
              {genre}
            </span>
          ))}
        </div>
      )}

      {/* コミュニティタグ（詳細） */}
      {game.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {game.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded bg-[#66c0f4]/10 px-2 py-0.5 text-xs text-[#66c0f4]/70"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-[#66c0f4]/20 px-2 py-0.5 text-sm font-medium text-[#66c0f4]">
          {t("score")}: {game.score}
        </span>
        <span className="text-sm text-gray-400">{priceDisplay}</span>
      </div>

      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="text-xs text-gray-500 transition-colors hover:text-[#66c0f4]"
      >
        {t("whyRecommended")} {showBreakdown ? "▲" : "▼"}
      </button>

      {showBreakdown && (
        <div className="mt-2 space-y-1 rounded-lg bg-gray-800/50 p-3">
          <ScoreBar
            label={t("genreMatch")}
            value={game.scoreBreakdown.genreMatch}
            max={30}
          />
          <ScoreBar
            label={t("playstyleMatch")}
            value={game.scoreBreakdown.playstyleMatch}
            max={10}
          />
          <ScoreBar
            label={t("popularity")}
            value={game.scoreBreakdown.popularity}
            max={15}
          />
          <ScoreBar
            label={t("trend")}
            value={game.scoreBreakdown.recentTrend}
            max={15}
          />
          <ScoreBar
            label={t("priceValue")}
            value={game.scoreBreakdown.priceValue}
            max={10}
          />
          <ScoreBar
            label={t("review")}
            value={game.scoreBreakdown.reviewScore}
            max={5}
          />
        </div>
      )}

      <a
        href={`https://store.steampowered.com/app/${game.appid}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-[#66c0f4] hover:underline"
      >
        {t("viewOnSteam")} →
      </a>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = (value / max) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-xs text-gray-400">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-700">
        <div
          className="h-2 rounded-full bg-[#66c0f4]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-gray-500">
        {value}/{max}
      </span>
    </div>
  );
}
