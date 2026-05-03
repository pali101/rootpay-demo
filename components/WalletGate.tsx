'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

type Role = 'payer' | 'merchant'

type WalletGateProps = {
  wallet: {
    hasWallet: boolean
    connected: boolean
    address: string | null
    connecting: boolean
    error: string | null
    connect: () => void
  }
  onEnterAs: (role: Role) => void
  onSimulated: () => void
  onSimulatedMerchant: () => void
}

function avatarColor(address: string): string {
  const colors = ['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#0891B2']
  const idx = parseInt(address.slice(2, 4), 16) % colors.length
  return colors[idx]
}

export default function WalletGate({ wallet, onEnterAs, onSimulated, onSimulatedMerchant }: WalletGateProps) {
  const [mounted, setMounted] = useState(false)
  const [showSimRole, setShowSimRole] = useState(false)
  useEffect(() => setMounted(true), [])

  const { hasWallet, connected, address, connecting, error, connect } = wallet
  const isConnected = mounted && connected
  const isConnecting = mounted && connecting
  const shortAddress = mounted && address
    ? `${address.slice(0, 6)}····${address.slice(-4)}`
    : null

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1
            className="font-display font-extrabold text-4xl tracking-[-0.02em] text-[#E8E6DF] leading-none mb-2"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
          >
            ROOTPAY
          </h1>
          <p className="font-mono text-xs text-[#6B6A65] tracking-wide">
            Merkle-Indexed Micropayment Channels
          </p>
        </div>

        <div
          className="rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-8 space-y-6"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <div className="text-center space-y-1">
            <p className="font-mono text-sm text-[#E8E6DF]">Connect your wallet</p>
            <p className="font-mono text-[11px] text-[#6B6A65] leading-relaxed">
              Connect to Base Sepolia<br />to run the live demo.
            </p>
          </div>

          {/* Connected address */}
          {isConnected && shortAddress && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 px-4 py-3 rounded-sm border border-[rgba(0,229,160,0.2)] bg-[rgba(0,229,160,0.04)]"
            >
              <span
                className="w-6 h-6 rounded-full shrink-0"
                style={{ background: avatarColor(address!) }}
              />
              <span className="font-mono text-sm text-[#E8E6DF] tabular-nums">{shortAddress}</span>
              <span className="ml-auto font-mono text-[10px] text-[#00E5A0]">●</span>
            </motion.div>
          )}

          {error && (
            <p className="font-mono text-[10px] text-[#FF6B35] text-center">{error}</p>
          )}

          {!isConnected ? (
            <button
              onClick={connect}
              disabled={isConnecting || !hasWallet}
              className="w-full font-mono text-sm py-3 px-4 rounded-sm bg-[#E8E6DF] text-[#0A0B0D] font-medium transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {isConnecting ? 'Connecting...' : !hasWallet ? 'MetaMask not detected' : 'Connect Wallet'}
            </button>
          ) : (
            /* Role selection */
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="font-mono text-[11px] text-[#6B6A65] text-center">
                Enter as:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onEnterAs('payer')}
                  className="font-mono text-sm py-3 px-4 rounded-sm bg-[#00E5A0] text-[#0A0B0D] font-medium transition-opacity hover:opacity-90 cursor-pointer text-center"
                >
                  Payer
                </button>
                <button
                  onClick={() => onEnterAs('merchant')}
                  className="font-mono text-sm py-3 px-4 rounded-sm border border-[rgba(255,255,255,0.15)] text-[#E8E6DF] transition-all hover:border-[rgba(255,255,255,0.3)] cursor-pointer text-center"
                >
                  Merchant
                </button>
              </div>
            </motion.div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="font-mono text-[10px] text-[#6B6A65]">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          {!showSimRole ? (
            <button
              onClick={() => setShowSimRole(true)}
              className="w-full font-mono text-[11px] text-[#6B6A65] hover:text-[#E8E6DF] transition-colors text-center cursor-pointer"
            >
              Continue with simulated data — no wallet needed →
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="font-mono text-[10px] text-[#6B6A65] text-center">Enter demo as:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onSimulated}
                  className="font-mono text-xs py-2 px-3 rounded-sm border border-[rgba(255,255,255,0.1)] text-[#6B6A65] hover:border-[rgba(255,255,255,0.25)] hover:text-[#E8E6DF] transition-all cursor-pointer text-center"
                >
                  Payer
                </button>
                <button
                  onClick={onSimulatedMerchant}
                  className="font-mono text-xs py-2 px-3 rounded-sm border border-[rgba(255,255,255,0.1)] text-[#6B6A65] hover:border-[rgba(255,255,255,0.25)] hover:text-[#E8E6DF] transition-all cursor-pointer text-center"
                >
                  Merchant
                </button>
              </div>
            </motion.div>
          )}
        </div>

        <p className="font-mono text-[10px] text-[#6B6A65] text-center mt-5">
          Base Sepolia testnet · Chain ID 84532
        </p>
      </motion.div>
    </div>
  )
}
