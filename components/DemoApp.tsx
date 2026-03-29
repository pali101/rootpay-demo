'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HeroHeader from './HeroHeader'
import MerkleViz from './MerkleViz'
import ChannelSetup from './tabs/ChannelSetup'
import LiveTicker from './tabs/LiveTicker'
import TrustTiers from './tabs/TrustTiers'
import Settlement from './tabs/Settlement'
import MerchantPanel from './tabs/MerchantPanel'
import { useTicker } from '@/hooks/useTicker'
import { useChannel, type LiveChannelData } from '@/hooks/useChannel'
import { useWallet } from '@/hooks/useWallet'
import WalletGate from './WalletGate'

type Role = 'payer' | 'merchant'
type PayerTab = 'a' | 'b' | 'c' | 'd'
type TrustWindow = 30 | 60 | 300

type DemoState = {
  mode: 'simulated' | 'live'
  leafIndex: number
  channelActive: boolean
  settled: boolean
  trustWindow: TrustWindow
}

const PAYER_TABS: { id: PayerTab; label: string; short: string }[] = [
  { id: 'a', label: 'Channel Setup', short: 'A' },
  { id: 'b', label: 'Live Ticker', short: 'B' },
  { id: 'c', label: 'Trust Tiers', short: 'C' },
  { id: 'd', label: 'Settlement', short: 'D' },
]

