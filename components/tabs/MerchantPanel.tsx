'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ethers } from 'ethers'
import HashDisplay from '../HashDisplay'
import { USDFC_ADDRESS, VALUE_PER_LEAF, TOTAL_LOCKED, TREE_SIZE, EXPLORER_URL } from '@/lib/constants'
import { redeemChannel } from '@/lib/contract'

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

function Row({ label, value, isHash, accent }: {
  label: string; value: string; isHash?: boolean; accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <span className="font-mono text-xs text-[#6B6A65] w-40 shrink-0">{label}</span>
      <span className={`font-mono text-xs min-w-0 ${accent ? 'text-[#00E5A0]' : 'text-[#E8E6DF]'}`}>
        {isHash ? <HashDisplay hash={value} /> : <span className="truncate">{value}</span>}
      </span>
    </div>
  )
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

export default function MerchantPanel({
  signer,
  walletAddress,
  sessionPayer,
  sessionLeafIndex,
  sessionMode,
  getSecretForLeaf,
  getProofForLeaf,
}: MerchantPanelProps) {
  const [pasteRaw, setPasteRaw] = useState('')
  const [useManual, setUseManual] = useState(false)

  const [step, setStep] = useState<RedeemStep>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [txHash, setTxHash] = useState<string | undefined>()

  const hasSession = sessionMode === 'live' && !!sessionPayer && sessionLeafIndex > 0
  const useSession = hasSession && !useManual

  // Try to parse pasted JSON
  const parsed = tryParseProof(pasteRaw)

  // Resolved values
  const payer = useSession ? sessionPayer : (parsed?.payer ?? '')
  const redeemLeafIndex = useSession ? Math.max(0, sessionLeafIndex - 1) : (parsed?.leafIndex ?? 0)
  const secret = useSession ? getSecretForLeaf(redeemLeafIndex) : (parsed?.secret ?? '')
  const proof = useSession ? getProofForLeaf(redeemLeafIndex) : (parsed?.proof ?? [])

  const claimable = ((redeemLeafIndex + 1) * VALUE_PER_LEAF).toFixed(6)
  const refund = (TOTAL_LOCKED - (redeemLeafIndex + 1) * VALUE_PER_LEAF).toFixed(6)

  const handleRedeem = async () => {
    if (!signer) { setErrorMsg('Connect your wallet first.'); setStep('error'); return }
    if (!ethers.isAddress(payer)) { setErrorMsg('Payer address is missing or invalid — make sure the proof JSON includes a "payer" field.'); setStep('error'); return }
    if (redeemLeafIndex < 0 || redeemLeafIndex >= TREE_SIZE) { setErrorMsg('Invalid leaf index.'); setStep('error'); return }
    if (!secret || proof.length === 0) { setErrorMsg('Secret and proof are required.'); setStep('error'); return }

    setStep('submitting')
    setErrorMsg('')
    const result = await redeemChannel({ payer, leafIndex: redeemLeafIndex, secret, proof }, signer)
    if (result.success) {
      setTxHash(result.txHash)
      setStep('confirmed')
    } else {
      setErrorMsg(result.error ?? 'Redeem failed')
      setStep('error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-[#6B6A65]">Merchant View</span>
        <span className={`font-mono text-[10px] px-2 py-0.5 border rounded-sm ${
          walletAddress ? 'border-[#00E5A0] text-[#00E5A0]' : 'border-[rgba(255,255,255,0.15)] text-[#6B6A65]'
        }`}>
          {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'NO WALLET'}
        </span>
      </div>

      {/* Session summary */}
      {useSession && (
        <div className="card rounded-sm p-4">
          <Row label="Payer" value={sessionPayer} isHash />
          <Row label="Token" value={USDFC_ADDRESS} isHash />
          <Row label="Payments received" value={`${sessionLeafIndex} / ${TREE_SIZE.toLocaleString('en-US')}`} />
          <Row label="Claimable" value={`${claimable} USDFC`} accent />
          <Row label="Refund to payer" value={`${refund} USDFC`} />
          <Row label="Leaf index" value={String(redeemLeafIndex)} />
        </div>
      )}

      {/* Paste proof JSON */}
      {!useSession && (
        <div className="card rounded-sm p-4 space-y-3">
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
            rows={8}
            placeholder={'Paste the JSON from "Copy Proof" in the payer\'s Live Ticker tab:\n\n{\n  "payer": "0x...",\n  "leafIndex": 436,\n  "secret": "0x...",\n  "proof": ["0x...", ...]\n}'}
            className="w-full font-mono text-xs bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-sm px-3 py-2 text-[#E8E6DF] placeholder-[#6B6A65] focus:outline-none focus:border-[rgba(0,229,160,0.4)] resize-none"
          />

          {/* Parsed preview */}
          {parsed && (
            <div className="space-y-0 border-t border-[rgba(255,255,255,0.06)] pt-3">
              <Row label="Payer" value={parsed.payer || '(not in JSON)'} isHash={!!parsed.payer} />
              <Row label="Leaf index" value={String(parsed.leafIndex)} />
              <Row label="Secret" value={parsed.secret} isHash />
              <Row label="Proof length" value={`${parsed.proof.length} hashes`} />
              <Row label="Claimable" value={`${claimable} USDFC`} accent />
            </div>
          )}
        </div>
      )}

      {/* Toggle session ↔ paste */}
      {hasSession && (
        <button
          className="font-mono text-[10px] text-[#6B6A65] hover:text-[#E8E6DF] transition-colors underline underline-offset-2"
          onClick={() => { setUseManual(v => !v); setStep('idle'); setErrorMsg('') }}
        >
          {useManual ? '← Use session data' : 'Paste proof from payer →'}
        </button>
      )}

      {/* Error */}
      {step === 'error' && (
        <p className="font-mono text-[10px] text-[#FF6B35]">{errorMsg}</p>
      )}

      {/* Confirmed */}
      {step === 'confirmed' && txHash && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="card rounded-sm p-4 space-y-2 border border-[rgba(0,229,160,0.2)]"
        >
          <div className="font-mono text-xs text-[#00E5A0]">Redeemed ✓</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#6B6A65]">Tx hash</span>
            <span className="font-mono text-[10px] text-[#E8E6DF] flex items-center gap-2">
              <HashDisplay hash={txHash} />
              <a href={`${EXPLORER_URL}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="text-[#6B6A65] hover:text-[#00E5A0] text-[10px]">↗</a>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#6B6A65]">Received</span>
            <span className="font-mono text-[10px] text-[#00E5A0]">+{claimable} USDFC</span>
          </div>
        </motion.div>
      )}

      <button
        className="btn-primary w-full"
        onClick={handleRedeem}
        disabled={step === 'submitting' || step === 'confirmed' || (!useSession && !parsed)}
      >
        {step === 'submitting' ? (
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
            Submitting redemption...
          </motion.span>
        ) : step === 'confirmed' ? 'Redeemed ✓' : 'Redeem Channel (merchant)'}
      </button>

      <div className="border border-[rgba(255,255,255,0.06)] rounded-sm p-3">
        <p className="font-mono text-[10px] text-[#6B6A65] leading-relaxed">
          <span className="text-[#E8E6DF]">How it works:</span> Payer clicks{' '}
          <span className="text-[#E8E6DF]">⎘ Copy Proof</span> in Live Ticker and sends you the JSON.
          Paste it here — the highest verified leaf claims all accumulated USDFC in one on-chain tx.
        </p>
      </div>
    </div>
  )
}
