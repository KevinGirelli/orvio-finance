import { DomainError } from "../domain/money.ts"

const messages: Record<string, string> = {
  "account.name_empty": "Dê um nome para a conta.",
  "account.name_too_long": "O nome da conta está longo demais.",
  "money.invalid_input": "Use um valor como 10,50.",
  "money.not_integer": "O valor precisa ser em centavos inteiros.",
  "movement.amount_not_positive": "O valor precisa ser maior que zero.",
  "movement.note_too_long": "A descrição está longa demais.",
  "date.invalid": "Use a data no formato AAAA-MM-DD.",
  "transfer.same_account": "Escolha duas contas diferentes.",
  "account.not_found": "Essa conta não está mais disponível.",
  "account.archived": "Essa conta está arquivada.",
  "profile.name_too_long": "O nome cabe em 24 caracteres.",
  "profile.ceiling_invalid": "O teto precisa ser maior que zero. Deixe vazio para desligar.",
}

export function messageFor(error: unknown): string {
  if (error instanceof DomainError) return messages[error.code] ?? "Não foi possível salvar."
  return "Não foi possível salvar."
}
