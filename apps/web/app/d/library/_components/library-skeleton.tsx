export function LibrarySkeleton() {
  return (
    <div>
      <div className="mb-9 flex flex-col gap-6 border-b border-black/[.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-4 bg-[#090b0c]/40" />
            <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-[#090b0c]/45">
              Library
            </p>
          </div>
          <div className="mb-3 h-10 w-64 animate-pulse rounded bg-black/[.08]" />
          <div className="h-5 w-48 animate-pulse rounded bg-black/[.08]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 animate-pulse rounded-full bg-black/[.08]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-3xl bg-black/[.06]" />
        ))}
      </div>
    </div>
  );
}
