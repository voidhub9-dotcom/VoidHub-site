'use client'

/**
 * Showcase of the in-game script UI under the hero.
 *
 * Drop a screenshot of the real UI in /public and set SCRIPT_UI_IMAGE to its
 * path (e.g. '/script-ui.png') to replace the drawn placeholder below.
 */
export const SCRIPT_UI_IMAGE = ''

const tabs = ['Main', 'Automation', 'Combat', 'Teleport', 'Visuals', 'Settings']

function Toggle({ on = false }: { on?: boolean }) {
  return (
    <span className={`relative w-7 h-4 rounded-full shrink-0 ${on ? 'bg-white' : 'bg-[#262626]'}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full ${on ? 'right-0.5 bg-black' : 'left-0.5 bg-[#6b6b6b]'}`} />
    </span>
  )
}

const Row = ({ label, on }: { label: string; on?: boolean }) => (
  <div className="flex items-center justify-between gap-2 py-[5px]">
    <span className="truncate text-[#cfcfcf]">{label}</span>
    <Toggle on={on} />
  </div>
)

const Select = ({ label, value }: { label: string; value: string }) => (
  <div className="py-[4px]">
    <div className="text-[#6b6b6b] mb-1">{label}</div>
    <div className="flex items-center justify-between h-6 px-2 rounded-md bg-[#141414] border border-[#262626] text-[#e5e5e5]">
      <span className="truncate">{value}</span><span className="text-[#6b6b6b] text-[0.5rem]">▼</span>
    </div>
  </div>
)

const Slider = ({ label, value, pct }: { label: string; value: string; pct: number }) => (
  <div className="py-[5px]">
    <div className="flex justify-between mb-1.5"><span className="text-[#cfcfcf]">{label}</span><span className="text-[#6b6b6b]">{value}</span></div>
    <div className="relative h-1 rounded-full bg-[#262626]">
      <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${pct}%` }} />
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" style={{ left: `${pct}%` }} />
    </div>
  </div>
)

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#1f1f1f] bg-[#0b0b0b] p-3">
      <div className="text-[0.55rem] tracking-[0.2em] uppercase text-[#6b6b6b] mb-1.5">{title}</div>
      {children}
    </div>
  )
}

function DrawnUI() {
  return (
    <div className="w-full aspect-[16/9.6] rounded-[14px] overflow-hidden bg-[#070707] font-gmono text-[0.55rem] sm:text-[0.66rem] flex flex-col">
      <div className="flex items-center justify-between h-9 px-4 border-b border-[#1a1a1a]">
        <span className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-4 h-4 object-contain" />
          <span className="font-display font-semibold text-white text-[0.7rem] sm:text-[0.78rem]">VoidHub</span>
          <span className="px-1.5 py-px rounded border border-[#262626] text-[#8a8a8a]">universal</span>
        </span>
        <span className="flex items-center gap-3 text-[#6b6b6b]">
          <span>fps <span className="text-white">144</span></span>
          <span>ping <span className="text-white">32</span></span>
          <span className="hidden sm:inline-flex items-center gap-1.5 h-6 w-28 px-2 rounded-md border border-[#262626] bg-[#101010]">⌕ search</span>
        </span>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-[20%] border-r border-[#1a1a1a] p-2 flex flex-col gap-0.5">
          {tabs.map((t, i) => (
            <div key={t} className={`px-2.5 py-1.5 rounded-md ${i === 0 ? 'bg-white text-black' : 'text-[#6b6b6b]'}`}>{t}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2.5 p-2.5 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2.5 min-w-0">
            <Group title="Auto Farm">
              <Select label="Method" value="Nearest mob" />
              <Row label="Auto farm level" on />
              <Row label="Auto collect drops" on />
              <Row label="Auto quest" />
            </Group>
            <Group title="Player">
              <Slider label="Walk speed" value="32" pct={58} />
              <Row label="Infinite jump" />
            </Group>
          </div>
          <div className="flex flex-col gap-2.5 min-w-0">
            <Group title="Combat">
              <Row label="Kill aura" on />
              <Slider label="Aura range" value="18" pct={72} />
              <Row label="Fast attack" on />
              <Row label="Auto block" />
            </Group>
            <Group title="Misc">
              <Row label="Anti-AFK" on />
              <Row label="Server hop" />
            </Group>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ScriptPreview() {
  return (
    <div className="relative [perspective:2000px] [transform-style:preserve-3d]">
      {/* light spilling onto the "floor" under the window */}
      <div className="absolute left-[10%] right-[10%] -top-10 h-40 bg-white/10 blur-[80px] rounded-full" />
      <div className="relative animate-ui-orbit origin-top" style={{ transformStyle: 'preserve-3d' }}>
        <div className="rounded-[18px] p-[1px] bg-gradient-to-b from-white/50 via-white/10 to-white/0 shadow-[0_-20px_80px_-30px_rgba(255,255,255,0.35)]">
          <div className="rounded-[17px] bg-[#070707] p-1.5">
            {SCRIPT_UI_IMAGE
              ? <img src={SCRIPT_UI_IMAGE} alt="VoidHub script UI" className="w-full rounded-[14px] block" />
              : <DrawnUI />}
          </div>
        </div>
      </div>
      {/* fade the bottom of the window into the page */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  )
}
