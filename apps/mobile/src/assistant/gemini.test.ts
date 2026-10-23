import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyLedger, openAccount } from "../domain/ledger.ts"
import { askGemini, isGeminiKey, readGeminiBody } from "./gemini.ts"

test("a Gemini key is recognized and a function call becomes a proposal", async () => {
  assert.equal(isGeminiKey("AQ.example"), true)
  assert.equal(isGeminiKey("AIzaExample"), true)
  assert.equal(isGeminiKey("xai-example"), false)
  const ledger = openAccount(emptyLedger(), { id: "cash", name: "Carteira", kind: "cash" })
  let header = ""
  const answer = await askGemini({
    apiKey: "AQ.test",
    ledger,
    today: "2026-10-23",
    message: "comprei uma bala por 10 centavos",
    source: "telegram",
    fetchImpl: async (_url, init) => {
      header = new Headers(init?.headers).get("x-goog-api-key") ?? ""
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "propose_movement",
                      args: { kind: "expense", account: "Carteira", amount: "0,10", category: "alimentacao", note: "bala" },
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      )
    },
  })
  assert.equal(header, "AQ.test")
  assert.equal(answer.type, "proposal")
  if (answer.type === "proposal") assert.equal(answer.proposal.minor, 10)
  assert.equal(readGeminiBody({}, "2026-10-23", "assistant").type, "reply")
})
