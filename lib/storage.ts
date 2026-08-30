// Storage keys
export const STORAGE_KEYS = {
  GAMES: 'voidhub_games',
  LOADSTRING: 'voidhub_loadstring',
  COPY_COUNT: 'voidhub_copy_count',
  AUTH: 'voidhub_auth',
  USER: 'voidhub_user',
  PASSWORD: 'voidhub_password',
  DISCORD: 'voidhub_discord',
  TAGLINE: 'voidhub_tagline',
  MAINTENANCE: 'voidhub_maintenance',
  ACTIVITY_LOG: 'voidhub_log',
  REMEMBER: 'voidhub_remember',
} as const

export interface Game {
  id: string
  name: string
  description: string
  category: string
  status: 'active' | 'outdated'
  thumbnail: string
  scriptLink: string
  robloxUrl?: string
  placeId?: string
  features: string[]
  featured: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ActivityLogEntry {
  id: string
  type: 'add' | 'edit' | 'delete' | 'loader' | 'login' | 'logout' | 'settings' | 'password'
  message: string
  timestamp: string
}

// Default games data
export const DEFAULT_GAMES: Game[] = [
  {
    id: '1',
    name: 'Blox Fruits',
    description: 'Auto farm, auto raid, devil fruit sniper, boss farm, sea beast killer and much more.',
    category: 'Roblox',
    status: 'active',
    thumbnail: '',
    scriptLink: 'https://discord.gg/kPPsdZtndn',
    robloxUrl: 'https://www.roblox.com/games/2753915549/Blox-Fruits',
    placeId: '2753915549',
    features: ['Auto Farm', 'Devil Fruit Sniper', 'Auto Raid', 'Boss Farm', 'Sea Beast Killer', 'Mastery Farm'],
    featured: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Murder Mystery 2',
    description: 'ESP for all players, gun aimbotter, coin collector, knife thrower and role finder.',
    category: 'Roblox',
    status: 'active',
    thumbnail: '',
    scriptLink: 'https://discord.gg/kPPsdZtndn',
    robloxUrl: 'https://www.roblox.com/games/142823291/Murder-Mystery-2',
    placeId: '142823291',
    features: ['Player ESP', 'Gun Aimbot', 'Coin Auto Collect', 'Knife Throw', 'Role Finder', 'Anti-AFK'],
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Arsenal',
    description: 'Silent aim, full ESP, no recoil, rapid fire, and wallbang for competitive play.',
    category: 'Roblox',
    status: 'active',
    thumbnail: '',
    scriptLink: 'https://discord.gg/kPPsdZtndn',
    robloxUrl: 'https://www.roblox.com/games/286090429/Arsenal',
    placeId: '286090429',
    features: ['Silent Aim', 'Full ESP', 'No Recoil', 'Rapid Fire', 'WallBang', 'Kill Sound Spam'],
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Pet Simulator 99',
    description: 'Auto hatch, auto collect coins, auto open chests, teleport farm, and pet dupe detection.',
    category: 'Roblox',
    status: 'active',
    thumbnail: '',
    scriptLink: 'https://discord.gg/kPPsdZtndn',
    robloxUrl: 'https://www.roblox.com/games/15532962292/Pet-Simulator-99',
    placeId: '15532962292',
    features: ['Auto Hatch', 'Auto Collect Coins', 'Auto Open Chests', 'Teleport Farm', 'Anti-AFK', 'Dupe Detector'],
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Anime Defenders',
    description: 'Auto wave complete, unit placement helper, gem farmer, afk bypasser and trait roller.',
    category: 'Roblox',
    status: 'active',
    thumbnail: '',
    scriptLink: 'https://discord.gg/kPPsdZtndn',
    robloxUrl: 'https://www.roblox.com/games/17017769292/Anime-Defenders',
    placeId: '17017769292',
    features: ['Auto Wave Complete', 'Unit Placer', 'Gem Farmer', 'AFK Bypass', 'Trait Roller', 'Auto Upgrade'],
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Fisch',
    description: 'Auto fish, teleport to rare spots, fish ESP, rod auto cast, and inventory manager.',
    category: 'Roblox',
    status: 'active',
    thumbnail: '',
    scriptLink: 'https://discord.gg/kPPsdZtndn',
    robloxUrl: 'https://www.roblox.com/games/16732694052/Fisch',
    placeId: '16732694052',
    features: ['Auto Fish', 'Rare Spot TP', 'Fish ESP', 'Auto Cast', 'Inventory Manager', 'Anti-AFK'],
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// IMPORTANT: must be the www domain — the apex "voidon.top" 308-redirects to
// "www.voidon.top" and many Roblox executors do NOT follow redirects, so they
// would receive "Redirecting..." instead of Lua and error out.
const DEFAULT_LOADSTRING = 'loadstring(game:HttpGet("https://www.voidon.top/api/loader"))()'

// Helper to check if we're in browser
const isBrowser = typeof window !== 'undefined'

// Initialize storage with defaults
export function initializeStorage() {
  if (!isBrowser) return

  if (!localStorage.getItem(STORAGE_KEYS.GAMES)) {
    localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(DEFAULT_GAMES))
  }

  if (!localStorage.getItem(STORAGE_KEYS.LOADSTRING)) {
    localStorage.setItem(STORAGE_KEYS.LOADSTRING, DEFAULT_LOADSTRING)
  }

  if (!localStorage.getItem(STORAGE_KEYS.COPY_COUNT)) {
    localStorage.setItem(STORAGE_KEYS.COPY_COUNT, '0')
  }

  if (!localStorage.getItem(STORAGE_KEYS.DISCORD)) {
    localStorage.setItem(STORAGE_KEYS.DISCORD, 'https://discord.gg/kPPsdZtndn')
  }

  if (!localStorage.getItem(STORAGE_KEYS.TAGLINE)) {
    localStorage.setItem(STORAGE_KEYS.TAGLINE, 'Free. Keyless. No Limits.')
  }

  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, '[]')
  }
}

