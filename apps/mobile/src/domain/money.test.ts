import assert from "node:assert/strict"
import { test } from "node:test"
import { DomainError, addMoney, formatBrl, money, parseBrl } from "./money.ts"

test("money stores an integer number of centavos", () => {
  assert.deepEqual(money(1050), { currency: "BRL", minor: 1050 })
})

test("money rejects fractional centavos", () => {
  assert.throws(() => money(10.5), (error: unknown) => {
    return error instanceof DomainError && error.code === "money.not_integer"
  })
})

test("adding money keeps the currency and sums centavos", () => {
  assert.deepEqual(addMoney(money(1000), money(250)), money(1250))
})

test("adding money rejects a different currency", () => {
  assert.throws(() => addMoney(money(100), { currency: "USD", minor: 100 }), (error: unknown) => {
    return error instanceof DomainError && error.code === "money.currency_mismatch"
  })
})

test("formatBrl uses Brazilian grouping", () => {
  assert.equal(formatBrl(money(0)), "R$ 0,00")
  assert.equal(formatBrl(money(1050)), "R$ 10,50")
  assert.equal(formatBrl(money(123456)), "R$ 1.234,56")
  assert.equal(formatBrl(money(-1050)), "-R$ 10,50")
})

test("parseBrl reads reais typed with a comma", () => {
  assert.deepEqual(parseBrl("10,50"), money(1050))
  assert.deepEqual(parseBrl("R$ 1.234,56"), money(123456))
  assert.deepEqual(parseBrl("10"), money(1000))
  assert.deepEqual(parseBrl("10,5"), money(1050))
  assert.deepEqual(parseBrl("-R$ 10,50"), money(-1050))
})

test("parseBrl rejects blank and extra decimals", () => {
  for (const input of ["", "   ", "10,505", "abc", "10.50"]) {
    assert.throws(() => parseBrl(input), (error: unknown) => {
      return error instanceof DomainError && error.code === "money.invalid_input"
    })
  }
})
