export type BridgeInboxMessage = { id: string; from: string; body: string }

export async function pullInbox(baseUrl: string, secret: string): Promise<BridgeInboxMessage[]> {
  const response = await fetch(join(baseUrl, "/inbox"), { headers: { authorization: `Bearer ${secret}` } })
  if (!response.ok) throw new Error("bridge")
  const body = (await response.json()) as { messages?: BridgeInboxMessage[] }
  return Array.isArray(body.messages) ? body.messages : []
}

export async function ackInbox(baseUrl: string, secret: string, ids: string[]): Promise<void> {
  const response = await fetch(join(baseUrl, "/ack"), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ ids }),
  })
  if (!response.ok && response.status !== 204) throw new Error("bridge")
}

export async function pushReply(baseUrl: string, secret: string, to: string, body: string): Promise<void> {
  const response = await fetch(join(baseUrl, "/reply"), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ to, body }),
  })
  if (!response.ok && response.status !== 204) throw new Error("bridge")
}

function join(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`
}
