export const startText =
  "Orvio no ar. Manda um lançamento, por exemplo: gastei 32,50 no mercado. Eu confirmo antes de gravar."

export type IncomingChat = { updateId: number; chatId: string; text: string; start: boolean }

export function readTelegram(payload: unknown): { nextOffset: number | null; chats: IncomingChat[] } {
  if (!payload || typeof payload !== "object") return { nextOffset: null, chats: [] }
  const result = (payload as { result?: unknown }).result
  if (!Array.isArray(result)) return { nextOffset: null, chats: [] }
  const chats: IncomingChat[] = []
  let max = -1
  for (const update of result) {
    if (!update || typeof update !== "object") continue
    const updateId = (update as { update_id?: unknown }).update_id
    if (typeof updateId !== "number") continue
    if (updateId > max) max = updateId
    const message = (update as { message?: { text?: unknown; chat?: { id?: unknown } } }).message
    const text = typeof message?.text === "string" ? message.text.trim() : ""
    const chatId = message?.chat?.id
    if (typeof chatId !== "number" || chatId <= 0 || text.length === 0) continue
    chats.push({ updateId, chatId: String(chatId), text, start: text === "/start" || text.startsWith("/start@") || text.startsWith("/start ") })
  }
  return { nextOffset: max >= 0 ? max + 1 : null, chats }
}

export async function pullTelegram(token: string, offset: number, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(`https://api.telegram.org/bot${token}/getUpdates?timeout=25&offset=${offset}`)
  if (!response.ok) throw new Error("telegram")
  return readTelegram(await response.json())
}

export async function sendTelegram(token: string, chatId: string, text: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!response.ok) throw new Error("telegram")
}
