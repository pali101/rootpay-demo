export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x7f3a4b8c2d1e9f0a3b5c7d2e4f6a8b0c1d3e5f7a'
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
export const CHAIN_ID = 314159 // Filecoin Calibration testnet
export const CHAIN_NAME = 'Filecoin Calibration'
export const EXPLORER_URL = 'https://calibration.filfox.info/en'

export const TREE_SIZE = 1024
export const VALUE_PER_LEAF = 10 / 1024 // USDFC (10 USDFC / 1024 leaves)
export const TOTAL_LOCKED = 10 // USDFC

// USDFC ERC20 token (Filecoin Calibration)
export const USDFC_ADDRESS = process.env.NEXT_PUBLIC_USDFC || '0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0'

// Live mode config — set these in .env.local
export const MERCHANT_WITHDRAW_BLOCKS = Number(process.env.NEXT_PUBLIC_MERCHANT_WITHDRAW_BLOCKS) || 100
export const PAYER_WITHDRAW_BLOCKS = Number(process.env.NEXT_PUBLIC_PAYER_WITHDRAW_BLOCKS) || 200
