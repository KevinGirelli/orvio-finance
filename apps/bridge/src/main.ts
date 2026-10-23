import "node:process"
import { createBridge } from "./server.ts"
import { pullTelegram, sendTelegram, startText } from "./telegram.ts"

const secret = process.env.ORVIO_BRIDGE_SECRET ?? ""
const telegramToken = process.env.TELEGRAM_BOT_TOKEN ?? ""
const authToken = process.env.TWILIO_AUTH_TOKEN ?? ""
const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ""
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM ?? ""
const publicUrl = process.env.ORVIO_PUBLIC_WEBHOOK_URL ?? ""
const port = Number(process.env.PORT ?? "8787")
const twilioReady = [authToken, accountSid, whatsappFrom, publicUrl].every((value) => value.length > 0)

if (secret.length === 0 || (telegramToken.length === 0 && !twilioReady)) {
  console.error("Defina ORVIO_BRIDGE_SECRET e TELEGRAM_BOT_TOKEN.")
  process.exit(1)
}

const bridge = createBridge({ secret, authToken, accountSid, whatsappFrom, publicUrl, telegramToken })
await bridge.listen(port)
console.log(`Orvio bridge em http://127.0.0.1:${port}`)

if (telegramToken.length === 0) {
  console.log("Telegram sem token. Grave TELEGRAM_BOT_TOKEN no .env e suba de novo.")
} else {
  console.log("Telegram em long polling.")
  void poll()
}

async function poll() {
  let offset = 0
  for (;;) {
    try {
      const pulled = await pullTelegram(telegramToken, offset)
      if (pulled.nextOffset !== null) offset = pulled.nextOffset
      for (const chat of pulled.chats) {
        if (chat.start) {
          await sendTelegram(telegramToken, chat.chatId, startText)
          continue
        }
        bridge.ingest(chat.chatId, chat.text, `tg-${chat.updateId}`)
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
}
