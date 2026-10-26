import {
  coinGeckoId,
  isBrazilianTicker,
  type Holding,
} from "./investments.ts"

export type Quote = { priceMinor: number; changeHundredths: number }

type FetchLike = typeof fetch

export async function fetchQuotes(holdings: readonly Holding[], fetchImpl: FetchLike = fetch): Promise<Map<string, Quote>> {
  const quotes = new Map<string, Quote>()
  const crypto = holdings.filter((holding) => holding.kind === "crypto")
  const brazil = holdings.filter((holding) => holding.kind === "stock" && isBrazilianTicker(holding.symbol))
  const abroad = holdings.filter((holding) => holding.kind === "stock" && !isBrazilianTicker(holding.symbol))
  await Promise.all([
    fillCrypto(crypto, quotes, fetchImpl),
    ...brazil.map((holding) => fillBrazil(holding, quotes, fetchImpl)),
    fillAbroad(abroad, quotes, fetchImpl),
  ])
  return quotes
}

async function fillCrypto(holdings: readonly Holding[], quotes: Map<string, Quote>, fetchImpl: FetchLike) {
  if (holdings.length === 0) return
  const ids = [...new Set(holdings.map((holding) => coinGeckoId(holding.symbol)))]
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=brl&include_24hr_change=true`
  const body = await readJson(fetchImpl, url)
  if (!body || typeof body !== "object") return
  const table = body as Record<string, { brl?: unknown; brl_24h_change?: unknown }>
  for (const holding of holdings) {
    const row = table[coinGeckoId(holding.symbol)]
    const quote = reaisQuote(row?.brl, row?.brl_24h_change)
    if (quote) quotes.set(holding.id, quote)
  }
}

async function fillBrazil(holding: Holding, quotes: Map<string, Quote>, fetchImpl: FetchLike) {
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(holding.symbol)}`
  const body = await readJson(fetchImpl, url)
  const row = firstResult(body)
  const quote = reaisQuote(row?.regularMarketPrice, row?.regularMarketChangePercent)
  if (quote && row?.currency === "BRL") quotes.set(holding.id, quote)
}

async function fillAbroad(holdings: readonly Holding[], quotes: Map<string, Quote>, fetchImpl: FetchLike) {
  if (holdings.length === 0) return
  const fx = await usdBrl(fetchImpl)
  await Promise.all(
    holdings.map(async (holding) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(holding.symbol)}?interval=1d&range=5d`
      const body = await readJson(fetchImpl, url)
      const meta = chartMeta(body)
      if (!meta) return
      const price = numberOrNull(meta.regularMarketPrice)
      const previous = numberOrNull(meta.chartPreviousClose)
      if (price === null || previous === null || previous === 0) return
      const change = ((price - previous) / previous) * 100
      const currency = meta.currency
      const reais = currency === "BRL" ? price : currency === "USD" && fx !== null ? price * fx : null
      const quote = reaisQuote(reais, change)
      if (quote) quotes.set(holding.id, quote)
    }),
  )
}

async function usdBrl(fetchImpl: FetchLike): Promise<number | null> {
  const body = await readJson(fetchImpl, "https://economia.awesomeapi.com.br/json/last/USD-BRL")
  if (!body || typeof body !== "object") return null
  const row = (body as { USDBRL?: { bid?: unknown } }).USDBRL
  return numberOrNull(row?.bid)
}

function reaisQuote(price: unknown, changePercent: unknown): Quote | null {
  const reais = numberOrNull(price)
  const change = numberOrNull(changePercent)
  if (reais === null || reais <= 0 || change === null) return null
  const priceMinor = Math.round(reais * 100)
  const changeHundredths = Math.round(change * 100)
  if (!Number.isSafeInteger(priceMinor)) return null
  return { priceMinor, changeHundredths }
}

function firstResult(body: unknown): { regularMarketPrice?: unknown; regularMarketChangePercent?: unknown; currency?: unknown } | null {
  if (!body || typeof body !== "object") return null
  const results = (body as { results?: unknown }).results
  if (!Array.isArray(results)) return null
  const row = results[0]
  return row && typeof row === "object" ? row : null
}

function chartMeta(body: unknown): { regularMarketPrice?: unknown; chartPreviousClose?: unknown; currency?: unknown } | null {
  if (!body || typeof body !== "object") return null
  const chart = (body as { chart?: { result?: unknown } }).chart
  if (!chart || !Array.isArray(chart.result)) return null
  const row = chart.result[0]
  if (!row || typeof row !== "object") return null
  const meta = (row as { meta?: unknown }).meta
  return meta && typeof meta === "object" ? meta : null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0 && Number.isFinite(Number(value))) return Number(value)
  return null
}

async function readJson(fetchImpl: FetchLike, url: string): Promise<unknown> {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}
