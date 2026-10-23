import { isCategory, type Category } from "../domain/categories.ts"
import type { Ledger } from "../domain/ledger.ts"
import type { Proposal } from "./commands.ts"
import { monthSeries } from "../pilot/charts.ts"

const endpoint = "https://api.x.ai/v1/responses"
const model = "grok-4.7"

export type GrokAnswer = { type: "reply"; text: string } | { type: "proposal"; proposal: Proposal }

export function ledgerContext(ledger: Ledger, today: string): string {
  const names = ledger.accounts
    .filter((account) => !account.archived)
    .map((account) => account.name)
  const month = monthSeries(ledger, today).at(-1)
  return [
    `Hoje é ${today}.`,
    `Contas: ${names.join(", ") || "nenhuma"}.`,
    `Neste mês, entradas em centavos: ${month?.income ?? 0}. Saídas em centavos: ${month?.expense ?? 0}.`,
    "Você organiza um livro-caixa pessoal. Não recomende compra ou venda de investimento e não invente cotação.",
    "Se a pessoa quiser lançar, transferir ou registrar dinheiro, chame propose_movement. Caso contrário, responda em português, curto.",
  ].join("\n")
}

export async function askLedger(input: {
  apiKey: string
  ledger: Ledger
  today: string
  message: string
  source: Proposal["source"]
  fetchImpl?: typeof fetch
}): Promise<GrokAnswer> {
  const fetchImpl = input.fetchImpl ?? fetch
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: "system", content: ledgerContext(input.ledger, input.today) },
        { role: "user", content: input.message },
      ],
      tools: [proposeTool],
    }),
  })
  if (!response.ok) return { type: "reply", text: "A xAI não respondeu. O lançamento não foi feito." }
  return readGrokBody(await response.json(), input.today, input.source)
}

export function readGrokBody(body: unknown, today: string, source: Proposal["source"]): GrokAnswer {
  const output = record(body).output
  if (!Array.isArray(output)) return { type: "reply", text: textOf(body) }
  for (const item of output) {
    const call = record(item)
    if (call.type !== "function_call" || call.name !== "propose_movement") continue
    const proposal = proposalFromArguments(call.arguments, today, source)
    if (proposal) return { type: "proposal", proposal }
  }
  return { type: "reply", text: textOf(body) }
}

const proposeTool = {
  type: "function",
  name: "propose_movement",
  description: "Propõe um lançamento para a pessoa confirmar. Não grava nada sozinho.",
  parameters: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["expense", "income", "transfer"] },
      account: { type: "string" },
      toAccount: { type: "string" },
      amount: { type: "string", description: "Reais com vírgula, por exemplo 32,50" },
      category: {
        type: "string",
        enum: ["moradia", "alimentacao", "transporte", "saude", "lazer", "compras", "salario", "outros"],
      },
      note: { type: "string" },
    },
    required: ["kind", "account", "amount"],
  },
}

function proposalFromArguments(raw: unknown, today: string, source: Proposal["source"]): Proposal | null {
  const parsed = typeof raw === "string" ? safeJson(raw) : record(raw)
  const kind = parsed.kind
  const account = typeof parsed.account === "string" ? parsed.account.trim() : ""
  const amount = typeof parsed.amount === "string" ? parsed.amount.trim() : ""
  if ((kind !== "expense" && kind !== "income" && kind !== "transfer") || account.length === 0 || amount.length === 0) {
    return null
  }
  const category = typeof parsed.category === "string" && isCategory(parsed.category) ? parsed.category : null
  return {
    kind,
    accountName: account,
    toAccountName: typeof parsed.toAccount === "string" ? parsed.toAccount.trim() : "",
    minor: reaisToMinor(amount),
    category: kind === "transfer" ? null : (category ?? (kind === "income" ? "salario" : "outros")),
    note: typeof parsed.note === "string" ? parsed.note.trim().slice(0, 80) : "",
    occurredOn: today,
    source,
  }
}

function reaisToMinor(amount: string): number {
  const match = amount.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/)
  if (!match) return 0
  const reais = Number(match[1].replaceAll(".", ""))
  const cents = Number((match[2] ?? "").padEnd(2, "0") || "0")
  if (!Number.isInteger(reais) || !Number.isInteger(cents)) return 0
  return reais * 100 + cents
}

function textOf(body: unknown): string {
  const direct = record(body).output_text
  if (typeof direct === "string" && direct.trim().length > 0) return direct.trim()
  const output = record(body).output
  if (!Array.isArray(output)) return "Não entendi. Pode dizer o valor e a conta?"
  for (const item of output) {
    const content = record(item).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      const text = record(part).text
      if (typeof text === "string" && text.trim().length > 0) return text.trim()
    }
  }
  return "Não entendi. Pode dizer o valor e a conta?"
}

function safeJson(raw: string): Record<string, unknown> {
  try {
    return record(JSON.parse(raw))
  } catch {
    return {}
  }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {}
}
