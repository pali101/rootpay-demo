'use client'

import { useState, useCallback } from 'react'

type HashDisplayProps = {
  hash: string
  truncateStart?: number
  truncateEnd?: number
  className?: string
  showCopy?: boolean
}

export default function HashDisplay({
  hash,
  truncateStart = 6,
  truncateEnd = 4,
  className = '',
  showCopy = true,
}: HashDisplayProps) {
  const [copied, setCopied] = useState(false)

  const display =
    hash.length > truncateStart + truncateEnd + 3
      ? `${hash.slice(0, truncateStart)}...${hash.slice(-truncateEnd)}`
      : hash

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }, [hash])

  return (
    <span
      className={`font-mono text-sm group relative inline-flex items-center gap-1 ${className}`}
      title={hash}
    >
      <span className="text-[#E8E6DF]">{display}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-[#6B6A65] text-xs ml-0.5 cursor-pointer"
          title="Copy full hash"
        >
          {copied ? '✓' : '⎘'}
        </button>
      )}
    </span>
  )
}
