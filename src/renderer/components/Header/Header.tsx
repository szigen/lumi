import { Menu, GitBranch, Settings, Maximize2, Minus, Square, X } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'
import { Mascot } from '../icons'
import RepoTab from './RepoTab'
import RepoSelector from './RepoSelector'

export default function Header() {
  const {
    openTabs,
    activeTab,
    setActiveTab,
    closeTab,
    toggleLeftSidebar,
    toggleRightSidebar,
    openSettings,
    enterFocusMode
  } = useAppStore()

  const handleDoubleClick = () => {
    window.api.toggleMaximize()
  }

  return (
    <header className="header" onDoubleClick={handleDoubleClick}>
      <div className="header-left">
        <IconButton
          icon={<Menu size={18} />}
          onClick={toggleLeftSidebar}
          tooltip="Toggle sidebar"
        />
        <Mascot variant="app-icon" size={26} />
        <span className="app-title">{import.meta.env.DEV ? 'DEV' : 'Lumi'}</span>
      </div>

      <div className="header-center">
        {openTabs.map((tab) => (
          <RepoTab
            key={tab}
            name={tab}
            isActive={tab === activeTab}
            onClick={() => setActiveTab(tab)}
            onClose={() => closeTab(tab)}
          />
        ))}
        <RepoSelector />
      </div>

      <div className="header-right">
        <IconButton
          icon={<Maximize2 size={18} />}
          onClick={enterFocusMode}
          tooltip={`Focus Mode (${window.api.platform === 'darwin' ? '⌘⇧F' : 'Ctrl+Shift+F'})`}
        />
        <IconButton
          icon={<GitBranch size={18} />}
          onClick={toggleRightSidebar}
          tooltip="Toggle commits"
        />
        <IconButton
          icon={<Settings size={18} />}
          onClick={openSettings}
          tooltip="Settings"
        />
        {window.api.platform === 'linux' && (
          <div className="window-controls">
            <button className="window-controls__btn" onClick={() => window.api.minimizeWindow()}>
              <Minus size={14} />
            </button>
            <button className="window-controls__btn" onClick={() => window.api.toggleMaximize()}>
              <Square size={12} />
            </button>
            <button className="window-controls__btn window-controls__btn--close" onClick={() => window.api.closeWindow()}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
