import { useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useTheme, withAlpha } from "@/lib/theme"
import type { Proposal } from "../assistant/commands.ts"
import { describeProposal } from "../assistant/commands.ts"
import type { AssistantSettings } from "../assistant/settings.ts"
import { Glyph } from "./icons.tsx"

export type ChatLine = { id: string; role: "user" | "orvio"; text: string }

type AssistantScreenProps = {
  lines: ChatLine[]
  pending: Proposal | null
  settings: AssistantSettings
  memoryOnly: boolean
  bridgeNote: string | null
  onChangeSettings: (settings: AssistantSettings) => void
  onSaveSettings: () => void
  onSend: (text: string) => void
  onConfirm: () => void
  onCancel: () => void
}

export function AssistantScreen({
  lines,
  pending,
  settings,
  memoryOnly,
  bridgeNote,
  onChangeSettings,
  onSaveSettings,
  onSend,
  onConfirm,
  onCancel,
}: AssistantScreenProps) {
  const { colors } = useTheme()
  const [draft, setDraft] = useState("")
  const [openSettings, setOpenSettings] = useState(false)

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="h3">Assistente</Text>
        {lines.length === 0 ? (
          <View style={styles.empty}>
            <Glyph name="spark" color={colors.ring} size={36} />
          </View>
        ) : null}
        {lines.map((line) => (
          <View
            key={line.id}
            style={[
              styles.bubble,
              line.role === "user"
                ? { backgroundColor: withAlpha(colors.ring, 0.28), alignSelf: "flex-end" }
                : { backgroundColor: colors.card, alignSelf: "flex-start" },
            ]}
          >
            <Text>{line.text}</Text>
          </View>
        ))}
        {pending ? (
          <Card>
            <CardContent>
              <Text>{describeProposal(pending)}</Text>
              <View style={styles.row}>
                <Button onPress={onConfirm} style={styles.flex}>
                  Confirmar
                </Button>
                <Button variant="outline" onPress={onCancel} style={styles.flex}>
                  Cancelar
                </Button>
              </View>
            </CardContent>
          </Card>
        ) : null}
        {bridgeNote ? <Text variant="muted">{bridgeNote}</Text> : null}
        <View style={styles.row}>
          <Input
            accessibilityLabel="Mensagem para o assistente"
            value={draft}
            onChangeText={setDraft}
            placeholder="saldo, ou gastei 20 no Inter"
            style={styles.flex}
          />
        </View>
        <Button
          onPress={() => {
            const text = draft.trim()
            if (text.length === 0) return
            setDraft("")
            onSend(text)
          }}
        >
          Enviar
        </Button>
        <Button variant="ghost" size="icon" accessibilityLabel={openSettings ? "Fechar conexão" : "WhatsApp e chave da xAI"} onPress={() => setOpenSettings((open) => !open)}>
          <Glyph name="sliders" color={colors.foreground} />
        </Button>
        {openSettings ? (
          <View style={styles.settings}>
            <Text variant="small">Chave da API da xAI</Text>
            <Input
              accessibilityLabel="Chave da API da xAI"
              value={settings.xaiKey}
              onChangeText={(xaiKey) => onChangeSettings({ ...settings, xaiKey })}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text variant="small">Endereço do seu bridge</Text>
            <Input
              accessibilityLabel="Endereço do bridge"
              value={settings.bridgeUrl}
              onChangeText={(bridgeUrl) => onChangeSettings({ ...settings, bridgeUrl })}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://seu-endereco"
            />
            <Text variant="small">Segredo do bridge</Text>
            <Input
              accessibilityLabel="Segredo do bridge"
              value={settings.bridgeSecret}
              onChangeText={(bridgeSecret) => onChangeSettings({ ...settings, bridgeSecret })}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Button variant="outline" onPress={onSaveSettings}>
              Guardar
            </Button>
            {memoryOnly ? <Text variant="muted">Vale só até recarregar.</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  bubble: { borderRadius: 16, padding: 12, maxWidth: "88%" },
  empty: { alignItems: "center", paddingVertical: 12 },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  settings: { gap: 8 },
})
