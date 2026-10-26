import assert from "node:assert/strict"
import test from "node:test"

import { emptyLedger, openAccount, postExpense, postIncome } from "../domain/ledger.ts"
import { emptyProfile } from "../domain/profile.ts"
import { noticeBody, telegramChatId } from "./notices.ts"

test("a daily notice states the cash picture and skips a turned-off line", () => {
  let ledger = openAccount(emptyLedger(), { id: "cash", name: "Carteira", kind: "cash" })
  ledger = postIncome(ledger, { id: "pay", accountId: "cash", minor: 10000, occurredOn: "2026-10-02", note: "Salário" })
  ledger = postExpense(ledger, { id: "rent", accountId: "cash", minor: 2500, occurredOn: "2026-10-03", note: "Aluguel" })
  const profile = { ...emptyProfile(), ceilingMinor: 1000, ready: true, notices: { daily: true, streak: false, ceiling: true } }
  const body = noticeBody(ledger, profile, "2026-10-23")
  assert.equal(body?.includes("Sequência"), false)
  assert.match(body ?? "", /patrimônio R\$ 75,00/)
  assert.match(body ?? "", /entrou R\$ 100,00/)
  assert.match(body ?? "", /saiu R\$ 25,00/)
  assert.match(body ?? "", /Teto estourou/)
})

test("every notice off produces nothing to send", () => {
  const profile = { ...emptyProfile(), notices: { daily: false, streak: false, ceiling: false } }
  assert.equal(noticeBody(emptyLedger(), profile, "2026-10-23"), null)
})

test("a Telegram chat id is the number Telegram sends", () => {
  assert.equal(telegramChatId("424242"), "424242")
  assert.equal(telegramChatId("oi"), null)
})
