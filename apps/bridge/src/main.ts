import "node:process"
import { createBridge } from "./server.ts"

const secret = process.env.ORVIO_BRIDGE_SECRET ?? ""
const authToken = process.env.TWILIO_AUTH_TOKEN ?? ""
const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ""
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM ?? ""
const publicUrl = process.env.ORVIO_PUBLIC_WEBHOOK_URL ?? ""
const port = Number(process.env.PORT ?? "8787")

if ([secret, authToken, accountSid, whatsappFrom, publicUrl].some((value) => value.length === 0)) {
  console.error(
    "Defina ORVIO_BRIDGE_SECRET, TWILIO_AUTH_TOKEN, TWILIO_ACCOUNT_SID, TWILIO_WHATSAPP_FROM e ORVIO_PUBLIC_WEBHOOK_URL.",
  )
  process.exit(1)
}

const bridge = createBridge({ secret, authToken, accountSid, whatsappFrom, publicUrl })
await bridge.listen(port)
console.log(`Orvio bridge em http://127.0.0.1:${port}`)
