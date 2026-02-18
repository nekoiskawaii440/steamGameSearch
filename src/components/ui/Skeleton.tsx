interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-800 ${className}`}
    />
  );
}

export function GameCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
      <Skeleton className="mb-3 h-[135px] w-full rounded-lg" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-2 h-4 w-1/2" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <Skeleton className="mb-2 h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}
