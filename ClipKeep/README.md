# ClipKeep

A local, on-device clipboard history manager for iOS. Copy something anywhere
on your phone; open ClipKeep and it's there, byte-for-byte, ready to paste
back exactly as it was copied — including formatting on rich text and full
image fidelity, not a re-encoded approximation.

Everything lives in `Application Support/ClipKeep/` on-device. There is no
network code anywhere in this project, no analytics, and clip data is
excluded from iCloud/iTunes backups automatically.

## What's actually in the box

- SwiftUI app, iOS 17.0+, no third-party dependencies.
- Byte-exact capture: every UTI representation the system pasteboard offers
  for a copied item (plain text, RTF, PNG/JPEG, a URL, ...) is captured and
  stored as raw bytes, and copy-back restores all of them at once so the
  destination app gets exactly what it originally would have.
- History list with search, pin, swipe-to-copy / swipe-to-delete, a detail
  view per clip, and a Settings screen (max history size, auto-delete after
  N days, storage usage, clear-all).
- Duplicate detection (SHA-256 over the captured bytes), size limits per item
  and per representation so one huge screenshot copy can't blow out storage,
  and thumbnail caching for image clips so the list stays smooth.
- Adaptive Liquid Glass UI: on iOS 26+, the clip-type badges, the "Copied"
  toast, the empty-state icon, and the detail screen's floating pin/delete/
  copy bar all render as real Liquid Glass (`glassEffect`, `GlassEffectContainer`,
  `.buttonStyle(.glass/.glassProminent)`). On iOS 17–25 the same views fall
  back to `.ultraThinMaterial` automatically — one call site
  (`Views/GlassEffects.swift`) branches on `#available(iOS 26.0, *)` so nothing
  else in the app has to. Standard chrome (navigation bar, tab/toolbar,
  sheets) picks up Liquid Glass for free from the OS with no code changes,
  per Apple's own guidance that glass belongs on the navigation/controls
  layer, not smeared across list content.

## The one thing no app can get around

iOS does not let *any* app — ClipKeep included — run in the background and
silently watch the system clipboard. That's a deliberate Apple privacy
protection, not a bug or a corner cut here. ClipKeep works the same way
every clipboard-manager app on the App Store does: it checks the pasteboard
every time you open it or switch back to it, plus a light foreground timer
while it's on-screen (to catch a copy made in a neighboring Split View app).
Depending on the iOS version, the system may also pop up its own "Allow
Paste" prompt the first time in a session that ClipKeep reads something you
copied elsewhere — that alert comes from iOS itself and can't be
skipped or suppressed by app code.

## Permissions: what ClipKeep asks for (and what it doesn't)

ClipKeep has exactly one permission-adjacent thing to know about, and it
isn't a permission the app requests — it's a system setting iOS attaches to
any app once it uses the pasteboard:

- **Paste from Other Apps** (Settings → ClipKeep → Paste from Other Apps).
  There's no Info.plist key or API to request this in advance the way you
  would Camera or Location access — iOS shows its own "Allow Paste" alert
  the first time it's relevant and separately exposes this toggle so the
  choice can be made permanent. ClipKeep's Settings screen has an **Open
  ClipKeep in Settings** button under "How Capture Works" that jumps
  straight to that page.

That's the entire permissions surface. There is no `NSCameraUsageDescription`,
`NSPhotoLibraryUsageDescription`, `NSLocationWhenInUseUsageDescription`,
push notification entitlement, Bluetooth, microphone, or contacts key
anywhere in this project, because the app doesn't touch any of those
things — adding an unused permission string is itself an App Store review
flag ("why does a clipboard app want the microphone?"), so none are present.

**Privacy manifest.** Since 2024, Apple requires every app to ship a
`PrivacyInfo.xcprivacy` file declaring (a) any "required-reason" API usage
and (b) what user data, if any, gets collected — this is checked at App
Store Connect upload, and a missing/incorrect one produces a rejection
(`ITMS-91053`), not just a warning. ClipKeep's is included at
`ClipKeep/PrivacyInfo.xcprivacy` and declares:
- `NSPrivacyTracking: false` and empty tracking domains / collected data
  types — there's no networking code in this app at all, so nothing is
  collected, let alone sent anywhere.
- One required-reason API declaration: `NSPrivacyAccessedAPICategoryUserDefaults`
  with reason `CA92.1` ("read/write information that is only accessible to
  the app itself"), because Settings persists `maxHistoryItems` and
  `retentionDays` via `UserDefaults.standard`.
- `PersistenceStore`'s use of `.fileSizeKey` (for the storage total shown in
  Settings) does *not* require a File Timestamp declaration — that category
  only covers creation/modification-date keys and the raw `stat()`/
  `getattrlist()` family, not file size — so it's correctly left out rather
  than over-declared. The comments in the file explain exactly which reason
  code to add if that ever changes.

## Opening the project

1. You need a Mac with Xcode 15 or newer installed (free from the Mac App
   Store). This can't be built on Windows or Linux — that's an Apple
   platform requirement for every iOS app, not specific to this one.
2. Double-click `ClipKeep.xcodeproj` (or open it from within Xcode).
3. Select the `ClipKeep` scheme and a Simulator (e.g. "iPhone 15") in the
   toolbar, then press ⌘R to build and run it in the Simulator — no signing
   needed for that.

## Getting it onto your iPhone as a real, installed app

