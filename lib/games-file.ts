/**
 * R2 object that holds the games list (stored at `files/<GAMES_FILE>`).
 *
 * Bumped from `games.json` to start the list over for the site revamp.
 * The old list is left untouched in the bucket at `files/games.json`
 * as a backup; point this back at it to restore.
 */
export const GAMES_FILE = 'games-v2.json'
