export default function Loading() {
  return (
    <div className="min-h-screen max-w-lg mx-auto">
      {/* Header skeleton */}
      <div className="sticky top-0 bg-[#0f0e17]/95 border-b border-amber-900/30 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-8 w-16 rounded-lg" />
        </div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-3 w-10" />
        </div>
        <div className="skeleton h-2 w-full rounded-full" />
      </div>

      {/* Image skeleton */}
      <div className="skeleton h-36 w-full rounded-none" />

      {/* Content skeleton */}
      <div className="px-4 py-5 space-y-4">
        <div className="skeleton h-7 w-3/4" />
        <div className="skeleton h-20 w-full rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="skeleton h-4 w-4 rounded-full" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="skeleton h-28 w-full rounded-xl" />
        <div className="skeleton h-14 w-full rounded-xl" />
        <div className="skeleton h-14 w-full rounded-xl" />
      </div>
    </div>
  );
}
