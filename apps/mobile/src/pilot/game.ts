import type { Category } from "../domain/categories.ts"
import type { Ledger } from "../domain/ledger.ts"
import type { Profile } from "../domain/profile.ts"

const levelSteps = [1, 3, 7, 14, 30, 60, 100]

export type Shield = "none" | "held" | "spent"
export type Mood = "quiet" | "steady" | "proud" | "worried"

export type StickerState = {
  id: string
  title: string
  detail: string
  earned: boolean
  progress: number
}

export type Assessment = {
  streak: number
  alive: boolean
  shield: Shield
  level: number
  points: number
  levelProgress: number
  nextLevelAt: number | null
  mood: Mood
  ceiling: { limit: number; spent: number; over: boolean } | null
  stickers: StickerState[]
}

export function shiftIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0")
  const nextDay = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`
}

export function assess(ledger: Ledger, profile: Profile, today: string): Assessment {
  const days = postingDays(ledger)
  const chain = streakChain(days, today)
  const points = days.size
  const level = levelFor(points)
  const month = today.slice(0, 7)
  const spent = monthExpenses(ledger, month)
  const ceiling =
    profile.ceilingMinor === null
      ? null
      : { limit: profile.ceilingMinor, spent, over: spent > profile.ceilingMinor }
  const categories = monthCategories(ledger, month)

  return {
    streak: chain.length,
    alive: chain.length > 0,
    shield: chain.shieldSpent ? "spent" : chain.length >= 7 ? "held" : "none",
    level,
    points,
    levelProgress: levelProgress(points),
    nextLevelAt: levelSteps[level] ?? null,
    mood: moodFor(points, chain.length, ceiling, daysInMonth(days, month)),
    ceiling,
    stickers: stickersFor(ledger, chain.length, categories, ceiling),
  }
}

function postingDays(ledger: Ledger): Set<string> {
  return new Set(ledger.movements.map((movement) => movement.occurredOn))
}

function streakChain(days: Set<string>, today: string): { length: number; shieldSpent: boolean } {
  const start = days.has(today) ? today : shiftIso(today, -1)
  let length = 0
  let shieldSpent = false
  let cursor = start
  for (let step = 0; step < 500; step += 1) {
    if (days.has(cursor)) {
      length += 1
      cursor = shiftIso(cursor, -1)
      continue
    }
    const beyond = shiftIso(cursor, -1)
    if (!shieldSpent && consecutive(days, beyond) >= 7) {
      shieldSpent = true
      cursor = beyond
      continue
    }
    break
  }
  return { length, shieldSpent }
}

function consecutive(days: Set<string>, start: string): number {
  let count = 0
  let cursor = start
  while (days.has(cursor) && count < 500) {
    count += 1
    cursor = shiftIso(cursor, -1)
  }
  return count
}

function levelFor(points: number): number {
  return levelSteps.filter((step) => points >= step).length
}

function levelProgress(points: number): number {
  const level = levelFor(points)
  const next = levelSteps[level]
  if (next === undefined) return 1
  const current = level === 0 ? 0 : levelSteps[level - 1]
  return (points - current) / (next - current)
}

function monthExpenses(ledger: Ledger, month: string): number {
  return ledger.movements
    .filter((movement) => movement.kind === "expense" && movement.occurredOn.startsWith(month))
    .reduce((sum, movement) => sum + Math.abs(movement.minor), 0)
}

function monthCategories(ledger: Ledger, month: string): number {
  const categories = new Set<Category>()
  for (const movement of ledger.movements) {
    if (movement.kind === "expense" && movement.category && movement.occurredOn.startsWith(month)) {
      categories.add(movement.category)
    }
  }
  return categories.size
}

function daysInMonth(days: Set<string>, month: string): number {
  let count = 0
  for (const day of days) if (day.startsWith(month)) count += 1
  return count
}

function moodFor(
  points: number,
  streak: number,
  ceiling: Assessment["ceiling"],
  daysThisMonth: number,
): Mood {
  if (ceiling?.over) return "worried"
  if (points === 0) return "quiet"
  if (streak >= 7 || (ceiling !== null && !ceiling.over && daysThisMonth >= 8)) return "proud"
  return "steady"
}

function stickersFor(
  ledger: Ledger,
  streak: number,
  categories: number,
  ceiling: Assessment["ceiling"],
): StickerState[] {
  const posted = ledger.movements.length > 0
  const transferred = ledger.movements.some((movement) => movement.kind === "transfer")
  const within = ceiling !== null && ceiling.spent > 0 && !ceiling.over
  return [
    {
      id: "primeiro",
      title: "Primeiro passo",
      detail: posted ? "Você lançou." : "Lance qualquer coisa.",
      earned: posted,
      progress: posted ? 1 : 0,
    },
    {
      id: "tres",
      title: "Três dias",
      detail: streak >= 3 ? "Três dias seguidos." : `${Math.min(streak, 3)} de 3 dias.`,
      earned: streak >= 3,
      progress: Math.min(streak, 3) / 3,
    },
    {
      id: "semana",
      title: "Semana firme",
      detail: streak >= 7 ? "Sete dias seguidos." : `${Math.min(streak, 7)} de 7 dias.`,
      earned: streak >= 7,
      progress: Math.min(streak, 7) / 7,
    },
    {
      id: "mapa",
      title: "Mapa do mês",
      detail: categories >= 4 ? "Quatro categorias neste mês." : `${Math.min(categories, 4)} de 4 categorias.`,
      earned: categories >= 4,
      progress: Math.min(categories, 4) / 4,
    },
    {
      id: "mao",
      title: "Passou de mão",
      detail: transferred ? "Você transferiu." : "Faça uma transferência.",
      earned: transferred,
      progress: transferred ? 1 : 0,
    },
    {
      id: "teto",
      title: "Dentro do teto",
      detail: ceiling === null ? "Defina um teto no perfil." : within ? "As saídas cabem no teto." : "Uma saída, sem passar do teto.",
      earned: within,
      progress: ceiling === null || ceiling.limit === 0 ? 0 : Math.min(ceiling.spent / ceiling.limit, 1),
    },
  ]
}
