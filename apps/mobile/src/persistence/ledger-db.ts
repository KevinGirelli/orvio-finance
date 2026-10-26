import { DomainError } from "../domain/money.ts"
import { isCategory, type Category } from "../domain/categories.ts"
import type { AccountKind, Ledger, MovementKind, MovementSource } from "../domain/ledger.ts"
import { isAccent, type Profile } from "../domain/profile.ts"
import type { Holding, HoldingKind } from "../domain/investments.ts"

export type Sql = {
  exec(statement: string, params?: readonly unknown[]): Promise<void>
  all(statement: string, params?: readonly unknown[]): Promise<Record<string, unknown>[]>
}

const accountKinds = new Set<AccountKind>(["checking", "savings", "cash"])
const movementKinds = new Set<MovementKind>(["income", "expense", "transfer", "opening"])

export async function migrate(sql: Sql): Promise<void> {
  await sql.exec("PRAGMA foreign_keys = ON")
  let version = await userVersion(sql)
  if (version === 0) {
    await sql.exec(`CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      currency TEXT NOT NULL,
      archived INTEGER NOT NULL
    )`)
    await sql.exec(`CREATE TABLE movements (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      minor INTEGER NOT NULL,
      kind TEXT NOT NULL,
      transfer_id TEXT,
      occurred_on TEXT NOT NULL,
      note TEXT NOT NULL,
      source TEXT NOT NULL,
      category TEXT
    )`)
    await sql.exec("PRAGMA user_version = 2")
    version = 2
  } else if (version === 1) {
    await sql.exec("ALTER TABLE movements ADD COLUMN category TEXT")
    await sql.exec("PRAGMA user_version = 2")
    version = 2
  }
  if (version === 2) {
    await sql.exec(`CREATE TABLE profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      accent TEXT NOT NULL,
      ceiling_minor INTEGER,
      ready INTEGER NOT NULL
    )`)
    await sql.exec("INSERT INTO profile (id, name, accent, ceiling_minor, ready) VALUES (1, '', 'lilac', NULL, 0)")
    await sql.exec("PRAGMA user_version = 3")
    version = 3
  }
  if (version === 3) {
    await sql.exec(`CREATE TABLE holdings (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      symbol TEXT NOT NULL,
      quantity_micros INTEGER NOT NULL,
      price_minor INTEGER,
      change_hundredths INTEGER
    )`)
    await sql.exec("PRAGMA user_version = 4")
    version = 4
  }
  if (version !== 4) throw new DomainError("persistence.unknown_version")
}

export async function saveHoldings(sql: Sql, holdings: readonly Holding[]): Promise<void> {
  await sql.exec("DELETE FROM holdings")
  for (const holding of holdings) {
    await sql.exec(
      "INSERT INTO holdings (id, kind, symbol, quantity_micros, price_minor, change_hundredths) VALUES (?, ?, ?, ?, ?, ?)",
      [holding.id, holding.kind, holding.symbol, holding.quantityMicros, holding.priceMinor, holding.changeHundredths],
    )
  }
}

export async function loadHoldings(sql: Sql): Promise<Holding[]> {
  const rows = await sql.all(
    "SELECT id, kind, symbol, quantity_micros, price_minor, change_hundredths FROM holdings ORDER BY symbol",
  )
  return rows.map((row) => ({
    id: text(row.id),
    kind: holdingKind(row.kind),
    symbol: text(row.symbol),
    quantityMicros: integer(row.quantity_micros),
    priceMinor: row.price_minor === null ? null : integer(row.price_minor),
    changeHundredths: row.change_hundredths === null ? null : integer(row.change_hundredths),
  }))
}

export async function saveProfile(sql: Sql, profile: Profile): Promise<void> {
  await sql.exec("UPDATE profile SET name = ?, accent = ?, ceiling_minor = ?, ready = ? WHERE id = 1", [
    profile.name,
    profile.accent,
    profile.ceilingMinor,
    profile.ready ? 1 : 0,
  ])
}

