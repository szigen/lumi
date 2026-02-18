# Action Auto-Discovery

## Context

Lumi terminallerde kullanici komutlarini/promptlarini izleyemiyor ve tekrarlayan kaliplari tespit edemiyor. Kullanicilar ayni komut dizilerini gunlerce tekrar yaziyor ama bunlari otomatik action haline getirmenin bir yolu yok. Bu ozellik, terminal kullanimini sessizce gozlemleyerek tekrarlayan kaliplari tespit edecek ve YAML action onerileri uretecek. Ogrenilenler context'e enjekte edilmez — YAML dosyalarina "derlenir", boylece context sismez ve user'a bagimlilik minimumda kalir.

## Mimari Ozet

```
User terminal'e yazar → CommandCapture yakalar → SessionRecorder diske yazar
                                                         ↓
User "Discover" tiklar → DiscoveryEngine session history'yi toplar
                                                         ↓
                         Claude analiz eder → ~/.lumi/suggestions/*.yaml
                                                         ↓
                         SuggestionStore izler → UI'da Accept/Dismiss kartlari gosterir
```

---

## Phase 1: Command Capture

### 1.1 TerminalManager'a input event ekle

**Dosya:** `src/main/terminal/TerminalManager.ts`

`write()` metodunda, PTY'ye yazmadan once `input` event'i emit et:

```typescript
write(terminalId: string, data: string): boolean {
  const terminal = this.terminals.get(terminalId)
  if (!terminal) return false
  this.emit('input', { terminalId, data })  // YENi
  terminal.pty.write(data)
  return true
}
```

Ayrica `onExit` ve `kill()` icinde repoPath bilgisini exit event'ine ekle (SessionRecorder'in ihtiyaci var):

```typescript
// onExit handler'inda:
ptyProcess.onExit(({ exitCode }) => {
  const terminal = this.terminals.get(id)
  window.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id, exitCode)
  this.terminals.delete(id)
  this.notificationManager.removeTerminal(id)
  this.emit('exit', { terminalId: id, exitCode, repoPath: terminal?.repoPath })
})

// kill() metodunda:
kill(terminalId: string): boolean {
  const terminal = this.terminals.get(terminalId)
  if (!terminal) return false
  const repoPath = terminal.repoPath
  terminal.pty.kill()
  this.terminals.delete(terminalId)
  this.notificationManager.removeTerminal(terminalId)
  this.emit('exit', { terminalId, exitCode: -1, repoPath })
  return true
}
```

### 1.2 CommandCapture olustur

**Yeni dosya:** `src/main/discovery/CommandCapture.ts`

Terminal'e yazilan raw keystroke'lari isler, komutlari cikarir.

**Sorumluluklar:**
- Her terminal icin line buffer tutar
- `\r` veya `\n` goruldugunde komutu tamamlanmis sayar
- `\x7f` (backspace) son karakteri siler
- `\x03` (Ctrl+C) buffer'i temizler, kaydetmez
- `\x1b[...` (escape sequences - arrow keys) `uncertain` olarak isaretler
- Bos veya tek karakterli komutlari filtreler

**Interface:**
```typescript
interface CapturedCommand {
  command: string
  timestamp: number
  terminalId: string
}
```

**Metodlar:**
- `processInput(terminalId, data)` — her write event'inde cagirilir
- `drain(terminalId)` — terminal kapanirken tum komutlari dondurur ve temizler

---

## Phase 2: Session Persistence

### 2.1 SessionRecorder olustur

**Yeni dosya:** `src/main/discovery/SessionRecorder.ts`

Terminal kapandiginda komut gecmisini diske yazar.

**Storage:** `~/.lumi/session-history/YYYY-MM-DD/<repoName>_<id-prefix>.json`

**Schema:**
```typescript
interface SessionRecord {
  id: string
  repoPath: string
  repoName: string
  commands: string[]
  startedAt: string
  endedAt: string
  actionId?: string     // action tarafindan tetiklendiyse
  commandCount: number
}
```

