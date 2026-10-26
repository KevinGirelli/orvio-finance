import { DomainError } from "../domain/money.ts"

export const accents = ["lilac", "pink", "coral"] as const

export type Accent = (typeof accents)[number]

export const accentColor: Record<Accent, string> = {
  lilac: "#D2B4EF",
  pink: "#E8B4C4",
  coral: "#F19456",
}

export const accentLabel: Record<Accent, string> = {
  lilac: "Lilás",
  pink: "Rosa",
  coral: "Coral",
}

export type NoticePrefs = {
  daily: boolean
  streak: boolean
  ceiling: boolean
}

export const defaultNotices: NoticePrefs = { daily: true, streak: true, ceiling: true }

export type Profile = {
  name: string
  accent: Accent
  ceilingMinor: number | null
  ready: boolean
  notices: NoticePrefs
  noticesSentOn: string | null
}

export function emptyProfile(): Profile {
  return { name: "", accent: "lilac", ceilingMinor: null, ready: false, notices: { ...defaultNotices }, noticesSentOn: null }
}

export function isAccent(value: string): value is Accent {
  return accents.some((accent) => accent === value)
}

export function profileName(input: string): string {
  const name = input.trim()
  if (name.length > 24) throw new DomainError("profile.name_too_long")
  return name
}
