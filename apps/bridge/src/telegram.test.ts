import assert from "node:assert/strict"
import { test } from "node:test"
import { pullTelegram, readTelegram, sendTelegram, startText } from "./telegram.ts"

test("a private text is kept and a sticker only moves the offset", () => {
  const read = readTelegram({
    ok: true,
    result: [
      { update_id: 4, message: { text: "/start", chat: { id: 42 } } },
      { update_id: 5, message: { sticker: { file_id: "x" }, chat: { id: 42 } } },
      { update_id: 6, message: { text: "gastei 10 no mercado", chat: { id: -100 } } },
      { update_id: 7, message: { text: "saldo", chat: { id: 42 } } },
    ],
  })
  assert.equal(read.nextOffset, 8)
  assert.equal(read.chats.length, 2)
  assert.equal(read.chats[0]?.start, true)
  assert.equal(read.chats[1]?.text, "saldo")
  assert.equal(read.chats[1]?.chatId, "42")
})

test("pull and send use the bot methods without echoing the token", async () => {
  const calls: { url: string; body: string }[] = []
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input).replace("secret-token", "hidden"), body: String(init?.body ?? "") })
    if (String(input).includes("getUpdates")) {
      return new Response(JSON.stringify({ ok: true, result: [{ update_id: 1, message: { text: "oi", chat: { id: 7 } } }] }), { status: 200 })
    }
    return new Response("{}", { status: 200 })
  }
  const pulled = await pullTelegram("secret-token", 1, fetchImpl)
  assert.equal(pulled.chats[0]?.text, "oi")
  await sendTelegram("secret-token", "7", startText, fetchImpl)
  assert.match(calls[0]?.url ?? "", /getUpdates/)
  assert.equal(calls[0]?.url.includes("secret-token"), false)
  assert.match(calls[1]?.body ?? "", /"chat_id":"7"/)
})
