import { Skeleton } from '@/components/ui/skeleton';

export default function BookingsLoading() {
  return (
    <div className="space-y-4 p-6">
      {/* Page title */}
      <div>
        <Skeleton className="h-9 w-56 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Filter row */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="flex gap-4 border-b py-3 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 px-4 border-b last:border-b-0">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