export async function loadProfile(sql: Sql): Promise<Profile> {
  const rows = await sql.all("SELECT name, accent, ceiling_minor, ready FROM profile WHERE id = 1")
  const row = rows[0]
  if (!row) throw new DomainError("persistence.corrupt")
  const accent = text(row.accent)
  if (!isAccent(accent)) throw new DomainError("persistence.corrupt")
  return {
    name: text(row.name),
    accent,
    ceilingMinor: row.ceiling_minor === null ? null : integer(row.ceiling_minor),
    ready: row.ready === 1,
  }
}

export async function saveLedger(sql: Sql, ledger: Ledger): Promise<void> {
  await sql.exec("BEGIN")
  try {
    await sql.exec("DELETE FROM movements")
    await sql.exec("DELETE FROM accounts")
    for (const account of ledger.accounts) {
      await sql.exec(
        "INSERT INTO accounts (id, name, kind, currency, archived) VALUES (?, ?, ?, ?, ?)",
        [account.id, account.name, account.kind, account.currency, account.archived ? 1 : 0],
      )
    }
    for (const movement of ledger.movements) {
      await sql.exec(
        "INSERT INTO movements (id, account_id, minor, kind, transfer_id, occurred_on, note, source, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          movement.id,
          movement.accountId,
          movement.minor,
          movement.kind,
          movement.transferId,
          movement.occurredOn,
          movement.note,
          movement.source,
          movement.category,
        ],
      )
    }
    await sql.exec("COMMIT")
  } catch (error) {
    await sql.exec("ROLLBACK")
    throw error
  }
}

export async function loadLedger(sql: Sql): Promise<Ledger> {
  const accounts = (await sql.all("SELECT id, name, kind, currency, archived FROM accounts ORDER BY rowid")).map(
    (row) => {
      if (row.currency !== "BRL") throw new DomainError("persistence.corrupt")
      return {
        id: text(row.id),
        name: text(row.name),
        kind: accountKind(row.kind),
        currency: "BRL" as const,
        archived: row.archived === 1,
      }
    },
  )

  const movements = (await sql.all(
    "SELECT id, account_id, minor, kind, transfer_id, occurred_on, note, source, category FROM movements ORDER BY rowid",
  )).map((row) => ({
    id: text(row.id),
    accountId: text(row.account_id),
    minor: integer(row.minor),
    kind: movementKind(row.kind),
    transferId: row.transfer_id === null ? null : text(row.transfer_id),
    occurredOn: text(row.occurred_on),
    note: text(row.note),
    source: source(row.source),
    category: categoryFor(movementKind(row.kind), row.category),
  }))

  return { accounts, movements }
}

async function userVersion(sql: Sql): Promise<number> {
  const rows = await sql.all("PRAGMA user_version")
  return Number(rows[0]?.user_version ?? 0)
}

function text(value: unknown): string {
  if (typeof value !== "string") throw new DomainError("persistence.corrupt")
  return value
}

function integer(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new DomainError("persistence.corrupt")
  return value
}

function holdingKind(value: unknown): HoldingKind {
  if (value !== "stock" && value !== "crypto") throw new DomainError("persistence.corrupt")
  return value
}

function accountKind(value: unknown): AccountKind {
  if (typeof value !== "string" || !accountKinds.has(value as AccountKind)) {
    throw new DomainError("persistence.corrupt")
  }
  return value as AccountKind
}

function movementKind(value: unknown): MovementKind {
  if (typeof value !== "string" || !movementKinds.has(value as MovementKind)) {
    throw new DomainError("persistence.corrupt")
  }
  return value as MovementKind
}

function source(value: unknown): MovementSource {
  if (value !== "manual" && value !== "assistant" && value !== "whatsapp") {
    throw new DomainError("persistence.corrupt")
  }
  return value
}

function categoryFor(kind: MovementKind, value: unknown): Category | null {
  if (kind === "transfer" || kind === "opening") return null
  if (value === null || value === undefined) return "outros"
  if (typeof value !== "string" || !isCategory(value)) throw new DomainError("persistence.corrupt")
  return value
}
