# Release Process

## Artifact Naming Convention

All platforms use hyphen-based naming with `artifactName` in `electron-builder.config.ts`:

| Platform | Installer | Portable |
|----------|-----------|----------|
| macOS (Apple Silicon) | `Lumi-X.Y.Z-arm64-mac.dmg` | `Lumi-X.Y.Z-arm64-mac.zip` |
| Windows | `Lumi-Setup-X.Y.Z-win.exe` | `Lumi-X.Y.Z-win.exe` |
| Linux | `Lumi-X.Y.Z-linux-x86_64.AppImage` | `Lumi-X.Y.Z-linux-amd64.deb` |

> **Note:** `${arch}` resolves per extension — `x86_64` for AppImage, `amd64` for deb, `arm64` for macOS.

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
| Linux | [Lumi-X.Y.Z-linux-x86_64.AppImage](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-linux-x86_64.AppImage) | [.deb](https://github.com/szigen/lumi/releases/download/vX.Y.Z/Lumi-X.Y.Z-linux-amd64.deb) |
```

**Inline references to update:**

- [ ] Windows install section: `Lumi-Setup-X.Y.Z-win.exe`
- [ ] Windows portable mention: `Lumi-X.Y.Z-win.exe`
- [ ] Linux AppImage commands: `Lumi-X.Y.Z-linux-x86_64.AppImage`
- [ ] Linux deb command: `Lumi-X.Y.Z-linux-amd64.deb`

### 4. Verify Build

```bash
npm run typecheck && npm run lint && npm test
```

---

## Release Steps

### 5. Commit & Push

```bash
git add package.json package-lock.json CHANGELOG.md README.md
git commit -m "Bump version to X.Y.Z"
git push origin main
```

### 6. Create Release PR

```bash
gh pr create --base release --head main --title "Release vX.Y.Z"
```

### 7. CI Check & Merge

```bash
gh pr checks <PR_NO> --watch
gh pr merge <PR_NO> --merge
```

### 8. Wait for Release Workflow

Merge triggers a push to `release` branch, which runs `release.yml`:

**test** → **build** (macOS, Linux, Windows) → **draft release** with all artifacts

```bash
gh run list --workflow=release.yml --limit 1
gh run watch <RUN_ID>
```

### 9. Publish

```bash
gh release edit vX.Y.Z --draft=false
```

---

## Post-release Verification

### 10. Verify Artifacts

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
```

### 11. Verify Download Links

- [ ] Click each link in the README download table — confirm no 404s
- [ ] Verify each asset name in `gh release view` matches the README links exactly
- [ ] Spot-check at least one download to confirm the file is valid
