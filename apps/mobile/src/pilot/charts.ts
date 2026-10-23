import { categoryLabel, type Category } from "../domain/categories.ts"
import { type Ledger } from "../domain/ledger.ts"

const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export type MonthBar = {
  key: string
  label: string
  income: number
  expense: number
}

export type CategoryBar = {
  category: Category
  label: string
  minor: number
}

export function monthSeries(ledger: Ledger, today: string): MonthBar[] {
  const end = today.slice(0, 7)
  const keys = Array.from({ length: 6 }, (_, index) => shiftMonth(end, index - 5))
  return keys.map((key) => {
    let income = 0
    let expense = 0
    for (const movement of ledger.movements) {
      if (!movement.occurredOn.startsWith(key)) continue
      if (movement.kind === "income") income += movement.minor
      if (movement.kind === "expense") expense += Math.abs(movement.minor)
    }
    const month = Number(key.slice(5, 7))
    return { key, label: monthNames[month - 1] ?? key, income, expense }
  })
}

export function categorySeries(ledger: Ledger, today: string): CategoryBar[] {
  const month = today.slice(0, 7)
  const totals = new Map<Category, number>()
  for (const movement of ledger.movements) {
    if (movement.kind !== "expense" || !movement.occurredOn.startsWith(month) || movement.category === null) {
      continue
    }
    totals.set(movement.category, (totals.get(movement.category) ?? 0) + Math.abs(movement.minor))
  }
  return [...totals.entries()]
    .map(([category, minor]) => ({ category, label: categoryLabel[category], minor }))
    .sort((left, right) => right.minor - left.minor)
}

function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}
