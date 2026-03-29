import { MerkleTree } from 'merkletreejs'
import { keccak256, AbiCoder } from 'ethers'

const abiCoder = AbiCoder.defaultAbiCoder()

export function buildTree(N: number, secrets: Uint8Array[]): MerkleTree {
  const leaves = secrets.map((s, i) => {
    const secretHex = '0x' + Array.from(s).map(b => b.toString(16).padStart(2, '0')).join('')
    return keccak256(abiCoder.encode(['uint16', 'bytes32'], [i, secretHex]))
  })
  return new MerkleTree(leaves, keccak256, { sortPairs: false })
}

export function getProof(tree: MerkleTree, leafIndex: number): string[] {
  const leaves = tree.getLeaves()
  if (leafIndex < 0 || leafIndex >= leaves.length) return []
  const leaf = leaves[leafIndex]
  return tree.getHexProof(leaf)
}

export function generateSecrets(N: number): Uint8Array[] {
  return Array.from({ length: N }, () => {
    const arr = new Uint8Array(32)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr)
    } else {
      for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  })
}

export function getTreeRoot(tree: MerkleTree): string {
  return tree.getHexRoot()
}
