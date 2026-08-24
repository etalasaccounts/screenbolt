export function WorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-9 border-b border-black/[.07] pb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-px w-4 bg-[#090b0c]/40" />
          <p className="text-[0.6875rem] font-normal uppercase tracking-[0.14rem] text-[#090b0c]/45">
            Workspace
          </p>
        </div>
        <div className="h-10 w-64 animate-pulse rounded bg-black/[.08]" />
      </div>

      <section className="mb-6 space-y-4 rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <div className="h-6 w-32 animate-pulse rounded bg-black/[.08]" />
        <div className="h-40 animate-pulse rounded-lg bg-black/[.08]" />
      </section>

      <section className="rounded-3xl border border-black/[.08] bg-white p-6 sm:p-7">
        <div className="mb-4 h-6 w-32 animate-pulse rounded bg-black/[.08]" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-black/[.08]" />
          ))}
        </div>
      </section>
    </div>
  );
}
