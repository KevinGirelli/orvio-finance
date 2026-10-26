import { DomainError } from "./money.ts"

export type HoldingKind = "stock" | "crypto"

export type Holding = {
  id: string
  kind: HoldingKind
  symbol: string
  quantityMicros: number
  priceMinor: number | null
  changeHundredths: number | null
}

const micros = 100_000_000

const cryptoIds: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  bnb: "binancecoin",
  usdt: "tether",
  usdc: "usd-coin",
}

export function holdingSymbol(kind: HoldingKind, raw: string): string {
  const trimmed = raw.trim()
  if (kind === "crypto") {
    const folded = trimmed.toLowerCase()
    const id = cryptoIds[folded] ?? folded
    if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new DomainError("investment.symbol_invalid")
    return cryptoIds[folded] ? folded.toUpperCase() : id
  }
  const symbol = trimmed.toUpperCase().replace(/\s+/g, "")
  if (!/^[A-Z][A-Z0-9.]{0,11}$/.test(symbol)) throw new DomainError("investment.symbol_invalid")
  return symbol
}

export function coinGeckoId(symbol: string): string {
  const folded = symbol.toLowerCase()
  return cryptoIds[folded] ?? folded
}

export function isBrazilianTicker(symbol: string): boolean {
  return /^[A-Z]{4}\d{1,2}$/.test(symbol)
}

export function parseQuantity(raw: string): number {
  const trimmed = raw.trim()
  if (!/^\d{1,7}(,\d{1,8})?$/.test(trimmed)) throw new DomainError("investment.quantity_invalid")
  const [whole, fraction = ""] = trimmed.split(",")
  const quantity = Number(whole) * micros + Number(fraction.padEnd(8, "0"))
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new DomainError("investment.quantity_invalid")
  return quantity
}

export function formatQuantity(quantityMicros: number): string {
  const whole = Math.floor(quantityMicros / micros)
  const fraction = quantityMicros % micros
  if (fraction === 0) return String(whole)
  const digits = String(fraction).padStart(8, "0").replace(/0+$/, "")
  return `${whole},${digits}`
}

export function valueMinor(quantityMicros: number, priceMinor: number): number {
  const whole = Math.floor(quantityMicros / micros)
  const fraction = quantityMicros % micros
  return whole * priceMinor + Math.round((fraction * priceMinor) / micros)
}

export function formatChange(hundredths: number): string {
  const sign = hundredths > 0 ? "+" : hundredths < 0 ? "-" : ""
  const absolute = Math.abs(hundredths)
  const whole = Math.floor(absolute / 100)
  const fraction = String(absolute % 100).padStart(2, "0")
  return `${sign}${whole},${fraction}%`
}

export function portfolioMinor(holdings: readonly Holding[]): number {
  return holdings.reduce((sum, holding) => {
    if (holding.priceMinor === null) return sum
    return sum + valueMinor(holding.quantityMicros, holding.priceMinor)
  }, 0)
}
