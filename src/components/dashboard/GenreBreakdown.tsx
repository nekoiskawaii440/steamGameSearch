"use client";

import { useTranslations } from "next-intl";
import Card, { CardHeader, CardTitle } from "@/components/ui/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface GenreBreakdownProps {
  genreScores: Record<string, number>;
}

const COLORS = [
  "#66c0f4",
  "#4fa3d7",
  "#3886ba",
  "#2b6a9e",
  "#1e4d82",
  "#1b3a66",
  "#17294a",
  "#132030",
];

export default function GenreBreakdown({
  genreScores,
}: GenreBreakdownProps) {
  const t = useTranslations("dashboard");

  const data = Object.entries(genreScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([genre, score]) => ({
      genre,
      score: Math.round(score * 100),
    }));

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("genreBreakdown")}</CardTitle>
      </CardHeader>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              hide
              domain={[0, 100]}
            />
            <YAxis
              type="category"
              dataKey="genre"
              width={120}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#f3f4f6",
              }}
              formatter={(value) => [`${value}%`, "Score"]}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
