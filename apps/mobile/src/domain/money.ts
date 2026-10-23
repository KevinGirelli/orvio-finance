export class DomainError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = "DomainError"
    this.code = code
  }
}

export type Money = {
  readonly currency: string
  readonly minor: number
}

export function money(minor: number, currency = "BRL"): Money {
  if (!Number.isInteger(minor)) {
    throw new DomainError("money.not_integer")
  }
  return { currency, minor }
}

export function addMoney(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new DomainError("money.currency_mismatch")
  }
  return money(left.minor + right.minor, left.currency)
}

export function formatBrl(value: Money): string {
  if (value.currency !== "BRL") {
    throw new DomainError("money.currency_mismatch")
  }
  const sign = value.minor < 0 ? "-" : ""
  const absolute = Math.abs(value.minor)
  const reais = Math.trunc(absolute / 100)
  const centavos = absolute % 100
  const grouped = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${sign}R$ ${grouped},${centavos.toString().padStart(2, "0")}`
}

export function parseBrl(input: string): Money {
  const trimmed = input.trim().replace(/\s+/g, "")
  const match = trimmed.match(/^(-)?(?:R\$)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?$/)
  if (!match) {
    throw new DomainError("money.invalid_input")
  }
  const sign = match[1] === "-" ? -1 : 1
  const reais = Number(match[2].replaceAll(".", ""))
  const fraction = match[3] ?? ""
  const centavos = fraction.length === 0 ? 0 : Number(fraction.padEnd(2, "0"))
  return money(sign * (reais * 100 + centavos))
}
