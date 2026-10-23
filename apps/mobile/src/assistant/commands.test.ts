import assert from "node:assert/strict"
import { test } from "node:test"
import { balance, emptyLedger, netWorth, openAccount } from "../domain/ledger.ts"
import { applyProposal, describeProposal, interpret } from "./commands.ts"

const today = "2026-10-23"

function ledger() {
  let current = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  current = openAccount(current, { id: "savings", name: "Nu", kind: "savings" })
  return current
}

test("a Portuguese expense becomes a proposal and only changes the ledger after confirmation", () => {
  const current = ledger()
  const result = interpret(current, "gastei 32,50 no mercado no Inter", today, "assistant")
  assert.equal(result.type, "proposal")
  if (result.type !== "proposal") return
  assert.equal(result.proposal.category, "alimentacao")
  assert.equal(result.proposal.minor, 3250)
  assert.equal(result.proposal.accountName, "Inter")
  assert.match(describeProposal(result.proposal), /Alimentação/)
  assert.equal(netWorth(current).minor, 0)
  const next = applyProposal(current, result.proposal, "food")
  assert.equal(balance(next, "checking").minor, -3250)
  assert.equal(netWorth(next).minor, -3250)
})

test("a transfer proposal does not change net worth", () => {
  let current = ledger()
  current = applyProposal(
    current,
    {
      kind: "income",
      accountName: "Inter",
      toAccountName: "",
      minor: 10000,
      category: "salario",
      note: "",
      occurredOn: today,
      source: "manual",
    },
    "pay",
  )
  const result = interpret(current, "transferi 15 do Inter para Nu", today, "whatsapp")
  assert.equal(result.type, "proposal")
  if (result.type !== "proposal") return
  const next = applyProposal(current, result.proposal, "move")
  assert.equal(balance(next, "checking").minor, 8500)
  assert.equal(balance(next, "savings").minor, 1500)
  assert.equal(netWorth(next).minor, 10000)
})

test("saldo and confirmations stay local", () => {
  const current = ledger()
  const balanceReply = interpret(current, "saldo", today, "assistant")
  assert.equal(balanceReply.type, "reply")
  if (balanceReply.type === "reply") assert.match(balanceReply.text, /R\$ 0,00/)
  assert.equal(interpret(current, "sim", today, "whatsapp").type, "confirm")
  assert.equal(interpret(current, "não", today, "whatsapp").type, "cancel")
  assert.equal(interpret(current, "me conta uma piada", today, "assistant").type, "unknown")
})
