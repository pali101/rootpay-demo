const SUBGRAPH_URL =
  'https://api.goldsky.com/api/public/project_cm85j9kf21mz301x6d08lhbpf/subgraphs/rootpay/dev/gn'

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

export type SubgraphChannel = {
  id: string
  payer: string
  merchant: string
  token: string
  amount: string       // wei string
  treeSize: string
  blockNumber: string
  txHash: string
  merchantWithdrawAfterBlocks: string
}

export async function fetchOpenChannelsForMerchant(
  merchantAddress: string
): Promise<SubgraphChannel[]> {
  const merchant = merchantAddress.toLowerCase()

  const data = await gql(`
    query($merchant: String!) {
      created: channelCreateds(
        where: { merchant: $merchant }
        first: 100
        orderBy: block_number
        orderDirection: desc
      ) {
        id
        payer
        merchant
        token
        amount
        treeSize
        block_number
        transactionHash_
        merchantWithdrawAfterBlocks
      }
      redeemed: channelRedeemeds(
        where: { merchant: $merchant }
        first: 100
      ) {
        payer
        token
      }
      reclaimed: channelReclaimeds(
        where: { merchant: $merchant }
        first: 100
      ) {
        payer
        token
      }
    }
  `, { merchant })

  // Count closed channels per payer+token (each redeem/reclaim closes exactly one channel)
  const closedCount = new Map<string, number>()
  for (const e of [...data.redeemed, ...data.reclaimed] as { payer: string; token: string }[]) {
    const key = `${e.payer}:${e.token}`
    closedCount.set(key, (closedCount.get(key) ?? 0) + 1)
  }

  // Count created channels per payer+token to find net open ones
  const createdCount = new Map<string, number>()
  for (const e of data.created as { payer: string; token: string }[]) {
    const key = `${e.payer}:${e.token}`
    createdCount.set(key, (createdCount.get(key) ?? 0) + 1)
  }

  // A payer+token has open channels if created > closed; keep only the latest (first after desc sort)
  const seen = new Set<string>()
  return data.created
    .filter((e: { payer: string; token: string }) => {
      const key = `${e.payer}:${e.token}`
      const net = (createdCount.get(key) ?? 0) - (closedCount.get(key) ?? 0)
      if (net <= 0) return false
      if (seen.has(key)) return false  // already included the latest for this key
      seen.add(key)
      return true
    })
    .map((e: {
      id: string; payer: string; merchant: string; token: string;
      amount: string; treeSize: string; block_number: string;
      transactionHash_: string; merchantWithdrawAfterBlocks: string;
    }) => ({
      id: e.id,
      payer: e.payer,
      merchant: e.merchant,
      token: e.token,
      amount: e.amount,
      treeSize: e.treeSize,
      blockNumber: e.block_number,
      txHash: e.transactionHash_,
      merchantWithdrawAfterBlocks: e.merchantWithdrawAfterBlocks,
    }))
}
