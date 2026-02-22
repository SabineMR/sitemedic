'use client';

export function CompanyRatingsSummary({
  companyId,
  averageRating,
  reviewCount,
}: {
  companyId: string;
  averageRating?: number | null;
  reviewCount?: number | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
      Company rating summary unavailable in this app build.
      <div className="mt-1 text-xs text-gray-400">Company: {companyId}</div>
      <div className="text-xs text-gray-400">
        Avg: {averageRating ?? '-'} | Reviews: {reviewCount ?? 0}
      </div>
    </div>
  );
}
