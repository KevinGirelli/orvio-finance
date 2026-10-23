import { categoryFromText, categoryLabel, type Category } from "../domain/categories.ts"
import {
  balance,
  netWorth,
  postExpense,
  postIncome,
  postTransfer,
  type Ledger,
  type MovementSource,
} from "../domain/ledger.ts"
import { DomainError, formatBrl, money, parseBrl } from "../domain/money.ts"
import { categorySeries, monthSeries } from "../pilot/charts.ts"

export type Proposal = {
  kind: "expense" | "income" | "transfer"
  accountName: string
  toAccountName: string
  minor: number
  category: Category | null
  note: string
  occurredOn: string
  source: MovementSource
}

export type Interpreted =
  | { type: "reply"; text: string }
  | { type: "proposal"; proposal: Proposal }
  | { type: "confirm" }
  | { type: "cancel" }
  | { type: "unknown" }

const fillers = new Set(["de", "do", "da", "dos", "das", "no", "na", "nos", "nas", "em", "com", "conta", "para", "pro", "pra"])

export function interpret(ledger: Ledger, text: string, today: string, source: MovementSource): Interpreted {
  const trimmed = text.trim().replace(/\s+/g, " ")
  const folded = trimmed.toLocaleLowerCase("pt-BR")
  if (/^(sim|confirmar|confirma|pode|ok)$/.test(folded)) return { type: "confirm" }
  if (/^(não|nao|cancela|cancelar)$/.test(folded)) return { type: "cancel" }
  if (/^(saldo|patrimônio|patrimonio)$/.test(folded)) return { type: "reply", text: balanceReply(ledger) }
  if (/^resumo$/.test(folded)) return { type: "reply", text: summaryReply(ledger, today) }
  const spent = folded.match(/^quanto gastei(?:\s+(?:com|de|em)\s+(.+))?$/)
  if (spent) return { type: "reply", text: spentReply(ledger, today, spent[1] ?? "") }

  const transfer = folded.match(/^transferi\s+(.+?)\s+d[oa]\s+(.+?)\s+(?:para|pro|pra)\s+(.+)$/)
  if (transfer) return transferProposal(ledger, transfer[1], transfer[2], transfer[3], today, source)
  const expense = folded.match(/^(?:gastei|paguei|saiu)\s+(.+)$/)
  if (expense) return postingProposal(ledger, "expense", expense[1], today, source)
  const income = folded.match(/^(?:recebi|entrou|ganhei)\s+(.+)$/)
  if (income) return postingProposal(ledger, "income", income[1], today, source)
  return { type: "unknown" }
}

export function describeProposal(proposal: Proposal): string {
  const amount = formatBrl(money(proposal.minor))
  if (proposal.kind === "transfer") {
    return `Transferir ${amount} de ${proposal.accountName} para ${proposal.toAccountName}.`
  }
  const verb = proposal.kind === "expense" ? "Lançar saída" : "Lançar entrada"
  const category = proposal.category ? ` em ${categoryLabel[proposal.category]}` : ""
  const note = proposal.note ? ` (${proposal.note})` : ""
  return `${verb} de ${amount}${category} na conta ${proposal.accountName}${note}.`
}

export function applyProposal(ledger: Ledger, proposal: Proposal, id: string): Ledger {
  const account = findAccount(ledger, proposal.accountName)
  if (!account) throw new DomainError("account.not_found")
  if (proposal.kind === "transfer") {
    const destination = findAccount(ledger, proposal.toAccountName)
    if (!destination) throw new DomainError("account.not_found")
    return postTransfer(ledger, {
      id,
      fromAccountId: account.id,
      toAccountId: destination.id,
      minor: proposal.minor,
      occurredOn: proposal.occurredOn,
      note: proposal.note,
      source: proposal.source,
    })
  }
  const posting = {
    id,
    accountId: account.id,
    minor: proposal.minor,
    occurredOn: proposal.occurredOn,
    note: proposal.note,
    category: proposal.category ?? "outros",
    source: proposal.source,
  }
  return proposal.kind === "expense" ? postExpense(ledger, posting) : postIncome(ledger, posting)
}

