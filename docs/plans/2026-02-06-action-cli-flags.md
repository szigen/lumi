# Action CLI Flags Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Action YAML schema'sına Claude CLI flag'leri (`systemPrompt`, `model`, `allowedTools`, `permissionMode`) ekleyerek her action'ın Claude'u özelleştirilmiş flag'lerle çalıştırabilmesini sağlamak.

**Architecture:** Mevcut YAML action schema'sına opsiyonel `claude` bloğu eklenir. ActionEngine, action execute ederken `write` step'lerindeki `claude` komutlarını parse edip, YAML'daki flag konfigürasyonunu CLI argümanlarına dönüştüren bir `buildClaudeCommand` utility fonksiyonu kullanır. System prompt gibi büyük değerler temp dosyaya yazılır, kısa flag'ler inline eklenir. Create-action prompt da bu yeni alanları bilecek şekilde güncellenir.

**Tech Stack:** TypeScript, js-yaml, node-pty, fs (temp file yazma)

---

### Task 1: Action type'larını genişlet — `claude` config bloğu ekle

**Files:**
- Modify: `src/shared/action-types.ts`

**Step 1: `ClaudeConfig` interface ve Action güncellemesini yaz**

```typescript
// src/shared/action-types.ts

export interface ClaudeConfig {
  /** Append custom text to Claude's default system prompt */
  appendSystemPrompt?: string
  /** Replace Claude's entire system prompt */
  systemPrompt?: string
  /** Model to use: 'sonnet', 'opus', 'haiku', or full model ID */
  model?: string
  /** Tools allowed without permission prompts (e.g. "Bash(git *)", "Read") */
  allowedTools?: string[]
  /** Tools completely disabled */
  disallowedTools?: string[]
  /** Restrict available tool set (e.g. "Bash,Read,Edit" or "" for none) */
  tools?: string
  /** Permission mode: 'plan', 'bypassPermissions' etc. */
  permissionMode?: string
  /** Max agentic turns (only works with -p print mode) */
  maxTurns?: number
}

export type ActionStep =
  | { type: 'write'; content: string }
  | { type: 'wait_for'; pattern: string; timeout?: number }
  | { type: 'delay'; ms: number }

export interface Action {
  id: string
  label: string
  icon: string
  scope: 'user' | 'project'
  claude?: ClaudeConfig
  steps: ActionStep[]
}
```

**Step 2: Commit**

```bash
git add src/shared/action-types.ts
git commit -m "feat: add ClaudeConfig interface to Action type"
```

---

### Task 2: `buildClaudeCommand` utility fonksiyonu oluştur

**Files:**
- Create: `src/main/action/build-claude-command.ts`

Bu fonksiyon bir `ClaudeConfig` alır ve orijinal `claude "prompt"` komutunu flag'lerle zenginleştirilmiş versiyona dönüştürür.

**Step 1: `buildClaudeCommand` fonksiyonunu yaz**

```typescript
// src/main/action/build-claude-command.ts

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { ClaudeConfig } from '../../shared/action-types'

const TEMP_DIR = path.join(os.tmpdir(), 'ai-orchestrator')

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }
}

/**
 * Takes a raw write step content (e.g. `claude "do something"\r`)
 * and injects CLI flags from ClaudeConfig before the prompt argument.
 *
 * Returns the modified command string.
 *
 * If the content does not start with `claude `, it is returned as-is
 * (shell commands like `git pull\r` are unaffected).
 */
export function buildClaudeCommand(content: string, config: ClaudeConfig): string {
  // Only transform lines that invoke claude
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('claude ')) {
    return content
  }

  const flags: string[] = []

  // System prompt — use temp file for long content
  if (config.systemPrompt) {
    ensureTempDir()
    const spFile = path.join(TEMP_DIR, `system-prompt-${Date.now()}.txt`)
    fs.writeFileSync(spFile, config.systemPrompt, 'utf-8')
    flags.push(`--system-prompt-file '${spFile}'`)
  }

  // Append system prompt — use temp file for long content
  if (config.appendSystemPrompt) {
    ensureTempDir()
    const aspFile = path.join(TEMP_DIR, `append-system-prompt-${Date.now()}.txt`)
    fs.writeFileSync(aspFile, config.appendSystemPrompt, 'utf-8')
    flags.push(`--append-system-prompt-file '${aspFile}'`)
  }

  // Model
  if (config.model) {
    flags.push(`--model ${config.model}`)
  }

  // Allowed tools
  if (config.allowedTools?.length) {
    for (const tool of config.allowedTools) {
      flags.push(`--allowedTools "${tool}"`)
    }
  }

  // Disallowed tools
  if (config.disallowedTools?.length) {
    for (const tool of config.disallowedTools) {
      flags.push(`--disallowedTools "${tool}"`)
    }
  }

  // Tools restriction
  if (config.tools !== undefined) {
    flags.push(`--tools "${config.tools}"`)
  }

  // Permission mode
  if (config.permissionMode) {
    flags.push(`--permission-mode ${config.permissionMode}`)
  }

  // Max turns
  if (config.maxTurns) {
    flags.push(`--max-turns ${config.maxTurns}`)
  }

  if (flags.length === 0) {
    return content
  }

  // Insert flags between `claude` and the rest of the command
  // e.g. `claude "prompt"\r` → `claude --model sonnet "prompt"\r`
  const flagStr = flags.join(' ')
  return content.replace(/^(\s*)claude /, `$1claude ${flagStr} `)
}
```

**Step 2: Commit**

```bash
git add src/main/action/build-claude-command.ts
git commit -m "feat: add buildClaudeCommand utility for CLI flag injection"
```

---

### Task 3: ActionEngine'i `ClaudeConfig` destekleyecek şekilde güncelle

**Files:**
- Modify: `src/main/action/ActionEngine.ts`

**Step 1: ActionEngine'de `write` step'lerini `buildClaudeCommand` ile dönüştür**

```typescript
// ActionEngine.ts — sadece değişen kısımlar:

import { buildClaudeCommand } from './build-claude-command'

// execute() method'unda write case'ini güncelle:
case 'write': {
  const cmd = action.claude
    ? buildClaudeCommand(step.content, action.claude)
    : step.content
  this.terminalManager.write(terminalId, cmd)
  break
}
```

Mevcut `case 'write':` bloğunu yukarıdaki ile değiştir. Diğer case'ler (wait_for, delay) değişmeden kalır.

**Step 2: Commit**

```bash
git add src/main/action/ActionEngine.ts
git commit -m "feat: integrate buildClaudeCommand into ActionEngine write steps"
```

---

### Task 4: ActionStore'da `claude` bloğunu YAML'dan parse et

**Files:**
- Modify: `src/main/action/ActionStore.ts`

**Step 1: `loadDir` method'undaki parse mantığını güncelle**

ActionStore.ts `loadDir` method'unda (satır 55-80), action object oluştururken `claude` alanını da oku:

```typescript
// loadDir içinde, actions.push bloğunu güncelle:
actions.push({
  id: parsed.id as string,
  label: parsed.label as string,
  icon: (parsed.icon as string) || 'Zap',
  scope,
  claude: parsed.claude as Action['claude'],
  steps: parsed.steps as Action['steps']
})
```

Tek değişiklik: `claude: parsed.claude as Action['claude']` satırının eklenmesi.

**Step 2: Commit**

```bash
git add src/main/action/ActionStore.ts
git commit -m "feat: parse claude config block from action YAML files"
```

---

### Task 5: Default action'ları CLI flag'leriyle zenginleştir

**Files:**
- Modify: `default-actions/update-claude-md.yaml`
- Modify: `default-actions/run-tests.yaml`
- Modify: `default-actions/git-pull.yaml`
- Modify: `default-actions/install-deps.yaml`

**Step 1: update-claude-md.yaml'a appendSystemPrompt ekle**

```yaml
id: update-claude-md
label: Update CLAUDE.md
icon: FileEdit
scope: user
claude:
  appendSystemPrompt: >
    Focus exclusively on CLAUDE.md maintenance. Read the existing CLAUDE.md first,
    then analyze recent git changes. Update file paths, command references, and
    architecture notes. Remove any dead references. Keep the format consistent.
  allowedTools:
    - "Read"
    - "Edit"
    - "Bash(git log *)"
    - "Bash(git diff *)"
    - "Glob"
    - "Grep"
steps:
  - type: write
    content: "claude \"Analyze all changes since your last CLAUDE.md revision. Clean up dead references and update CLAUDE.md to accurately reflect the current codebase.\"\r"
```

**Step 2: run-tests.yaml'a model ekle**

```yaml
id: run-tests
label: Run Tests
icon: TestTube
scope: user
claude:
  model: sonnet
  allowedTools:
    - "Bash(npm test *)"
    - "Bash(npx *)"
    - "Bash(pytest *)"
    - "Read"
    - "Glob"
    - "Grep"
steps:
  - type: write
    content: "claude \"Run the test suite for this project. Use the appropriate test runner (npm test, pytest, etc).\"\r"
```

**Step 3: git-pull.yaml'a allowedTools ekle**

```yaml
id: git-pull
label: Git Pull
icon: GitBranch
scope: user
claude:
  model: sonnet
  allowedTools:
    - "Bash(git *)"
    - "Read"
steps:
  - type: write
    content: "claude \"Pull the latest changes from the remote repository and resolve any conflicts.\"\r"
```

**Step 4: install-deps.yaml'a allowedTools ekle**

```yaml
id: install-deps
label: Install Deps
icon: Package
scope: user
claude:
  model: sonnet
  allowedTools:
    - "Bash(npm *)"
    - "Bash(yarn *)"
    - "Bash(pnpm *)"
    - "Bash(pip *)"
    - "Bash(cargo *)"
    - "Read"
    - "Glob"
steps:
  - type: write
    content: "claude \"Install all dependencies for this project using the appropriate package manager.\"\r"
```

**Step 5: Commit**

```bash
git add default-actions/
git commit -m "feat: add claude config blocks to default actions"
```

---

### Task 6: Create-action prompt'u yeni YAML alanları hakkında güncelle

**Files:**
- Modify: `src/main/action/create-action-prompt.ts`

**Step 1: CREATE_ACTION_PROMPT'a `claude` config bloku dokümantasyonu ekle**

YAML Schema bölümünden sonra, Common Patterns'dan önce, şu bölümü ekle:

```
# Claude CLI Config (optional)

Actions can include an optional \`claude\` block to customize how Claude CLI behaves:

claude:
  appendSystemPrompt: 'Extra instructions appended to Claude default prompt'
  systemPrompt: 'Replaces Claude entire system prompt (use rarely)'
  model: sonnet | opus | haiku
  allowedTools:
    - "Read"
    - "Edit"
    - "Bash(git *)"
  disallowedTools:
    - "Bash(rm *)"
  tools: "Bash,Read,Edit"
  permissionMode: plan
  maxTurns: 10

**Guidelines:**
- Prefer \`appendSystemPrompt\` over \`systemPrompt\` — it keeps Claude defaults while adding context.
- Use \`model: sonnet\` for fast/simple tasks, omit for complex ones (defaults to user setting).
- Use \`allowedTools\` to auto-approve safe tools (prevents permission prompts).
- Use \`disallowedTools\` to block dangerous tools for safety.
- Only use \`systemPrompt\` (full replace) when you need complete control over Claude behavior.
```

Ayrıca Common Patterns'daki Pattern 1'i flag'li versiyon olarak güncelle:

```
## Pattern 1: Single Claude command with config

claude:
  model: sonnet
  appendSystemPrompt: 'Focus only on linting. Do not refactor or change logic.'
  allowedTools:
    - "Bash(npx eslint *)"
    - "Read"
    - "Edit"
steps:
  - type: write
    content: 'claude "Run the linter, fix all auto-fixable issues, then report remaining warnings with file locations."\r'
```

**Step 2: Commit**

```bash
git add src/main/action/create-action-prompt.ts
git commit -m "feat: update create-action prompt with claude config documentation"
```

---

### Task 7: handlers.ts — create-action flow'u `--append-system-prompt-file` kullanacak şekilde güncelle

