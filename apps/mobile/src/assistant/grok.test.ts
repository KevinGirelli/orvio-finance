import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyLedger, openAccount } from "../domain/ledger.ts"
import { askLedger, ledgerContext, readGrokBody } from "./grok.ts"

test("the xAI request uses the caller's key, grok-4.7, and does not ask for web search", async () => {
  const ledger = openAccount(emptyLedger(), { id: "checking", name: "Inter", kind: "checking" })
  const seen = { authorization: "", body: {} as Record<string, unknown> }
  const answer = await askLedger({
    apiKey: "test-key",
    ledger,
    today: "2026-10-23",
    message: "paguei o aluguel ontem",
    source: "assistant",
    fetchImpl: async (_url, init) => {
      const headers = new Headers(init?.headers)
      seen.authorization = headers.get("authorization") ?? ""
      seen.body = JSON.parse(String(init?.body)) as Record<string, unknown>
      return new Response(
        JSON.stringify({
          output: [
            {
              type: "function_call",
              name: "propose_movement",
              arguments: JSON.stringify({
                kind: "expense",
                account: "Inter",
                amount: "1.200,00",
                category: "moradia",
                note: "Aluguel",
              }),
            },
          ],
        }),
        { status: 200 },
      )
    },
  })

  assert.equal(seen.authorization, "Bearer test-key")
  assert.equal(seen.body.model, "grok-4.7")
  assert.equal(seen.body.store, false)
  const tools = seen.body.tools as { type: string; name?: string }[]
  assert.deepEqual(tools.map((tool) => tool.type), ["function"])
  assert.equal(answer.type, "proposal")
  if (answer.type === "proposal") {
    assert.equal(answer.proposal.minor, 120000)
    assert.equal(answer.proposal.category, "moradia")
  }
  assert.match(ledgerContext(ledger, "2026-10-23"), /Inter/)
  assert.doesNotMatch(ledgerContext(ledger, "2026-10-23"), /test-key/)
})

test("a plain answer is shown and a bad payload does not invent a posting", () => {
  assert.equal(readGrokBody({ output_text: "Pode detalhar o valor?" }, "2026-10-23", "assistant").type, "reply")
  const broken = readGrokBody({ output: [{ type: "function_call", name: "propose_movement", arguments: "{}" }] }, "2026-10-23", "assistant")
  assert.equal(broken.type, "reply")
})
