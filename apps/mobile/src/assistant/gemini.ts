import type { Ledger } from "../domain/ledger.ts"
import type { Proposal } from "./commands.ts"
import { ledgerContext, proposalFromArguments, type GrokAnswer } from "./grok.ts"

const model = "gemini-flash-lite-latest"

export function isGeminiKey(apiKey: string): boolean {
  return apiKey.startsWith("AQ.") || apiKey.startsWith("AIza")
}

export async function askGemini(input: {
  apiKey: string
  ledger: Ledger
  today: string
  message: string
  source: Proposal["source"]
  fetchImpl?: typeof fetch
}): Promise<GrokAnswer> {
  const fetchImpl = input.fetchImpl ?? fetch
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": input.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: ledgerContext(input.ledger, input.today) }] },
        contents: [{ role: "user", parts: [{ text: input.message }] }],
        tools: [{ functionDeclarations: [proposeDeclaration] }],
      }),
    },
  )
  if (!response.ok) return { type: "reply", text: "O Gemini não respondeu. O lançamento não foi feito." }
  return readGeminiBody(await response.json(), input.today, input.source)
}

export function readGeminiBody(body: unknown, today: string, source: Proposal["source"]): GrokAnswer {
  const candidates = record(body).candidates
  if (!Array.isArray(candidates)) return { type: "reply", text: "Não entendi. Pode dizer o valor e a conta?" }
  for (const candidate of candidates) {
    const parts = record(record(candidate).content).parts
    if (!Array.isArray(parts)) continue
    for (const part of parts) {
      const call = record(record(part).functionCall)
      if (call.name !== "propose_movement") continue
      const proposal = proposalFromArguments(call.args, today, source)
      if (proposal) return { type: "proposal", proposal }
    }
    for (const part of parts) {
      const text = record(part).text
      if (typeof text === "string" && text.trim().length > 0) return { type: "reply", text: text.trim() }
    }
  }
  return { type: "reply", text: "Não entendi. Pode dizer o valor e a conta?" }
}

const proposeDeclaration = {
  name: "propose_movement",
  description: "Propõe um lançamento para a pessoa confirmar. Não grava nada sozinho.",
  parameters: {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["expense", "income", "transfer"] },
      account: { type: "string" },
      toAccount: { type: "string" },
      amount: { type: "string", description: "Reais com vírgula. Dez centavos é 0,10." },
      category: {
        type: "string",
        enum: ["moradia", "alimentacao", "transporte", "saude", "lazer", "compras", "salario", "outros"],
      },
      note: { type: "string" },
    },
    required: ["kind", "account", "amount"],
  },
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {}
}
