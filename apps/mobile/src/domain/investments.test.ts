import assert from "node:assert/strict"
import { test } from "node:test"
import {
  formatChange,
  formatQuantity,
  holdingSymbol,
  parseQuantity,
  portfolioMinor,
  valueMinor,
  type Holding,
} from "./investments.ts"
import { fetchQuotes } from "./quotes.ts"
import { DomainError } from "./money.ts"

test("a quantity uses eight decimal places and prices stay in centavos", () => {
  assert.equal(parseQuantity("1"), 100_000_000)
  assert.equal(parseQuantity("0,015"), 1_500_000)
  assert.equal(formatQuantity(1_500_000), "0,015")
  assert.equal(valueMinor(1_500_000, 40_898_800), 613_482)
  assert.equal(formatChange(169), "+1,69%")
  assert.equal(formatChange(-20), "-0,20%")
})

test("symbols stay tickers and reject blanks", () => {
  assert.equal(holdingSymbol("stock", "petr4"), "PETR4")
  assert.equal(holdingSymbol("crypto", "btc"), "BTC")
  assert.throws(() => holdingSymbol("stock", "petrobras ltda"), DomainError)
  assert.throws(() => parseQuantity("0"), DomainError)
})

test("quotes read free payloads and ignore a failed ticker", async () => {
  const petr: Holding = {
    id: "petr",
    kind: "stock",
    symbol: "PETR4",
    quantityMicros: 100_000_000,
    priceMinor: null,
    changeHundredths: null,
  }
  const btc: Holding = { ...petr, id: "btc", kind: "crypto", symbol: "BTC" }
  const aapl: Holding = { ...petr, id: "aapl", kind: "stock", symbol: "AAPL" }
  const quotes = await fetchQuotes([petr, btc, aapl], async (input) => {
    const url = String(input)
    if (url.includes("coingecko")) {
      return json({ bitcoin: { brl: 400000, brl_24h_change: -1.5 } })
    }
    if (url.includes("brapi")) return json({ results: [{ currency: "BRL", regularMarketPrice: 58.81, regularMarketChangePercent: 1.69 }] })
    if (url.includes("USD-BRL")) return json({ USDBRL: { bid: "5.00" } })
    if (url.includes("AAPL")) {
      return json({
        chart: { result: [{ meta: { currency: "USD", regularMarketPrice: 100, chartPreviousClose: 80 } }] },
      })
    }
    return json(null, 500)
  })
  assert.equal(quotes.get("petr")?.priceMinor, 5881)
  assert.equal(quotes.get("petr")?.changeHundredths, 169)
  assert.equal(quotes.get("btc")?.priceMinor, 40_000_000)
  assert.equal(quotes.get("aapl")?.priceMinor, 50_000)
  assert.equal(portfolioMinor([{ ...petr, priceMinor: 5881 }]), 5881)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}
