# Release Process

## 1. Changelog & Version Bump

1. `CHANGELOG.md` — add new version section at top
2. `README.md` — update download URLs and installer references
3. `package.json` — update `version`
4. `package-lock.json` — update `version` (2 places: top-level + `packages[""]`)

## 2. Commit & Push

```bash
git add -A
git commit -m "Bump version to X.Y.Z"
git push origin main
```

## 3. Release PR

```bash
gh pr create --base release --head main --title "Release vX.Y.Z"
```

## 4. CI Check & Merge

```bash
gh pr checks <PR_NO> --watch
gh pr merge <PR_NO> --merge
```

## 5. Wait for Release Workflow

Merge triggers a push to `release` branch, which runs `release.yml`:

**test** → **build** (macOS, Linux, Windows) → **draft release** with all artifacts

```bash
gh run list --workflow=release.yml --limit 1
gh run watch <RUN_ID>
```

## 6. Publish

```bash
gh release edit vX.Y.Z --draft=false
```
