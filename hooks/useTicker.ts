'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DEMO_CIDS } from '@/lib/demoData'
import { VALUE_PER_LEAF, TREE_SIZE } from '@/lib/constants'

export type PaymentEvent = {
  id: string
  timestamp: string
  cid: string
  byteStart: number
  byteEnd: number
  leafIndex: number
  verified: boolean
}

export type TickerSpeed = '1x' | '10x' | '100x'

const SPEED_INTERVALS: Record<TickerSpeed, [number, number]> = {
  '1x':   [800, 1200],  // ~1 payment/sec — real-time feel
  '10x':  [80, 120],    // ~10 payments/sec
  '100x': [8, 12],      // ~100 payments/sec
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatTimestamp(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}.${String(now.getMilliseconds()).padStart(3,'0')}`
}

export function useTicker(
  trustWindow: 30 | 60 | 300,
  onLeafIndexChange: (index: number) => void
) {
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState<TickerSpeed>('10x')
  const [proofsVerified, setProofsVerified] = useState(0)
  const [leafIndex, setLeafIndex] = useState(0)

  const leafIndexRef = useRef(0)
  const proofsVerifiedRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runningRef = useRef(false)
  const speedRef = useRef<TickerSpeed>('10x')
  const trustWindowRef = useRef<30 | 60 | 300>(60)

  // Keep refs in sync
  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { trustWindowRef.current = trustWindow }, [trustWindow])

  const scheduleNextTick = useCallback(() => {
    if (!runningRef.current) return
    const [min, max] = SPEED_INTERVALS[speedRef.current]
    const delay = randomInRange(min, max)
    timerRef.current = setTimeout(() => {
      tick()
    }, delay)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const tick = useCallback(() => {
    if (!runningRef.current) return

    const currentIndex = leafIndexRef.current
    if (currentIndex >= TREE_SIZE - 1) {
      // Max leaves reached
      runningRef.current = false
      setRunning(false)
      return
    }

    const nextIndex = currentIndex + 1
    leafIndexRef.current = nextIndex

    const cidIndex = nextIndex % DEMO_CIDS.length
    const cid = DEMO_CIDS[cidIndex]
    const byteStart = (nextIndex - 1) * 4096
    const byteEnd = nextIndex * 4096 - 1

    // Check if this tick is a proof-check boundary
    // trustWindow in seconds, avg tick ~115ms → ~8.7 ticks/sec at normal speed
    // proof check every (trustWindow * 8.7) ticks ≈ trustWindow * 8
    const proofCheckInterval = Math.max(1, Math.floor(trustWindowRef.current * 8))
    const isVerified = nextIndex % proofCheckInterval === 0

    if (isVerified) {
      proofsVerifiedRef.current += 1
      setProofsVerified(proofsVerifiedRef.current)
    }

    const event: PaymentEvent = {
      id: `${nextIndex}-${Date.now()}`,
      timestamp: formatTimestamp(),
      cid,
      byteStart,
      byteEnd,
      leafIndex: nextIndex,
      verified: isVerified,
    }

    setLeafIndex(nextIndex)
    onLeafIndexChange(nextIndex)

    setEvents(prev => {
      const next = [event, ...prev]
      return next.slice(0, 12) // Keep max 12 rows
    })

    scheduleNextTick()
  }, [onLeafIndexChange, scheduleNextTick])

  const start = useCallback(() => {
    if (runningRef.current) return
    runningRef.current = true
    setRunning(true)
    scheduleNextTick()
  }, [scheduleNextTick])

  const stop = useCallback(() => {
    runningRef.current = false
    setRunning(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stop()
    leafIndexRef.current = 0
    proofsVerifiedRef.current = 0
    setLeafIndex(0)
    setProofsVerified(0)
    setEvents([])
    onLeafIndexChange(0)
  }, [stop, onLeafIndexChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runningRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const filEarned = (leafIndex * VALUE_PER_LEAF).toFixed(6)

  return {
    events,
    running,
    speed,
    setSpeed,
    start,
    stop,
    reset,
    leafIndex,
    proofsVerified,
    filEarned,
  }
}
