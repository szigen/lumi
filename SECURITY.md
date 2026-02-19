# Security Policy

## Security Model

Lumi is an Electron desktop application that manages AI CLI sessions. Key security aspects:

- **Process isolation**: Renderer process is sandboxed and communicates with the main process exclusively through `contextBridge`-based IPC. No direct `nodeIntegration` in the renderer.
- **Terminal access**: AI CLI sessions run via `node-pty` in the main process. Each terminal session is scoped to a user-selected repository directory.
- **No network server**: Lumi does not expose any local or remote HTTP/WebSocket server. All communication is local IPC within the Electron process.

## Unsigned Binaries

Lumi is an independent open-source project and the release binaries are **not code-signed**. This means:

- **macOS**: Gatekeeper will block the app. You need to run `xattr -dr com.apple.quarantine /Applications/Lumi.app` before first launch.
- **Windows**: SmartScreen will show an "unknown publisher" warning. Click "More info" → "Run anyway".

We recommend verifying the download checksums from the [Releases](https://github.com/szigen/lumi/releases) page. You can also build from source to avoid unsigned binary concerns entirely.

## Reporting a Vulnerability

If you discover a security vulnerability in Lumi, please report it responsibly.

Please report it via [GitHub Issues](https://github.com/szigen/lumi/issues) with the **security** label. Avoid including exploit details in the public issue — just describe the area affected and we'll follow up privately.

Please include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix release | Within 30 days (best effort) |

For critical vulnerabilities, we will prioritize a faster turnaround.

## Scope

### In scope

- Remote code execution via Lumi's IPC or terminal handling
- `contextBridge` bypass or renderer-to-main process escape
- Path traversal or arbitrary file access outside selected repositories
- Vulnerabilities in Lumi's own code (not upstream dependencies)

### Out of scope

- Social engineering or phishing attacks
- Physical access attacks
- Denial of service against local application
- Vulnerabilities in upstream dependencies (Electron, node-pty, xterm.js) — please report these to the respective projects
- Issues requiring the user to install malicious AI CLI tools

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |
