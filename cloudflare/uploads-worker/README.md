# Uploads CDN Worker

Right now every uploaded image (logos, banners, product/thumbnail images —
anything uploaded through the admin panel's "Upload" buttons) is served by
`/api/uploads/[id]` on Vercel: a Node function that fetches the bytes from
R2 over the S3 API on every request. Every one of those hits counts as a
Vercel Edge Request.

This Worker serves the same files straight from R2 at Cloudflare's edge,
using a native R2 binding — no Vercel function involved at all, so none of
that traffic counts against Vercel. It only ever reads the `uploads/`
prefix of the bucket; nothing else in `voidhub-storage` (games.json, shop
products, etc — some of which has fields that must stay private) is
reachable through it.

I can't deploy this myself — the Cloudflare MCP tools available to me can
read Workers/R2 but not deploy code or touch DNS. Two ways to do it
yourself, pick one:

## Option A — Cloudflare dashboard only (no CLI)

1. **Paste the code.** Cloudflare dashboard → Workers & Pages → your
   `voidhub` Worker (already exists, currently a "Hello world" placeholder)
   → **Edit code**. Replace everything with the contents of `index.js` in
   this folder → **Deploy**.
2. **Bind the bucket.** Same Worker → **Settings → Variables and Bindings**
   → **Add binding** → type **R2 Bucket** → variable name
   `VOIDHUB_BUCKET` → bucket `voidhub-storage` → **Deploy**.
3. **Add the DNS record.** Cloudflare dashboard → your `voidon.top` zone →
   **DNS** → **Add record**: type `CNAME`, name `cdn`, target `voidon.top`
   (anything works — the Worker intercepts before it'd ever reach that
   target), **Proxy status: Proxied** (orange cloud — this is the part
   that actually matters, it's what lets the Worker see the request at
   all).
4. **Add the route.** Same Worker → **Settings → Domains & Routes** →
   **Add** → Route → pattern `cdn.voidon.top/uploads/*`, zone `voidon.top`.
5. **Verify** before flipping anything on: upload a test file the normal
   way first (Admin → any Upload button) to get a real `<id>.png` from
   `/api/uploads/`, then hit
   `https://cdn.voidon.top/uploads/<that id>` directly — you should get the
   image back, not a 404.
6. **Turn it on.** Vercel → your project → Settings → Environment
   Variables → add `CDN_UPLOADS_BASE_URL` = `https://cdn.voidon.top/uploads`
   → redeploy. From then on, new uploads return a `cdn.voidon.top` URL
   instead of `/api/uploads/...`. Anything uploaded before this (logo,
   existing product images, game thumbnails) keeps working exactly as
   before — `/api/uploads/[id]` isn't going anywhere, this only changes
   the URL handed back for uploads made *after* you set the env var.

## Option B — Wrangler CLI

From this folder:

```
npx wrangler deploy
```

Wrangler reads `wrangler.toml` here, which already declares the
`VOIDHUB_BUCKET` binding and the `cdn.voidon.top/uploads/*` route — it'll
create/update both in one shot (you'll be prompted to log in to the right
Cloudflare account the first time). You still need to add the `cdn` DNS
record yourself (step 3 above) — wrangler doesn't create DNS records, only
the Worker and its route.

Then do steps 5 and 6 above.

## Re-pointing existing images (optional, later)

If you eventually want *old* uploads served from the CDN too (not just new
ones), that's a separate step: re-upload them through the Upload buttons
in Admin so they get fresh CDN URLs, or write a one-off script to rewrite
the stored `imageUrl`/`logoUrl`/etc fields in R2. Not required — the
Vercel route keeps serving old ones fine either way.
