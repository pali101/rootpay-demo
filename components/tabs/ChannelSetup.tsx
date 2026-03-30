'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import HashDisplay from '../HashDisplay'
import { EXPLORER_URL, MERCHANT_WITHDRAW_BLOCKS, PAYER_WITHDRAW_BLOCKS, TOTAL_LOCKED, USDFC_ADDRESS } from '@/lib/constants'
import { createChannel, reclaimChannel } from '@/lib/contract'
import type { ChannelParams, LiveChannelData } from '@/hooks/useChannel'

type ChannelSetupProps = {
  mode: 'simulated' | 'live'
  channelParams: ChannelParams
  channelActive: boolean
  treeReady: boolean
  signer: ethers.Signer | null
  walletAddress: string | null
  onUseSimulated: () => void
  onCreateLive: (data: LiveChannelData) => void
  onClearSession: () => void
}

type ProgressStep = 'idle' | 'generating' | 'signing' | 'submitting' | 'confirmed' | 'error'

const STEP_LABELS: Record<ProgressStep, string> = {
  idle: '',
  generating: 'Generating tree...',
  signing: 'Sign permit in wallet (no gas)...',
  submitting: 'Creating channel...',
  confirmed: 'Confirmed ✓',
  error: 'Transaction failed — see console',
}

function Row({ label, value, isHash = false, link }: {
  label: string
  value: string
  isHash?: boolean
  link?: string
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <span className="font-mono text-xs text-[#6B6A65] w-36 shrink-0">{label}</span>
      <span className="font-mono text-xs text-[#E8E6DF] flex items-center gap-2 min-w-0">
        {isHash ? (
          <HashDisplay hash={value} />
        ) : (
          <span className="truncate">{value}</span>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6B6A65] hover:text-[#00E5A0] transition-colors text-[10px] shrink-0"
            title="View on explorer"
          >
            ↗
          </a>
        )}
      </span>
    </div>
  )
}

