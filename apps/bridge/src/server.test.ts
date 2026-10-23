import assert from "node:assert/strict"
import { test } from "node:test"
import { twilioSignature } from "./signature.ts"
import { createBridge } from "./server.ts"

test("rejects a Twilio webhook with a bad signature and queues a valid one once", async () => {
  const sent: string[] = []
  const bridge = createBridge({
    secret: "bridge-secret",
    authToken: "twilio-token",
    accountSid: "AC123",
    whatsappFrom: "whatsapp:+14155238886",
    publicUrl: "https://example.test/twilio/whatsapp",
    fetchImpl: async (_url, init) => {
      sent.push(String(init?.body))
      return new Response("", { status: 201 })
    },
  })
  await bridge.listen(0)
  const base = bridge.address()
  try {
    const params = { Body: "gastei 10", From: "whatsapp:+5511999999999", MessageSid: "SM1" }
    const signature = twilioSignature("twilio-token", "https://example.test/twilio/whatsapp", params)
    const form = new URLSearchParams(params)
    const rejected = await fetch(`${base}/twilio/whatsapp`, { method: "POST", body: form })
    assert.equal(rejected.status, 403)

    const accepted = await fetch(`${base}/twilio/whatsapp`, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: form,
    })
    assert.equal(accepted.status, 200)
    const duplicate = await fetch(`${base}/twilio/whatsapp`, {
      method: "POST",
      headers: { "x-twilio-signature": signature },
      body: form,
    })
    assert.equal(duplicate.status, 200)

    const inbox = await fetch(`${base}/inbox`, { headers: { authorization: "Bearer bridge-secret" } })
    const body = (await inbox.json()) as { messages: { id: string; body: string }[] }
    assert.equal(body.messages.length, 1)
    assert.equal(body.messages[0]?.body, "gastei 10")

    const reply = await fetch(`${base}/reply`, {
      method: "POST",
      headers: { authorization: "Bearer bridge-secret", "content-type": "application/json" },
      body: JSON.stringify({ to: "whatsapp:+5511999999999", body: "Confirma?" }),
    })
    assert.equal(reply.status, 204)
    assert.match(sent[0] ?? "", /Confirma/)

    await fetch(`${base}/ack`, {
      method: "POST",
      headers: { authorization: "Bearer bridge-secret", "content-type": "application/json" },
      body: JSON.stringify({ ids: [body.messages[0]?.id] }),
    })
    const after = (await (await fetch(`${base}/inbox`, { headers: { authorization: "Bearer bridge-secret" } })).json()) as {
      messages: unknown[]
    }
    assert.equal(after.messages.length, 0)
  } finally {
    await bridge.close()
  }
})
