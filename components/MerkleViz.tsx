'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { TREE_SIZE } from '@/lib/constants'

type MerkleVizProps = {
  leafIndex: number
  channelActive: boolean
  animateProof?: boolean
}

// Pre-computed node positions in a 400x300 viewBox
// Tree structure: 15 nodes total (depth 4: 1+2+4+8)
const NODES = [
  // Row 0: root (index 0)
  { x: 200, y: 30, row: 0, id: 0 },
  // Row 1 (indices 1-2)
  { x: 100, y: 100, row: 1, id: 1 },
  { x: 300, y: 100, row: 1, id: 2 },
  // Row 2 (indices 3-6)
  { x: 50, y: 170, row: 2, id: 3 },
  { x: 150, y: 170, row: 2, id: 4 },
  { x: 250, y: 170, row: 2, id: 5 },
  { x: 350, y: 170, row: 2, id: 6 },
  // Row 3: leaves (indices 7-14)
  { x: 25, y: 240, row: 3, id: 7 },
  { x: 75, y: 240, row: 3, id: 8 },
  { x: 125, y: 240, row: 3, id: 9 },
  { x: 175, y: 240, row: 3, id: 10 },
  { x: 225, y: 240, row: 3, id: 11 },
  { x: 275, y: 240, row: 3, id: 12 },
  { x: 325, y: 240, row: 3, id: 13 },
  { x: 375, y: 240, row: 3, id: 14 },
]

// Edges: [parentId, childId]
const EDGES: [number, number][] = [
  [0, 1], [0, 2],
  [1, 3], [1, 4], [2, 5], [2, 6],
  [3, 7], [3, 8], [4, 9], [4, 10], [5, 11], [5, 12], [6, 13], [6, 14],
]

// Leaf nodes are IDs 7-14
// Proof path for leaf i (0-7): path from leaf node to root
// Leaf 0 → node7 → node3 → node1 → node0
// Leaf 1 → node8 → node3 → node1 → node0
// Leaf 2 → node9 → node4 → node1 → node0
// Leaf 3 → node10 → node4 → node1 → node0
// Leaf 4 → node11 → node5 → node2 → node0
// Leaf 5 → node12 → node5 → node2 → node0
// Leaf 6 → node13 → node6 → node2 → node0
// Leaf 7 → node14 → node6 → node2 → node0

function getProofPath(leafVisualIndex: number): number[] {
  const paths: Record<number, number[]> = {
    0: [7, 3, 1, 0],
    1: [8, 3, 1, 0],
    2: [9, 4, 1, 0],
    3: [10, 4, 1, 0],
    4: [11, 5, 2, 0],
    5: [12, 5, 2, 0],
    6: [13, 6, 2, 0],
    7: [14, 6, 2, 0],
  }
  return paths[leafVisualIndex] ?? []
}

function getProofEdges(leafVisualIndex: number): [number, number][] {
  const path = getProofPath(leafVisualIndex)
  const edges: [number, number][] = []
  for (let i = 0; i < path.length - 1; i++) {
    edges.push([path[i + 1], path[i]])
  }
  return edges
}

