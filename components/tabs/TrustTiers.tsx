'use client'

import { motion } from 'framer-motion'

type TrustWindow = 30 | 60 | 300

type TrustTiersProps = {
  selectedTier: TrustWindow
  onSelectTier: (tier: TrustWindow) => void
}

const TIERS: {
  id: TrustWindow
  name: string
  label: string
  duration: string
  proofsRate: string
  computeLabel: string
  computeLevel: number // 0-1 normalized
  description: string
}[] = [
  {
    id: 30,
    name: 'NEW CLIENT',
    label: '30 sec',
    duration: '30 seconds',
    proofsRate: 'Proofs/min: 2',
    computeLabel: 'HIGH',
    computeLevel: 0.85,
    description: 'Verify frequently for unknown counterparties.',
  },
  {
    id: 60,
    name: 'DEFAULT',
    label: '1 min',
    duration: '1 minute',
    proofsRate: 'Proofs/min: 1',
    computeLabel: 'MEDIUM',
    computeLevel: 0.50,
    description: 'Balanced verification cadence for typical usage.',
  },
  {
    id: 300,
    name: 'ESTABLISHED',
    label: '5 min',
    duration: '5 minutes',
    proofsRate: 'Proofs/hr: 12',
    computeLabel: 'LOW',
    computeLevel: 0.18,
    description: 'Minimal overhead for trusted long-term partners.',
  },
]

const BAR_COLORS = ['#FF6B35', '#00E5A0', 'rgba(0,229,160,0.4)']

export default function TrustTiers({ selectedTier, onSelectTier }: TrustTiersProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[#6B6A65]">
          Trust Tiers
        </span>
        <span className="font-mono text-[10px] text-[#6B6A65]">
          Merchant verification window
        </span>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-3 gap-3">
        {TIERS.map((tier) => {
          const isSelected = selectedTier === tier.id
          return (
            <motion.div
              key={tier.id}
              className={`card rounded-sm p-4 flex flex-col gap-3 cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#00E5A0] bg-[rgba(0,229,160,0.04)]'
                  : 'hover:border-[rgba(255,255,255,0.15)]'
              }`}
              style={{
                border: `1px solid ${isSelected ? '#00E5A0' : 'rgba(255,255,255,0.08)'}`,
              }}
              onClick={() => onSelectTier(tier.id)}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15 }}
            >
              {/* Tier name */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65] mb-1">
                  {tier.name}
                </div>
                <div className={`font-display text-xl font-bold ${isSelected ? 'text-[#00E5A0]' : 'text-[#E8E6DF]'}`}
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {tier.label}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-1.5 flex-1">
                <div className="font-mono text-[10px] text-[#6B6A65]">{tier.proofsRate}</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-[#6B6A65]">Compute:</span>
                  <span className={`font-mono text-[10px] ${
                    tier.computeLabel === 'HIGH' ? 'text-[#FF6B35]' :
                    tier.computeLabel === 'MEDIUM' ? 'text-[#E8E6DF]' :
                    'text-[#00E5A0]'
                  }`}>
                    {tier.computeLabel}
                  </span>
                </div>
              </div>

              {/* Select button */}
              <button
                className={`font-mono text-[10px] py-1.5 border rounded-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#00E5A0] text-[#00E5A0] bg-[rgba(0,229,160,0.08)]'
                    : 'border-[rgba(255,255,255,0.08)] text-[#6B6A65] hover:text-[#E8E6DF]'
                }`}
                onClick={(e) => { e.stopPropagation(); onSelectTier(tier.id) }}
              >
                {isSelected ? 'Selected ✓' : 'Select'}
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Compute comparison bar chart */}
      <div className="card rounded-sm p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65] mb-4">
          Off-chain compute overhead comparison
        </div>
        <div className="space-y-3">
          {TIERS.map((tier, i) => (
            <div key={tier.id} className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-[#6B6A65] w-24 shrink-0">{tier.name}</span>
              <div className="flex-1 h-4 bg-[rgba(255,255,255,0.04)] rounded-sm overflow-hidden relative">
                <motion.div
                  className="h-full rounded-sm absolute left-0 top-0"
                  style={{ background: BAR_COLORS[i] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${tier.computeLevel * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.1 }}
                />
              </div>
              <span className={`font-mono text-[10px] w-12 text-right shrink-0 ${
                tier.computeLabel === 'HIGH' ? 'text-[#FF6B35]' :
                tier.computeLabel === 'MEDIUM' ? 'text-[#E8E6DF]' :
                'text-[#00E5A0]'
              }`}>
                {tier.computeLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Key insight callout */}
      <div className="border border-[rgba(0,229,160,0.2)] bg-[rgba(0,229,160,0.03)] rounded-sm p-4">
        <p className="font-mono text-[11px] text-[#E8E6DF] leading-relaxed">
          <span className="text-[#00E5A0] block mb-1 uppercase tracking-widest text-[9px]">
            Key insight
          </span>
          The payer&apos;s payment granularity is <span className="text-[#00E5A0]">unaffected</span> by the
          merchant&apos;s verification window. 1,024 leaves remain 1,024 payment slots
          regardless of how often the merchant checks.
        </p>
      </div>

      {/* Active tier info */}
      <div className="flex items-center gap-2 font-mono text-[10px] text-[#6B6A65]">
        <span className="text-[#00E5A0]">→</span>
        <span>
          Active window: <span className="text-[#E8E6DF]">
            {TIERS.find(t => t.id === selectedTier)?.duration}
          </span>{' '}
          — proof checks propagate to Live Ticker automatically
        </span>
      </div>
    </div>
  )
}
