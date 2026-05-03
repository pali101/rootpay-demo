export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xA5a481b8a8b32Ac5525D4092c65BF2e18A5fD907'
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'
export const CHAIN_ID = 84532 // Base Sepolia testnet
export const CHAIN_NAME = 'Base Sepolia'
export const EXPLORER_URL = 'https://sepolia.basescan.org'

export const TREE_SIZE = 8192
export const VALUE_PER_LEAF = 10 / 8192 // USDC (10 USDC / 8192 leaves)
export const TOTAL_LOCKED = 10 // USDC

// USDC ERC20 token (Base Sepolia)
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

// Live mode config — set these in .env.local
export const MERCHANT_WITHDRAW_BLOCKS = Number(process.env.NEXT_PUBLIC_MERCHANT_WITHDRAW_BLOCKS) || 100
export const PAYER_WITHDRAW_BLOCKS = Number(process.env.NEXT_PUBLIC_PAYER_WITHDRAW_BLOCKS) || 200
