# PIJUSH OS

A browser-based desktop environment built with vanilla HTML, CSS, and JavaScript, styled with a Windows XP Luna-inspired desktop: blue title bars, a green Start button, desktop shortcuts, classic display properties, and Bliss-inspired rolling hills. PIJUSH OS runs as a static web app and progressive web app (PWA), with built-in utilities, a virtual filesystem, and sandboxed app packages.

**Live site:** https://tejas-mk2.github.io/PIJUSH-WEB-OS/  
**Source:** https://github.com/TEJAS-MK2/PIJUSH-WEB-OS  
**Deployment:** GitHub Pages via GitHub Actions

## Features

### Desktop and built-in apps
- Desktop interface with application launcher and dock
- Window controls: move, minimize, maximize, and close
- File Manager and virtual workspace
- Text Editor, Terminal, and Calculator
- System Monitor and System Center
- Settings, Developer Mode, App Store, Display Properties, User Profile, Storage Center, Browser, and Desktop Gadgets
- Responsive layout for desktop and mobile screens
- Windows XP-inspired Luna styling, Start menu/taskbar, desktop shortcuts, and rolling-hills wallpaper
- Display Properties with XP Blue, Silver, and Olive themes; selectable wallpapers and compact/classic taskbar
- Internet Explorer-inspired start page with safe external-link handling
- Desktop Gadgets for clock, workspace entries, process count, and network state
- Installable PWA shell with a versioned service worker and offline fallback

### Virtual filesystem and recovery
- IndexedDB-backed virtual filesystem for workspace files
- In-memory fallback when IndexedDB cannot be used; data in this fallback is temporary
- JSON backup export and validated backup import from Settings
- Recovery mode for troubleshooting with built-in apps only
- Workspace restore replaces current workspace contents, so export a backup before restoring or resetting

The backup parser validates the backup format, file records, path safety, entry count, and content size before accepting a restore. A valid backup uses the `pijush-os-backup` format, version `1`.

### System Center
Open **System Center** from the application launcher for a live view of:
- Session uptime and active processes
- Workspace entry count
- Browser-reported storage usage and quota, when available
- Filesystem backend, storage-persistence status, viewport, network state, and JavaScript heap information where the browser exposes it
- Session diagnostic events, including JavaScript errors and network lifecycle events

The diagnostics panel can export a JSON report for troubleshooting. Its log is session-local and is not a remote monitoring service. Standard browser APIs do not expose reliable system CPU usage, so PIJUSH OS does not display a fabricated CPU percentage.

### Local storage and backups

- Workspace files and app data stay in the browser's IndexedDB-backed virtual filesystem on this device
- No cloud authentication, remote account, or cloud database is used by the app
- Storage Center reports browser-reported usage/quota when available and can request persistent storage
- Export/import a local JSON backup to move data manually between devices
- Browser persistent storage is not guaranteed; site data can still be removed by browser settings or device cleanup

Backups may contain personal files and installed app packages, so keep exported JSON files private. Restoring a backup replaces the current virtual workspace and asks for confirmation first. PIJUSH OS does not upload the backup anywhere.

### Snapshot Manager
System Center supports up to **3 named snapshots**, each limited to **8 MB**. Snapshots can be created, exported, restored, and deleted. When IndexedDB is available, snapshot records are stored separately from virtual workspace files. If the app falls back to memory storage, snapshots are temporary and will not survive a page reload.

Restoring a snapshot replaces the current virtual workspace, including files and stored app data represented in the backup. Export a current backup first if you need to keep the latest state. Snapshots are a convenience for recovery, not a substitute for downloading an independent backup.

### App distribution and security
Open **App Store** to try the built-in **Hello World** and **Scratchpad Mini** demos, install supported local packages, launch installed apps, or uninstall them. Local packages use the `.pijapp` extension and JSON with a manifest and HTML entry point, for example:

```json
{
  "manifest": {
    "id": "sample-tool",
    "name": "Sample Tool",
    "version": "1.0.0",
    "description": "A short description",
    "permissions": []
  },
  "html": "<!doctype html><html><body><h1>Sample</h1></body></html>"
}
```

The package manager validates package IDs, semantic versions, entry points, permissions, duplicate permissions, and size limits. It computes and verifies a SHA-256 checksum for installed package content. This checksum detects changes; **it is not a publisher signature**.

Third-party apps run in a sandboxed iframe without same-origin privilege, with a restrictive Content Security Policy intended to block network connections. Host API requests are checked against granted permissions, and app filesystem paths are namespaced under `AppData/<app-id>/`. Treat packages as untrusted, even when their checksum is valid.

## Getting started

You can run the static site locally with Python:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

Node.js is required for the repository's automated test and syntax-check scripts. From the project root, run:

```bash
npm test
npm run check
```

- `npm test` runs the Node.js test suite in `tests/`.
- `npm run check` performs JavaScript syntax checks on the application, kernel, package manager, recovery module, System Center, and XP desktop suite.

## Deployment

GitHub Actions deploys the site to GitHub Pages when changes are pushed to `main`, or when the workflow is manually started. The workflow runs tests and syntax checks first; the deployment job runs only if the test job succeeds.

To check the current build, open the [Actions runs](https://github.com/TEJAS-MK2/PIJUSH-WEB-OS/actions). A successful workflow run is required before treating a change as deployed.

## Architecture

- `index.html` — application shell and script loading
- `styles.css` — desktop, window, app, and responsive styles
- `app.js` — desktop UI and built-in applications
- `kernel.js` — event bus, process manager, app registry, and virtual filesystem
- `package-manager.js` — package validation, installation, and sandbox integration
- `recovery.js` — backup creation and validation
- `system-center.js` — diagnostics, runtime overview, and snapshot UI
- `xp-suite.js` — XP-inspired appearance, local profile, on-device storage controls, backup import/export, browser start page, and desktop gadgets
- `sw.js` — service worker and static-asset cache
- `tests/` — automated tests
- `.github/workflows/deploy.yml` — test and GitHub Pages deployment pipeline

## Browser and storage notes

PIJUSH OS is a browser-based operating-system interface, not a standalone kernel or a native operating system. Available storage, persistence grants, heap information, and offline behavior depend on the browser and device. Browsers can decline persistent-storage requests or clear site data. Download important backups and test restore procedures before relying on them.

## License

MIT
