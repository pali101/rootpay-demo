'use client'

import { useEffect, useState } from 'react'
import { fetchOpenChannelsForMerchant, type SubgraphChannel } from '@/lib/subgraph'

export function useOpenChannels(merchantAddress: string | null) {
  const [channels, setChannels] = useState<SubgraphChannel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!merchantAddress) { setChannels([]); return }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchOpenChannelsForMerchant(merchantAddress)
      .then(data => { if (!cancelled) { setChannels(data); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [merchantAddress])

  return { channels, loading, error }
}
