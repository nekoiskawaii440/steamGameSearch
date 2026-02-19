"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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

  const labelMap: Record<PoolSource, string> = {
    genre:   t("poolGenre"),
    classic: t("poolClassic"),
    new:     t("poolNew"),
    trend:   t("poolTrend"),
    sale:    t("poolSale"),
  };

  function toggle(source: PoolSource) {
    const next = currentSources.includes(source)
      ? currentSources.filter((s) => s !== source)
      : [...currentSources, source];

    // 1つも選択されない状態は許可しない
    if (next.length === 0) return;

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
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
      <h2 className="mb-3 font-semibold text-gray-200">
        {t("poolSelectorTitle")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {ALL_SOURCES.map((source) => {
          const active = currentSources.includes(source);
          return (
            <button
              key={source}
              onClick={() => toggle(source)}
              className={[
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                active
                  ? "border-[#66c0f4] bg-[#66c0f4]/15 text-[#66c0f4]"
                  : "border-gray-700 bg-transparent text-gray-500 hover:border-gray-500 hover:text-gray-300",
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