**Files:**
- Modify: `src/main/ipc/handlers.ts`

**Step 1: ACTIONS_CREATE_NEW handler'ını güncelle**

Mevcut create-action flow zaten temp dosyaya yazıp `claude "$(cat '...')"` kullanıyor. Bunu `--append-system-prompt-file` ile daha temiz yapabiliriz:

```typescript
ipcMain.handle(IPC_CHANNELS.ACTIONS_CREATE_NEW, async (_, repoPath: string) => {
  const promptPath = path.join(os.tmpdir(), 'ai-orchestrator-create-action-prompt.txt')
  fs.writeFileSync(promptPath, CREATE_ACTION_PROMPT, 'utf-8')

  const action: import('../../shared/action-types').Action = {
    id: '__create-action',
    label: 'Create Action',
    icon: 'Plus',
    scope: 'user',
    claude: {
      appendSystemPrompt: CREATE_ACTION_PROMPT
    },
    steps: [
      {
        type: 'write',
        content: `claude "Help me create a new Quick Action. Ask me what I want to automate."\r`
      }
    ]
  }
  return actionEngine!.execute(action, repoPath)
})
```

Bu değişiklikle:
- `CREATE_ACTION_PROMPT` artık system prompt olarak gider (daha doğru kullanım)
- User prompt kısa ve öz kalır
- Temp dosya mekanizması `buildClaudeCommand` tarafından otomatik yönetilir

**Step 2: `promptPath` ve eski `fs.writeFileSync` satırlarını temizle**

Artık prompt file'ı `buildClaudeCommand` yönettiği için handler'daki temp file yazma kodu kaldırılabilir:

```typescript
ipcMain.handle(IPC_CHANNELS.ACTIONS_CREATE_NEW, async (_, repoPath: string) => {
  const action: import('../../shared/action-types').Action = {
    id: '__create-action',
    label: 'Create Action',
    icon: 'Plus',
    scope: 'user',
    claude: {
      appendSystemPrompt: CREATE_ACTION_PROMPT
    },
    steps: [
      {
        type: 'write',
        content: `claude "Help me create a new Quick Action. Ask me what I want to automate."\r`
      }
    ]
  }
  return actionEngine!.execute(action, repoPath)
})
```

**Step 3: Commit**

```bash
git add src/main/ipc/handlers.ts
git commit -m "refactor: use appendSystemPrompt for create-action flow"
```

---

### Task 8: Build & typecheck

**Step 1: TypeScript type check**

Run: `npm run typecheck`
Expected: No errors

**Step 2: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing ones)

---

### Task 9: Manual test — dev modda çalıştırıp action'ları test et

**Step 1: Dev mode başlat**

Run: `npm run dev`

**Step 2: Test senaryoları**

1. Sidebar'da "Run Tests" action'ına tıkla → terminalde `claude --model sonnet --allowedTools "Bash(npm test *)" ... "Run the test suite..."` komutunun oluştuğunu gör
2. "Update CLAUDE.md" action'ına tıkla → `--append-system-prompt-file` flag'inin eklendiğini gör
3. "+" (Create Action) butonuna tıkla → `--append-system-prompt-file` ile system prompt'un gönderildiğini, user prompt'un kısa kaldığını gör
4. `claude` bloğu olmayan eski YAML action'ların hala düzgün çalıştığını doğrula (backward compat)

---

## Özet: Değişen/Eklenen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/shared/action-types.ts` | `ClaudeConfig` interface + `Action.claude` alanı |
| `src/main/action/build-claude-command.ts` | **YENİ** — CLI flag injection utility |
| `src/main/action/ActionEngine.ts` | `write` step'lerinde `buildClaudeCommand` kullanımı |
| `src/main/action/ActionStore.ts` | YAML'dan `claude` bloğunu parse etme |
| `src/main/action/create-action-prompt.ts` | Prompt'a `claude` config dokümantasyonu ekleme |
| `src/main/ipc/handlers.ts` | create-action flow'u `appendSystemPrompt` kullanımına geçirme |
| `default-actions/*.yaml` (4 dosya) | Her default action'a `claude` config bloğu ekleme |
