"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { PoolSource } from "@/lib/steamspy/api";
import { DEFAULT_POOL_SOURCES } from "@/lib/steamspy/api";

const ALL_SOURCES: PoolSource[] = ["genre", "classic", "new", "trend", "sale"];

interface PoolSelectorProps {
  /** サーバー側で解釈した現在の有効ソース（初期値として使用） */
  currentSources: PoolSource[];
}

export default function PoolSelector({ currentSources }: PoolSelectorProps) {
  const t = useTranslations("recommendations");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // クライアント側の楽観的状態（クリック瞬時に反映）
  const [optimisticSources, setOptimisticSources] = useState<PoolSource[]>(currentSources);
  // サーバーレスポンス待ちかどうか
  const [isPending, startTransition] = useTransition();

  const labelMap: Record<PoolSource, string> = {
    genre:   t("poolGenre"),
    classic: t("poolClassic"),
    new:     t("poolNew"),
    trend:   t("poolTrend"),
    sale:    t("poolSale"),
  };

  function toggle(source: PoolSource) {
    const next = optimisticSources.includes(source)
      ? optimisticSources.filter((s) => s !== source)
      : [...optimisticSources, source];

    // 1つも選択されない状態は許可しない
    if (next.length === 0) return;

    // クリック瞬時に UI を更新（楽観的更新）
    setOptimisticSources(next);

    const params = new URLSearchParams(searchParams.toString());

    // デフォルト値と同じ場合はパラメータを削除してURLをきれいに保つ
    const isDefault =
      next.length === DEFAULT_POOL_SOURCES.length &&
      DEFAULT_POOL_SOURCES.every((s) => next.includes(s));

    if (isDefault) {
      params.delete("pool");
    } else {
      params.set("pool", next.join(","));
    }

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-gray-200">
          {t("poolSelectorTitle")}
        </h2>
        {/* サーバーレスポンス待ち中のローディングインジケータ */}
        {isPending && (
          <svg
            className="h-4 w-4 animate-spin text-[#66c0f4]/60"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
            />
          </svg>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {ALL_SOURCES.map((source) => {
          const active = optimisticSources.includes(source);
          return (
            <button
              key={source}
              onClick={() => toggle(source)}
              disabled={isPending && !optimisticSources.includes(source)}
              className={[
                "rounded-full border px-3 py-1 text-sm font-medium transition-all",
                active
                  ? "border-[#66c0f4] bg-[#66c0f4]/15 text-[#66c0f4]"
                  : "border-gray-700 bg-transparent text-gray-500 hover:border-gray-500 hover:text-gray-300",
                isPending ? "opacity-70" : "",
              ].join(" ")}
            >
              {labelMap[source]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
