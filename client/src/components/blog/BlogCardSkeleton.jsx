/** Loading placeholder shaped like a BlogCard. */
export default function BlogCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white" aria-hidden="true">
      <div className="aspect-[16/9] animate-pulse bg-gray-100" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="h-5 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
