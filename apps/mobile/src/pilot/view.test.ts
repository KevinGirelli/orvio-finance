import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyLedger, openAccount, postExpense, postIncome, postTransfer } from "../domain/ledger.ts"
import { DomainError } from "../domain/money.ts"
import { messageFor } from "./messages.ts"
import { summarize, todayIso } from "./view.ts"

test("todayIso uses the local calendar date", () => {
  assert.equal(todayIso(new Date(2026, 9, 23, 23, 30)), "2026-10-23")
})

test("summarize formats balances and does not treat a transfer as income", () => {
  let ledger = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  ledger = openAccount(ledger, { id: "savings", name: "Nu", kind: "savings" })
  ledger = postIncome(ledger, {
    id: "pay",
    accountId: "checking",
    minor: 100000,
    occurredOn: "2026-10-23",
    note: "Salário",
  })
  ledger = postExpense(ledger, {
    id: "rent",
    accountId: "checking",
    minor: 30000,
    occurredOn: "2026-10-22",
    note: "",
  })
  ledger = postTransfer(ledger, {
    id: "move",
    fromAccountId: "checking",
    toAccountId: "savings",
    minor: 25000,
    occurredOn: "2026-10-23",
    note: "Reserva",
  })

  const summary = summarize(ledger)
  assert.equal(summary.netWorth, "R$ 700,00")
  assert.deepEqual(
    summary.accounts.map((account) => [account.name, account.balance]),
    [
      ["Inter", "R$ 450,00"],
      ["Nu", "R$ 250,00"],
    ],
  )
  assert.deepEqual(
    summary.activity.map((item) => item.title),
    ["Inter → Nu", "Salário", "Saída"],
  )
  assert.equal(summary.activity[0]?.amount, "R$ 250,00")
  assert.equal(summary.activity[2]?.amount, "-R$ 300,00")
})

test("messageFor turns a domain error into a sentence", () => {
  assert.equal(messageFor(new DomainError("money.invalid_input")), "Use um valor como 10,50.")
  assert.equal(messageFor(new Error("disk")), "Não foi possível salvar.")
})
