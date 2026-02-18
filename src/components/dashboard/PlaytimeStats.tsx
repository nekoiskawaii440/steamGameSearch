import { useTranslations } from "next-intl";
import Card from "@/components/ui/Card";

interface PlaytimeStatsProps {
  totalGames: number;
  totalPlaytimeMinutes: number;
  recentlyPlayedCount: number;
}

export default function PlaytimeStats({
  totalGames,
  totalPlaytimeMinutes,
  recentlyPlayedCount,
}: PlaytimeStatsProps) {
  const t = useTranslations("dashboard");
  const totalHours = Math.round(totalPlaytimeMinutes / 60);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <p className="text-sm text-gray-400">{t("totalGames")}</p>
        <p className="text-3xl font-bold text-white">{totalGames}</p>
      </Card>
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