// Games
export function getGames(): Game[] {
  if (!isBrowser) return DEFAULT_GAMES
  initializeStorage()
  const data = localStorage.getItem(STORAGE_KEYS.GAMES)
  return data ? JSON.parse(data) : DEFAULT_GAMES
}

export function setGames(games: Game[]) {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games))
}

export function addGame(game: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Game {
  const games = getGames()
  const newGame: Game = {
    ...game,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  games.unshift(newGame)
  setGames(games)
  addActivityLog('add', `Added game: ${newGame.name}`)
  return newGame
}

export function updateGame(id: string, updates: Partial<Game>): Game | null {
  const games = getGames()
  const index = games.findIndex(g => g.id === id)
  if (index === -1) return null
  
  games[index] = {
    ...games[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  setGames(games)
  addActivityLog('edit', `Edited game: ${games[index].name}`)
  return games[index]
}

export function deleteGame(id: string): boolean {
  const games = getGames()
  const game = games.find(g => g.id === id)
  if (!game) return false
  
  const filtered = games.filter(g => g.id !== id)
  setGames(filtered)
  addActivityLog('delete', `Deleted game: ${game.name}`)
  return true
}

// Loadstring
export function getLoadstring(): string {
  if (!isBrowser) return DEFAULT_LOADSTRING
  initializeStorage()
  let value = localStorage.getItem(STORAGE_KEYS.LOADSTRING) || DEFAULT_LOADSTRING
  // Migrate old cached loadstrings that point at the apex domain (which
  // 308-redirects and breaks executors that don't follow redirects).
  if (value.includes('https://voidon.top/api/loader')) {
    value = value.replace('https://voidon.top/api/loader', 'https://www.voidon.top/api/loader')
    localStorage.setItem(STORAGE_KEYS.LOADSTRING, value)
  }
  return value
}

export function setLoadstring(value: string) {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.LOADSTRING, value)
}

// Copy count
export function getCopyCount(): number {
  if (!isBrowser) return 0
  initializeStorage()
  return parseInt(localStorage.getItem(STORAGE_KEYS.COPY_COUNT) || '0', 10)
}

export function incrementCopyCount() {
  if (!isBrowser) return
  const count = getCopyCount() + 1
  localStorage.setItem(STORAGE_KEYS.COPY_COUNT, count.toString())
}

export function resetCopyCount() {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.COPY_COUNT, '0')
}

// Discord link
export function getDiscordLink(): string {
  if (!isBrowser) return 'https://discord.gg/kPPsdZtndn'
  initializeStorage()
  return localStorage.getItem(STORAGE_KEYS.DISCORD) || 'https://discord.gg/kPPsdZtndn'
}

export function setDiscordLink(value: string) {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.DISCORD, value)
}

// Tagline
export function getTagline(): string {
  if (!isBrowser) return 'Free. Keyless. No Limits.'
  initializeStorage()
  return localStorage.getItem(STORAGE_KEYS.TAGLINE) || 'Free. Keyless. No Limits.'
}

export function setTagline(value: string) {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.TAGLINE, value)
}

