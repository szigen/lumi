import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Folder, TerminalSquare, Palette, Keyboard } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { DEFAULT_CONFIG } from '../../../shared/constants'
import type { Config, UIState } from '../../../shared/types'
import GeneralSection from './GeneralSection'
import TerminalSection from './TerminalSection'
import AppearanceSection from './AppearanceSection'
import ShortcutsSection from './ShortcutsSection'

type SectionId = 'general' | 'terminal' | 'appearance' | 'shortcuts'

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General', icon: <Folder size={16} /> },
  { id: 'terminal', label: 'Terminal', icon: <TerminalSquare size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
]

export default function SettingsModal() {
  const { settingsOpen, closeSettings, setAiProvider } = useAppStore()
  const [activeSection, setActiveSection] = useState<SectionId>('general')
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG)
  const [uiDefaults, setUiDefaults] = useState<Pick<UIState, 'leftSidebarOpen' | 'rightSidebarOpen'>>({
    leftSidebarOpen: true,
    rightSidebarOpen: false,
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load config when modal opens
  useEffect(() => {
    if (!settingsOpen) return
    const load = async () => {
      const [loadedConfig, loadedUI] = await Promise.all([
        window.api.getConfig(),
        window.api.getUIState(),
      ])
      const cfg = { ...DEFAULT_CONFIG, ...loadedConfig } as Config
      setConfig(cfg)
      setUiDefaults({
        leftSidebarOpen: (loadedUI as UIState)?.leftSidebarOpen ?? true,
        rightSidebarOpen: (loadedUI as UIState)?.rightSidebarOpen ?? false,
      })
      setHasChanges(false)
    }
    load()
  }, [settingsOpen])

  // Escape key to close
  useEffect(() => {
    if (!settingsOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [settingsOpen, closeSettings])

  const handleConfigChange = useCallback((updates: Partial<Config>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  const handleUIChange = useCallback((updates: Partial<Pick<UIState, 'leftSidebarOpen' | 'rightSidebarOpen'>>) => {
    setUiDefaults((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.api.setConfig(config)
      await window.api.setUIState(uiDefaults)
      setAiProvider(config.aiProvider)
      setHasChanges(false)
      closeSettings()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          className="settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeSettings}
        >
          <motion.div
            className="settings-modal"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal__header">
              <h2 className="settings-modal__title">Settings</h2>
              <button className="settings-modal__close" onClick={closeSettings}>
                <X size={16} />
              </button>
            </div>

            <div className="settings-modal__body">
              <nav className="settings-nav">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    className={`settings-nav__item ${activeSection === section.id ? 'settings-nav__item--active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    {section.icon}
                    <span>{section.label}</span>
                  </button>
                ))}
              </nav>

              <div className="settings-content">
                {activeSection === 'general' && (
                  <GeneralSection config={config} onChange={handleConfigChange} />
                )}
                {activeSection === 'terminal' && (
                  <TerminalSection config={config} onChange={handleConfigChange} />
                )}
                {activeSection === 'appearance' && (
                  <AppearanceSection uiDefaults={uiDefaults} onChange={handleUIChange} />
                )}
                {activeSection === 'shortcuts' && <ShortcutsSection />}
              </div>
            </div>

            <div className="settings-modal__footer">
              <button className="settings-cancel-btn" onClick={closeSettings}>
                Cancel
              </button>
              <button
                className="settings-save-btn"
                disabled={!hasChanges || saving}
                onClick={handleSave}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
