"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

type Status = "idle" | "loading" | "done" | "error";

export default function RefreshProfileButton() {
  const t = useTranslations("recommendations");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{
    analyzedGames?: number;
    totalGames?: number;
    pendingCount?: number;
  } | null>(null);

  const handleRefresh = async () => {
    setStatus("loading");
    setResult(null);

    try {
      const res = await fetch(
        `/api/profile/refresh?locale=${locale}`,
        { method: "POST" }
      );

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
      <h2 className="mb-1 font-semibold text-gray-200">
        {t("refreshTitle")}
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        {t("refreshDesc")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleRefresh}
          disabled={status === "loading" || status === "done"}
          className="rounded-lg bg-[#1b2838] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a475e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? t("refreshing") : t("refreshButton")}
        </button>

        {/* ステータス表示 */}
        {status === "done" && result && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#66c0f4]">
              {t("refreshDone")}
            </span>
            <span className="text-xs text-gray-600">
              ({result.analyzedGames}/{result.totalGames} games
              {result.pendingCount && result.pendingCount > 0
                ? `, ${result.pendingCount} still pending`
                : ""})
            </span>
          </div>
        )}
        {status === "error" && (
          <span className="text-sm text-red-400">{t("refreshError")}</span>
        )}
      </div>

      {/* 完了後にリロードボタンを表示 */}
      {status === "done" && (
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg border border-[#66c0f4]/30 px-4 py-2 text-sm text-[#66c0f4] transition-colors hover:bg-[#66c0f4]/10"
        >
          {t("reloadButton")}
        </button>
      )}
    </div>
  );
}
