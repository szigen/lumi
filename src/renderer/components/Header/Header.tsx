import { motion } from 'framer-motion'
import { Menu, GitBranch, Settings } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { IconButton } from '../ui'
import { Logo } from '../icons'
import RepoTab from './RepoTab'
import RepoSelector from './RepoSelector'

export default function Header() {
  const {
    openTabs,
    activeTab,
    setActiveTab,
    closeTab,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useAppStore()

  return (
    <header className="
      relative h-12
      bg-bg-secondary/80 backdrop-blur-glass
      border-b border-border-subtle
      flex items-center pr-3 gap-3
      overflow-visible
    " style={{ WebkitAppRegion: 'drag', paddingLeft: '88px' } as React.CSSProperties}>
      {/* Subtle bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      {/* Left Section - Menu & Logo */}
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <IconButton
          icon={<Menu />}
          onClick={toggleLeftSidebar}
          tooltip="Toggle sidebar"
          variant="ghost"
        />

        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="font-semibold text-text-primary text-sm tracking-tight">
            AI Orchestrator
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border-subtle" />

      {/* Center Section - Tabs */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {openTabs.map((tab, index) => (
          <motion.div
            key={tab}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15, delay: index * 0.03 }}
          >
            <RepoTab
              name={tab}
              isActive={tab === activeTab}
              onClick={() => setActiveTab(tab)}
              onClose={() => closeTab(tab)}
            />
          </motion.div>
        ))}
        <RepoSelector />
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border-subtle" />

      {/* Right Section - Actions */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <IconButton
          icon={<GitBranch />}
          onClick={toggleRightSidebar}
          tooltip="Toggle commits"
          variant="ghost"
        />

        <IconButton
          icon={<Settings />}
          tooltip="Settings"
          variant="ghost"
        />
      </div>
    </header>
  )
}
