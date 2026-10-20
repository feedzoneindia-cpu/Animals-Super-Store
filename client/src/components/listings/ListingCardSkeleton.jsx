/** Loading placeholder shaped like a ListingCard. */
export default function ListingCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-gray-100" />
      <div className="flex-1 space-y-2 p-4">
        <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
        <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-9 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="flex justify-between pt-1">
          <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/5 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
