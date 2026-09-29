export default function GameCardSkeleton() {
  return (
    <div className="rounded-[20px] overflow-hidden border border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="aspect-[16/9] bg-[#111] animate-pulse" />
      <div className="px-4 pb-4">
        <div className="-mt-8 mb-3 w-14 h-14 rounded-2xl border-2 border-[#0a0a0a] bg-[#1a1a1a] animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-[#161616] animate-pulse" />
        <div className="mt-2 h-3 w-full rounded bg-[#131313] animate-pulse" />
        <div className="mt-1.5 h-3 w-4/5 rounded bg-[#131313] animate-pulse" />
        <div className="mt-4 h-10 rounded-full bg-[#151515] animate-pulse" />
      </div>
    </div>
  )
}