export default function MerkleViz({
  leafIndex,
  channelActive,
  animateProof = false,
}: MerkleVizProps) {
  const visualLeafIndex = leafIndex % 8
  const litLeaves = Math.min(leafIndex % 8 + (leafIndex > 0 ? 1 : 0), 8)
  const proofPath = useMemo(() => getProofPath(visualLeafIndex), [visualLeafIndex])
  const proofEdges = useMemo(() => getProofEdges(visualLeafIndex), [visualLeafIndex])

  const isOnProofPath = (nodeId: number) => proofPath.includes(nodeId)
  const isProofEdge = (parentId: number, childId: number) =>
    proofEdges.some(([p, c]) => p === parentId && c === childId) ||
    proofEdges.some(([p, c]) => p === childId && c === parentId)

  // The currently active leaf in the 8-leaf visual (0-7)
  const currentVisualLeaf = leafIndex > 0 ? visualLeafIndex : -1

  const getNodeFill = (node: typeof NODES[0]) => {
    if (node.row === 0) {
      return channelActive ? '#00E5A0' : '#2a2a2a'
    }
    if (node.row === 3) {
      const leafIdx = node.id - 7
      if (leafIdx === currentVisualLeaf) return '#00E5A0'  // current — pulsed separately
      if (leafIdx < litLeaves) return '#00E5A0'
      return '#1a1a1a'
    }
    if (isOnProofPath(node.id)) return 'rgba(0,229,160,0.3)'
    return '#1a1a1a'
  }

  const getNodeStroke = (node: typeof NODES[0]) => {
    if (node.row === 0) return channelActive ? '#00E5A0' : 'rgba(255,255,255,0.15)'
    if (node.row === 3) {
      const leafIdx = node.id - 7
      if (leafIdx === currentVisualLeaf) return '#00E5A0'
      if (leafIdx < litLeaves) return '#00E5A0'
      return 'rgba(255,255,255,0.08)'
    }
    if (isOnProofPath(node.id)) return '#00E5A0'
    return 'rgba(255,255,255,0.08)'
  }

  const getEdgeStroke = (parentId: number, childId: number) => {
    if (isProofEdge(parentId, childId)) return '#00E5A0'
    return 'rgba(255,255,255,0.07)'
  }

  const getEdgeOpacity = (parentId: number, childId: number) => {
    if (isProofEdge(parentId, childId)) return 0.8
    return 1
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-[#6B6A65] uppercase tracking-widest">
          Merkle Tree Visualization
        </span>
        <span className="font-mono text-[10px] text-[#6B6A65]">
          N={TREE_SIZE.toLocaleString('en-US')} (shown: depth 4)
        </span>
      </div>
      <div className="card rounded-sm p-2 overflow-hidden">
        <svg
          viewBox="0 0 400 270"
          className="w-full h-auto"
          style={{ maxHeight: '240px' }}
        >
          {/* Edges */}
          {EDGES.map(([parentId, childId]) => {
            const parent = NODES[parentId]
            const child = NODES[childId]
            const onProof = isProofEdge(parentId, childId)
            return (
              <motion.line
                key={`edge-${parentId}-${childId}`}
                x1={parent.x}
                y1={parent.y}
                x2={child.x}
                y2={child.y}
                stroke={getEdgeStroke(parentId, childId)}
                strokeWidth={onProof ? 1.5 : 0.75}
                opacity={getEdgeOpacity(parentId, childId)}
                animate={{
                  stroke: getEdgeStroke(parentId, childId),
                  strokeWidth: onProof ? 1.5 : 0.75,
                  opacity: getEdgeOpacity(parentId, childId),
                }}
                transition={{ duration: 0.3 }}
                strokeDasharray={onProof && animateProof ? '60' : undefined}
                strokeDashoffset={onProof && animateProof ? '60' : undefined}
              />
            )
          })}

          {/* Proof path animated pulse overlay */}
          {animateProof && proofEdges.map(([parentId, childId]) => {
            const parent = NODES[parentId]
            const child = NODES[childId]
            return (
              <motion.line
                key={`proof-edge-${parentId}-${childId}`}
                x1={parent.x}
                y1={parent.y}
                x2={child.x}
                y2={child.y}
                stroke="#00E5A0"
                strokeWidth={2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 0.6] }}
                transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
              />
            )
          })}

          {/* Nodes */}
          {NODES.map(node => {
            const isLeaf = node.row === 3
            const leafIdx = node.id - 7
            const isRoot = node.row === 0
            const size = isRoot ? 10 : isLeaf ? 6 : 7
            const isCurrent = isLeaf && leafIdx === currentVisualLeaf

            return (
              <g key={`node-${node.id}`}>
                {/* Pulsing ring on current leaf */}
                {isCurrent && (
                  <motion.rect
                    x={node.x - size - 4}
                    y={node.y - size - 4}
                    width={(size + 4) * 2}
                    height={(size + 4) * 2}
                    rx={2}
                    fill="none"
                    stroke="#00E5A0"
                    strokeWidth={1}
                    animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ originX: `${node.x}px`, originY: `${node.y}px` }}
                  />
                )}
                <motion.rect
                  x={node.x - size}
                  y={node.y - size}
                  width={size * 2}
                  height={size * 2}
                  rx={isRoot ? 2 : 1}
                  fill={getNodeFill(node)}
                  stroke={getNodeStroke(node)}
                  strokeWidth={isCurrent ? 1.5 : isRoot ? 1.5 : 1}
                  animate={{
                    fill: getNodeFill(node),
                    stroke: getNodeStroke(node),
                  }}
                  transition={{ duration: 0.25 }}
                />
              </g>
            )
          })}

          {/* Root label */}
          <text
            x={200}
            y={20}
            textAnchor="middle"
            fontSize="7"
            fill={channelActive ? '#00E5A0' : '#6B6A65'}
            fontFamily="IBM Plex Mono"
            letterSpacing="0.05em"
          >
            ROOT
          </text>

          {/* Leaf count label */}
          <text
            x={200}
            y={264}
            textAnchor="middle"
            fontSize="7"
            fill="#6B6A65"
            fontFamily="IBM Plex Mono"
          >
            8 leaves shown · {TREE_SIZE.toLocaleString('en-US')} total
          </text>
        </svg>
      </div>

      {/* Off-chain payment counter */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-2">
          <motion.span
            className="font-mono text-lg font-medium tabular-nums leading-none text-[#00E5A0]"
            key={leafIndex}
            animate={leafIndex > 0 ? { scale: [1.15, 1] } : {}}
            transition={{ duration: 0.15 }}
          >
            {leafIndex.toLocaleString('en-US')}
          </motion.span>
          <span className="font-mono text-[9px] text-[#6B6A65] uppercase tracking-widest leading-tight">
            off-chain<br />payments
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-[10px] text-[#6B6A65]">
            leaf{' '}
            <span className="text-[#E8E6DF]">{leafIndex > 0 ? leafIndex : '—'}</span>
            {' '}/ {TREE_SIZE.toLocaleString('en-US')}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#00E5A0] rounded-sm" />
          <span className="font-mono text-[9px] text-[#6B6A65]">consumed leaf</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[rgba(0,229,160,0.3)] border border-[#00E5A0] rounded-sm" />
          <span className="font-mono text-[9px] text-[#6B6A65]">proof path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#1a1a1a] border border-[rgba(255,255,255,0.08)] rounded-sm" />
          <span className="font-mono text-[9px] text-[#6B6A65]">unused</span>
        </div>
      </div>
    </div>
  )
}
