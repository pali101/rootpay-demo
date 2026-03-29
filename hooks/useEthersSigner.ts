'use client'

import { useMemo } from 'react'
import { useWalletClient } from 'wagmi'
import { ethers } from 'ethers'
import type { Account, Chain, Client, Transport } from 'viem'

// Converts a viem WalletClient to an ethers v6 Signer
export function clientToSigner(client: Client<Transport, Chain, Account>): ethers.JsonRpcSigner {
  const { account, chain, transport } = client
  const network = { chainId: chain.id, name: chain.name }
  const provider = new ethers.BrowserProvider(transport as ethers.Eip1193Provider, network)
  return new ethers.JsonRpcSigner(provider, account.address)
}

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient()
  return useMemo(
    () => (walletClient ? clientToSigner(walletClient as Client<Transport, Chain, Account>) : null),
    [walletClient]
  )
}
