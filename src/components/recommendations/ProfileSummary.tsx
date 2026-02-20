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

      {/* コミュニティタグ傾向（profile/refresh 後に有効化） */}
      {profile.topTags.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Top Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.topTags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-[#66c0f4]/10 px-2 py-0.5 text-xs text-[#66c0f4]/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* プレイスタイル傾向 */}
      {profile.playstyle && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {t("playstyleTitle")}
          </h3>
          <div className="space-y-2">
            {(
              [
                { key: "singlePlayer", label: t("singlePlayer"), value: profile.playstyle.singlePlayer },
                { key: "multiPlayer",  label: t("multiPlayer"),  value: profile.playstyle.multiPlayer },
                { key: "coop",         label: t("coop"),          value: profile.playstyle.coop },
                { key: "pvp",          label: t("pvp"),           value: profile.playstyle.pvp },
              ] as const
            ).map(({ key, label, value }) => {
              const pct = Math.round(value * 100);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm text-gray-400">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-800">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500/70 transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs text-gray-500">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
