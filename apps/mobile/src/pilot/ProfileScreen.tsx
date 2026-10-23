import { useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import { DomainError, formatBrl, money, parseBrl } from "../domain/money.ts"
import { accentColor, accentLabel, accents, profileName, type Accent, type Profile } from "../domain/profile.ts"
import { Glyph } from "./icons.tsx"
import { messageFor } from "./messages.ts"

type ProfileScreenProps = {
  profile: Profile
  memoryOnly: boolean
  onSave: (profile: Profile) => void
  onAccent: (accent: Accent) => void
  onOpenAlbum: () => void
}

export function ProfileScreen({ profile, memoryOnly, onSave, onAccent, onOpenAlbum }: ProfileScreenProps) {
  const { colors } = useTheme()
  const [name, setName] = useState(profile.name)
  const [accent, setAccent] = useState<Accent>(profile.accent)
  const [ceiling, setCeiling] = useState(profile.ceilingMinor === null ? "" : formatBrl(money(profile.ceilingMinor)).replace("R$ ", ""))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  function save() {
    try {
      const nextName = profileName(name)
      const trimmed = ceiling.trim()
      let ceilingMinor: number | null = null
      if (trimmed.length > 0) {
        const parsed = parseBrl(trimmed).minor
        if (parsed <= 0) throw new DomainError("profile.ceiling_invalid")
        ceilingMinor = parsed
      }
      onSave({ name: nextName, accent, ceilingMinor, ready: true })
      setError(null)
      setSaved(memoryOnly ? "Vale só até recarregar esta página." : "Guardado neste aparelho.")
    } catch (caught) {
      setSaved(null)
      setError(messageFor(caught))
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h3">Perfil</Text>
        <Input accessibilityLabel="Nome" value={name} onChangeText={setName} maxLength={24} />
        <View style={styles.colors}>
          {accents.map((item) => {
            const selected = item === accent
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={accentLabel[item]}
                accessibilityState={{ selected }}
                onPress={() => {
                  setAccent(item)
                  onAccent(item)
                }}
                style={[styles.swatch, { backgroundColor: accentColor[item], borderColor: selected ? colors.foreground : "transparent" }]}
              >
                {selected ? <Glyph name="check" color="#0A0A0A" size={18} /> : null}
              </Pressable>
            )
          })}
        </View>
        <Text variant="small">Teto de saídas do mês</Text>
        <Input
          accessibilityLabel="Teto de saídas do mês"
          value={ceiling}
          onChangeText={setCeiling}
          keyboardType="decimal-pad"
          placeholder="Vazio desliga o teto"
        />
        {error ? <Text variant="muted">{error}</Text> : null}
        {saved ? <Text variant="muted">{saved}</Text> : null}
        <Button variant="raised" onPress={save}>
          Guardar neste aparelho
        </Button>
        <Button variant="outline" accessibilityLabel="Álbum" onPress={onOpenAlbum}>
          <View style={styles.album}>
            <Glyph name="album" color={colors.foreground} size={18} />
            <Text>Álbum</Text>
          </View>
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 32 },
  colors: { flexDirection: "row", gap: 12 },
  swatch: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  album: { flexDirection: "row", alignItems: "center", gap: 8 },
})
