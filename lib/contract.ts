import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, USDFC_ADDRESS } from './constants'

const ABI = [
  // createChannel(merchant, token, merkleRoot, amount, treeSize, merchantWithdrawAfterBlocks, payerWithdrawAfterBlocks)
  'function createChannel(address merchant, address token, bytes32 merkleRoot, uint256 amount, uint16 treeSize, uint64 merchantWithdrawAfterBlocks, uint64 payerWithdrawAfterBlocks) payable',
  // redeemChannel(payer, token, leafIndex, secret, proof) — msg.sender must be merchant
  'function redeemChannel(address payer, address token, uint16 leafIndex, bytes32 secret, bytes32[] calldata proof)',
  // reclaimChannel(merchant, token) — msg.sender must be payer, called after payerWithdrawAfterBlocks
  'function reclaimChannel(address merchant, address token)',
  'event ChannelCreated(address indexed payer, address indexed merchant, address token, uint256 amount, uint16 treeSize, uint64 merchantWithdrawAfterBlocks)',
  'event ChannelRedeemed(address indexed payer, address indexed merchant, address token, uint256 amountPaid, uint16 leafIndex)',
  'event ChannelRefunded(address indexed payer, address indexed merchant, address token, uint256 refundAmount)',
  'event ChannelReclaimed(address indexed payer, address indexed merchant, address token, uint64 blockNumber)',
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

const ERRORS_ABI = [
  'error ChannelAlreadyExists(address payer, address merchant, address token)',
  'error ChannelDoesNotExistOrWithdrawn()',
  'error MerchantCannotRedeemChannelYet(uint64 availableAtBlock)',
  'error PayerCannotReclaimChannelYet(uint64 availableAtBlock)',
  'error LeafIndexOutOfBounds(uint16 leafIndex, uint16 treeSize)',
  'error ProofLengthMismatch(uint256 actual, uint256 expected)',
  'error MerkleProofVerificationFailed()',
  'error NothingPayable()',
]

const errorsInterface = new ethers.Interface(ERRORS_ABI)

function decodeContractError(e: unknown): string {
  if (!(e instanceof Error)) return 'Unknown error'
  // Try to extract revert data from ethers error
  const data: string | undefined =
    (e as { data?: string }).data ??
    e.message.match(/data="(0x[0-9a-fA-F]+)"/)?.[1]
  if (data && data !== '0x') {
    try {
      const decoded = errorsInterface.parseError(data)
      if (decoded) {
        switch (decoded.name) {
          case 'ChannelAlreadyExists':
            return 'Channel already exists for this payer/merchant/token. Reclaim it first before creating a new one.'
          case 'ChannelDoesNotExistOrWithdrawn':
            return 'Channel not found. It may have already been settled or reclaimed.'
          case 'MerchantCannotRedeemChannelYet':
            return `Merchant cannot redeem yet. Available at block ${decoded.args[0]}.`
          case 'PayerCannotReclaimChannelYet':
            return `Cannot reclaim yet. Available at block ${decoded.args[0]}.`
          case 'LeafIndexOutOfBounds':
            return `Leaf index ${decoded.args[0]} is out of bounds (tree size ${decoded.args[1]}).`
          case 'ProofLengthMismatch':
            return `Proof length mismatch: got ${decoded.args[0]}, expected ${decoded.args[1]}.`
          case 'MerkleProofVerificationFailed':
            return 'Merkle proof verification failed. The secret or proof is invalid.'
          case 'NothingPayable':
            return 'Nothing to pay — leaf index results in zero merchant amount.'
        }
      }
    } catch {
      // fall through to raw message
    }
  }
  return e.message
}

export type TxResult = {
  success: boolean
  txHash?: string
  blockNumber?: number
  error?: string
}

export type CreateChannelResult = TxResult & {
  payer?: string
}

export type CreateChannelParams = {
  merchant: string
  merkleRoot: string
  treeSize: number
  merchantWithdrawAfterBlocks: number
  payerWithdrawAfterBlocks: number
  tokenAmount: string // USDFC amount as human-readable string (e.g. "10")
  onApproving?: () => void
  onSubmitting?: () => void
}

export type RedeemChannelParams = {
  payer: string          // the payer's address (channel owner)
  leafIndex: number      // 0-based highest verified leaf index
  secret: string
  proof: string[]
}

export async function createChannel(
  params: CreateChannelParams,
  signer: ethers.Signer
): Promise<CreateChannelResult> {
  try {
    const token = new ethers.Contract(USDFC_ADDRESS, ERC20_ABI, signer)
    const decimals: number = await token.decimals()
    const amount = ethers.parseUnits(params.tokenAmount, decimals)

    // Step 1: approve only if current allowance is insufficient
    const owner = await signer.getAddress()
    const allowance: bigint = await token.allowance(owner, CONTRACT_ADDRESS)
    if (allowance < amount) {
      params.onApproving?.()
      const approveTx = await token.approve(CONTRACT_ADDRESS, amount)
      await approveTx.wait()
    }

    // Step 2: create the channel (no native value sent)
    params.onSubmitting?.()
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
    const tx = await contract.createChannel(
      params.merchant,
      USDFC_ADDRESS,
      params.merkleRoot,
      amount,
      params.treeSize,
      params.merchantWithdrawAfterBlocks,
      params.payerWithdrawAfterBlocks
    )
    const receipt = await tx.wait()
    const payer = await signer.getAddress()
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber, payer }
  } catch (e: unknown) {
    return { success: false, error: decodeContractError(e) }
  }
}

// Note: msg.sender must be the payer. Called after payerWithdrawAfterBlocks have passed.
export async function reclaimChannel(
  merchant: string,
  signer: ethers.Signer
): Promise<TxResult> {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
    const tx = await contract.reclaimChannel(merchant, USDFC_ADDRESS)
    const receipt = await tx.wait()
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber }
  } catch (e: unknown) {
    return { success: false, error: decodeContractError(e) }
  }
}

// Note: msg.sender must be the merchant address to redeem.
export async function redeemChannel(
  params: RedeemChannelParams,
  signer: ethers.Signer
): Promise<TxResult> {
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
    const tx = await contract.redeemChannel(
      params.payer,
      USDFC_ADDRESS,
      params.leafIndex,
      params.secret,
      params.proof
    )
    const receipt = await tx.wait()
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber }
  } catch (e: unknown) {
    return { success: false, error: decodeContractError(e) }
  }
}
