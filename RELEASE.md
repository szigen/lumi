# Release Process

## Artifact Naming Convention

All platforms use hyphen-based naming with `artifactName` in `electron-builder.config.ts`:

| Platform | Installer | Portable |
|----------|-----------|----------|
| macOS (Apple Silicon) | `Lumi-X.Y.Z-arm64-mac.dmg` | `Lumi-X.Y.Z-arm64-mac.zip` |
| Windows | `Lumi-Setup-X.Y.Z-win.exe` | `Lumi-X.Y.Z-win.exe` |
| Linux (x86_64) | `Lumi-X.Y.Z-linux-x86_64.AppImage` | `Lumi-X.Y.Z-linux-amd64.deb` |
| Linux (ARM64) | `Lumi-X.Y.Z-linux-arm64.AppImage` | `Lumi-X.Y.Z-linux-arm64.deb` |

> **Note:** `${arch}` resolves per extension — `x86_64` for AppImage (x86), `amd64` for deb (x86), `arm64` for macOS and Linux ARM64.

---

## Pre-release Checklist

### 1. Version Bump

Update version in **4 places**:

- [ ] `package.json` → `"version": "X.Y.Z"`
- [ ] `package-lock.json` → top-level `"version": "X.Y.Z"`
- [ ] `package-lock.json` → `packages[""].version: "X.Y.Z"`

```bash
# Verify all three match:
node -e "const p=require('./package.json'); const l=require('./package-lock.json'); console.log('pkg:', p.version, '| lock:', l.version, '| lock.packages:', l.packages[''].version)"
```

### 2. CHANGELOG.md

- [ ] Add new `## [X.Y.Z] - YYYY-MM-DD` section at top (below header)
- [ ] Categorize changes: `### Added`, `### Changed`, `### Fixed`, `### Removed`
- [ ] Include all commits since previous version tag

### 3. README.md — Download Links

Update the download table and **all inline references** to match the naming convention above.

**Download table** (replace `X.Y.Z` with new version):

```markdown
| Platform | Installer | Portable |
|----------|-----------|----------|
| macOS (Apple Silicon) | [Lumi-X.Y.Z-arm64-mac.dmg](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-arm64-mac.dmg) | [.zip](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-arm64-mac.zip) |
| Windows | [Lumi-Setup-X.Y.Z-win.exe](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-Setup-X.Y.Z-win.exe) | [.exe](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-win.exe) |
| Linux (x86_64) | [Lumi-X.Y.Z-linux-x86_64.AppImage](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-linux-x86_64.AppImage) | [.deb](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-linux-amd64.deb) |
| Linux (ARM64) | [Lumi-X.Y.Z-linux-arm64.AppImage](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-linux-arm64.AppImage) | [.deb](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-linux-arm64.deb) |
```

**Inline references to update:**

- [ ] Windows install section: `Lumi-Setup-X.Y.Z-win.exe`
- [ ] Windows portable mention: `Lumi-X.Y.Z-win.exe`
- [ ] Linux (x86_64) AppImage commands: `Lumi-X.Y.Z-linux-x86_64.AppImage`
- [ ] Linux (x86_64) deb command: `Lumi-X.Y.Z-linux-amd64.deb`
- [ ] Linux (ARM64) AppImage commands: `Lumi-X.Y.Z-linux-arm64.AppImage`
- [ ] Linux (ARM64) deb command: `Lumi-X.Y.Z-linux-arm64.deb`

### 4. Verify Build

```bash
npm run typecheck && npm run lint && npm test
```

---

## Release Steps

### 5. Commit & Push

```bash
git add package.json package-lock.json CHANGELOG.md README.md
git commit -m "chore: bump version to X.Y.Z and update CHANGELOG"
git push origin main
```

### 6. Tag & Push Tag

```bash
git tag vX.Y.Z
git push origin main --tags
```

### 7. Wait for Release Workflow

Tag push triggers `release.yml`:

**validate** (lint, typecheck, test, version match) → **build** (macOS, Linux x86_64, Linux ARM64, Windows) → **draft release** with all artifacts

```bash
gh run list --workflow=release.yml --limit 1
gh run watch <RUN_ID>
```

### 8. Publish

```bash
gh release edit vX.Y.Z --draft=false
```

---

## Post-release Verification

### 9. Verify Artifacts

```bash
# List all assets in the release
gh release view vX.Y.Z --json assets --jq '.assets[].name'
```

Expected assets for `vX.Y.Z`:

```
Lumi-X.Y.Z-arm64-mac.dmg
Lumi-X.Y.Z-arm64-mac.zip
Lumi-Setup-X.Y.Z-win.exe
Lumi-X.Y.Z-win.exe
Lumi-X.Y.Z-linux-x86_64.AppImage
Lumi-X.Y.Z-linux-amd64.deb
Lumi-X.Y.Z-linux-arm64.AppImage
Lumi-X.Y.Z-linux-arm64.deb
```

### 10. Verify Download Links

- [ ] Click each link in the README download table — confirm no 404s
- [ ] Verify each asset name in `gh release view` matches the README links exactly
- [ ] Spot-check at least one download to confirm the file is valid
