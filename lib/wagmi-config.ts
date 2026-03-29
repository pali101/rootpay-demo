import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { filecoinCalibration } from 'viem/chains'

// Get a free project ID at https://cloud.walletconnect.com (takes 30 seconds, no credit card)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo'

export const wagmiConfig = getDefaultConfig({
  appName: 'RootPay',
  projectId,
  chains: [filecoinCalibration],
  ssr: false,
})
