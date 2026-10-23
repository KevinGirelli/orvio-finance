import assert from "node:assert/strict"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { test } from "node:test"
import { emptyLedger, netWorth, openAccount, postExpense, postIncome, postTransfer } from "../domain/ledger.ts"
import { loadLedger, migrate, saveLedger, type Sql } from "./ledger-db.ts"
import { pragmaKeyStatement, requireCipherVersion } from "./sqlcipher.ts"

const on = "2026-10-23"

test("a ledger round-trips through sqlite, including a transfer", async () => {
  let ledger = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  ledger = openAccount(ledger, { id: "savings", name: "Nu", kind: "savings" })
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
  ledger = postTransfer(ledger, {
    id: "move",
    fromAccountId: "checking",
    toAccountId: "savings",
    minor: 25000,
    occurredOn: on,
    note: "Reserva",
  })

  const sql = memorySql()
  await migrate(sql)
  await saveLedger(sql, ledger)
  const loaded = await loadLedger(sql)

  assert.deepEqual(loaded, ledger)
  assert.deepEqual(netWorth(loaded), { currency: "BRL", minor: 70000 })
})

test("saving replaces the previous snapshot", async () => {
  const sql = memorySql()
  await migrate(sql)
  const first = openAccount(emptyLedger(), { id: "cash", name: "Carteira", kind: "cash" })
  await saveLedger(sql, first)
  await saveLedger(sql, emptyLedger())

  assert.deepEqual(await loadLedger(sql), emptyLedger())
})

test("migrate is safe to run twice", async () => {
  const sql = memorySql()
  await migrate(sql)
  await migrate(sql)
  assert.deepEqual(await loadLedger(sql), emptyLedger())
})

test("a build without SQLCipher is refused", () => {
  assert.throws(() => requireCipherVersion(null), { code: "sqlcipher.unavailable" })
  assert.throws(() => requireCipherVersion({ cipher_version: null }), { code: "sqlcipher.unavailable" })
  assert.doesNotThrow(() => requireCipherVersion({ cipher_version: "4.17.0" }))
})

test("the SQLCipher key is hex-only", () => {
  const key = new Uint8Array(32).map((_, index) => index)
  assert.equal(
    pragmaKeyStatement(key),
    `PRAGMA key = "x'000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'"`,
  )
  assert.throws(() => pragmaKeyStatement(new Uint8Array(16)), { code: "sqlcipher.key_length" })
})

test("a version 1 database gains categories without dropping movements", async () => {
  const sql = memorySql()
  await sql.exec(`CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    currency TEXT NOT NULL,
    archived INTEGER NOT NULL
  )`)
  await sql.exec(`CREATE TABLE movements (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    minor INTEGER NOT NULL,
    kind TEXT NOT NULL,
    transfer_id TEXT,
    occurred_on TEXT NOT NULL,
    note TEXT NOT NULL,
    source TEXT NOT NULL
  )`)
  await sql.exec("PRAGMA user_version = 1")
  await sql.exec("INSERT INTO accounts (id, name, kind, currency, archived) VALUES (?, ?, ?, ?, ?)", [
    "cash",
    "Carteira",
    "cash",
    "BRL",
    0,
  ])
  await sql.exec(
    "INSERT INTO movements (id, account_id, minor, kind, transfer_id, occurred_on, note, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["rent", "cash", -2000, "expense", null, "2026-10-01", "Aluguel", "manual"],
  )
  await migrate(sql)
  const loaded = await loadLedger(sql)
  assert.equal(loaded.movements[0]?.category, "outros")
  assert.equal(loaded.movements[0]?.minor, -2000)
})

function memorySql(): Sql {
  const db = new DatabaseSync(":memory:")
  return {
    async exec(statement, params = []) {
      db.prepare(statement).run(...(params as SQLInputValue[]))
    },
    async all(statement, params = []) {
      return db.prepare(statement).all(...(params as SQLInputValue[])) as Record<string, unknown>[]
    },
  }
}
