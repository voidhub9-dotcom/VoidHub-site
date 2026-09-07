# Chat On Steroids — iOS

A standalone SwiftUI chat client for iPhone and iPad. It talks straight to any
OpenAI-compatible endpoint with your own API key, streams answers, and keeps every
conversation on the device.

Inspired by the desktop [Chat On Steroids](https://github.com/totec448-spec/chat-on-steroids),
but deliberately not a port of it: that app's whole point is running shell commands
and driving your desktop, and iOS permanently forbids both. What carries over is the
shape of the workspace — projects, durable local history, per-chat system prompts,
a context meter, and the same "your credentials never leave the device" rule.

## What it does

- **Streaming chat** against any OpenAI-compatible `/chat/completions` endpoint
  (OpenRouter by default, or your own server).
- **Projects** — folders of chats that share a system prompt. A chat can override it.
- **Attachments** — photos (downscaled and re-encoded before sending) and text or
  source files, sent as vision parts or inlined text depending on the file.
- **Markdown with real code blocks** — horizontally scrollable, with a copy button.
- **Local history** — JSON under Application Support, searchable across every
  message, with optional retention pruning. Pinned chats are never pruned.
- **Context meter** — the same honest local estimate the desktop app uses. It is not
  the provider's counter.
- **Model picker** — reads the provider's `/models` listing, with a manual entry box
  for servers that do not publish one.
- **Sign in with Google**, or skip it entirely and run locally.

Your API key lives in the iOS keychain. Chats never leave the device except as the
requests you send to the endpoint you configured.

## Getting an .ipa

The GitHub Actions workflow at `.github/workflows/ios-build.yml` builds this on a
macOS runner and uploads an **unsigned** `.ipa` as a build artifact. It runs on every
push that touches `ios-app/`, and can be started by hand from the Actions tab.

Download it from the run's **Artifacts** section: `ChatOnSteroids-unsigned-ipa`.

### Installing an unsigned .ipa

An unsigned `.ipa` will not install on a stock iPhone as-is — iOS refuses any app
without a valid signature. Pick one:

| Route | What you need | Lasts |
| --- | --- | --- |
| **Sideloadly** or **AltStore** | A free Apple ID | 7 days, then re-sign |
| **Xcode** on a Mac | A free Apple ID (personal team) | 7 days |
| **Apple Developer Program** | $99/yr | 1 year |

All three re-sign the same `.ipa`; none of them need this project to change.

## Building on a Mac

```sh
brew install xcodegen
cd ios-app
xcodegen generate
open ChatOnSteroids.xcodeproj
```

`project.yml` is the source of truth — the `.xcodeproj` is generated and is not
committed. Hit **Product → Archive** for your own signed build.

## First run

1. Open the app and either sign in with Google or choose **Continue without an account**.
2. **Settings → Provider**: paste an API key. Get one from
   [openrouter.ai/keys](https://openrouter.ai/keys), or point the base URL at any
   other OpenAI-compatible server.
3. Press **Test connection** to confirm the endpoint answers.
4. Start a chat.

## Enabling Google sign-in

Google sign-in is off until a client ID is present, and the app says so on the
sign-in screen rather than failing at the tap. To switch it on:

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type **iOS**. It is free and needs no Apple
   Developer account. Use `com.voidhub.chatonsteroids` as the bundle ID.
2. Copy both values Google shows you into `ios-app/project.yml`:

   ```yaml
   settings:
     base:
       GOOGLE_CLIENT_ID: "123456-abc.apps.googleusercontent.com"
       GOOGLE_REVERSED_CLIENT_ID: "com.googleusercontent.apps.123456-abc"
   ```

3. Rebuild. Both values flow into Info.plist, so the URL scheme and the client ID can
   never drift apart.

The flow is OAuth 2.0 with PKCE through `ASWebAuthenticationSession` — no Google SDK,
no client secret, and the system browser session Google requires.

## Layout

```
ios-app/
  project.yml               XcodeGen spec — the source of truth
  ChatOnSteroids/
    App/                    Entry point and the auth gate
    Auth/                   Google OAuth (PKCE), account model, sign-in screen
    Chat/                   Transcript, composer, markdown/code rendering, context meter
    Conversations/          Chat list and search
    Projects/               Project folders
    Settings/               Provider, defaults, data, account
    Models/                 Conversation, Message, Project, settings, model info
    Networking/             Streaming client, wire types
    Storage/                Keychain, JSON store, observable app store
    Support/                Theme, token estimate, content parsing, attachments
```

## Requirements

iOS 17 or newer. No third-party dependencies — everything is system frameworks, which
is also why the CI build has nothing to resolve.
