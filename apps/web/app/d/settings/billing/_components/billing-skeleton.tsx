export function BillingSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-9 border-b border-black/[.07] pb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-px w-4 bg-[#090b0c]/40" />
          <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-[#090b0c]/45">
            Settings
          </p>
        </div>
        <div className="h-10 w-48 animate-pulse rounded bg-black/[.08]" />
      </div>

      <section className="p-6 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-7 min-h-72"
            >
              <div className="h-4 w-16 animate-pulse rounded bg-black/[.08]" />
              <div className="h-12 w-20 animate-pulse rounded bg-black/[.08]" />
              <div className="space-y-2 flex-1">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-4 w-full animate-pulse rounded bg-black/[.08]" />
                ))}
              </div>
              <div className="h-9 w-full animate-pulse rounded-xl bg-black/[.08]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
