// Persistent storage for channel session — survives page reload

const KEYS = {
  SECRETS: 'rootpay:secrets',
  CHANNEL: 'rootpay:channel',
} as const

export type PersistedChannel = {
  payer: string
  merchant: string
  blockNumber: number
  merkleRoot: string
}

// Secrets: stored as array of hex strings (one per leaf)
export function saveSecrets(secrets: Uint8Array[]): void {
  try {
    const hex = secrets.map(s =>
      Array.from(s).map(b => b.toString(16).padStart(2, '0')).join('')
    )
    localStorage.setItem(KEYS.SECRETS, JSON.stringify(hex))
  } catch { /* storage full or unavailable */ }
}

export function loadSecrets(): Uint8Array[] | null {
  try {
    const raw = localStorage.getItem(KEYS.SECRETS)
    if (!raw) return null
    const hex: string[] = JSON.parse(raw)
    return hex.map(h => {
      const bytes = new Uint8Array(h.length / 2)
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
      }
      return bytes
    })
  } catch { return null }
}

export function saveChannel(data: PersistedChannel): void {
  try {
    localStorage.setItem(KEYS.CHANNEL, JSON.stringify(data))
  } catch { /* storage full or unavailable */ }
}

export function loadChannel(): PersistedChannel | null {
  try {
    const raw = localStorage.getItem(KEYS.CHANNEL)
    if (!raw) return null
    return JSON.parse(raw) as PersistedChannel
  } catch { return null }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEYS.SECRETS)
    localStorage.removeItem(KEYS.CHANNEL)
  } catch { /* unavailable */ }
}
