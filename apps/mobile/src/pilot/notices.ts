import { netWorth, type Ledger } from "../domain/ledger.ts"
import { formatBrl, money } from "../domain/money.ts"
import type { Profile } from "../domain/profile.ts"
import { assess } from "./game.ts"

export function telegramChatId(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length < 5 || digits.length > 15) return null
  return digits
}

export function noticeBody(ledger: Ledger, profile: Profile, today: string): string | null {
  const lines: string[] = []
  const month = today.slice(0, 7)
  const game = assess(ledger, profile, today)
  if (profile.notices.daily) {
    const income = monthMinor(ledger, month, "income")
    const spent = monthMinor(ledger, month, "expense")
    lines.push(
      `Resumo: patrimônio ${formatBrl(netWorth(ledger))}. No mês entrou ${formatBrl(money(income))} e saiu ${formatBrl(money(spent))}.`,
    )
  }
  if (profile.notices.streak) {
    const postedToday = ledger.movements.some((movement) => movement.occurredOn === today && movement.kind !== "opening")
    if (game.streak === 0) lines.push("Sequência parada. Um lançamento hoje começa de novo.")
    else if (postedToday) lines.push(`Sequência de ${game.streak} dias. Hoje já conta.`)
    else lines.push(`Sequência de ${game.streak} dias. Ainda falta lançar hoje.`)
  }
  if (profile.notices.ceiling) {
    if (!game.ceiling) lines.push("Teto do mês desligado.")
    else if (game.ceiling.over) {
      lines.push(`Teto estourou: saiu ${formatBrl(money(game.ceiling.spent))} de ${formatBrl(money(game.ceiling.limit))}.`)
    } else {
      lines.push(`Teto: saiu ${formatBrl(money(game.ceiling.spent))} de ${formatBrl(money(game.ceiling.limit))}.`)
    }
  }
  if (lines.length === 0) return null
  return ["Orvio", ...lines].join("\n")
}

function monthMinor(ledger: Ledger, month: string, kind: "income" | "expense"): number {
  return ledger.movements
    .filter((movement) => movement.kind === kind && movement.occurredOn.startsWith(month))
    .reduce((sum, movement) => sum + Math.abs(movement.minor), 0)
}
