"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import type { AppDetails } from "@/lib/steam/types";
import type { OwnedGame } from "@/lib/steam/types";
import GenreBreakdown from "./GenreBreakdown";

interface EnrichProgressProps {
  pendingAppIds: number[];
  games: OwnedGame[];
  locale: string;
  initialGenreScores: Record<string, number>;
}

/**
 * バックグラウンドでジャンル情報を段階的に取得し、
 * 完了したらジャンルチャートを更新するコンポーネント
 */
export default function EnrichProgress({
  pendingAppIds,
  games,
  locale,
  initialGenreScores,
}: EnrichProgressProps) {
  const t = useTranslations("dashboard");

  const [remaining, setRemaining] = useState(pendingAppIds.length);
  const [genreScores, setGenreScores] = useState(initialGenreScores);

  // 取得済みのジャンルデータを累積する ref（render をまたいで保持）
  const accumulatedDetails = useRef<Record<number, AppDetails>>({});
  const pendingRef = useRef<number[]>([...pendingAppIds]);
  const isFetching = useRef(false);

  /** ゲームのプレイデータとジャンル情報からスコアを再計算 */
  const recalcGenreScores = useCallback(
    (details: Record<number, AppDetails>) => {
      const raw: Record<string, number> = { ...initialGenreScores };

      for (const game of games) {
        const d = details[game.appid];
        if (!d?.genres?.length) continue;

        const weight = Math.log2(game.playtime_forever + 1);
        const boost =
          game.playtime_2weeks && game.playtime_2weeks > 0 ? 1.5 : 1.0;

        for (const genre of d.genres) {
          raw[genre.description] =
            (raw[genre.description] ?? 0) + weight * boost;
        }
      }

      const max = Math.max(...Object.values(raw), 0);
      if (max === 0) return raw;

      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        normalized[k] = v / max;
      }
      return normalized;
    },
    [games, initialGenreScores]
  );

  /** バッチごとに /api/enrich を叩き、結果を蓄積してスコアを更新 */
  const fetchNextBatch = useCallback(async () => {
    if (isFetching.current || pendingRef.current.length === 0) return;
    isFetching.current = true;

    const BATCH = 5;
    const batch = pendingRef.current.slice(0, BATCH);
    pendingRef.current = pendingRef.current.slice(BATCH);

    try {
      const res = await fetch(
        `/api/enrich?appids=${batch.join(",")}&locale=${locale}`
      );
      if (res.ok) {
        const json = await res.json();
        const fetched: Record<number, AppDetails> = json.results ?? {};

        // 蓄積
        accumulatedDetails.current = {
          ...accumulatedDetails.current,
          ...fetched,
        };

        // ジャンルスコアを再計算して更新
        const newScores = recalcGenreScores(accumulatedDetails.current);
        setGenreScores(newScores);
      }
    } catch {
      // 失敗しても残りのバッチは続ける
    } finally {
      setRemaining(pendingRef.current.length);
      isFetching.current = false;
    }
  }, [locale, recalcGenreScores]);

  /** 残りがある限り順次フェッチ */
  useEffect(() => {
    if (pendingAppIds.length === 0) return;

    let cancelled = false;

    const run = async () => {
      while (pendingRef.current.length > 0 && !cancelled) {
        await fetchNextBatch();
        // Steam Store API のレートリミット対策で少し間隔を空ける
        if (pendingRef.current.length > 0 && !cancelled) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [pendingAppIds, fetchNextBatch]);

  return (
    <>
      {remaining > 0 && (
        <div className="rounded-lg border border-[#66c0f4]/30 bg-[#66c0f4]/10 px-4 py-2 text-sm text-[#66c0f4] flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#66c0f4] border-t-transparent" />
          {t("enriching", { count: remaining })}
        </div>
      )}
      <GenreBreakdown genreScores={genreScores} />
    </>
  );
}
