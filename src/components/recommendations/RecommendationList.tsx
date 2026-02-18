"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import RecommendationCard from "./RecommendationCard";
import PriceFilter from "@/components/ui/PriceFilter";
import type { ScoredGame } from "@/lib/recommendation/types";

interface RecommendationListProps {
  games: ScoredGame[];
}

export default function RecommendationList({
  games,
}: RecommendationListProps) {
  const t = useTranslations("recommendations");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const filteredGames = maxPrice !== null
    ? games.filter(
        (g) => g.price !== null && g.price <= maxPrice
      )
    : games;

  return (
    <div>
      <div className="mb-6">
        <PriceFilter maxPrice={maxPrice} onChange={setMaxPrice} />
      </div>

      {filteredGames.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
          <p className="text-gray-400">{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <RecommendationCard key={game.appid} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
