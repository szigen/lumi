# Fix: Branch-Specific Commits Display

## Problem
Right panel'de her branch aynı commit'leri gösteriyor. Her branch için aynı `repoCommits` array'i pass ediliyor.

## Root Cause Analysis

### 1. Yanlış Data Structure
`useRepoStore.ts` commits'leri repo başına tutuyor, branch başına değil:
```typescript
commits: Map<string, Commit[]>  // Map<repoPath, Commit[]>
```

### 2. Aynı Commits Tüm Branch'lere Gidiyor
`CommitTree.tsx:98`:
```tsx
<BranchSection
  branch={branch}
  commits={repoCommits}  // AYNI array HER branch'e!
/>
```

### 3. Git Komutu Yanlış
`RepoManager.ts:80-83`:
```typescript
git.log({
  maxCount: 50,
  ...(branch && { from: branch })  // 'from' branch için YANLIŞ!
})
```
`from` option simple-git'te range için kullanılır (`from...to`), branch filtreleme için değil.

---

## Implementation Plan

### Step 1: Fix Git Command (RepoManager.ts)
**File:** `src/main/repo/RepoManager.ts`

`getCommits` metodunu düzelt - doğru simple-git syntax kullan:
```typescript
async getCommits(repoPath: string, branch?: string): Promise<Commit[]> {
  const git: SimpleGit = simpleGit(this.expandPath(repoPath))

  try {
    const options: Parameters<typeof git.log>[0] = { maxCount: 50 }

    // Branch spesifik log için doğru syntax
    if (branch) {
      const log = await git.log({ maxCount: 50, '--': [branch] })
      return log.all.map(...)
    }

    const log = await git.log(options)
    return log.all.map(...)
  } catch (error) {
    console.error('Failed to get commits:', error)
    return []
  }
}
```

### Step 2: Update Store Data Structure (useRepoStore.ts)
**File:** `src/renderer/stores/useRepoStore.ts`

Commits'i branch başına sakla:
```typescript
interface RepoState {
  repos: Repository[]
  commits: Map<string, Map<string, Commit[]>>  // Map<repoPath, Map<branchName, Commit[]>>
  branches: Map<string, Branch[]>

  loadCommits: (repoPath: string, branch: string) => Promise<void>
  loadAllBranchCommits: (repoPath: string) => Promise<void>
  getCommitsForBranch: (repoPath: string, branchName: string) => Commit[]
}
```

Store update:
```typescript
loadCommits: async (repoPath, branch) => {
  const commits = await window.api.getCommits(repoPath, branch)
  set((state) => {
    const newCommits = new Map(state.commits)
    const repoCommits = newCommits.get(repoPath) || new Map()
    repoCommits.set(branch, commits)
    newCommits.set(repoPath, repoCommits)
    return { commits: newCommits }
  })
},

loadAllBranchCommits: async (repoPath) => {
  const branches = get().branches.get(repoPath) || []
  await Promise.all(
    branches.map(b => get().loadCommits(repoPath, b.name))
  )
},

getCommitsForBranch: (repoPath, branchName) => {
  const repoCommits = get().commits.get(repoPath)
  return repoCommits?.get(branchName) || []
}
```

### Step 3: Update CommitTree.tsx
**File:** `src/renderer/components/RightSidebar/CommitTree.tsx`

Branch'ler yüklendikten sonra her branch için commits yükle:
```typescript
useEffect(() => {
  if (activeRepo) {
    loadBranches(activeRepo.path)
  }
}, [activeRepo, loadBranches])

// Branch'ler yüklendikten sonra commits'leri yükle
useEffect(() => {
  if (activeRepo && repoBranches.length > 0) {
    loadAllBranchCommits(activeRepo.path)
  }
}, [activeRepo, repoBranches, loadAllBranchCommits])
```

Refresh handler'ı güncelle:
```typescript
const handleRefresh = async () => {
  if (activeRepo) {
    setIsRefreshing(true)
    await loadBranches(activeRepo.path)
    await loadAllBranchCommits(activeRepo.path)
    setIsRefreshing(false)
  }
}
```

### Step 4: Update BranchSection Props
**File:** `src/renderer/components/RightSidebar/CommitTree.tsx`

Her branch'e kendi commits'ini pass et:
```tsx
{repoBranches.map((branch) => (
  <BranchSection
    key={branch.name}
    branch={branch}
    commits={getCommitsForBranch(activeRepo.path, branch.name)}
    isExpanded={expandedBranches.has(branch.name)}
    onToggle={() => toggleBranch(branch.name)}
  />
))}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/main/repo/RepoManager.ts` | Fix `getCommits` git command syntax |
| `src/renderer/stores/useRepoStore.ts` | Change commits Map structure, add helper methods |
| `src/renderer/components/RightSidebar/CommitTree.tsx` | Use branch-specific commits loading |

---

## Verification

1. Uygulamayı `npm run dev` ile başlat
2. Bir repo seç
3. Farklı branch'leri expand et
4. Her branch'in kendi commit history'sini gösterdiğini doğrula
5. Refresh butonunun doğru çalıştığını test et
6. Farklı repo'lar arası geçişte state'in doğru yönetildiğini kontrol et
