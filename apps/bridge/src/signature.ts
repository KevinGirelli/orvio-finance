import { createHmac, timingSafeEqual } from "node:crypto"

export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url)
  return createHmac("sha1", authToken).update(payload, "utf8").digest("base64")
}

export function signaturesMatch(expected: string, received: string | undefined): boolean {
  if (!received) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
