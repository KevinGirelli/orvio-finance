import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { signaturesMatch, twilioSignature } from "./signature.ts"
import { sendTelegram } from "./telegram.ts"

export type BridgeMessage = { id: string; from: string; body: string; sid: string }

export type BridgeOptions = {
  secret: string
  authToken: string
  accountSid: string
  whatsappFrom: string
  publicUrl: string
  telegramToken?: string
  fetchImpl?: typeof fetch
}

export function createBridge(options: BridgeOptions) {
  const queue: BridgeMessage[] = []
  const seen = new Set<string>()
  let nextId = 1
  const server = createServer((request, response) => {
    void handle(request, response)
  })

  async function handle(request: IncomingMessage, response: ServerResponse) {
    setCors(response)
    if (request.method === "OPTIONS") {
      response.writeHead(204)
      response.end()
      return
    }
    const url = new URL(request.url ?? "/", "http://bridge.local")
    try {
      if (request.method === "POST" && url.pathname === "/twilio/whatsapp") {
        const raw = await readBody(request)
        const params = Object.fromEntries(new URLSearchParams(raw))
        const expected = twilioSignature(options.authToken, options.publicUrl, params)
        const received = header(request, "x-twilio-signature")
        if (!signaturesMatch(expected, received)) {
          respond(response, 403, "text/plain", "invalid signature")
          return
        }
        ingest(params.From ?? "", params.Body ?? "", params.MessageSid ?? "")
        respond(response, 200, "text/xml", "<Response></Response>")
        return
      }
      if (!authorized(request, options.secret)) {
        respond(response, 401, "application/json", JSON.stringify({ error: "unauthorized" }))
        return
      }
      if (request.method === "GET" && url.pathname === "/inbox") {
        respond(response, 200, "application/json", JSON.stringify({ messages: queue }))
        return
      }
      if (request.method === "POST" && url.pathname === "/ack") {
        const ids = new Set(stringList((await readJson(request)).ids))
        for (let index = queue.length - 1; index >= 0; index -= 1) {
          if (ids.has(queue[index].id)) queue.splice(index, 1)
        }
        respond(response, 204, "application/json", "")
        return
      }
      if (request.method === "POST" && url.pathname === "/reply") {
        const payload = await readJson(request)
        const to = typeof payload.to === "string" ? payload.to : ""
        const body = typeof payload.body === "string" ? payload.body : ""
        if (to.length === 0 || body.length === 0) {
          respond(response, 400, "application/json", JSON.stringify({ error: "missing" }))
          return
        }
        await sendOut(options, to, body)
        respond(response, 204, "application/json", "")
        return
      }
      respond(response, 404, "application/json", JSON.stringify({ error: "not_found" }))
    } catch {
      respond(response, 500, "application/json", JSON.stringify({ error: "failed" }))
    }
  }

  function ingest(from: string, body: string, sid: string) {
    if (sid.length === 0 || seen.has(sid) || from.length === 0) return false
    seen.add(sid)
    queue.push({ id: String(nextId++), from, body, sid })
    return true
  }

  return {
    ingest,
    listen(port: number) {
      return new Promise<void>((resolve) => {
        server.listen(port, "127.0.0.1", () => resolve())
      })
    },
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    },
    address(current: Server = server) {
      const address = current.address()
      if (address === null || typeof address === "string") throw new Error("bridge not listening")
      return `http://127.0.0.1:${address.port}`
    },
  }
}

async function sendOut(options: BridgeOptions, to: string, body: string) {
  if (!to.startsWith("whatsapp:")) {
    await sendTelegram(options.telegramToken ?? "", to, body, options.fetchImpl ?? fetch)
    return
  }
  await sendWhatsApp(options, to, body)
}

async function sendWhatsApp(options: BridgeOptions, to: string, body: string) {
  const fetchImpl = options.fetchImpl ?? fetch
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(options.accountSid)}/Messages.json`
  const form = new URLSearchParams({ From: options.whatsappFrom, To: to, Body: body })
  const token = Buffer.from(`${options.accountSid}:${options.authToken}`).toString("base64")
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { authorization: `Basic ${token}`, "content-type": "application/x-www-form-urlencoded" },
    body: form,
  })
  if (!response.ok) throw new Error("twilio")
}

function authorized(request: IncomingMessage, secret: string) {
  const value = header(request, "authorization") ?? ""
  return value === `Bearer ${secret}` && secret.length > 0
}

function header(request: IncomingMessage, name: string) {
  const value = request.headers[name]
  return Array.isArray(value) ? value[0] : value
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    request.on("error", reject)
  })
}

async function readJson(request: IncomingMessage) {
  const raw = await readBody(request)
  if (raw.trim().length === 0) return {}
  return JSON.parse(raw) as Record<string, unknown>
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function setCors(response: ServerResponse) {
  response.setHeader("access-control-allow-origin", "*")
  response.setHeader("access-control-allow-headers", "authorization, content-type")
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS")
}

function respond(response: ServerResponse, status: number, type: string, body: string) {
  response.writeHead(status, { "content-type": type })
  response.end(body)
}
