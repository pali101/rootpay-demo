'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import HashDisplay from '../HashDisplay'
import { USDFC_ADDRESS, VALUE_PER_LEAF, TOTAL_LOCKED, TREE_SIZE, EXPLORER_URL } from '@/lib/constants'
import { redeemChannel } from '@/lib/contract'
import { useOpenChannels } from '@/hooks/useOpenChannels'
import type { SubgraphChannel } from '@/lib/subgraph'

type MerchantPanelProps = {
  signer: ethers.Signer | null
  walletAddress: string | null
  sessionPayer: string
  sessionLeafIndex: number
  sessionMode: 'simulated' | 'live'
  getSecretForLeaf: (index: number) => string
  getProofForLeaf: (index: number) => string[]
}

type RedeemStep = 'idle' | 'submitting' | 'confirmed' | 'error'

type ParsedProof = {
  payer: string
  leafIndex: number
  secret: string
  proof: string[]
}

function tryParseProof(raw: string): ParsedProof | null {
  try {
    const obj = JSON.parse(raw)
    if (
      typeof obj.leafIndex === 'number' &&
      typeof obj.secret === 'string' &&
      Array.isArray(obj.proof)
    ) {
      return {
        payer: typeof obj.payer === 'string' ? obj.payer : '',
        leafIndex: obj.leafIndex,
        secret: obj.secret,
        proof: obj.proof,
      }
    }
  } catch { /* not valid JSON yet */ }
  return null
}

// ── Redeem Modal ──────────────────────────────────────────────────────────────

type ModalProps = {
  channel: SubgraphChannel | null  // null = manual mode
  sessionPayer: string
  sessionLeafIndex: number
  sessionMode: 'simulated' | 'live'
  getSecretForLeaf: (index: number) => string
  getProofForLeaf: (index: number) => string[]
  signer: ethers.Signer | null
  onClose: () => void
  onSuccess: (txHash: string, claimable: string) => void
}

