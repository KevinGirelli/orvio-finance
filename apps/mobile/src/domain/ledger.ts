import { DomainError, money, type Money } from "./money.ts"

export type AccountKind = "checking" | "savings" | "cash"
export type MovementKind = "income" | "expense" | "transfer" | "opening"

export type Account = {
  id: string
  name: string
  kind: AccountKind
  currency: "BRL"
  archived: boolean
}

export type Movement = {
  id: string
  accountId: string
  minor: number
  kind: MovementKind
  transferId: string | null
  occurredOn: string
  note: string
  source: "manual"
}

export type Ledger = {
  accounts: Account[]
  movements: Movement[]
}

export type Activity =
  | {
      id: string
      kind: "income" | "expense" | "opening"
      accountId: string
      minor: number
      occurredOn: string
      note: string
    }
  | {
      id: string
      kind: "transfer"
      fromAccountId: string
      toAccountId: string
      minor: number
      occurredOn: string
      note: string
    }

type AccountInput = { id: string; name: string; kind: AccountKind }
type PostingInput = { id: string; accountId: string; minor: number; occurredOn: string; note: string }
type TransferInput = {
  id: string
  fromAccountId: string
  toAccountId: string
  minor: number
  occurredOn: string
  note: string
}

export function emptyLedger(): Ledger {
  return { accounts: [], movements: [] }
}

export function openAccount(ledger: Ledger, input: AccountInput): Ledger {
  const name = input.name.trim()
  if (name.length === 0) throw new DomainError("account.name_empty")
  if (name.length > 60) throw new DomainError("account.name_too_long")
  if (input.id.trim().length === 0) throw new DomainError("account.id_empty")
  if (ledger.accounts.some((account) => account.id === input.id)) {
    throw new DomainError("account.duplicate_id")
  }
  return {
    accounts: [
      ...ledger.accounts,
      { id: input.id, name, kind: input.kind, currency: "BRL", archived: false },
    ],
    movements: ledger.movements,
  }
}

export function postOpening(ledger: Ledger, input: PostingInput): Ledger {
  assertPositive(input.minor)
  return append(ledger, {
    id: input.id,
    accountId: requireActiveAccount(ledger, input.accountId).id,
    minor: input.minor,
    kind: "opening",
    transferId: null,
    occurredOn: requireDate(input.occurredOn),
    note: requireNote(input.note),
    source: "manual",
  })
}

export function postIncome(ledger: Ledger, input: PostingInput): Ledger {
  assertPositive(input.minor)
  return append(ledger, {
    id: input.id,
    accountId: requireActiveAccount(ledger, input.accountId).id,
    minor: input.minor,
    kind: "income",
    transferId: null,
    occurredOn: requireDate(input.occurredOn),
    note: requireNote(input.note),
    source: "manual",
  })
}

export function postExpense(ledger: Ledger, input: PostingInput): Ledger {
  assertPositive(input.minor)
  return append(ledger, {
    id: input.id,
    accountId: requireActiveAccount(ledger, input.accountId).id,
    minor: -input.minor,
    kind: "expense",
    transferId: null,
    occurredOn: requireDate(input.occurredOn),
    note: requireNote(input.note),
    source: "manual",
  })
}

export function postTransfer(ledger: Ledger, input: TransferInput): Ledger {
  assertPositive(input.minor)
  if (input.fromAccountId === input.toAccountId) throw new DomainError("transfer.same_account")
  const from = requireActiveAccount(ledger, input.fromAccountId)
  const to = requireActiveAccount(ledger, input.toAccountId)
  const occurredOn = requireDate(input.occurredOn)
  const note = requireNote(input.note)
  const withOut = append(ledger, {
    id: `${input.id}:out`,
    accountId: from.id,
    minor: -input.minor,
    kind: "transfer",
    transferId: input.id,
    occurredOn,
    note,
    source: "manual",
  })
  return append(withOut, {
    id: `${input.id}:in`,
    accountId: to.id,
    minor: input.minor,
    kind: "transfer",
    transferId: input.id,
    occurredOn,
    note,
    source: "manual",
  })
}

export function balance(ledger: Ledger, accountId: string): Money {
  requireAccount(ledger, accountId)
  const minor = ledger.movements
    .filter((movement) => movement.accountId === accountId)
    .reduce((sum, movement) => sum + movement.minor, 0)
  return money(minor)
}

export function netWorth(ledger: Ledger): Money {
  const minor = ledger.movements.reduce((sum, movement) => sum + movement.minor, 0)
  return money(minor)
}

export function activity(ledger: Ledger): Activity[] {
  const items: { at: number; item: Activity }[] = []
  const seenTransfers = new Set<string>()

  ledger.movements.forEach((movement, index) => {
    if (movement.kind === "transfer") {
      const transferId = movement.transferId
      if (transferId === null || seenTransfers.has(transferId)) return
      seenTransfers.add(transferId)
      const pair = ledger.movements.filter((candidate) => candidate.transferId === transferId)
      const outgoing = pair.find((candidate) => candidate.minor < 0)
      const incoming = pair.find((candidate) => candidate.minor > 0)
      if (!outgoing || !incoming) throw new DomainError("transfer.unbalanced")
      items.push({
        at: index,
        item: {
          id: transferId,
          kind: "transfer",
          fromAccountId: outgoing.accountId,
          toAccountId: incoming.accountId,
          minor: incoming.minor,
          occurredOn: outgoing.occurredOn,
          note: outgoing.note,
        },
      })
      return
    }

    items.push({
      at: index,
      item: {
        id: movement.id,
        kind: movement.kind,
        accountId: movement.accountId,
        minor: Math.abs(movement.minor),
        occurredOn: movement.occurredOn,
        note: movement.note,
      },
    })
  })

  return items
    .sort((left, right) => {
      const byDate = right.item.occurredOn.localeCompare(left.item.occurredOn)
      if (byDate !== 0) return byDate
      return right.at - left.at
    })
    .map((entry) => entry.item)
}

function append(ledger: Ledger, movement: Movement): Ledger {
  if (ledger.movements.some((existing) => existing.id === movement.id || existing.transferId === movement.id)) {
    throw new DomainError("movement.duplicate_id")
  }
  if (movement.transferId !== null && ledger.movements.some((existing) => existing.id === movement.transferId)) {
    throw new DomainError("movement.duplicate_id")
  }
  return { accounts: ledger.accounts, movements: [...ledger.movements, movement] }
}

function requireAccount(ledger: Ledger, accountId: string): Account {
  const account = ledger.accounts.find((candidate) => candidate.id === accountId)
  if (!account) throw new DomainError("account.not_found")
  return account
}

function requireActiveAccount(ledger: Ledger, accountId: string): Account {
  const account = requireAccount(ledger, accountId)
  if (account.archived) throw new DomainError("account.archived")
  return account
}

function assertPositive(minor: number): void {
  if (!Number.isInteger(minor) || minor <= 0) throw new DomainError("movement.amount_not_positive")
}

function requireDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DomainError("date.invalid")
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new DomainError("date.invalid")
  }
  return value
}

function requireNote(note: string): string {
  const trimmed = note.trim()
  if (trimmed.length > 280) throw new DomainError("movement.note_too_long")
  return trimmed
}
