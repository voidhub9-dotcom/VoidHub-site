export default function GameCardSkeleton() {
  return (
    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border-dim bg-black-card">
      <div className="absolute inset-0 bg-black-surface animate-pulse" />
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2">
        <div className="h-2.5 w-16 bg-black-elevated rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-black-elevated rounded animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-2.5 w-full bg-black-elevated rounded animate-pulse" />
          <div className="h-2.5 w-2/3 bg-black-elevated rounded animate-pulse" />
        </div>
        <div className="h-9 w-full bg-black-elevated rounded-lg animate-pulse mt-2" />
      </div>
    </div>
  )
}
