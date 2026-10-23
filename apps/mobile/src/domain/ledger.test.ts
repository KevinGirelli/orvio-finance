import assert from "node:assert/strict"
import { test } from "node:test"
import {
  activity,
  balance,
  emptyLedger,
  netWorth,
  openAccount,
  postExpense,
  postIncome,
  postOpening,
  postTransfer,
} from "./ledger.ts"

const on = "2026-10-23"

test("opening an account stores a trimmed name and zero balance", () => {
  const ledger = openAccount(emptyLedger(), {
    id: "acc-inter",
    name: "  Inter  ",
    kind: "checking",
  })

  assert.deepEqual(ledger.accounts, [
    {
      id: "acc-inter",
      name: "Inter",
      kind: "checking",
      currency: "BRL",
      archived: false,
    },
  ])
  assert.deepEqual(balance(ledger, "acc-inter"), { currency: "BRL", minor: 0 })
})

test("account name is required and unique ids cannot be reused", () => {
  assert.throws(() => openAccount(emptyLedger(), { id: "a", name: "   ", kind: "cash" }), {
    code: "account.name_empty",
  })

  const ledger = openAccount(emptyLedger(), { id: "a", name: "Carteira", kind: "cash" })
  assert.throws(() => openAccount(ledger, { id: "a", name: "Outra", kind: "cash" }), {
    code: "account.duplicate_id",
  })
})

test("income and expense change only that account", () => {
  let ledger = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  ledger = postIncome(ledger, {
    id: "pay",
    accountId: "checking",
    minor: 100000,
    occurredOn: on,
    note: "Salário",
  })
  ledger = postExpense(ledger, {
    id: "rent",
    accountId: "checking",
    minor: 30000,
    occurredOn: on,
    note: "Aluguel",
  })

  assert.deepEqual(balance(ledger, "checking"), { currency: "BRL", minor: 70000 })
  assert.deepEqual(netWorth(ledger), { currency: "BRL", minor: 70000 })
})

test("a transfer moves money and does not change net worth", () => {
  let ledger = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  ledger = openAccount(ledger, { id: "savings", name: "Nu", kind: "savings" })
  ledger = postIncome(ledger, {
    id: "pay",
    accountId: "checking",
    minor: 100000,
    occurredOn: on,
    note: "",
  })
  ledger = postTransfer(ledger, {
    id: "move",
    fromAccountId: "checking",
    toAccountId: "savings",
    minor: 25000,
    occurredOn: on,
    note: "Reserva",
  })

  assert.deepEqual(balance(ledger, "checking"), { currency: "BRL", minor: 75000 })
  assert.deepEqual(balance(ledger, "savings"), { currency: "BRL", minor: 25000 })
  assert.deepEqual(netWorth(ledger), { currency: "BRL", minor: 100000 })
  assert.deepEqual(activity(ledger), [
    {
      id: "move",
      kind: "transfer",
      fromAccountId: "checking",
      toAccountId: "savings",
      minor: 25000,
      occurredOn: on,
      note: "Reserva",
    },
    {
      id: "pay",
      kind: "income",
      accountId: "checking",
      minor: 100000,
      occurredOn: on,
      note: "",
      category: "outros",
    },
  ])
})

test("opening balance is not income", () => {
  let ledger = openAccount(emptyLedger(), { id: "cash", name: "Carteira", kind: "cash" })
  ledger = postOpening(ledger, {
    id: "open",
    accountId: "cash",
    minor: 5000,
    occurredOn: on,
    note: "",
  })

  assert.deepEqual(balance(ledger, "cash"), { currency: "BRL", minor: 5000 })
  assert.equal(activity(ledger)[0]?.kind, "opening")
})

test("rejects invalid amounts, dates, same-account transfers, and unknown accounts", () => {
  let ledger = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  const income = { id: "x", accountId: "checking", minor: 100, occurredOn: on, note: "" }

  assert.throws(() => postIncome(ledger, { ...income, minor: 0 }), { code: "movement.amount_not_positive" })
  assert.throws(() => postExpense(ledger, { ...income, minor: -1 }), { code: "movement.amount_not_positive" })
  assert.throws(() => postIncome(ledger, { ...income, occurredOn: "2026-02-31" }), { code: "date.invalid" })
  assert.throws(() => postIncome(ledger, { ...income, accountId: "missing" }), { code: "account.not_found" })
  assert.throws(
    () =>
      postTransfer(ledger, {
        id: "t",
        fromAccountId: "checking",
        toAccountId: "checking",
        minor: 100,
        occurredOn: on,
        note: "",
      }),
    { code: "transfer.same_account" },
  )

  ledger = postIncome(ledger, income)
  assert.throws(() => postIncome(ledger, income), { code: "movement.duplicate_id" })
})

test("an archived account rejects new movements", () => {
  const opened = openAccount(emptyLedger(), { id: "old", name: "Antiga", kind: "checking" })
  const ledger = {
    ...opened,
    accounts: opened.accounts.map((account) => ({ ...account, archived: true })),
  }

  assert.throws(
    () => postIncome(ledger, { id: "x", accountId: "old", minor: 100, occurredOn: on, note: "" }),
    { code: "account.archived" },
  )
})