function balanceReply(ledger: Ledger): string {
  const lines = ledger.accounts
    .filter((account) => !account.archived)
    .map((account) => `${account.name}: ${formatBrl(balance(ledger, account.id))}`)
  return [`Patrimônio ${formatBrl(netWorth(ledger))}.`, ...lines].join("\n")
}

function summaryReply(ledger: Ledger, today: string): string {
  const month = monthSeries(ledger, today).at(-1)
  return `Neste mês: entradas ${formatBrl(money(month?.income ?? 0))} e saídas ${formatBrl(money(month?.expense ?? 0))}.`
}

function spentReply(ledger: Ledger, today: string, topic: string): string {
  const bars = categorySeries(ledger, today)
  const category = topic ? categoryFromText(topic) : null
  if (category) {
    const found = bars.find((bar) => bar.category === category)
    return `${categoryLabel[category]} neste mês: ${formatBrl(money(found?.minor ?? 0))}.`
  }
  const total = bars.reduce((sum, bar) => sum + bar.minor, 0)
  return `Saídas neste mês: ${formatBrl(money(total))}.`
}

function postingProposal(
  ledger: Ledger,
  kind: "expense" | "income",
  rest: string,
  today: string,
  source: MovementSource,
): Interpreted {
  const amount = firstAmount(rest)
  if (!amount) return { type: "reply", text: "Não encontrei o valor. Tente algo como: gastei 32,50 no mercado." }
  const account = resolveAccount(ledger, rest)
  if (!account.ok) return { type: "reply", text: account.missing }
  const category = kind === "expense" ? (categoryFromText(rest) ?? "outros") : (categoryFromText(rest) ?? "salario")
  const note = leftoverNote(rest, amount.raw, account.name)
  return {
    type: "proposal",
    proposal: {
      kind,
      accountName: account.name,
      toAccountName: "",
      minor: amount.minor,
      category,
      note,
      occurredOn: today,
      source,
    },
  }
}

function transferProposal(
  ledger: Ledger,
  amountText: string,
  fromText: string,
  toText: string,
  today: string,
  source: MovementSource,
): Interpreted {
  const amount = firstAmount(amountText)
  if (!amount) return { type: "reply", text: "Não encontrei o valor da transferência." }
  const from = findAccount(ledger, fromText)
  const to = findAccount(ledger, toText)
  if (!from || !to) return { type: "reply", text: "Não achei as duas contas dessa transferência." }
  return {
    type: "proposal",
    proposal: {
      kind: "transfer",
      accountName: from.name,
      toAccountName: to.name,
      minor: amount.minor,
      category: null,
      note: "",
      occurredOn: today,
      source,
    },
  }
}

function resolveAccount(ledger: Ledger, text: string): { ok: true; name: string } | { ok: false; missing: string } {
  const found = findAccount(ledger, text)
  if (found) return { ok: true, name: found.name }
  const active = ledger.accounts.filter((account) => !account.archived)
  if (active.length === 1) return { ok: true, name: active[0].name }
  if (active.length === 0) return { ok: false, missing: "Abra uma conta antes de lançar." }
  return { ok: false, missing: `Em qual conta? ${active.map((account) => account.name).join(" ou ")}.` }
}

function findAccount(ledger: Ledger, text: string) {
  const folded = text.toLocaleLowerCase("pt-BR")
  const matches = ledger.accounts
    .filter((account) => !account.archived && folded.includes(account.name.toLocaleLowerCase("pt-BR")))
    .sort((left, right) => right.name.length - left.name.length)
  return matches[0]
}

function firstAmount(text: string): { minor: number; raw: string } | null {
  const match = text.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?/)
  if (!match) return null
  return { minor: parseBrl(match[0]).minor, raw: match[0] }
}

function leftoverNote(text: string, amount: string, accountName: string): string {
  const words = text
    .replace(amount, " ")
    .replace(new RegExp(accountName, "i"), " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && !fillers.has(word.toLocaleLowerCase("pt-BR")))
  const note = words.join(" ")
  return note.length > 80 ? note.slice(0, 80) : note
}
