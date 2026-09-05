# PhoneMigrate

A native Android app that moves your data from an old phone to a new one over a
direct, encrypted local connection — no cloud upload, no cable, no account. The
old phone shows a QR code; the new phone scans it and the transfer starts.

## How it actually works

QR codes can't hold gigabytes of photos, so the code isn't the transfer — it's the
handshake. Scanning it is closer to pairing two devices than "downloading" anything:

1. The sending phone (**old phone**) briefly turns itself into a Wi-Fi hotspot
   (`WifiManager.startLocalOnlyHotspot`) and opens a TCP server on it.
2. It encodes the hotspot's SSID/password, its IP/port, and a random one-time
   auth token into a QR code.
3. The receiving phone (**new phone**) scans that code, joins the hotspot
   programmatically, and connects to the server with the token.
4. Every item is streamed in 256 KB chunks, each encrypted with AES-256-GCM
   using a key derived from the token (so nothing is readable to anyone else on
   that transient network), and checksummed end-to-end with SHA-256.
5. Both phones tear the hotspot/connection down when the transfer finishes.

No internet connection is used or required on either phone during the transfer.

## What it can move

Everything here is done through public Android APIs, without root:

- **Contacts** — exported as vCards via the platform's own vCard generator, including
  photos, then re-imported as new local contacts on the other phone.
- **Photos / Videos / Audio** — read from and written to MediaStore, landing in a
  `PhoneMigrate` subfolder of Pictures/Movies/Music so nothing gets overwritten.
- **Call history** — read from and written to the call log (needs the permission
  granted; some manufacturers additionally restrict call log writes to the default
  phone app, which this isn't).
- **Files** — any folder you pick on the old phone, recreated under a folder you
  pick on the new phone, via the Storage Access Framework.

### What it deliberately doesn't do

Stock, non-rooted Android doesn't let a third-party app read another app's private
storage. That means WhatsApp/Signal history, other apps' saved data, home screen
layout, and system settings are out of reach here — that's not a shortcut this app
took, it's a wall every non-root migration tool on Android runs into. Manufacturer
tools that claim to move "everything" are usually doing it with a system-level
backup API this app doesn't have access to.

## Requirements

- Both phones on Android 8.0 (API 26) or later.
- Both phones need Wi-Fi turned on (they connect to *each other*, not to a router).
- Location permission (or "Nearby Wi-Fi devices" on Android 13+) is required by
  the platform to create/join a local hotspot — it's not used for anything else
  here, and no location data is collected or transmitted.

## Project layout

```
app/src/main/java/com/voidhub/phonemigrate/
  data/model/     Wire/UI data classes (ConnectionInfo, TransferManifest, …)
  network/        Hotspot + Wi-Fi join + the socket protocol (server & client)
  collectors/     Read each data category off the sending phone
  writers/        Write each data category onto the receiving phone
  qr/             QR generation (ZXing) and scanning (CameraX + ML Kit)
  service/        Foreground service that runs the transfer and its notification
  permissions/    Runtime permission helpers
  ui/              Jetpack Compose screens, navigation, and Material 3 theme
```

## Building it

This needs Android Studio (or the Android SDK + `gradle`) — it wasn't built inside
a sandbox with the SDK installed, so it hasn't been run through an actual device
build here. To build:

1. Open the `android-app/` folder in Android Studio; it will fetch the Gradle
   wrapper jar and dependencies on first sync.
   - Or, from the command line with the Android SDK installed:
     `gradle wrapper --gradle-version 8.7` once (to generate `gradlew`), then
     `./gradlew assembleDebug`.
2. Install the resulting APK on both phones (`app-debug.apk` under
   `app/build/outputs/apk/debug/`).
3. Open the app on both, pick **Send** on the old phone and **Receive** on the
   new one, and scan.

## Security notes

- The QR code is single-use: it's only meaningful while that specific hotspot
  session is up, and the token it carries is regenerated every time you start a
  send.
- All item data is encrypted in transit (AES-256-GCM); the hotspot password
  itself is also random per session.
- Nothing is written to disk unencrypted in transit — items are streamed
  straight into MediaStore/Contacts/SAF as they arrive.
