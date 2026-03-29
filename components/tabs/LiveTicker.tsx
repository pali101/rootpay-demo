'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StatCard from '../StatCard'
import type { PaymentEvent, TickerSpeed } from '@/hooks/useTicker'

type LiveTickerProps = {
  events: PaymentEvent[]
  running: boolean
  speed: TickerSpeed
  leafIndex: number
  proofsVerified: number
  filEarned: string
  onStart: () => void
  onStop: () => void
  onReset: () => void
  onSpeedChange: (s: TickerSpeed) => void
  onCopyProof?: () => string | null  // returns JSON string or null if not ready
}

const SPEEDS: TickerSpeed[] = ['slow', 'normal', 'fast']

export default function LiveTicker({
  events,
  running,
  speed,
  leafIndex,
  proofsVerified,
  filEarned,
  onStart,
  onStop,
  onReset,
  onSpeedChange,
  onCopyProof,
}: LiveTickerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyProof = () => {
    if (!onCopyProof) return
    const json = onCopyProof()
    if (!json) return
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Leaf Index" value={leafIndex.toLocaleString('en-US')} accent="default" />
        <StatCard label="USDFC Earned" value={filEarned} subLabel="USDFC" accent="emerald" />
        <StatCard label="Proofs Verified" value={proofsVerified} accent="default" />
        <StatCard label="Chain Txs" value="0" accent="coral" />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!running ? (
          <button
            className="btn-primary px-5 py-2 text-sm"
            onClick={onStart}
            disabled={leafIndex >= 1023}
          >
            ▶ Start Session
          </button>
        ) : (
          <button
            className="btn-secondary px-5 py-2 text-sm border-[#FF6B35] text-[#FF6B35] hover:bg-[rgba(255,107,53,0.08)]"
            onClick={onStop}
          >
            ■ Stop
          </button>
        )}
        <button
          className="btn-secondary px-3 py-2 text-xs"
          onClick={onReset}
          disabled={running}
        >
          Reset
        </button>

        {/* Copy proof */}
        {onCopyProof && leafIndex > 0 && (
          <button
            onClick={handleCopyProof}
            className={`font-mono text-[10px] px-3 py-1.5 border rounded-sm transition-all cursor-pointer ${
              copied
                ? 'border-[#00E5A0] text-[#00E5A0] bg-[rgba(0,229,160,0.06)]'
                : 'border-[rgba(255,255,255,0.15)] text-[#6B6A65] hover:text-[#E8E6DF] hover:border-[rgba(255,255,255,0.3)]'
            }`}
          >
            {copied ? '✓ Copied' : '⎘ Copy Proof'}
          </button>
        )}

        {/* Speed control */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-[#6B6A65] mr-1">Speed:</span>
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`font-mono text-[10px] px-2 py-1 border rounded-sm transition-all cursor-pointer ${
                speed === s
                  ? 'border-[#00E5A0] text-[#00E5A0] bg-[rgba(0,229,160,0.06)]'
                  : 'border-[rgba(255,255,255,0.08)] text-[#6B6A65] hover:text-[#E8E6DF]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Event feed */}
      <div className="card rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] w-20">Time</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] flex-1">CID</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] w-28">Byte Range</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] w-12 text-right">Leaf</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] w-16 text-right">Status</span>
        </div>

        {/* Rows */}
        <div className="overflow-hidden" style={{ minHeight: '280px' }}>
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <div className="text-center">
                {running ? (
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="font-mono text-xs text-[#6B6A65]"
                  >
                    Waiting for payments...
                  </motion.div>
                ) : (
                  <div className="font-mono text-xs text-[#6B6A65]">
                    Press ▶ Start Session to begin
                  </div>
                )}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {events.map(event => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    enter: { duration: 0.2, ease: 'easeOut' },
                    exit: { duration: 0.15 },
                  }}
                  className="flex items-center gap-3 px-3 py-1.5 border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                >
                  <span className="font-mono text-[10px] text-[#6B6A65] w-20 shrink-0 tabular-nums">
                    {event.timestamp}
                  </span>
                  <span className="font-mono text-[10px] text-[#E8E6DF] flex-1 truncate">
                    {event.cid.slice(0, 16)}…
                  </span>
                  <span className="font-mono text-[10px] text-[#6B6A65] w-28 shrink-0 tabular-nums">
                    {event.byteStart.toLocaleString('en-US')}–{event.byteEnd.toLocaleString('en-US')}
                  </span>
                  <span className="font-mono text-[10px] text-[#E8E6DF] w-12 text-right shrink-0 tabular-nums">
                    {String(event.leafIndex).padStart(3, '0')}
                  </span>
                  <span className="w-16 text-right shrink-0">
                    {event.verified ? (
                      <span className="font-mono text-[10px] text-[#00E5A0] bg-[rgba(0,229,160,0.1)] px-1.5 py-0.5 rounded-sm">
                        ✓ proof
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-[#6B6A65]">—</span>
                    )}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Live indicator */}
      {running && (
        <div className="flex items-center gap-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
          <span className="font-mono text-[10px] text-[#6B6A65]">
            Live · payments streaming · chain txs: <span className="text-[#FF6B35]">0</span>
          </span>
        </div>
      )}
    </div>
  )
}
