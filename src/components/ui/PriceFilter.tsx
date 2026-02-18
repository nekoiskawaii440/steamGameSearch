"use client";

import { useTranslations } from "next-intl";

interface PriceFilterProps {
  maxPrice: number | null; // セント単位, null = 制限なし
  onChange: (price: number | null) => void;
}

const PRICE_OPTIONS = [
  { value: null, label: "all" },
  { value: 0, labelKey: "free" },
  { value: 1000, label: "~\u00a51,000" },
  { value: 2000, label: "~\u00a52,000" },
  { value: 4000, label: "~\u00a54,000" },
  { value: 6000, label: "~\u00a56,000" },
  { value: 8000, label: "~\u00a58,000" },
];

export default function PriceFilter({
  maxPrice,
  onChange,
}: PriceFilterProps) {
  const t = useTranslations("recommendations");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-400">
        {t("priceFilter")}:
      </span>
      {PRICE_OPTIONS.map((option) => {
        const isActive =
          option.value === maxPrice ||
          (option.value === null && maxPrice === null);

        const label =
          option.labelKey
            ? t(option.labelKey)
            : option.value === null
              ? t("maxPrice") + ": " + t("noResults").split(" ")[0]
              : option.label;

        const displayLabel =
          option.value === null ? "ALL" : label;

        return (
          <button
            key={option.value ?? "all"}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              isActive
                ? "bg-[#66c0f4] text-[#1b2838] font-medium"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            {displayLabel}
          </button>
        );
      })}
    </div>
  );
}
