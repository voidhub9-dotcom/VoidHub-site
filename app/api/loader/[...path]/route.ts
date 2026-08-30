/**
 * Catch-all for any subpath under /api/loader (e.g. /api/loader/main,
 * /api/loader/v2). People share slightly different URLs, and a 404 here
 * would feed HTML to loadstring() and crash the executor — so every
 * subpath serves the exact same protected loader as /api/loader.
 */
export { GET } from '../route'
