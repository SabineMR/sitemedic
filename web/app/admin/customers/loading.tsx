import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersLoading() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <Skeleton className="h-9 w-44 mb-2" />
        <Skeleton className="h-4 w-36" />
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="rounded-md border">
        <div className="flex gap-4 border-b py-3 px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 px-4 border-b last:border-b-0">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
