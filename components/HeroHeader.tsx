'use client'

import { motion, AnimatePresence } from 'framer-motion'
import ChainBadge from './ChainBadge'

type HeroHeaderProps = {
  leafIndex: number
  chainTxs: number
  usdfc: string | null
  gasPerTransfer: number
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
  usdfc,
  gasPerTransfer,
  wallet,
}: HeroHeaderProps) {
  const { hasWallet, connected, address, connecting, connect } = wallet

  const filEarned = (leafIndex * 0.000977).toFixed(3)

  // Without RootPay: 1 approve + leafIndex transfers
  const naiveTxns = leafIndex > 0 ? leafIndex + 1 : 0
  const txnsSaved = Math.max(0, naiveTxns - chainTxs)
  // Gas saved = avoided transfers × real Filecoin gas per transfer
  const gasSaved = leafIndex * gasPerTransfer
  const gasSavedLabel = gasSaved >= 1_000_000
    ? `${(gasSaved / 1_000_000).toFixed(1)}M`
    : gasSaved >= 1_000
    ? `${(gasSaved / 1_000).toFixed(0)}K`
    : String(gasSaved)

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
              onClick={connect}
              disabled={connecting}
              className="font-mono text-[10px] text-[#6B6A65] hover:text-[#00E5A0] transition-colors underline underline-offset-2 cursor-pointer disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect wallet for live demo'}
            </button>
          )}
          {connected && address && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#00E5A0]">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              {usdfc !== null && (
                <span className="font-mono text-[10px] text-[#6B6A65]">
                  {usdfc} USDFC
                </span>
              )}
            </div>
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
        {/* Chain Txs */}
        <div className="card rounded-sm p-2.5 flex flex-col gap-0.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={chainTxs}
              className="font-mono text-2xl font-medium tabular-nums leading-none text-[#E8E6DF]"
              animate={chainTxs === 1 ? { scale: [1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
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

        {/* USDFC Earned */}
        <div className="card rounded-sm p-2.5 flex flex-col gap-0.5">
          <span className="font-mono text-2xl font-medium tabular-nums leading-none text-[#00E5A0]">
            {filEarned}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65]">
            USDFC · earned off-chain
          </span>
        </div>
      </div>

      {/* Savings comparison — only meaningful once payments start */}
      <AnimatePresence>
        {leafIndex > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 border border-[rgba(0,229,160,0.15)] bg-[rgba(0,229,160,0.03)] rounded-sm px-3 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65]">
                  vs naive on-chain transfers
                </span>
                <span className="font-mono text-[9px] text-[#00E5A0]">RootPay saves</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-1">
                    <motion.span
                      key={naiveTxns}
                      className="font-mono text-base font-medium tabular-nums text-[#FF6B35]"
                      animate={{ scale: [1.1, 1] }}
                      transition={{ duration: 0.2 }}
                    >
                      {naiveTxns.toLocaleString('en-US')}
                    </motion.span>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#6B6A65] leading-tight">
                    txns without<br />RootPay
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <motion.span
                    key={txnsSaved}
                    className="font-mono text-base font-medium tabular-nums text-[#00E5A0]"
                    animate={{ scale: [1.1, 1] }}
                    transition={{ duration: 0.2 }}
                  >
                    {txnsSaved.toLocaleString('en-US')}
                  </motion.span>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#6B6A65] leading-tight">
                    txns<br />avoided
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <motion.span
                    key={gasSavedLabel}
                    className="font-mono text-base font-medium tabular-nums text-[#00E5A0]"
                    animate={{ scale: [1.1, 1] }}
                    transition={{ duration: 0.2 }}
                  >
                    {gasSavedLabel}
                  </motion.span>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-[#6B6A65] leading-tight">
                    gas<br />saved
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
