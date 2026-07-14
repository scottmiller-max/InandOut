# EAS Build — Setup & First Build

This repo now ships an `eas.json` and npm scripts for building native iOS/Android
binaries with **EAS Build** (Expo Application Services). It does **not** yet have an
Expo project/account linked — that's a one-time step you run locally, below.

> Nothing here changes the existing web build (`npm run build:web`), which keeps working.

---

## What's already in the repo

- **`eas.json`** — three build profiles:
  - `development` — a dev client (`developmentClient: true`), internal distribution, iOS
    simulator build allowed. Use while actively developing.
  - `preview` — internal distribution; Android builds as a plain `.apk` you can sideload,
    iOS as an ad-hoc build. Use for sharing test builds with yourself/crew.
  - `production` — store-ready build, `autoIncrement` bumps the build number each time.
- **`package.json` scripts** — `eas:build:dev`, `eas:build:preview`, `eas:build:ios`,
  `eas:build:android`, `eas:build:all`, `eas:submit`.
- **`eas-cli`** pinned in `devDependencies` (`^21.0.0`).

App identifiers are already set in `app.json`:
`ios.bundleIdentifier` and `android.package` are both `com.inandout.moving`.

---

## One-time setup (do this on your Mac)

### 1. Create a free Expo account
Go to https://expo.dev and sign up (free). Note the **username** — it becomes the app
`owner`.

### 2. Install the CLI and log in
```bash
npm install -g eas-cli      # or use: npx eas-cli@latest <command>
eas login
```

### 3. Link this project to an EAS project
From the repo root:
```bash
eas init
```
This creates the app on your Expo account and writes `owner` and
`extra.eas.projectId` into `app.json` automatically. **Commit that change.**

### 4. Generate native credentials
EAS manages signing keys for you (recommended):
```bash
eas build:configure
```
- **Android:** EAS generates a keystore and stores it. Say yes to letting EAS manage it.
- **iOS:** requires a paid **Apple Developer account** ($99/yr). `eas` will prompt for
  your Apple ID and create the distribution certificate + provisioning profile. If you
  don't have the Apple account yet, you can still do Android now and add iOS later.

---

## Running builds

```bash
npm run eas:build:preview        # quick internal test build (both platforms)
npm run eas:build:android        # production Android (.aab for Play Store)
npm run eas:build:ios            # production iOS (needs Apple Developer account)
npm run eas:build:all            # production, both platforms
```
Builds run on Expo's servers; the CLI prints a URL to watch progress and download the
artifact. First Android build takes ~10–20 min.

### Install a test build
- **Android preview:** download the `.apk` from the build page and install it directly
  on a device (enable "install unknown apps").
- **iOS preview:** register the device UDID when prompted, then install via the QR/link.

---

## Submitting to the stores (later)
```bash
npm run eas:submit               # uploads the latest production build
```
Requires store listings to exist (App Store Connect / Google Play Console) and the
respective developer accounts.

---

## Notes / decisions
- **EAS Update (OTA) is intentionally not set up here.** This app is on Expo SDK 54, and
  wiring OTA updates means adding an SDK-matched `expo-updates` (`eas update:configure`).
  That's a separate opt-in step; plain EAS Build does not need it, so the profiles above
  have no `channel` keys yet. Add them when/if you adopt OTA updates.
- **`appVersionSource` is `remote`** — EAS owns the build number and auto-increments it on
  production builds, so you won't hand-edit versions.
- If `eas build` complains about the Expo SDK version being outdated relative to the CLI,
  run `npx expo install --fix` first, or upgrade the SDK — but do that deliberately, not
  as part of the first build.