**Boyut kontrolu:**
- Session basina max 50 komut (eskiler truncate)
- 30 gun sonrasi otomatik prune (startup'ta calisir)
- Sifir komutlu session'lar kaydedilmez
- `uncertain` komutlar varsayilan olarak haric tutulur

**Metodlar:**
- `trackStart(terminalId)` — spawn'da cagirilir
- `saveSession(record)` — terminal exit'te cagirilir
- `getRecentSessions(days = 7)` — son N gunun session'larini dondurur
- `getSessionsByRepo(repoPath, days)` — repo bazli filtreleme
- `pruneOldSessions(maxDays = 30)` — eski kayitlari temizler

### 2.2 handlers.ts'e baglama

**Dosya:** `src/main/ipc/handlers.ts`

`setupIpcHandlers()` icinde CommandCapture ve SessionRecorder'i olustur, TerminalManager event'lerine bagla:

```typescript
const commandCapture = new CommandCapture()
const sessionRecorder = new SessionRecorder()

terminalManager.on('input', ({ terminalId, data }) => {
  commandCapture.processInput(terminalId, data)
})

terminalManager.on('exit', ({ terminalId, repoPath }) => {
  const commands = commandCapture.drain(terminalId)
  if (commands.length > 0) {
    sessionRecorder.saveSession({ ... })
  }
})
```

> Bu noktada sistem sessizce calismaya baslar — kullanici fark etmez, session history birikiyor.

---

## Phase 3: Discovery Engine

### 3.1 Discovery prompt olustur

**Yeni dosya:** `src/main/discovery/discovery-prompt.ts`

`buildDiscoveryPrompt(sessions, existingActions)` fonksiyonu:

**Prompt'a dahil edilenler:**
1. En sik kullanilan komutlar (top 30, session sayisiyla)
2. Repo bazli son 5 session, her birinde son 20 komut
3. Mevcut action listesi (duplikasyon onleme)
4. YAML action schemasi ve kurallar (create-action-prompt'tan alinir)

**Prompt kurallari:**
- Max 5 oneri uret
- En az 3+ tekrar gorulmus kaliplar icin oner
- Mevcut action'lari duplike etme
- Her oneriyi `~/.lumi/suggestions/` dizinine yaz
- Her YAML'da ekstra `reason` alani: neden onerildigini 1 cumleyle acikla
- Dosyalari direkt olustur, onay isteme

**Prompt boyut kontrolu:** ~4KB limit — 30 top komut + repo basina 5 session + session basina 20 komut

### 3.2 DiscoveryEngine olustur

**Yeni dosya:** `src/main/discovery/DiscoveryEngine.ts`

`discover(repoPath?)` metodu:
1. SessionRecorder'dan son 7 gunun session'larini al
2. ActionStore'dan mevcut action'lari al
3. `buildDiscoveryPrompt()` ile prompt olustur
4. Prompt'u temp dosyaya yaz (create-action pattern'i)
5. ActionEngine uzerinden Claude terminal'i spawn et
6. SpawnResult dondur (UI terminal olarak gosterir)

### 3.3 SuggestionStore olustur

**Yeni dosya:** `src/main/discovery/SuggestionStore.ts`

`~/.lumi/suggestions/` dizinini izler.

**Interface:**
```typescript
interface ActionSuggestion extends Action {
  reason: string
  suggestedAt: string
}
```

**Metodlar:**
- `getSuggestions()` — tum onerileri dondurur
- `accept(id, scope, repoPath?)` — `reason` alanini cikarip actions/ dizinine tasir
- `dismiss(id)` — oneriyi siler
- `setOnChange(callback)` — dosya degisikliklerinde bildirir
- 7 gun sonrasi otomatik prune

---

## Phase 4: IPC & Preload

### 4.1 IPC channel'lari ekle

**Dosya:** `src/shared/ipc-channels.ts`

```typescript
// Discovery operations
DISCOVERY_TRIGGER: 'discovery:trigger',
DISCOVERY_SUGGESTIONS: 'discovery:suggestions',
DISCOVERY_ACCEPT: 'discovery:accept',
DISCOVERY_DISMISS: 'discovery:dismiss',
DISCOVERY_SUGGESTIONS_CHANGED: 'discovery:suggestions-changed',
DISCOVERY_SESSION_COUNT: 'discovery:session-count',
```

### 4.2 ActionSuggestion type ekle

**Dosya:** `src/shared/action-types.ts`

```typescript
export interface ActionSuggestion extends Action {
  reason: string
  suggestedAt: string
}
```

### 4.3 Preload API ekle

**Dosya:** `src/preload/index.ts`

```typescript
triggerDiscovery: (repoPath?: string) =>
  invokeIpc<SpawnResult | null>(IPC_CHANNELS.DISCOVERY_TRIGGER, repoPath),
getSuggestions: () =>
  invokeIpc<ActionSuggestion[]>(IPC_CHANNELS.DISCOVERY_SUGGESTIONS),
acceptSuggestion: (id: string, scope: 'user' | 'project', repoPath?: string) =>
  invokeIpc<boolean>(IPC_CHANNELS.DISCOVERY_ACCEPT, id, scope, repoPath),
dismissSuggestion: (id: string) =>
  invokeIpc<boolean>(IPC_CHANNELS.DISCOVERY_DISMISS, id),
getSessionCount: (repoPath?: string) =>
  invokeIpc<number>(IPC_CHANNELS.DISCOVERY_SESSION_COUNT, repoPath),
onSuggestionsChanged: (callback: () => void) =>
  createIpcListener<[]>(IPC_CHANNELS.DISCOVERY_SUGGESTIONS_CHANGED, callback),
```

### 4.4 IPC handler'lari ekle

**Dosya:** `src/main/ipc/handlers.ts`

SuggestionStore ve DiscoveryEngine'i olustur, 5 yeni `ipcMain.handle` ekle (trigger, suggestions, accept, dismiss, session-count). SuggestionStore onChange'de `DISCOVERY_SUGGESTIONS_CHANGED` event'i gonder.

---

## Phase 5: UI

### 5.1 ActionSuggestions componenti

**Yeni dosya:** `src/renderer/components/LeftSidebar/ActionSuggestions.tsx`

QuickActions ile ayni pattern'de, LeftSidebar'a eklenir.

**Icerik:**
- Section header: Lightbulb icon + "Suggestions" + count badge
- "Discover" butonu (Search icon) — minimum 3 session gerektirir
- Session sayaci: "2/3 sessions recorded" (yetersizse)
- Oneri kartlari: icon + label + reason + Accept/Dismiss butonlari
- Accept: yesil check — action'i kabul et, actions/ dizinine tasi
- Dismiss: kirmizi X — oneriyi sil
- Framer Motion animasyonlar (mevcut component pattern'leri)

### 5.2 LeftSidebar'a ekle

**Dosya:** `src/renderer/components/LeftSidebar/LeftSidebar.tsx`

```tsx
<SessionList />
<ProjectContext />
<ActionSuggestions />  {/* YENi — QuickActions'in ustunde */}
<QuickActions />
```

### 5.3 CSS ekle

**Dosya:** `src/renderer/styles/globals.css`

Suggestion card stilleri — mevcut tasarim diline uygun (glass-morphism, purple accent, dark theme).

---

## Dosya Ozeti

### Yeni dosyalar (6):
1. `src/main/discovery/CommandCapture.ts`
2. `src/main/discovery/SessionRecorder.ts`
3. `src/main/discovery/DiscoveryEngine.ts`
4. `src/main/discovery/discovery-prompt.ts`
5. `src/main/discovery/SuggestionStore.ts`
6. `src/renderer/components/LeftSidebar/ActionSuggestions.tsx`

### Degistirilecek dosyalar (6):
1. `src/main/terminal/TerminalManager.ts` — input event + exit repoPath
2. `src/main/ipc/handlers.ts` — yeni manager'lar + 5 IPC handler
3. `src/shared/ipc-channels.ts` — 6 yeni channel
4. `src/shared/action-types.ts` — ActionSuggestion interface
5. `src/preload/index.ts` — 6 yeni API metodu
6. `src/renderer/components/LeftSidebar/LeftSidebar.tsx` — ActionSuggestions import

---

## Uygulama Sirasi

1. `TerminalManager.ts` degisiklikleri (temel)
2. `CommandCapture.ts` olustur
3. `SessionRecorder.ts` olustur
4. `ipc-channels.ts` + `action-types.ts` type'lar
5. `handlers.ts`'e CommandCapture + SessionRecorder bagla → **Bu noktada session kaydi baslar**
6. `discovery-prompt.ts` olustur
7. `DiscoveryEngine.ts` + `SuggestionStore.ts` olustur
8. `handlers.ts`'e discovery IPC handler'lari ekle
9. `preload/index.ts` API metodlari
10. `ActionSuggestions.tsx` UI componenti
11. `LeftSidebar.tsx` guncelle
12. CSS stilleri ekle

---

## Dogrulama

1. `npm run typecheck` — tip hatalari yok
2. `npm run dev` ile uygulamayi baslat
3. Bir repo ac, 3-4 terminal session'i olustur, cesitli komutlar yaz
4. Terminal'leri kapat, `~/.lumi/session-history/` dizininde JSON dosyalari olustuunu dogrula
5. "Discover" butonuna tikla, Claude terminal'inin acilip analiz yaptigini gor
6. `~/.lumi/suggestions/` dizininde YAML dosyalari olustuunu dogrula
7. UI'da oneri kartlarinin gorundugunu, Accept/Dismiss calistigini dogrula
8. Accept edilen action'in QuickActions'ta gorundugunu dogrula