export default function ChannelSetup({
  mode,
  channelParams,
  channelActive,
  treeReady,
  signer,
  walletAddress,
  onUseSimulated,
  onCreateLive,
  onClearSession,
}: ChannelSetupProps) {
  const [progress, setProgress] = useState<ProgressStep>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [merchant, setMerchant] = useState<string>('')
  const [reclaimMerchant, setReclaimMerchant] = useState<string>('')
  const [reclaiming, setReclaiming] = useState(false)
  const [reclaimMsg, setReclaimMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const handleReclaim = async () => {
    if (!signer) { setReclaimMsg({ text: 'Connect your wallet first.', ok: false }); return }
    if (!ethers.isAddress(reclaimMerchant)) { setReclaimMsg({ text: 'Enter a valid merchant address.', ok: false }); return }
    setReclaiming(true)
    setReclaimMsg(null)
    const result = await reclaimChannel(reclaimMerchant, signer)
    if (result.success) {
      onClearSession()
      setReclaimMsg({ text: 'Channel reclaimed. You can now create a new one.', ok: true })
    } else {
      setReclaimMsg({ text: result.error ?? 'Reclaim failed', ok: false })
    }
    setReclaiming(false)
  }

  const handleCreateLive = async () => {
    if (!signer) {
      setErrorMsg('Connect your wallet first.')
      setProgress('error')
      return
    }
    if (!merchant || !ethers.isAddress(merchant)) {
      setErrorMsg('Enter a valid merchant address.')
      setProgress('error')
      return
    }
    if (!treeReady) {
      setProgress('generating')
      // Tree is generating — poll briefly then proceed
      await new Promise(r => setTimeout(r, 800))
    }

    setErrorMsg('')

    const result = await createChannel(
      {
        merkleRoot: channelParams.merkleRoot,
        treeSize: channelParams.treeSize,
        merchant,
        merchantWithdrawAfterBlocks: MERCHANT_WITHDRAW_BLOCKS,
        payerWithdrawAfterBlocks: PAYER_WITHDRAW_BLOCKS,
        tokenAmount: String(TOTAL_LOCKED),
        onSigning: () => setProgress('signing'),
        onSubmitting: () => setProgress('submitting'),
      },
      signer
    )

    if (!result.success || result.blockNumber === undefined) {
      setErrorMsg(result.error || 'Transaction failed')
      setProgress('error')
      return
    }

    setProgress('confirmed')
    const payer = result.payer ?? await signer.getAddress()
    onCreateLive({
      payer,
      merchant,
      blockNumber: result.blockNumber,
    })
  }

  const isCreating = progress === 'generating' || progress === 'signing' || progress === 'submitting'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[#6B6A65]">
          Channel Parameters
        </span>
        <div className={`flex items-center gap-1.5 font-mono text-[10px] ${channelActive ? 'text-[#00E5A0]' : 'text-[#6B6A65]'}`}>
          <motion.span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: channelActive ? '#00E5A0' : '#6B6A65' }}
            animate={channelActive ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          {channelActive ? 'ACTIVE' : 'PENDING'}
        </div>
      </div>

      {/* Parameter table */}
      <div className="card rounded-sm p-4">
        <Row
          label="Contract"
          value={channelParams.contractAddress}
          isHash
          link={`${EXPLORER_URL}/address/${channelParams.contractAddress}`}
        />
        <Row label="Merkle root" value={channelParams.merkleRoot} isHash />
        <Row label="Tree size" value={`${channelParams.treeSize.toLocaleString('en-US')} leaves`} />
        <Row label="Token" value={USDFC_ADDRESS} isHash />
        <Row label="Locked amount" value={`${channelParams.lockedAmount.toFixed(2)} USDFC`} />
        <Row label="Value per leaf" value={`${channelParams.valuePerLeaf.toFixed(6)} USDFC`} />
        <Row
          label="Payer"
          value={walletAddress ?? channelParams.payer}
          isHash={!!(walletAddress ?? channelParams.payer)}
        />
        {channelActive && (
          <Row label="Merchant" value={channelParams.merchant} isHash />
        )}
        <Row label="Settle after" value={`block ${channelParams.settleAfterBlock.toLocaleString('en-US')}`} />
        <Row label="Reclaim after" value={`block ${channelParams.reclaimAfterBlock.toLocaleString('en-US')}`} />
        <div className="flex items-center justify-between py-1.5 mt-1">
          <span className="font-mono text-xs text-[#6B6A65]">Status</span>
          <div className={`flex items-center gap-1.5 font-mono text-xs ${channelActive ? 'text-[#00E5A0]' : 'text-[#E8E6DF]'}`}>
            <motion.span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: channelActive ? '#00E5A0' : '#6B6A65' }}
              animate={channelActive ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {channelActive ? 'ACTIVE' : 'NOT CREATED'}
          </div>
        </div>
      </div>

      {/* Mode badge */}
      <div className="flex items-center gap-2">
        <div
          className={`font-mono text-[10px] px-2 py-0.5 border rounded-sm ${
            mode === 'simulated'
              ? 'border-[rgba(255,255,255,0.15)] text-[#6B6A65]'
              : 'border-[#00E5A0] text-[#00E5A0]'
          }`}
        >
          {mode === 'simulated' ? 'SIMULATED MODE' : 'LIVE MODE'}
        </div>
        {mode === 'simulated' && (
          <span className="font-mono text-[10px] text-[#6B6A65]">
            — no wallet required
          </span>
        )}
      </div>

      {/* Merchant address input (shown before channel is created live) */}
      {!channelActive && (
        <div className="space-y-1">
          <label className="font-mono text-[10px] text-[#6B6A65] uppercase tracking-widest">
            Merchant address
          </label>
          <input
            type="text"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            placeholder="0x..."
            className="w-full font-mono text-xs bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-sm px-3 py-2 text-[#E8E6DF] placeholder-[#6B6A65] focus:outline-none focus:border-[rgba(0,229,160,0.4)]"
          />
        </div>
      )}

      {/* Progress indicator */}
      <AnimatePresence>
        {progress !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`font-mono text-xs px-3 py-2 card rounded-sm ${
              progress === 'confirmed' ? 'text-[#00E5A0]' :
              progress === 'error' ? 'text-[#FF6B35]' :
              'text-[#6B6A65]'
            }`}
          >
            {isCreating && (
              <motion.span
                className="inline-block mr-2"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                ◌
              </motion.span>
            )}
            {progress === 'error' ? errorMsg : STEP_LABELS[progress]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          className="btn-primary flex-1"
          onClick={handleCreateLive}
          disabled={isCreating || progress === 'confirmed'}
        >
          Create Channel (live)
        </button>
        <button
          className="btn-secondary flex-1"
          onClick={onUseSimulated}
        >
          Use Simulated Data
        </button>
      </div>

      {/* Info callout */}
      <div className="border border-[rgba(0,229,160,0.15)] bg-[rgba(0,229,160,0.03)] rounded-sm p-3">
        <p className="font-mono text-[10px] text-[#6B6A65] leading-relaxed">
          <span className="text-[#00E5A0]">Note:</span> The Merkle root commits to all{' '}
          {channelParams.treeSize.toLocaleString('en-US')} payment slots at channel creation.{' '}
          No further on-chain interaction is needed until settlement.
        </p>
      </div>

      {/* Reclaim existing channel */}
      <div className="border border-[rgba(255,255,255,0.06)] rounded-sm p-3 space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#6B6A65]">
          Reclaim existing channel
        </span>
        <p className="font-mono text-[10px] text-[#6B6A65] leading-relaxed">
          Recover locked USDFC if proofs are lost on reload, or to close a channel before creating a new one.
        </p>
        <input
          type="text"
          value={reclaimMerchant}
          onChange={e => setReclaimMerchant(e.target.value)}
          placeholder="Merchant address (0x...)"
          className="w-full font-mono text-xs bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-sm px-3 py-2 text-[#E8E6DF] placeholder-[#6B6A65] focus:outline-none focus:border-[rgba(0,229,160,0.4)]"
        />
        {reclaimMsg && (
          <p className={`font-mono text-[10px] ${reclaimMsg.ok ? 'text-[#00E5A0]' : 'text-[#FF6B35]'}`}>
            {reclaimMsg.text}
          </p>
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
          ) : 'Reclaim Channel'}
        </button>
      </div>
    </div>
  )
}
