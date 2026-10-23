import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyLedger, openAccount, postExpense, postIncome, postOpening, postTransfer } from "../domain/ledger.ts"
import { categorySeries, monthSeries } from "./charts.ts"

test("charts count income and expense, and ignore transfers and opening balances", () => {
  let ledger = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  ledger = openAccount(ledger, { id: "savings", name: "Nu", kind: "savings" })
  ledger = postOpening(ledger, {
    id: "open",
    accountId: "checking",
    minor: 50000,
    occurredOn: "2026-10-01",
    note: "",
  })
  ledger = postIncome(ledger, {
    id: "pay",
    accountId: "checking",
    minor: 100000,
    occurredOn: "2026-10-05",
    note: "Salário",
    category: "salario",
  })
  ledger = postExpense(ledger, {
    id: "food",
    accountId: "checking",
    minor: 4000,
    occurredOn: "2026-10-06",
    note: "Mercado",
    category: "alimentacao",
  })
  ledger = postTransfer(ledger, {
    id: "move",
    fromAccountId: "checking",
    toAccountId: "savings",
    minor: 1000,
    occurredOn: "2026-10-07",
    note: "",
  })

  const months = monthSeries(ledger, "2026-10-23")
  assert.equal(months.at(-1)?.label, "out")
  assert.equal(months.at(-1)?.income, 100000)
  assert.equal(months.at(-1)?.expense, 4000)
  assert.equal(months[0]?.key, "2026-05")
  assert.deepEqual(categorySeries(ledger, "2026-10-23"), [
    { category: "alimentacao", label: "Alimentação", minor: 4000 },
  ])
})
