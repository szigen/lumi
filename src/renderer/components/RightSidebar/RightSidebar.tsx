import { motion } from 'framer-motion'
import CommitTree from './CommitTree'

export default function RightSidebar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="h-full"
    >
      <CommitTree />
    </motion.div>
  )
}
