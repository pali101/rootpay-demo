'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { MerkleTree } from 'merkletreejs'
import { buildTree, generateSecrets, getTreeRoot, getProof } from '@/lib/merkle'
import {
  DEMO_MERKLE_ROOT,
  DEMO_CONTRACT_ADDRESS,
  DEMO_PAYER,
  DEMO_MERCHANT,
  DEMO_SETTLE_BLOCK,
  DEMO_RECLAIM_BLOCK,
} from '@/lib/demoData'
import {
  TREE_SIZE,
  VALUE_PER_LEAF,
  TOTAL_LOCKED,
  CONTRACT_ADDRESS,
  MERCHANT_WITHDRAW_BLOCKS,
  PAYER_WITHDRAW_BLOCKS,
} from '@/lib/constants'

export type ChannelParams = {
  contractAddress: string
  merkleRoot: string
  treeSize: number
  lockedAmount: number
  valuePerLeaf: number
  payer: string
  merchant: string
  settleAfterBlock: number
  reclaimAfterBlock: number
}

export type LiveChannelData = {
  payer: string
  merchant: string
  blockNumber: number
}

export function useChannel(mode: 'simulated' | 'live') {
  const secretsRef = useRef<Uint8Array[] | null>(null)
  const treeRef = useRef<MerkleTree | null>(null)
  const [treeReady, setTreeReady] = useState(false)
  const [merkleRoot, setMerkleRoot] = useState<string>(DEMO_MERKLE_ROOT)
  const [liveData, setLiveData] = useState<LiveChannelData | null>(null)

  useEffect(() => {
    if (secretsRef.current) return
    const secrets = generateSecrets(TREE_SIZE)
    secretsRef.current = secrets
    const tree = buildTree(TREE_SIZE, secrets)
    treeRef.current = tree
    const root = getTreeRoot(tree)
    setMerkleRoot(root)
    setTreeReady(true)
  }, [])

  const setLiveChannelData = useCallback((data: LiveChannelData) => {
    setLiveData(data)
  }, [])

  const isLive = mode === 'live' && liveData !== null

  const channelParams: ChannelParams = isLive
    ? {
        contractAddress: CONTRACT_ADDRESS,
        merkleRoot: treeReady ? merkleRoot : DEMO_MERKLE_ROOT,
        treeSize: TREE_SIZE,
        lockedAmount: TOTAL_LOCKED,
        valuePerLeaf: VALUE_PER_LEAF,
        payer: liveData.payer,
        merchant: liveData.merchant,
        settleAfterBlock: liveData.blockNumber + MERCHANT_WITHDRAW_BLOCKS,
        reclaimAfterBlock: liveData.blockNumber + PAYER_WITHDRAW_BLOCKS,

      }
    : {
        contractAddress: DEMO_CONTRACT_ADDRESS,
        merkleRoot: treeReady ? merkleRoot : DEMO_MERKLE_ROOT,
        treeSize: TREE_SIZE,
        lockedAmount: TOTAL_LOCKED,
        valuePerLeaf: VALUE_PER_LEAF,
        payer: DEMO_PAYER,
        merchant: DEMO_MERCHANT,
        settleAfterBlock: DEMO_SETTLE_BLOCK,
        reclaimAfterBlock: DEMO_RECLAIM_BLOCK,

      }

  const getProofForLeaf = (leafIndex: number): string[] => {
    if (!treeRef.current) return []
    return getProof(treeRef.current, leafIndex)
  }

  const getSecretForLeaf = (leafIndex: number): string => {
    if (!secretsRef.current) return '0x' + '00'.repeat(32)
    const s = secretsRef.current[leafIndex]
    return '0x' + Array.from(s).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  return {
    channelParams,
    treeReady,
    setLiveChannelData,
    getProofForLeaf,
    getSecretForLeaf,
    tree: treeRef.current,
  }
}
