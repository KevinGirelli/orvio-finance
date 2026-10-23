import { DomainError } from "../domain/money.ts"

export function requireCipherVersion(row: { cipher_version?: string | null } | null): void {
  if (!row?.cipher_version) throw new DomainError("sqlcipher.unavailable")
}

export function pragmaKeyStatement(key: Uint8Array): string {
  if (key.length !== 32) throw new DomainError("sqlcipher.key_length")
  const hex = [...key].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  return `PRAGMA key = "x'${hex}'"`
}
