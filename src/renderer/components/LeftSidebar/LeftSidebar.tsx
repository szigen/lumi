import { motion } from 'framer-motion'
import SessionList from './SessionList'
import ProjectContext from './ProjectContext'
import QuickActions from './QuickActions'

export default function LeftSidebar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="h-full flex flex-col p-3 overflow-y-auto"
    >
      <SessionList />
      <ProjectContext />
      <QuickActions />
    </motion.div>
  )
}
