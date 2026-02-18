import { StatSkeleton } from "@/components/ui/Skeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* タイトル */}
      <Skeleton className="h-8 w-48" />

      {/* 統計カード3枚 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      {/* ジャンル分布（縦並び） */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>

      {/* よく遊ぶゲーム（リスト形式・縦並び） */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        {/* ヘッダー：タイトル＋切り替えボタン */}
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-7 w-40 rounded-lg" />
        </div>
        {/* リスト行：順位・サムネ・タイトル・プレイ時間 */}
        <div className="flex flex-col divide-y divide-gray-800">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-3 w-4 shrink-0" />
              <Skeleton className="h-[30px] w-20 shrink-0 rounded" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
