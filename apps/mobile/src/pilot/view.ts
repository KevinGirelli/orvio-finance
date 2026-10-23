import { categoryLabel } from "../domain/categories.ts"
import { activity, balance, netWorth, type Ledger } from "../domain/ledger.ts"
import { formatBrl, money } from "../domain/money.ts"

const kindLabel = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro",
} as const

export type AccountRow = {
  id: string
  name: string
  kind: string
  balance: string
}

export type ActivityRow = {
  id: string
  title: string
  detail: string
  amount: string
  when: string
}

export type Summary = {
  netWorth: string
  accounts: AccountRow[]
  activity: ActivityRow[]
}

export function todayIso(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function summarize(ledger: Ledger): Summary {
  const names = new Map(ledger.accounts.map((account) => [account.id, account.name]))
  return {
    netWorth: formatBrl(netWorth(ledger)),
    accounts: ledger.accounts
      .filter((account) => !account.archived)
      .map((account) => ({
        id: account.id,
        name: account.name,
        kind: kindLabel[account.kind],
        balance: formatBrl(balance(ledger, account.id)),
      })),
    activity: activity(ledger).map((item) => {
      if (item.kind === "transfer") {
        return {
          id: item.id,
          title: `${names.get(item.fromAccountId) ?? "Conta"} → ${names.get(item.toAccountId) ?? "Conta"}`,
          detail: item.note || "Transferência",
          amount: formatBrl(money(item.minor)),
          when: item.occurredOn,
        }
      }
      const accountName = names.get(item.accountId) ?? "Conta"
      const title =
        item.note ||
        (item.kind === "income" ? "Entrada" : item.kind === "expense" ? "Saída" : "Saldo inicial")
      const signed = item.kind === "expense" ? -item.minor : item.minor
      const category = item.category ? categoryLabel[item.category] : ""
      return {
        id: item.id,
        title,
        detail: category ? `${category} · ${accountName}` : accountName,
        amount: formatBrl(money(signed)),
        when: item.occurredOn,
      }
    }),
  }
}
