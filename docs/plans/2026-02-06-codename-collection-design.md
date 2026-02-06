# Terminal Codename Collection System

## Overview

Terminal'lere spawn'da verilen rastgele isimleri (codename) takip eden bir koleksiyon sistemi. 50 adjective x 50 noun = 2500 kombinasyon. Kullanici terminal actikca yeni kombinasyonlari "kesfeder", progress bar ile ilerleme takip edilir.

## UI

### CollectionProgress Widget
- Konum: Sol sidebar, session list'in hemen ustunde
- Icerik: Progress bar + "47 / 2500" sayac
- Yeni kesif oldugunda progress bar'da hafif pulse animasyonu
- 2500/2500 tamamlandiginda confetti animasyonu + kalici "COMPLETED" rozeti

### Session List'te NEW Badge
- Ilk kez gorulen kombinasyon: ismin yaninda `NEW` badge + kisa sparkle efekti
- Tekrar kombinasyon: isim normal gorunur, badge yok

## Data Flow

1. Terminal spawn → `generateCodename()` isim uretir
2. Main process: isim `discoveredCodenames` Set'inde var mi kontrol edilir
3. Yeni ise → Set'e eklenir, diske persist edilir, renderer'a `isNew: true` gonderilir
4. Tekrar ise → renderer'a `isNew: false` gonderilir
5. Renderer: `isNew` degerine gore badge gosterir/gostermez, progress gunceller

## Persistence

- ConfigManager uzerinden `~/.ai-orchestrator/config.json` icinde saklanir
- Format: `discoveredCodenames: string[]` (orn. `["brave-alpaca", "swift-dragon", ...]`)
- Uygulama acilisinda yuklenir, her yeni kesiste guncellenir

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|-----------|
| `src/main/terminal/TerminalManager.ts` | Spawn'da discovered kontrolu, `isNew` flag eklenmesi |
| `src/main/config/ConfigManager.ts` | `discoveredCodenames` persist/load |
| `src/main/ipc/handlers.ts` | Collection data icin IPC handler |
| `src/shared/types.ts` | `SpawnResult`'a `isNew` eklenmesi |
| `src/shared/ipc-channels.ts` | Yeni IPC channel |
| `src/preload/index.ts` | Yeni API expose |
| `src/renderer/components/LeftSidebar/` | `CollectionProgress` widget, `NEW` badge |
| `src/renderer/stores/useTerminalStore.ts` | `isNew` tracking |

## Completion Celebration

- 2500/2500'e ulasildiginda ekranda confetti animasyonu patlar
- Progress widget'ta "COMPLETED" rozeti kalici olarak gorunur
- `canvas-confetti` veya basit CSS animasyonu ile implement edilebilir
