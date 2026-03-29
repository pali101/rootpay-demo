'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { USDFC_ADDRESS } from '@/lib/constants'

const ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

export function useUSDFCBalance(signer: ethers.Signer | null | undefined): string | null {
  const [balance, setBalance] = useState<string | null>(null)

  useEffect(() => {
    if (!signer) { setBalance(null); return }

    let cancelled = false

    const fetch = async () => {
      try {
        const token = new ethers.Contract(USDFC_ADDRESS, ABI, signer)
        const [raw, decimals]: [bigint, number] = await Promise.all([
          token.balanceOf(await signer.getAddress()),
          token.decimals(),
        ])
        if (!cancelled) {
          setBalance(parseFloat(ethers.formatUnits(raw, decimals)).toFixed(2))
        }
      } catch {
        // silently ignore
      }
    }

    fetch()
    const interval = setInterval(fetch, 15_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [signer])

  return balance
}
