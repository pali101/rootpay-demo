# RootPay

**One root. Thousands of payments. One settlement.**

RootPay is a Merkle-indexed micropayment channel system built on Filecoin. A payer locks USDC into a smart contract and commits to a Merkle tree of 1,024 payment slots. The merchant receives off-chain micropayments — one secret per leaf — and settles the entire batch on-chain with a single Merkle proof. No per-payment transactions. No per-payment chain fees.

---

## How It Works

### 1. Channel Creation

The payer generates 1,024 random 32-byte secrets client-side and builds a Merkle tree. Each leaf is hashed as:

```
leaf[i] = keccak256(abi.encode(uint16(i), bytes32(secret[i])))
```

The Merkle root, along with 10 USDC (ERC20), is committed on-chain via `createChannel`. This is the only transaction the payer ever sends.

### 2. Off-Chain Payments

For each micropayment, the payer reveals `(leafIndex, secret[leafIndex])` to the merchant off-chain. The merchant verifies the secret against the on-chain Merkle root without touching the chain.

### 3. Trust Tiers

The merchant periodically checkpoints a full Merkle proof to establish a verifiable claim. Three configurable windows:

| Tier | Window | Proof frequency |
|------|--------|-----------------|
| Tight | 30 sec | ~2/min |
| Default | 60 sec | ~1/min |
| Relaxed | 300 sec | ~12/hr |

### 4. Settlement

The merchant calls `redeemChannel` with the highest verified leaf index, its secret, and a 10-hash Merkle proof. The contract:
- Pays out `(leafIndex + 1) × valuePerLeaf` USDC to the merchant
- Refunds the remainder to the payer

### 5. Reclaim

If the payer needs to close the channel early (e.g., page reload lost the secrets), they can call `reclaimChannel` after `payerWithdrawAfterBlocks` to recover locked funds.

---

## Contract Interface

Deployed on Filecoin Calibration testnet at `0x5f3784791704d69e975D129AfEc55c23D3616AA4`.

```solidity
// Payer locks USDC and commits a Merkle root
function createChannel(
    address merchant,
    address token,
    bytes32 merkleRoot,
    uint256 amount,
    uint16 treeSize,
    uint64 merchantWithdrawAfterBlocks,
    uint64 payerWithdrawAfterBlocks
) external;

// Merchant redeems with the highest verified leaf
// msg.sender must be the merchant address
function redeemChannel(
    address payer,
    address token,
    uint16 leafIndex,
    bytes32 secret,
    bytes32[] calldata proof
) external;

// Payer recovers funds if proofs are lost
// msg.sender must be the payer address, callable after payerWithdrawAfterBlocks
function reclaimChannel(
    address merchant,
    address token
) external;

event ChannelCreated(address indexed payer, address indexed merchant, address token, uint256 amount, uint16 treeSize, uint64 merchantWithdrawAfterBlocks);
event ChannelRedeemed(address indexed payer, address indexed merchant, address token, uint256 amountPaid, uint16 leafIndex);
event ChannelRefunded(address indexed payer, address indexed merchant, address token, uint256 refundAmount);
event ChannelReclaimed(address indexed payer, address indexed merchant, address token, uint64 blockNumber);
```

---

## Demo

The demo runs in two modes:

- **Simulated** (default) — Pre-seeded data, no wallet required. Explore the full UI and payment flow instantly.
- **Live** — Connect MetaMask to Filecoin Calibration testnet and interact with the deployed contract using real USDC.

The UI has two roles:

- **Payer** — Four tabs: Channel Setup, Live Ticker, Trust Tiers, Settlement.
- **Merchant** — Dedicated dashboard to paste a proof JSON and redeem the channel.

The payer copies a proof bundle (JSON with `payer`, `leafIndex`, `secret`, `proof`) from the Live Ticker tab and sends it to the merchant, who pastes it into the Merchant Dashboard to settle on-chain.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5f3784791704d69e975D129AfEc55c23D3616AA4
NEXT_PUBLIC_USDC=0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0
NEXT_PUBLIC_RPC_URL=https://api.calibration.node.glif.io/rpc/v1
NEXT_PUBLIC_MERCHANT_WITHDRAW_BLOCKS=100
NEXT_PUBLIC_PAYER_WITHDRAW_BLOCKS=200
```

### Run

```bash
npm run dev      # development server at http://localhost:3000
npm run build    # production build
```

---

## Project Structure

```
app/
  layout.tsx              # Root layout, fonts, metadata
  page.tsx                # Entry point — mounts DemoApp

components/
  DemoApp.tsx             # Top-level state and role routing (payer / merchant)
  WalletGate.tsx          # Connect wallet + choose payer or merchant role
  HeroHeader.tsx          # Live leaf count and USDC earned off-chain
  MerkleViz.tsx           # Animated SVG Merkle tree with proof path highlight
  HashDisplay.tsx         # Truncated hash with copy-to-clipboard
  StatCard.tsx            # Stat tile (leaf index, USDC earned, proofs verified)
  ChainBadge.tsx          # Filecoin Calibration network indicator
  tabs/
    ChannelSetup.tsx      # USDC approve → createChannel, reclaim option
    LiveTicker.tsx        # Real-time payment event feed, Copy Proof button
    TrustTiers.tsx        # Verification window selector (30s / 60s / 5min)
    Settlement.tsx        # Final on-chain redemption with proof animation
    MerchantPanel.tsx     # Paste proof JSON, preview, and redeemChannel

hooks/
  useChannel.ts           # 1024-secret generation, Merkle tree, proof helpers
  useTicker.ts            # Payment event simulation at configurable speed
  useWallet.ts            # MetaMask connect, address, ethers Signer
  useEthersSigner.ts      # Bridges wagmi viem client to ethers.js Signer

lib/
  merkle.ts               # buildTree, generateSecrets, getProof, getTreeRoot
  contract.ts             # createChannel, redeemChannel, reclaimChannel + error decoding
  constants.ts            # Contract/token addresses, RPC, tree params
  demoData.ts             # Pre-seeded demo values (CIDs, addresses, hashes)
  wagmi-config.ts         # wagmi chain config for Filecoin Calibration
```

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 |
| Language | TypeScript |
| Wallet | wagmi v2 + MetaMask |
| Blockchain | ethers.js 6, Filecoin Calibration (chain ID 314159) |
| Cryptography | merkletreejs, keccak256 |
| Animations | Framer Motion |
| Styling | Tailwind CSS |
| Fonts | IBM Plex Mono, Syne |

---

## Network

| | |
|---|---|
| Network | Filecoin Calibration testnet |
| Chain ID | 314159 |
| RPC | `https://api.calibration.node.glif.io/rpc/v1` |
| Explorer | `https://calibration.filfox.info` |
| FIL faucet | `https://faucet.calibnet.chainsafe-fil.io/funds.html` |
| Get USDC | `https://docs.secured.finance/usdfc-stablecoin/getting-started/getting-test-usdfc-on-testnet` |

---

## License

MIT
