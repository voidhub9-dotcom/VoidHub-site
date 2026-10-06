'use client'

import { useState, useEffect } from 'react'

export const SCRIPT_UI_IMAGE = ''

const ALL_TABS = ['Main', 'Automation', 'Combat', 'Teleport', 'Visuals', 'Settings']

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

const SLIDES: { tab: number; content: React.ReactNode }[] = [
  {
    tab: 0,
    content: (
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-2.5">
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
        <div className="flex flex-col gap-2.5">
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
    ),
  },
  {
    tab: 2,
    content: (
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-2.5">
          <Group title="Aura">
            <Row label="Kill aura" on />
            <Slider label="Aura range" value="24" pct={85} />
            <Slider label="Attack speed" value="0.1s" pct={90} />
          </Group>
          <Group title="Defence">
            <Row label="Auto block" on />
            <Row label="Auto dodge" on />
          </Group>
        </div>
        <div className="flex flex-col gap-2.5">
          <Group title="Attacks">
            <Row label="Fast attack" on />
            <Row label="Rage mode" on />
            <Row label="Critical hits" />
            <Row label="No cooldown" />
          </Group>
          <Group title="Misc">
            <Row label="Auto revive" on />
            <Row label="Safe attack" />
          </Group>
        </div>
      </div>
    ),
  },
  {
    tab: 3,
    content: (
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-2.5">
          <Group title="Teleport">
            <Row label="Safe teleport" on />
            <Row label="Loop teleport" />
            <Select label="Target" value="Nearest mob" />
          </Group>
          <Group title="Presets">
            <Row label="TP to quest" on />
            <Row label="TP to boss" />
          </Group>
        </div>
        <div className="flex flex-col gap-2.5">
          <Group title="Movement">
            <Slider label="TP delay" value="0.3s" pct={30} />
            <Row label="Auto-path" on />
            <Row label="No clip" />
          </Group>
          <Group title="Bypass">
            <Row label="Anti-rubber band" on />
            <Row label="Lag switch" />
          </Group>
        </div>
      </div>
    ),
  },
  {
    tab: 4,
    content: (
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-2.5">
          <Group title="ESP">
            <Row label="ESP boxes" on />
            <Row label="ESP names" on />
            <Row label="ESP health" on />
            <Row label="Show distance" />
          </Group>
          <Group title="World">
            <Row label="Full bright" on />
            <Row label="No fog" on />
          </Group>
        </div>
        <div className="flex flex-col gap-2.5">
          <Group title="Players">
            <Row label="Show hitboxes" />
            <Row label="Chams" on />
            <Row label="Wallhack" />
          </Group>
          <Group title="Camera">
            <Slider label="FOV" value="90" pct={60} />
            <Row label="No shake" on />
          </Group>
        </div>
      </div>
    ),
  },
]

function DrawnUI({ slide }: { slide: number }) {
  const { tab, content } = SLIDES[slide]
  return (
    <div className="w-full aspect-[16/9.6] rounded-[14px] overflow-hidden bg-[#070707] font-gmono text-[0.55rem] sm:text-[0.66rem] flex flex-col">
      <div className="flex items-center justify-between h-9 px-4 border-b border-[#1a1a1a] shrink-0">
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
        <div className="w-[20%] border-r border-[#1a1a1a] p-2 flex flex-col gap-0.5 shrink-0">
          {ALL_TABS.map((t, i) => (
            <div key={t} className={`px-2.5 py-1.5 rounded-md transition-colors ${i === tab ? 'bg-white text-black' : 'text-[#6b6b6b]'}`}>{t}</div>
          ))}
        </div>
        <div className="flex-1 p-2.5 overflow-hidden">
          {content}
        </div>
      </div>
    </div>
  )
}

export default function ScriptPreview() {
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        const next = (current + 1) % SLIDES.length
        setCurrent(next)
        setVisible(next)
        setFading(false)
      }, 400)
    }, 3200)
    return () => clearInterval(id)
  }, [current])

  return (
    <div className="relative [perspective:2000px]">
      <div className="absolute left-[10%] right-[10%] -top-10 h-40 bg-white/10 blur-[80px] rounded-full" />
      <div className="relative [transform:rotateX(12deg)] origin-top">
        <div className="rounded-[18px] p-[1px] bg-gradient-to-b from-white/50 via-white/10 to-white/0 shadow-[0_-20px_80px_-30px_rgba(255,255,255,0.35)]">
          <div className="rounded-[17px] bg-[#070707] p-1.5">
            <div
              className="transition-opacity duration-400"
              style={{ opacity: fading ? 0 : 1, transitionDuration: '400ms' }}
            >
              {SCRIPT_UI_IMAGE
                ? <img src={SCRIPT_UI_IMAGE} alt="VoidHub script UI" className="w-full rounded-[14px] block" />
                : <DrawnUI slide={visible} />}
            </div>
          </div>
        </div>
        {/* slide dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-colors duration-300 ${i === current ? 'bg-white' : 'bg-[#333]'}`}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  )
}