To run on an actual iPhone (not the Simulator), or to produce a distributable
`.ipa`, Apple requires the build to be code-signed with an Apple ID — this is
an App Store / iOS platform rule that applies to every app, and no tool
running outside of Xcode on a Mac can substitute for it.

**Option A — run it directly on your phone via Xcode (free, easiest):**

1. Plug your iPhone into the Mac (or use wireless debugging).
2. In Xcode, select `ClipKeep` in the Project Navigator, go to the
   **Signing & Capabilities** tab, turn on **Automatically manage signing**,
   and pick your Apple ID under **Team** (Xcode will prompt you to add one
   if needed — any free Apple ID works for this, no paid developer account
   required).
3. Select your iPhone as the run destination in the toolbar and press ⌘R.
   The first time, your iPhone will ask you to trust the developer
   certificate: **Settings → General → VPN & Device Management → \[your
   Apple ID\] → Trust**.
4. With a free account the app keeps running for 7 days before it needs to
   be reinstalled from Xcode; a $99/year Apple Developer Program membership
   extends that to a year and removes the device-count limits.

**Option B — export an actual `.ipa` file:**

1. Set signing as in Option A (a paid Apple Developer Program account is
   required for the "Release"/ad-hoc export options below; a free account
   is limited to the direct-run method in Option A).
2. In the toolbar, set the scheme's destination to **Any iOS Device (arm64)**.
3. **Product → Archive.** When it finishes, the Organizer window opens.
4. Click **Distribute App**, choose **Ad Hoc** (installs on your own
   registered devices) or **Development**, follow the prompts, and Xcode
   writes out a signed `.ipa` you can install via Apple Configurator, Xcode's
   Devices window, or your MDM of choice.

Both paths go through Xcode's own signing and Archive step — that part
can't be scripted away or done from a plain text editor, because Apple
requires a cryptographic signature tied to a real Apple ID for any code
that runs on a physical iPhone.

**Option C — no Mac at all: build an `.ipa` in the cloud via GitHub Actions.**

Included at `.github/workflows/build-ipa.yml` is a workflow that runs a real
Xcode toolchain on GitHub's own hosted macOS runners and hands you back an
actual compiled `.ipa` — useful if you don't have a Mac available:

1. Push this project to a GitHub repository (from inside this folder, the
   one containing `ClipKeep.xcodeproj`):
   ```
   git init
   git add .
   git commit -m "ClipKeep"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
2. On GitHub, open the **Actions** tab and either wait for the push-triggered
   run or click **Run workflow** on "Build unsigned IPA" to trigger it by hand.
3. When the run finishes (a few minutes), open it and download the
   **ClipKeep-unsigned-ipa** artifact — that zip contains
   `ClipKeep-unsigned.ipa`, a real, compiled `.ipa` file.

The catch, and it's an unavoidable one: this workflow has no Apple
Developer certificate to sign with (it never asks for your Apple ID —
that's deliberate), so **the `.ipa` it produces is unsigned**. iOS refuses
to run any app that isn't signed, so this file will not install on a real
iPhone as-is. To actually install it, re-sign it with a free tool like
[Sideloadly](https://sideloadly.io) or [AltStore](https://altstore.io) using
your own (free) Apple ID — both exist specifically to take an unsigned
`.ipa` like this one and sign+install it on your phone, re-signing it every
7 days unless you have a paid Apple Developer Program membership. This is
the same free-Apple-ID, 7-day-renewal tradeoff as Option A, just reached
without opening Xcode yourself.

If instead you want a properly signed, indefinitely-installable `.ipa` with
zero manual steps on your end, a paid CI service like
[Codemagic](https://codemagic.io) or [Bitrise](https://bitrise.io) can do
that — you upload your Apple Developer certificate and provisioning profile
to their dashboard once, and they export a signed `.ipa` on every build.
That's a bigger commitment (their pricing, and handing them your signing
credentials) than this repo's own free GitHub Actions workflow, so it's
worth doing only if you specifically want to skip Option A/B entirely going
forward.

## If you want to change the bundle identifier

The project ships with `com.clipkeep.app` as a placeholder bundle ID. If
Xcode complains it's already taken during signing (bundle IDs must be
globally unique), open the target's **Signing & Capabilities** tab and
change it to something like `com.<yourname>.clipkeep`.

## Project layout

```
ClipKeep/
  ClipKeepApp.swift        Entry point; wires scenePhase -> ClipboardManager
  ContentView.swift        History list, search, pinning, swipe actions
  Models/
    ClipKind.swift          text / richText / url / image / unknown
    UTIConstants.swift       Pasteboard type-identifier constants + classifier
    ClipMetadata.swift       Lightweight in-memory index entry
  Services/
    ClipboardManager.swift   Owns history; all UIPasteboard interaction
    PersistenceStore.swift   Disk layout: JSON index + per-item binary plists
    ThumbnailCache.swift     Downscaled image cache for list rows
    HapticsManager.swift     Haptic feedback wrapper
  Views/
    ClipRowView.swift        One history row
    ClipDetailView.swift     Full clip view + copy/pin/delete
    SettingsView.swift       History limits, storage, clear-all, about
    EmptyStateView.swift     No-history / no-search-results placeholder
    ToastView.swift          "Copied to Clipboard" confirmation banner
  Assets.xcassets/           App icon + accent color
```
