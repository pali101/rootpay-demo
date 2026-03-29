'use client'

import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useEthersSigner } from './useEthersSigner'

export type WalletState = {
  connected: boolean
  address: string | null
  signer: ReturnType<typeof useEthersSigner>
  hasWallet: boolean
  connecting: boolean
  error: string | null
  connect: () => void
  disconnect: () => void
}

export function useWallet(): WalletState {
  const { address, isConnected, isConnecting } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { disconnect } = useDisconnect()
  const signer = useEthersSigner()

  return {
    connected: isConnected,
    address: address ?? null,
    signer,
    hasWallet: true, // RainbowKit handles wallet detection
    connecting: isConnecting,
    error: null,
    connect: () => openConnectModal?.(),
    disconnect,
  }
}
