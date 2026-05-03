import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia } from 'viem/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo'

export const wagmiConfig = getDefaultConfig({
  appName: 'RootPay',
  projectId,
  chains: [baseSepolia],
  ssr: false,
})
