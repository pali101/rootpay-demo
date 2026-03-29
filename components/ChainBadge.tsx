'use client'

import { motion } from 'framer-motion'

export default function ChainBadge() {
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-[#6B6A65]">
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] inline-block"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span>Calibration Testnet</span>
    </div>
  )
}
