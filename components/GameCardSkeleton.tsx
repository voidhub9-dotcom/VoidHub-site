export default function GameCardSkeleton() {
  return (
    <div className="flex flex-col bg-black-card border border-border-dim rounded-xl overflow-hidden">
      <div className="aspect-video w-full bg-black-surface animate-pulse" />
      <div className="flex flex-col p-4 gap-3">
        <div className="h-4 w-3/4 bg-black-surface rounded animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-black-surface rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-black-surface rounded animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-5 w-16 bg-black-surface rounded animate-pulse" />
          ))}
        </div>
        <div className="h-9 w-full bg-black-surface rounded-lg animate-pulse mt-1" />
      </div>
    </div>
  )
}
