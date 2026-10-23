import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyLedger, openAccount, postExpense, postIncome, postTransfer } from "../domain/ledger.ts"
import { assess, shiftIso } from "./game.ts"
import { emptyProfile, type Profile } from "../domain/profile.ts"

const today = "2026-10-23"

function ledgerWith(days: { on: string; kind?: "expense" | "income" | "transfer"; minor?: number; category?: "alimentacao" | "moradia" | "transporte" | "saude" }[]) {
  let ledger = openAccount(emptyLedger(), { id: "a", name: "Inter", kind: "checking" })
  ledger = openAccount(ledger, { id: "b", name: "Nu", kind: "savings" })
  days.forEach((day, index) => {
    if (day.kind === "transfer") {
      ledger = postTransfer(ledger, {
        id: `t${index}`,
        fromAccountId: "a",
        toAccountId: "b",
        minor: day.minor ?? 100,
        occurredOn: day.on,
        note: "",
      })
      return
    }
    const post = day.kind === "income" ? postIncome : postExpense
    ledger = post(ledger, {
      id: `m${index}`,
      accountId: "a",
      minor: day.minor ?? 100,
      occurredOn: day.on,
      note: "",
      category: day.category ?? "alimentacao",
    })
  })
  return ledger
}

function daysEnding(count: number, end: string): string[] {
  return Array.from({ length: count }, (_, index) => shiftIso(end, -index))
}

test("a day with a posting counts, and today can still be empty", () => {
  const posted = assess(ledgerWith([{ on: today }]), emptyProfile(), today)
  assert.equal(posted.streak, 1)
  assert.equal(posted.alive, true)
  assert.equal(posted.mood, "steady")

  const waiting = assess(ledgerWith([{ on: "2026-10-22" }]), emptyProfile(), today)
  assert.equal(waiting.streak, 1)
  assert.equal(waiting.alive, true)
})

test("seven days earn a shield that holds one missed day", () => {
  const week = daysEnding(7, "2026-10-21")
  const bridged = assess(
    ledgerWith([...week.map((on) => ({ on })), { on: today }]),
    emptyProfile(),
    today,
  )
  assert.equal(bridged.streak, 8)
  assert.equal(bridged.shield, "spent")

  const held = daysEnding(7, "2026-10-20")
  const grace = assess(ledgerWith(held.map((on) => ({ on }))), emptyProfile(), "2026-10-22")
  assert.equal(grace.streak, 7)
  assert.equal(grace.shield, "spent")
  assert.equal(grace.alive, true)

  const broken = assess(ledgerWith(held.map((on) => ({ on }))), emptyProfile(), "2026-10-23")
  assert.equal(broken.streak, 0)
  assert.equal(broken.shield, "none")
})

test("a short gap is not covered", () => {
  const result = assess(
    ledgerWith([{ on: "2026-10-19" }, { on: "2026-10-20" }, { on: "2026-10-21" }, { on: today }]),
    emptyProfile(),
    today,
  )
  assert.equal(result.streak, 1)
  assert.equal(result.shield, "none")
})

test("the ceiling worries the month and the streak still counts", () => {
  const profile: Profile = { ...emptyProfile(), ceilingMinor: 1000, ready: true }
  const over = assess(ledgerWith([{ on: today, minor: 1500 }]), profile, today)
  assert.equal(over.mood, "worried")
  assert.equal(over.ceiling?.over, true)
  assert.equal(over.streak, 1)
  assert.equal(over.stickers.find((sticker) => sticker.id === "teto")?.earned, false)

  const inside = assess(ledgerWith([{ on: today, minor: 400 }]), profile, today)
  assert.equal(inside.mood, "steady")
  assert.equal(inside.stickers.find((sticker) => sticker.id === "teto")?.earned, true)
})

test("with the ceiling off, a large expense does not change the mood", () => {
  const result = assess(ledgerWith([{ on: today, minor: 900000 }]), emptyProfile(), today)
  assert.equal(result.mood, "steady")
  assert.equal(result.ceiling, null)
})

test("level and stickers come from days, categories and transfers", () => {
  const result = assess(
    ledgerWith([
      { on: "2026-10-21", category: "alimentacao" },
      { on: "2026-10-22", category: "moradia" },
      { on: today, category: "transporte" },
      { on: today, kind: "expense", category: "saude" },
      { on: today, kind: "transfer" },
    ]),
    emptyProfile(),
    today,
  )
  assert.equal(result.points, 3)
  assert.equal(result.level, 2)
  assert.equal(result.nextLevelAt, 7)
  assert.equal(result.stickers.find((sticker) => sticker.id === "mapa")?.earned, true)
  assert.equal(result.stickers.find((sticker) => sticker.id === "mao")?.earned, true)
  assert.equal(result.stickers.find((sticker) => sticker.id === "tres")?.earned, true)
})
