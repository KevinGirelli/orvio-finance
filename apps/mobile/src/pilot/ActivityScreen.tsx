import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { Ledger } from "../domain/ledger.ts"
import { Disc, Glyph } from "./icons.tsx"
import { MovementRow } from "./rows.tsx"
import { summarize } from "./view.ts"

export function ActivityScreen({ ledger, onCreate }: { ledger: Ledger; onCreate: () => void }) {
  const { colors } = useTheme()
  const summary = summarize(ledger)
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Disc color={colors.ring}>
            <Glyph name="list" color={colors.ring} />
          </Disc>
          <Text variant="h3">Lista</Text>
        </View>
        <Button variant="raised" accessibilityLabel="Novo lançamento" onPress={onCreate}>
          <View style={styles.plus}>
            <Glyph name="plus" color={colors.primaryForeground} size={18} />
            <Text>Novo</Text>
          </View>
        </Button>
        {summary.activity.length === 0 ? (
          <View style={styles.empty}>
            <Glyph name="moon" color={colors.mutedForeground} size={36} />
          </View>
        ) : (
          summary.activity.map((item) => <MovementRow key={item.id} item={item} />)
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  plus: { flexDirection: "row", alignItems: "center", gap: 8 },
  empty: { alignItems: "center", paddingVertical: 24 },
})
