import { Skeleton } from '@/components/ui/skeleton';

export default function BookingsLoading() {
  return (
    <div className="space-y-4 p-6 max-w-4xl mx-auto">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* Booking cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-5 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
