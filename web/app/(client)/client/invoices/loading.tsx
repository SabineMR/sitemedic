import { Skeleton } from '@/components/ui/skeleton';

export default function InvoicesLoading() {
  return (
    <div className="space-y-4 p-6 max-w-4xl mx-auto">
      <div>
        <Skeleton className="h-9 w-44 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Invoice cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
