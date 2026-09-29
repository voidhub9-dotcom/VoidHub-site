import { r2Configured, r2Delete, r2GetText, r2Put } from './r2'

/**
 * R2 object that holds the games list (stored at `files/<GAMES_FILE>`).
 * Started fresh for the site revamp.
 */
export const GAMES_FILE = 'games-v2.json'

// Everywhere older versions of the site kept a games list.
const LEGACY_GAME_KEYS = ['files/games.json', 'data/games.json', 'kv/voidhub__games.txt']
const PURGED_MARKER = 'files/.legacy-games-purged'

let purge: Promise<void> | null = null

/**
 * One-time cleanup: deletes the old games lists from R2 so nothing from the
 * pre-revamp catalogue is left in the bucket. Runs on the first games
 * request after deploy, then leaves a marker so it never runs again.
 */
export function purgeLegacyGames(): Promise<void> {
  if (!r2Configured) return Promise.resolve()
  if (!purge) {
    purge = (async () => {
      try {
        if (await r2GetText(PURGED_MARKER)) return
        const results = await Promise.all(LEGACY_GAME_KEYS.map(k => r2Delete(k)))
        if (results.every(Boolean)) {
          await r2Put(PURGED_MARKER, new Date().toISOString(), 'text/plain')
          console.log('[voidhub] Deleted legacy games lists from R2')
        } else {
          purge = null // try again on the next request
        }
      } catch (e) {
        console.error('[voidhub] legacy games purge failed', e)
        purge = null
      }
    })()
  }
  return purge
}
