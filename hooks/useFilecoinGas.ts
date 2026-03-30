'use client'

import { useEffect, useState } from 'react'
import { RPC_URL, USDFC_ADDRESS } from '@/lib/constants'

// Fallback: measured from a real Calibration transfer (2025-03)
const FALLBACK_GAS = 32_451_156

async function fetchTransferGas(): Promise<number> {
  // 1. Find a recent single Transfer log from USDFC
  const latestRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
  })
  const { result: latestHex } = await latestRes.json()
  const latest = parseInt(latestHex, 16)
  const fromBlock = '0x' + (latest - 1800).toString(16)

  const logsRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 2, method: 'eth_getLogs',
      params: [{
        address: USDFC_ADDRESS.toLowerCase(),
        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
        fromBlock,
        toBlock: 'latest',
      }],
    }),
  })
  const { result: logs } = await logsRes.json()
  if (!Array.isArray(logs) || logs.length === 0) return FALLBACK_GAS

  // 2. Find a log with logIndex = 0 (simple transfer, not buried in a complex tx)
  const simple = logs.find((l: { logIndex: string }) => l.logIndex === '0x0')
  const txHash = (simple ?? logs[0]).transactionHash

  // 3. Get the receipt
  const receiptRes = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'eth_getTransactionReceipt', params: [txHash] }),
  })
  const { result: receipt } = await receiptRes.json()
  if (!receipt?.gasUsed) return FALLBACK_GAS

  return parseInt(receipt.gasUsed, 16)
}

export function useFilecoinGas() {
  const [gasPerTransfer, setGasPerTransfer] = useState<number>(FALLBACK_GAS)

  useEffect(() => {
    fetchTransferGas()
      .then(setGasPerTransfer)
      .catch(() => { /* keep fallback */ })
  }, [])

  return gasPerTransfer
}
