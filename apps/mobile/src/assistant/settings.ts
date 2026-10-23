import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

export type AssistantSettings = {
  xaiKey: string
  bridgeUrl: string
  bridgeSecret: string
  telegramChat: string
}

export const emptySettings: AssistantSettings = { xaiKey: "", bridgeUrl: "", bridgeSecret: "", telegramChat: "" }

const storageKey = "orvio.assistant"

export async function loadSettings(): Promise<AssistantSettings> {
  if (Platform.OS === "web") return emptySettings
  try {
    const raw = await SecureStore.getItemAsync(storageKey)
    if (!raw) return emptySettings
    const parsed = JSON.parse(raw) as Partial<AssistantSettings>
    return {
      xaiKey: typeof parsed.xaiKey === "string" ? parsed.xaiKey : "",
      bridgeUrl: typeof parsed.bridgeUrl === "string" ? parsed.bridgeUrl : "",
      bridgeSecret: typeof parsed.bridgeSecret === "string" ? parsed.bridgeSecret : "",
      telegramChat: typeof parsed.telegramChat === "string" ? parsed.telegramChat : "",
    }
  } catch {
    return emptySettings
  }
}

export async function saveSettings(settings: AssistantSettings): Promise<void> {
  if (Platform.OS === "web") return
  await SecureStore.setItemAsync(storageKey, JSON.stringify(settings))
}
