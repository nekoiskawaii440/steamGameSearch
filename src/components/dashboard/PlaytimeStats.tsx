import { useTranslations } from "next-intl";
import Card from "@/components/ui/Card";

interface PlaytimeStatsProps {
  totalGames: number;
  totalPlaytimeMinutes: number;
  recentlyPlayedCount: number;
  steamId: string;
}

export default function PlaytimeStats({
  totalGames,
  totalPlaytimeMinutes,
  recentlyPlayedCount,
  steamId,
}: PlaytimeStatsProps) {
  const t = useTranslations("dashboard");
  const totalHours = Math.round(totalPlaytimeMinutes / 60);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <a
        href={`https://steamcommunity.com/profiles/${steamId}/games?tab=all`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <Card className="h-full transition-colors hover:border-[#66c0f4]/50 hover:bg-gray-800/50 cursor-pointer">
          <p className="text-sm text-gray-400">{t("totalGames")}</p>
          <p className="text-3xl font-bold text-white">{totalGames}</p>
          <p className="mt-1 text-xs text-[#66c0f4]/70">{t("viewLibrary")} →</p>
        </Card>
      </a>
      <Card>
        <p className="text-sm text-gray-400">{t("totalPlaytime")}</p>
        <p className="text-3xl font-bold text-white">
          {totalHours.toLocaleString()}{" "}
          <span className="text-lg font-normal text-gray-400">
            {t("hours")}
          </span>
        </p>
      </Card>
      <Card>
        <p className="text-sm text-gray-400">{t("recentlyPlayed")}</p>
        <p className="text-3xl font-bold text-white">
          {recentlyPlayedCount}
        </p>
      </Card>
    </div>
  );
}
