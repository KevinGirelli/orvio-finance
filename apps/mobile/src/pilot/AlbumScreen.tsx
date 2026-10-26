import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Sticker } from "@/components/ui/sticker"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { Ledger } from "../domain/ledger.ts"
import type { Profile } from "../domain/profile.ts"
import { assess } from "./game.ts"
import { Glyph, type GlyphName } from "./icons.tsx"
import { todayIso } from "./view.ts"

const stickerGlyph: Record<string, GlyphName> = {
  primeiro: "check",
  tres: "flame",
  semana: "shield",
  mapa: "spark",
  mao: "swap",
  teto: "bag",
}

type AlbumScreenProps = {
  ledger: Ledger
  profile: Profile
  onBack: () => void
}

export function AlbumScreen({ ledger, profile, onBack }: AlbumScreenProps) {
  const { colors } = useTheme()
  const stickers = assess(ledger, profile, todayIso(new Date())).stickers
  const earned = stickers.filter((sticker) => sticker.earned).length

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} style={styles.back}>
          <Glyph name="back" color={colors.foreground} />
        </Pressable>
        <Text variant="h4">
          {earned}/{stickers.length}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {stickers.map((sticker, index) => (
            <View key={sticker.id} style={styles.cell}>
              <Sticker index={index + 1} title={sticker.title} detail={sticker.detail} earned={sticker.earned} progress={sticker.progress}>
                <Glyph name={stickerGlyph[sticker.id] ?? "spark"} color={sticker.earned ? colors.ring : colors.mutedForeground} />
              </Sticker>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 8 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  cell: { width: "48%" },
})
