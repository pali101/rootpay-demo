'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import HashDisplay from '../HashDisplay'
import { DEMO_PROOF_HASHES, DEMO_TX_HASH, DEMO_SETTLE_TX_BLOCK, DEMO_GAS_USED } from '@/lib/demoData'
import { EXPLORER_URL, TREE_SIZE } from '@/lib/constants'
import { redeemChannel, reclaimChannel } from '@/lib/contract'

type SettlementProps = {
  leafIndex: number
  settled: boolean
  mode: 'simulated' | 'live'
  payer: string
  merchant: string
  lockedAmount: number
  valuePerLeaf: number
  signer: ethers.Signer | null
  getProofForLeaf: (index: number) => string[]
  getSecretForLeaf: (index: number) => string
  onSettle: () => void
  onAnimateProof: (active: boolean) => void
}

const TOTAL_LEAVES = TREE_SIZE
const PROOF_DEPTH = Math.log2(TREE_SIZE)

export default function Settlement({
  leafIndex,
  settled,
  mode,
  payer,
  merchant,
  lockedAmount,
  valuePerLeaf,
  signer,
  getProofForLeaf,
  getSecretForLeaf,
  onSettle,
  onAnimateProof,
}: SettlementProps) {
  const [verifying, setVerifying] = useState(false)
  const [verifiedCount, setVerifiedCount] = useState(0)
  const [proofValid, setProofValid] = useState(false)
  const [settling, setSettling] = useState(false)
  const [settleError, setSettleError] = useState<string>('')
  const [reclaiming, setReclaiming] = useState(false)
  const [reclaimError, setReclaimError] = useState<string>('')
  const [reclaimMerchant, setReclaimMerchant] = useState<string>(merchant)
  const [realTxHash, setRealTxHash] = useState<string | undefined>()
  const [realBlockNumber, setRealBlockNumber] = useState<number | undefined>()

  const merchantReceives = (leafIndex * valuePerLeaf).toFixed(6)
  const payerRefunded = (lockedAmount - leafIndex * valuePerLeaf).toFixed(6)

  // Proof hashes to display — use real proof when available, else demo placeholders
  const displayProofHashes = mode === 'live'
    ? getProofForLeaf(Math.max(0, leafIndex - 1))
    : DEMO_PROOF_HASHES

  const animateVerification = useCallback(async () => {
    setVerifying(true)
    setVerifiedCount(0)
    setProofValid(false)
    onAnimateProof(true)

    for (let i = 1; i <= PROOF_DEPTH; i++) {
      await delay(200)
      setVerifiedCount(i)
    }
    await delay(300)
    setProofValid(true)
    onAnimateProof(false)
    setVerifying(false)
  }, [onAnimateProof])

  const handleSettle = useCallback(async () => {
    setSettling(true)
    setSettleError('')

    if (mode === 'live') {
      if (!signer) {
        setSettleError('Connect your wallet first.')
        setSettling(false)
        return
      }
      const redeemLeaf = leafIndex - 1
      const result = await redeemChannel(
        {
          payer,
          leafIndex: redeemLeaf,
          secret: getSecretForLeaf(redeemLeaf),
          proof: getProofForLeaf(redeemLeaf),
        },
        signer
      )
      if (!result.success) {
        setSettleError(result.error || 'Transaction failed')
        setSettling(false)
        return
      }
      setRealTxHash(result.txHash)
      setRealBlockNumber(result.blockNumber)
    } else {
      // Simulated: fake delays
      await delay(600)
      await delay(1800)
      await delay(400)
    }

    onSettle()
    setSettling(false)
  }, [mode, signer, payer, leafIndex, getSecretForLeaf, getProofForLeaf, onSettle])

  const handleReclaim = useCallback(async () => {
    if (!signer) {
      setReclaimError('Connect your wallet first.')
      return
    }
    if (!reclaimMerchant || !ethers.isAddress(reclaimMerchant)) {
      setReclaimError('Enter a valid merchant address.')
      return
    }
    setReclaiming(true)
    setReclaimError('')
    const result = await reclaimChannel(reclaimMerchant, signer)
    if (!result.success) {
      setReclaimError(result.error || 'Reclaim failed')
    } else {
      onSettle()
    }
    setReclaiming(false)
  }, [signer, reclaimMerchant, onSettle])

  if (settled) {
    return (
      <SettlementReceipt
        leafIndex={leafIndex}
        lockedAmount={lockedAmount}
        valuePerLeaf={valuePerLeaf}
        txHash={realTxHash ?? DEMO_TX_HASH}
        blockNumber={realBlockNumber ?? DEMO_SETTLE_TX_BLOCK}
      />
    )
  }

  const proofHashes = displayProofHashes.length > 0 ? displayProofHashes : DEMO_PROOF_HASHES

  return (
    <div className="space-y-4">
      <span className="font-mono text-xs uppercase tracking-widest text-[#6B6A65]">
        Settlement Preview
      </span>

      {/* Preview table */}
      <div className="card rounded-sm p-4 space-y-2">
        <PreviewRow label="Highest verified leaf" value={`${leafIndex.toLocaleString('en-US')} / ${TOTAL_LEAVES.toLocaleString('en-US')}`} />
        <PreviewRow label="Merchant receives" value={`${merchantReceives} USDFC`} accent="emerald" />
        <PreviewRow label="Payer refunded" value={`${payerRefunded} USDFC`} />
        <PreviewRow label="Proof depth" value={`${PROOF_DEPTH} hashes (log₂ ${TOTAL_LEAVES.toLocaleString('en-US')})`} />
      </div>

      {/* Merkle proof display */}
      <div className="card rounded-sm p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65] mb-3">
          Merkle Proof  (leaf {leafIndex} → root)
        </div>
        <div className="space-y-1.5">
          {proofHashes.map((hash, i) => {
            const isRoot = i === PROOF_DEPTH - 1
            const isVerified = verifiedCount > i
            const isCurrent = verifiedCount === i + 1

            return (
              <motion.div
                key={i}
                className={`flex items-center gap-3 px-2 py-1 rounded-sm transition-all ${
                  isVerified ? 'bg-[rgba(0,229,160,0.06)]' :
                  isCurrent ? 'bg-[rgba(0,229,160,0.03)]' : ''
                }`}
                animate={isCurrent && verifying ? {
                  backgroundColor: ['rgba(0,229,160,0)', 'rgba(0,229,160,0.1)', 'rgba(0,229,160,0.06)'],
                } : {}}
                transition={{ duration: 0.2 }}
              >
                <span className="font-mono text-[10px] text-[#6B6A65] w-12 shrink-0">
                  Hash {String(i + 1).padStart(2, '0')}
                </span>
                <span className={`font-mono text-[10px] flex-1 ${isVerified ? 'text-[#E8E6DF]' : 'text-[#6B6A65]'}`}>
                  <HashDisplay hash={hash} truncateStart={8} truncateEnd={6} showCopy={false} />
                </span>
                {isRoot && (
                  <span className="font-mono text-[9px] text-[#6B6A65]">← root</span>
                )}
                {isVerified && (
                  <motion.span
                    className="font-mono text-[10px] text-[#00E5A0]"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Progress bar */}
        <AnimatePresence>
          {(verifying || proofValid) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3"
            >
              <div className="h-0.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#00E5A0] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(verifiedCount / PROOF_DEPTH) * 100}%` }}
                  transition={{ duration: 0.15 }}
                />
              </div>
              {proofValid && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-center font-mono text-xs text-[#00E5A0]"
                  style={{ textShadow: '0 0 12px rgba(0,229,160,0.6)' }}
                >
                  PROOF VALID ✓
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {settleError && (
        <p className="font-mono text-[10px] text-[#FF6B35]">{settleError}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          className="btn-secondary flex-1"
          onClick={animateVerification}
          disabled={verifying || proofValid}
        >
          {verifying ? (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              Verifying...
            </motion.span>
          ) : 'Animate Verification'}
        </button>
        <button
          className="btn-primary flex-1"
          onClick={handleSettle}
          disabled={settling || leafIndex === 0}
        >
          {settling ? (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              {mode === 'live' ? 'Submitting proof...' : 'Processing...'}
            </motion.span>
          ) : 'Settle Channel'}
        </button>
      </div>

      {leafIndex === 0 && (
        <p className="font-mono text-[10px] text-[#6B6A65]">
          Start the Live Ticker first to accumulate payments before settling.
        </p>
      )}

      {/* Reclaim section */}
      {mode === 'live' && (
        <div className="border border-[rgba(255,255,255,0.06)] rounded-sm p-3 space-y-2">
          <p className="font-mono text-[10px] text-[#6B6A65] leading-relaxed">
            <span className="text-[#E8E6DF]">Reclaim channel</span> — recovers all locked USDFC back to payer.
            Use this if proofs are lost on reload, or to clear an existing channel before creating a new one.
          </p>
          <div className="space-y-1">
            <label className="font-mono text-[10px] text-[#6B6A65] uppercase tracking-widest">
              Merchant address
            </label>
            <input
              type="text"
              value={reclaimMerchant}
              onChange={e => setReclaimMerchant(e.target.value)}
              placeholder="0x... (enter merchant from the original channel)"
              className="w-full font-mono text-xs bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-sm px-3 py-2 text-[#E8E6DF] placeholder-[#6B6A65] focus:outline-none focus:border-[rgba(0,229,160,0.4)]"
            />
          </div>
          {reclaimError && (
            <p className="font-mono text-[10px] text-[#FF6B35]">{reclaimError}</p>
          )}
          <button
            className="btn-secondary w-full"
            onClick={handleReclaim}
            disabled={reclaiming}
          >
            {reclaiming ? (
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                Reclaiming...
              </motion.span>
            ) : 'Reclaim Channel (payer)'}
          </button>
        </div>
      )}
    </div>
  )
}

function PreviewRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'emerald'
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <span className="font-mono text-xs text-[#6B6A65]">{label}</span>
      <span className={`font-mono text-xs ${accent === 'emerald' ? 'text-[#00E5A0]' : 'text-[#E8E6DF]'}`}>
        {value}
      </span>
    </div>
  )
}

function SettlementReceipt({
  leafIndex,
  lockedAmount,
  valuePerLeaf,
  txHash,
  blockNumber,
}: {
  leafIndex: number
  lockedAmount: number
  valuePerLeaf: number
  txHash: string
  blockNumber: number
}) {
  const merchantReceives = (leafIndex * valuePerLeaf).toFixed(6)
  const payerRefunded = (lockedAmount - leafIndex * valuePerLeaf).toFixed(6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-[#6B6A65]">
          Settlement Receipt
        </span>
        <motion.span
          className="font-mono text-[10px] text-[#00E5A0] bg-[rgba(0,229,160,0.1)] px-2 py-0.5 rounded-sm"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          SETTLED ✓
        </motion.span>
      </div>

      {/* Receipt card */}
      <div className="card rounded-sm p-4 space-y-2">
        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.04)]">
          <span className="font-mono text-xs text-[#6B6A65]">Tx hash</span>
          <span className="font-mono text-xs text-[#E8E6DF] flex items-center gap-2">
            <HashDisplay hash={txHash} />
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6B6A65] hover:text-[#00E5A0] text-[10px]"
            >↗</a>
          </span>
        </div>
        <PreviewRow label="Block" value={blockNumber.toLocaleString('en-US')} />
        <PreviewRow label="Gas used" value={`${DEMO_GAS_USED.toLocaleString('en-US')} units`} />
        <PreviewRow label="Proof depth" value={`${PROOF_DEPTH} hashes`} />
      </div>

      {/* Amounts */}
      <div className="card rounded-sm p-4 space-y-2">
        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.04)]">
          <span className="font-mono text-xs text-[#6B6A65]">Merchant</span>
          <span className="font-mono text-xs text-[#00E5A0]">+{merchantReceives} USDFC</span>
        </div>
        <div className="flex items-center justify-between py-1 border-b border-[rgba(255,255,255,0.04)]">
          <span className="font-mono text-xs text-[#6B6A65]">Payer (refund)</span>
          <span className="font-mono text-xs text-[#E8E6DF]">+{payerRefunded} USDFC</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="font-mono text-xs text-[#6B6A65]">Dust (remainder)</span>
          <span className="font-mono text-xs text-[#6B6A65]">0.000000 USDFC</span>
        </div>
      </div>

      {/* THE closing argument — largest text on card */}
      <motion.div
        className="card rounded-sm p-5 text-center border-[rgba(0,229,160,0.2)]"
        style={{ border: '1px solid rgba(0,229,160,0.2)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65] mb-3">
          Session summary
        </div>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div
              className="font-display font-bold text-4xl text-[#E8E6DF] tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {leafIndex.toLocaleString('en-US')}
            </div>
            <div className="font-mono text-[10px] text-[#6B6A65] mt-1">payments sent</div>
          </div>
          <div className="text-[#6B6A65] font-mono text-2xl">·</div>
          <div className="text-center">
            <div
              className="font-display font-bold text-4xl text-[#FF6B35] tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              2
            </div>
            <div className="font-mono text-[10px] text-[#6B6A65] mt-1">on-chain txs</div>
          </div>
        </div>
        <div className="font-mono text-[10px] text-[#6B6A65] mt-3">
          open + settle
        </div>
      </motion.div>
    </motion.div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
