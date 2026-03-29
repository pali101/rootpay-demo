'use client'

import { motion } from 'framer-motion'

type StatCardProps = {
  label: string
  value: string | number
  subLabel?: string
  accent?: 'emerald' | 'coral' | 'default'
  large?: boolean
  flash?: boolean
}

export default function StatCard({
  label,
  value,
  subLabel,
  accent = 'default',
  large = false,
  flash = false,
}: StatCardProps) {
  const accentColor =
    accent === 'emerald' ? '#00E5A0' :
    accent === 'coral' ? '#FF6B35' :
    '#E8E6DF'

  return (
    <div className="card rounded-sm p-3 flex flex-col gap-1 min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65] truncate">
        {label}
      </span>
      <motion.span
        className={`font-mono ${large ? 'text-2xl' : 'text-xl'} font-medium leading-none tabular-nums`}
        style={{ color: accentColor }}
        animate={flash ? {
          color: ['#E8E6DF', '#FF6B35', '#E8E6DF', '#FF6B35', '#FF6B35'],
          textShadow: ['none', '0 0 20px rgba(255,107,53,0.9)', 'none', '0 0 20px rgba(255,107,53,0.9)', '0 0 8px rgba(255,107,53,0.4)'],
        } : {}}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        {value}
      </motion.span>
      {subLabel && (
        <span className="font-mono text-[10px] text-[#6B6A65] truncate">{subLabel}</span>
      )}
    </div>
  )
}