// Maintenance mode
export function isMaintenanceMode(): boolean {
  if (!isBrowser) return false
  return localStorage.getItem(STORAGE_KEYS.MAINTENANCE) === 'true'
}

export function setMaintenanceMode(value: boolean) {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.MAINTENANCE, value.toString())
  addActivityLog('settings', value ? 'Enabled maintenance mode' : 'Disabled maintenance mode')
}

// Activity log
export function getActivityLog(): ActivityLogEntry[] {
  if (!isBrowser) return []
  initializeStorage()
  const data = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG)
  return data ? JSON.parse(data) : []
}

export function addActivityLog(type: ActivityLogEntry['type'], message: string) {
  if (!isBrowser) return
  const log = getActivityLog()
  const entry: ActivityLogEntry = {
    id: Date.now().toString(),
    type,
    message,
    timestamp: new Date().toISOString(),
  }
  log.unshift(entry)
  // Keep only last 50 entries
  const trimmed = log.slice(0, 50)
  localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(trimmed))
}

export function clearActivityLog() {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, '[]')
}

// Auth
export function isAuthenticated(): boolean {
  if (!isBrowser) return false
  const remember = localStorage.getItem(STORAGE_KEYS.REMEMBER) === 'true'
  const storage = remember ? localStorage : sessionStorage
  return storage.getItem(STORAGE_KEYS.AUTH) === 'true'
}

export async function login(password: string, remember: boolean): Promise<boolean> {
  // Verify against the server (ADMIN_PASSWORD env var) - never against localStorage
  try {
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) return false
  } catch {
    return false
  }

  const storage = remember ? localStorage : sessionStorage
  storage.setItem(STORAGE_KEYS.AUTH, 'true')
  storage.setItem(STORAGE_KEYS.USER, 'admin')
  // Keep the verified key in localStorage so admin API calls (x-admin-key) work
  localStorage.setItem(STORAGE_KEYS.PASSWORD, password)
  if (remember) {
    localStorage.setItem(STORAGE_KEYS.REMEMBER, 'true')
  }
  addActivityLog('login', 'Admin login')
  return true
}

export function logout() {
  if (!isBrowser) return
  sessionStorage.removeItem(STORAGE_KEYS.AUTH)
  sessionStorage.removeItem(STORAGE_KEYS.USER)
  localStorage.removeItem(STORAGE_KEYS.AUTH)
  localStorage.removeItem(STORAGE_KEYS.USER)
  localStorage.removeItem(STORAGE_KEYS.REMEMBER)
  addActivityLog('logout', 'Admin logout')
}

export function getUsername(): string {
  if (!isBrowser) return ''
  const remember = localStorage.getItem(STORAGE_KEYS.REMEMBER) === 'true'
  const storage = remember ? localStorage : sessionStorage
  return storage.getItem(STORAGE_KEYS.USER) || ''
}

export function updatePassword(newPassword: string) {
  if (!isBrowser) return
  localStorage.setItem(STORAGE_KEYS.PASSWORD, newPassword)
  addActivityLog('password', 'Password changed')
}

// Export/Import
export function exportData(): string {
  return JSON.stringify({}, null, 2)
}

export function importData(jsonString: string): boolean {
  return true
}

export function clearAllGames() {
  // Now handled by API
}
