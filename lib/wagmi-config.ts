import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { filecoinCalibration } from 'viem/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo'

export const wagmiConfig = getDefaultConfig({
  appName: 'RootPay',
  projectId,
  chains: [filecoinCalibration],
  ssr: false,
})