function RedeemModal({
  channel,
  sessionPayer,
  sessionLeafIndex,
  sessionMode,
  getSecretForLeaf,
  getProofForLeaf,
  signer,
  onClose,
  onSuccess,
}: ModalProps) {
  const [pasteRaw, setPasteRaw] = useState('')
  const [step, setStep] = useState<RedeemStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const hasSession = !!sessionPayer && sessionLeafIndex > 0
  // If channel is selected from table AND has a session for the same payer, use session
  const useSession = hasSession && channel !== null && channel.payer.toLowerCase() === sessionPayer.toLowerCase()

  const parsed = tryParseProof(pasteRaw)

  const redeemLeafIndex = useSession
    ? Math.max(0, sessionLeafIndex - 1)
    : (parsed?.leafIndex ?? 0)

  const payer = useSession
    ? sessionPayer
    : (channel?.payer ?? parsed?.payer ?? '')

  const secret = useSession ? getSecretForLeaf(redeemLeafIndex) : (parsed?.secret ?? '')
  const proof  = useSession ? getProofForLeaf(redeemLeafIndex)  : (parsed?.proof ?? [])

  const claimable = ((redeemLeafIndex + 1) * VALUE_PER_LEAF).toFixed(6)
  const refund    = (TOTAL_LOCKED - (redeemLeafIndex + 1) * VALUE_PER_LEAF).toFixed(6)

  const canRedeem = useSession || !!parsed

  const handleRedeem = async () => {
    if (!signer) { setErrorMsg('Connect your wallet first.'); setStep('error'); return }
    if (!ethers.isAddress(payer)) { setErrorMsg('Payer address missing or invalid.'); setStep('error'); return }
    if (redeemLeafIndex < 0 || redeemLeafIndex >= TREE_SIZE) { setErrorMsg('Invalid leaf index.'); setStep('error'); return }
    if (!secret || proof.length === 0) { setErrorMsg('Secret and proof are required.'); setStep('error'); return }

    setStep('submitting')
    setErrorMsg('')
    const result = await redeemChannel({ payer, leafIndex: redeemLeafIndex, secret, proof }, signer)
    if (result.success && result.txHash) {
      onSuccess(result.txHash, claimable)
    } else {
      setErrorMsg(result.error ?? 'Redeem failed')
      setStep('error')
    }
  }

  const isManual = channel === null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,11,13,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md card rounded-sm border border-[rgba(255,255,255,0.1)] overflow-hidden"
        style={{ background: '#0F1012' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] inline-block" />
            <span className="font-mono text-xs text-[#E8E6DF] uppercase tracking-widest">
              {isManual ? 'Manual Redeem' : 'Redeem Channel'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[10px] text-[#6B6A65] hover:text-[#E8E6DF] transition-colors px-1"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Channel info (when from table) */}
          {channel && (
            <div className="space-y-0 border border-[rgba(255,255,255,0.06)] rounded-sm p-3">
              <div className="flex items-center justify-between py-1">
                <span className="font-mono text-[10px] text-[#6B6A65]">Payer</span>
                <span className="font-mono text-[10px] text-[#E8E6DF]">
                  <HashDisplay hash={channel.payer} />
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-mono text-[10px] text-[#6B6A65]">Locked</span>
                <span className="font-mono text-[10px] text-[#00E5A0]">
                  {(Number(channel.amount) / 1e18).toFixed(2)} USDFC
                </span>
              </div>
            </div>
          )}

          {/* Session auto-fill indicator */}
          {useSession ? (
            <div className="border border-[rgba(0,229,160,0.2)] bg-[rgba(0,229,160,0.03)] rounded-sm p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] inline-block shrink-0"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-mono text-[10px] text-[#00E5A0] uppercase tracking-widest">
                  Session proof loaded
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6B6A65]">Payments received</span>
                <span className="font-mono text-[10px] text-[#E8E6DF]">{sessionLeafIndex} / {TREE_SIZE.toLocaleString('en-US')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6B6A65]">Claimable</span>
                <span className="font-mono text-[10px] text-[#00E5A0]">{claimable} USDFC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6B6A65]">Refund to payer</span>
                <span className="font-mono text-[10px] text-[#E8E6DF]">{refund} USDFC</span>
              </div>
            </div>
          ) : (
            /* Proof JSON textarea */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6B6A65] uppercase tracking-widest">
                  Paste proof JSON
                </span>
                {parsed && (
                  <span className="font-mono text-[10px] text-[#00E5A0]">✓ parsed</span>
                )}
              </div>
              <textarea
                value={pasteRaw}
                onChange={e => { setPasteRaw(e.target.value); setStep('idle'); setErrorMsg('') }}
                rows={6}
                placeholder={'{\n  "payer": "0x...",\n  "leafIndex": 436,\n  "secret": "0x...",\n  "proof": ["0x...", ...]\n}'}
                className="w-full font-mono text-[10px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-sm px-3 py-2 text-[#E8E6DF] placeholder-[#3a3a36] focus:outline-none focus:border-[rgba(0,229,160,0.4)] resize-none"
              />

              {/* Parsed preview */}
              {parsed && (
                <div className="border border-[rgba(255,255,255,0.06)] rounded-sm p-3 space-y-0">
                  {!isManual && !parsed.payer && (
                    <p className="font-mono text-[10px] text-[#6B6A65] mb-2">
                      No payer in JSON — using channel payer.
                    </p>
                  )}
                  <div className="flex items-center justify-between py-1">
                    <span className="font-mono text-[10px] text-[#6B6A65]">Leaf index</span>
                    <span className="font-mono text-[10px] text-[#E8E6DF]">{parsed.leafIndex}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-mono text-[10px] text-[#6B6A65]">Proof length</span>
                    <span className="font-mono text-[10px] text-[#E8E6DF]">{parsed.proof.length} hashes</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-mono text-[10px] text-[#6B6A65]">Claimable</span>
                    <span className="font-mono text-[10px] text-[#00E5A0]">{claimable} USDFC</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <p className="font-mono text-[10px] text-[#FF6B35]">{errorMsg}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              className="btn-secondary flex-1"
              onClick={onClose}
              disabled={step === 'submitting'}
            >
              Cancel
            </button>
            <button
              className="btn-primary flex-1"
              onClick={handleRedeem}
              disabled={step === 'submitting' || !canRedeem}
            >
              {step === 'submitting' ? (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                  Submitting...
                </motion.span>
              ) : 'Redeem'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MerchantPanel({
  signer,
  walletAddress,
  sessionPayer,
  sessionLeafIndex,
  sessionMode,
  getSecretForLeaf,
  getProofForLeaf,
}: MerchantPanelProps) {
  const { channels, loading: channelsLoading } = useOpenChannels(walletAddress)

  // Modal state: null = closed, SubgraphChannel = channel-based, 'manual' = manual
  const [modalTarget, setModalTarget] = useState<SubgraphChannel | 'manual' | null>(null)

  // Success state
  const [lastTx, setLastTx] = useState<{ txHash: string; claimable: string } | null>(null)

  const hasSession = !!sessionPayer && sessionLeafIndex > 0

  const handleSuccess = (txHash: string, claimable: string) => {
    setModalTarget(null)
    setLastTx({ txHash, claimable })
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-[#6B6A65]">Merchant View</span>
          <span className={`font-mono text-[10px] px-2 py-0.5 border rounded-sm ${
            walletAddress ? 'border-[#00E5A0] text-[#00E5A0]' : 'border-[rgba(255,255,255,0.15)] text-[#6B6A65]'
          }`}>
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'NO WALLET'}
          </span>
        </div>

        {/* Session banner */}
        {hasSession && (
          <div className="flex items-center justify-between border border-[rgba(0,229,160,0.2)] bg-[rgba(0,229,160,0.03)] rounded-sm px-3 py-2">
            <div className="flex items-center gap-2">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-[#00E5A0] inline-block"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="font-mono text-[10px] text-[#00E5A0]">
                Live session — {sessionLeafIndex} payment{sessionLeafIndex !== 1 ? 's' : ''} received
              </span>
            </div>
            <button
              className="font-mono text-[10px] text-[#00E5A0] border border-[rgba(0,229,160,0.3)] rounded-sm px-2 py-0.5 hover:bg-[rgba(0,229,160,0.08)] transition-colors"
              onClick={() => {
                // find the session channel in list or open manual with session
                const ch = channels.find(c => c.payer.toLowerCase() === sessionPayer.toLowerCase())
                setModalTarget(ch ?? 'manual')
              }}
            >
              Redeem session →
            </button>
          </div>
        )}

        {/* Simulated channel table (no wallet) */}
        {!walletAddress && sessionMode === 'simulated' && hasSession && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65]">Open Channels</span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 border border-[rgba(255,255,255,0.1)] rounded-sm text-[#6B6A65]">SIMULATED</span>
            </div>
            <div className="border border-[rgba(255,255,255,0.08)] rounded-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-3 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65]">Payer</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] text-right">Locked</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] text-right">Leaves</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] text-right"></span>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-3 py-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1 h-1 rounded-full bg-[#00E5A0] shrink-0" />
                  <span className="font-mono text-[10px] text-[#E8E6DF] truncate">
                    {sessionPayer.slice(0, 8)}…{sessionPayer.slice(-6)}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#00E5A0] text-right whitespace-nowrap">
                  {TOTAL_LOCKED.toFixed(2)} USDFC
                </span>
                <span className="font-mono text-[10px] text-[#6B6A65] text-right whitespace-nowrap">
                  {TREE_SIZE.toLocaleString('en-US')}
                </span>
                <button
                  onClick={() => setModalTarget('manual')}
                  className="font-mono text-[9px] uppercase tracking-wider text-[#6B6A65] border border-[rgba(255,255,255,0.1)] rounded-sm px-2 py-0.5 hover:border-[rgba(0,229,160,0.4)] hover:text-[#00E5A0] transition-all whitespace-nowrap"
                >
                  Redeem
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Open channels table */}
        {walletAddress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65]">
                Open Channels
              </span>
              {channelsLoading ? (
                <motion.span
                  className="font-mono text-[10px] text-[#6B6A65]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  loading...
                </motion.span>
              ) : (
                <span className="font-mono text-[10px] text-[#6B6A65]">{channels.length} found</span>
              )}
            </div>

            {!channelsLoading && channels.length === 0 && (
              <p className="font-mono text-[10px] text-[#6B6A65]">
                No open channels found for this address.
              </p>
            )}

            {channels.length > 0 && (
              <div className="border border-[rgba(255,255,255,0.08)] rounded-sm overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65]">Payer</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] text-right">Locked</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] text-right">Leaves</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] text-right">Tx</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#6B6A65] text-right"></span>
                </div>

                {/* Table rows */}
                {channels.map((ch, i) => {
                  const amountUSDFC = (Number(ch.amount) / 1e18).toFixed(2)
                  const isSessionPayer = sessionPayer && ch.payer.toLowerCase() === sessionPayer.toLowerCase()
                  return (
                    <motion.div
                      key={ch.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0 group hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isSessionPayer && (
                          <span className="w-1 h-1 rounded-full bg-[#00E5A0] shrink-0" />
                        )}
                        <span className="font-mono text-[10px] text-[#E8E6DF] truncate">
                          {ch.payer.slice(0, 8)}…{ch.payer.slice(-6)}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#00E5A0] text-right whitespace-nowrap">
                        {amountUSDFC} USDFC
                      </span>
                      <span className="font-mono text-[10px] text-[#6B6A65] text-right whitespace-nowrap">
                        {Number(ch.treeSize).toLocaleString('en-US')}
                      </span>
                      <a
                        href={`${EXPLORER_URL}/tx/${ch.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="font-mono text-[10px] text-[#6B6A65] hover:text-[#00E5A0] transition-colors text-right"
                      >
                        ↗
                      </a>
                      <button
                        onClick={() => setModalTarget(ch)}
                        className="font-mono text-[9px] uppercase tracking-wider text-[#6B6A65] border border-[rgba(255,255,255,0.1)] rounded-sm px-2 py-0.5 hover:border-[rgba(0,229,160,0.4)] hover:text-[#00E5A0] transition-all whitespace-nowrap"
                      >
                        Redeem
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Manual entry */}
        <button
          onClick={() => setModalTarget('manual')}
          className="w-full font-mono text-[10px] text-[#6B6A65] border border-[rgba(255,255,255,0.06)] rounded-sm px-3 py-2.5 hover:border-[rgba(255,255,255,0.12)] hover:text-[#E8E6DF] transition-all text-left flex items-center justify-between group"
        >
          <span>Manual — paste proof JSON</span>
          <span className="text-[#6B6A65] group-hover:text-[#E8E6DF] transition-colors">→</span>
        </button>

        {/* Success banner */}
        <AnimatePresence>
          {lastTx && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card rounded-sm p-4 space-y-2 border border-[rgba(0,229,160,0.2)]"
            >
              <div className="font-mono text-xs text-[#00E5A0]">Redeemed ✓</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6B6A65]">Tx hash</span>
                <span className="font-mono text-[10px] text-[#E8E6DF] flex items-center gap-2">
                  <HashDisplay hash={lastTx.txHash} />
                  <a href={`${EXPLORER_URL}/tx/${lastTx.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="text-[#6B6A65] hover:text-[#00E5A0] text-[10px]">↗</a>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#6B6A65]">Received</span>
                <span className="font-mono text-[10px] text-[#00E5A0]">+{lastTx.claimable} USDFC</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How it works */}
        <div className="border border-[rgba(255,255,255,0.06)] rounded-sm p-3">
          <p className="font-mono text-[10px] text-[#6B6A65] leading-relaxed">
            <span className="text-[#E8E6DF]">How it works:</span> Payer clicks{' '}
            <span className="text-[#E8E6DF]">⎘ Copy Proof</span> in Live Ticker and sends you the JSON.
            Paste it in the Redeem modal — the highest verified leaf claims all accumulated USDFC in one on-chain tx.
          </p>
        </div>
      </div>

      {/* Redeem modal */}
      <AnimatePresence>
        {modalTarget !== null && (
          <RedeemModal
            channel={modalTarget === 'manual' ? null : modalTarget}
            sessionPayer={sessionPayer}
            sessionLeafIndex={sessionLeafIndex}
            sessionMode={sessionMode}
            getSecretForLeaf={getSecretForLeaf}
            getProofForLeaf={getProofForLeaf}
            signer={signer}
            onClose={() => setModalTarget(null)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </>
  )
}
