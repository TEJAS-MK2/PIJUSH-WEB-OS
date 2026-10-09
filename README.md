# PIJUSH-WEB-OS

A browser-native operating system interface built from scratch with vanilla HTML, CSS and JavaScript.

## Included
- Window manager: drag, minimize, maximize, close
- Application launcher and dock
- Terminal shell
- Persistent virtual filesystem
- Text editor
- File manager
- Calculator
- System monitor and integrated System Center
- Named workspace snapshots with restore/export
- Session diagnostics and exportable reports
- Settings
- Offline-capable PWA
- Mobile/touch-friendly layout
- GitHub Pages deployment via Actions

## System Center

Open **System Center** from the application launcher to inspect session uptime, active processes, workspace size, browser-reported storage usage, available runtime capabilities, and session diagnostics. CPU usage is not exposed by standard browser APIs, so the interface does not fabricate a CPU percentage.

Create up to three named snapshots (8 MB each) stored separately from workspace files. Snapshots can be exported, restored, or deleted. Restoring replaces the current workspace, so export a backup first if you need to preserve current data. Diagnostic reports contain the current page session's events and can be exported as JSON. Browser storage quotas and persistence grants are controlled by the browser.

## Development
Serve the repository with any static HTTP server, for example: python3 -m http.server 8080

## License
MIT

## WebKernel

PIJUSH OS now has a browser-native kernel layer with an event bus, process manager, app registry, and IndexedDB-backed virtual filesystem. The desktop consumes these services instead of directly owning filesystem state.

## Phase 4: App distribution and security

Open **App Store** from the launcher to install the built-in **Hello World** and **Scratchpad Mini** demos, launch installed apps, or uninstall them. Local packages use the `.pijapp` extension and are JSON files with this shape:

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

The package manager validates IDs, semantic versions, the `index.html` entrypoint, permission names, duplicate permissions, and size limits. Installed packages receive a SHA-256 checksum over the normalized manifest, permissions, entrypoint, and HTML; it is verified before launch. Replacement versions are backed up and can be rolled back from the App Store. This checksum detects accidental changes, but it is not a publisher signature. Third-party apps run in an iframe with `sandbox="allow-scripts"` (no same-origin privilege) and a restrictive Content Security Policy that blocks network connections. Host APIs are bridged through nonce-bound messages and are checked against explicitly granted permissions. App filesystem calls are namespaced under `AppData/<app-id>/`. Permissions are requested before first use; denying a request prevents launch. Treat packages as untrusted regardless of their source.

Run `npm test` and `npm run check` before deploying. GitHub Actions runs both before the Pages deployment job.
