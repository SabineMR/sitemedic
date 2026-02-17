import { Skeleton } from '@/components/ui/skeleton';

export default function TreatmentsLoading() {
  return (
    <div className="space-y-4 p-6">
      {/* Page title */}
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Filter row */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        {/* Table header */}
        <div className="flex gap-4 border-b py-3 px-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 flex-1" />
        </div>

        {/* 6 table body rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 px-4 border-b last:border-b-0">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