export default function DemoApp() {
  const [gateCleared, setGateCleared] = useState(false)
  const [role, setRole] = useState<Role>('payer')
  const [activeTab, setActiveTab] = useState<PayerTab>('a')
  const [animateProof, setAnimateProof] = useState(false)
  const [settlementToast, setSettlementToast] = useState(false)

  const [state, setState] = useState<DemoState>({
    mode: 'simulated',
    leafIndex: 0,
    channelActive: false,
    settled: false,
    trustWindow: 60,
  })

  const wallet = useWallet()
  const { channelParams, treeReady, setLiveChannelData, getProofForLeaf, getSecretForLeaf } =
    useChannel(state.mode)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as PayerTab | null
    if (tab && ['a', 'b', 'c', 'd'].includes(tab)) setActiveTab(tab)
  }, [])

  const handleTabChange = useCallback((tab: PayerTab) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?tab=${tab}`)
    }
  }, [])

  const handleLeafIndexChange = useCallback((index: number) => {
    setState(s => ({ ...s, leafIndex: index }))
  }, [])

  const { events, running, speed, setSpeed, start, stop, reset, leafIndex, proofsVerified, filEarned } =
    useTicker(state.trustWindow, handleLeafIndexChange)

  const handleUseSimulated = useCallback(() => {
    setGateCleared(true)
    setRole('payer')
    setState(s => ({ ...s, mode: 'simulated', channelActive: true }))
  }, [])

  const handleEnterAs = useCallback((r: Role) => {
    setRole(r)
    setGateCleared(true)
  }, [])

  const handleCreateLive = useCallback((data: LiveChannelData) => {
    setLiveChannelData(data)
    setState(s => ({ ...s, mode: 'live', channelActive: true }))
  }, [setLiveChannelData])

  const handleSettle = useCallback(() => {
    setState(s => ({ ...s, settled: true }))
    setSettlementToast(true)
    setTimeout(() => setSettlementToast(false), 5000)
  }, [])

  const handleSelectTier = useCallback((tier: TrustWindow) => {
    setState(s => ({ ...s, trustWindow: tier }))
  }, [])

  const handleCopyProof = useCallback((): string | null => {
    if (leafIndex === 0) return null
    const idx = leafIndex - 1
    return JSON.stringify({
      payer: channelParams.payer,
      leafIndex: idx,
      secret: getSecretForLeaf(idx),
      proof: getProofForLeaf(idx),
    }, null, 2)
  }, [leafIndex, channelParams.payer, getSecretForLeaf, getProofForLeaf])

  const chainTxs = state.settled ? 1 : 0

  if (!gateCleared) {
    return (
      <WalletGate
        wallet={wallet}
        onEnterAs={handleEnterAs}
        onSimulated={handleUseSimulated}
      />
    )
  }

  // ── Merchant layout ──────────────────────────────────────────────────────
  if (role === 'merchant') {
    return (
      <div className="min-h-screen bg-[#0A0B0D]">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1
                className="font-display font-extrabold text-2xl tracking-[-0.02em] text-[#E8E6DF]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
              >
                ROOTPAY
              </h1>
              <p className="font-mono text-[10px] text-[#6B6A65]">Merchant Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              {wallet.address && (
                <span className="font-mono text-[10px] text-[#6B6A65]">
                  {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                </span>
              )}
              <button
                onClick={() => { setGateCleared(false); setRole('payer') }}
                className="font-mono text-[10px] text-[#6B6A65] hover:text-[#E8E6DF] transition-colors border border-[rgba(255,255,255,0.08)] rounded-sm px-2 py-1"
              >
                Switch role
              </button>
            </div>
          </div>
          <MerchantPanel
            signer={wallet.signer}
            walletAddress={wallet.address}
            sessionPayer={channelParams.payer}
            sessionLeafIndex={leafIndex}
            sessionMode={state.mode}
            getSecretForLeaf={getSecretForLeaf}
            getProofForLeaf={getProofForLeaf}
          />
        </div>
      </div>
    )
  }

  // ── Payer layout ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0B0D] relative">
      <AnimatePresence>
        {settlementToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 font-mono text-sm px-5 py-3 rounded-sm border border-[#00E5A0] bg-[#0A0B0D] text-[#00E5A0] shadow-lg"
            style={{ boxShadow: '0 0 32px rgba(0,229,160,0.2)' }}
          >
            Channel settled. {filEarned} USDFC transferred to merchant.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6 min-h-screen">
          {/* Left column */}
          <div className="w-[40%] shrink-0 flex flex-col gap-5">
            <div className="sticky top-6 space-y-5">
              <HeroHeader
                leafIndex={leafIndex}
                chainTxs={chainTxs}
                settled={state.settled}
                wallet={wallet}
              />
              <MerkleViz
                leafIndex={leafIndex}
                channelActive={state.channelActive}
                animateProof={animateProof}
                settled={state.settled}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-0 border-b border-[rgba(255,255,255,0.08)] mb-5">
              {PAYER_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative font-mono text-xs px-4 py-2.5 cursor-pointer transition-all ${
                    activeTab === tab.id ? 'text-[#E8E6DF]' : 'text-[#6B6A65] hover:text-[#E8E6DF]'
                  }`}
                >
                  <span className="text-[#6B6A65] mr-1.5">{tab.short}</span>
                  <span className="hidden sm:inline">· {tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#00E5A0]"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 pb-1">
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-sm border ${
                  state.mode === 'simulated'
                    ? 'border-[rgba(255,255,255,0.1)] text-[#6B6A65]'
                    : 'border-[#00E5A0] text-[#00E5A0]'
                }`}>
                  {state.mode.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <div className={activeTab === 'a' ? '' : 'hidden'}>
                <ChannelSetup
                  mode={state.mode}
                  channelParams={channelParams}
                  channelActive={state.channelActive}
                  treeReady={treeReady}
                  signer={wallet.signer}
                  walletAddress={wallet.address}
                  onUseSimulated={handleUseSimulated}
                  onCreateLive={handleCreateLive}
                />
              </div>

              <div className={activeTab === 'b' ? '' : 'hidden'}>
                <LiveTicker
                  events={events}
                  running={running}
                  speed={speed}
                  leafIndex={leafIndex}
                  proofsVerified={proofsVerified}
                  filEarned={filEarned}
                  onStart={start}
                  onStop={stop}
                  onReset={reset}
                  onSpeedChange={setSpeed}
                  onCopyProof={handleCopyProof}
                />
              </div>

              <div className={activeTab === 'c' ? '' : 'hidden'}>
                <TrustTiers
                  selectedTier={state.trustWindow}
                  onSelectTier={handleSelectTier}
                />
              </div>

              <div className={activeTab === 'd' ? '' : 'hidden'}>
                <Settlement
                  leafIndex={leafIndex}
                  settled={state.settled}
                  mode={state.mode}
                  payer={channelParams.payer}
                  merchant={channelParams.merchant}
                  lockedAmount={channelParams.lockedAmount}
                  valuePerLeaf={channelParams.valuePerLeaf}
                  signer={wallet.signer}
                  getProofForLeaf={getProofForLeaf}
                  getSecretForLeaf={getSecretForLeaf}
                  onSettle={handleSettle}
                  onAnimateProof={setAnimateProof}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
