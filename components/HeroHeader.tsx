'use client'

import { motion, AnimatePresence } from 'framer-motion'
import ChainBadge from './ChainBadge'

type HeroHeaderProps = {
  leafIndex: number
  chainTxs: number
  settled: boolean
  wallet: {
    hasWallet: boolean
    connected: boolean
    address: string | null
    connecting: boolean
    connect: () => void
  }
}

export default function HeroHeader({
  leafIndex,
  chainTxs,
  settled,
  wallet,
}: HeroHeaderProps) {
  const { hasWallet, connected, address, connecting, connect } = wallet

  const filEarned = (leafIndex * 0.000977).toFixed(3)

  const handleConnect = () => connect()

  return (
    <div className="pb-5 border-b border-[rgba(255,255,255,0.08)]">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h1
            className="font-display text-3xl font-800 tracking-[-0.02em] text-[#E8E6DF] leading-none"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
          >
            ROOTPAY
          </h1>
          <p className="font-mono text-xs text-[#6B6A65] mt-1 tracking-wide">
            Merkle-Indexed Micropayment Channels
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ChainBadge />
          {hasWallet && !connected && (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="font-mono text-[10px] text-[#6B6A65] hover:text-[#00E5A0] transition-colors underline underline-offset-2 cursor-pointer disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect wallet for live demo'}
            </button>
          )}
          {connected && address && (
            <span className="font-mono text-[10px] text-[#00E5A0]">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </div>
      </div>

      {/* Tagline */}
      <p
        className="text-sm text-[#6B6A65] mb-4 italic"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        One root. Thousands of payments. One settlement.
      </p>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        {/* Chain Txs — the critical counter */}
        <div className="card rounded-sm p-2.5 flex flex-col gap-0.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={chainTxs}
              className="font-mono text-2xl font-medium tabular-nums leading-none"
              style={{ color: settled ? '#FF6B35' : '#E8E6DF' }}
              animate={settled && chainTxs === 1 ? {
                color: ['#E8E6DF', '#FF6B35', '#E8E6DF', '#FF6B35', '#FF6B35'],
                textShadow: ['none', '0 0 24px rgba(255,107,53,1)', 'none', '0 0 24px rgba(255,107,53,1)', '0 0 8px rgba(255,107,53,0.4)'],
              } : {}}
              transition={{ duration: 0.9 }}
            >
              {chainTxs}
            </motion.span>
          </AnimatePresence>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65]">
            chain txs · this session
          </span>
        </div>

        {/* Micro-payments */}
        <div className="card rounded-sm p-2.5 flex flex-col gap-0.5">
          <motion.span
            className="font-mono text-2xl font-medium tabular-nums leading-none text-[#E8E6DF]"
            key={leafIndex}
          >
            {leafIndex.toLocaleString('en-US')}
          </motion.span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65]">
            micro-payments sent
          </span>
        </div>

        {/* FIL Earned */}
        <div className="card rounded-sm p-2.5 flex flex-col gap-0.5">
          <span className="font-mono text-2xl font-medium tabular-nums leading-none text-[#00E5A0]">
            {filEarned}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65]">
            USDFC · earned off-chain
          </span>
        </div>
      </div>
    </div>
  )
}
