"use client";

import { useTranslations } from "next-intl";
import type { GenreProfile } from "@/lib/recommendation/types";

interface ProfileSummaryProps {
  profile: GenreProfile;
  analyzedGameCount: number;
}

export default function ProfileSummary({
  profile,
  analyzedGameCount,
}: ProfileSummaryProps) {
  const t = useTranslations("recommendations");

  // 上位8ジャンルをスコア順に取得
  const topGenres = Object.entries(profile.genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-semibold text-gray-200">
          {t("profileSummaryTitle")}
        </h2>
        <span className="shrink-0 text-xs text-gray-500">
          {t("analyzedGames")}: {analyzedGameCount}
        </span>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        {t("profileSummaryDesc")}
      </p>

      {/* ジャンルバー一覧 */}
      <div className="space-y-2">
        {topGenres.map(([genre, score], index) => {
          const pct = Math.round(score * 100);
          const isRecent =
            (profile.recentGenreScores[genre] ?? 0) > 0.5;
          return (
            <div key={genre} className="flex items-center gap-3">
              {/* 順位 */}
              <span className="w-4 shrink-0 text-right text-xs font-bold text-gray-600">
                {index + 1}
              </span>

              {/* ジャンル名 */}
              <span className="w-28 shrink-0 truncate text-sm text-gray-300">
                {genre}
              </span>

              {/* バー */}
              <div className="flex-1 h-2 rounded-full bg-gray-800">
                <div
                  className="h-2 rounded-full bg-[#66c0f4] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* スコア */}
              <span className="w-8 shrink-0 text-right text-xs text-gray-500">
                {pct}%
              </span>

              {/* 最近プレイ中バッジ */}
              {isRecent && (
                <span className="shrink-0 rounded bg-[#66c0f4]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#66c0f4]">
                  Recent
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
