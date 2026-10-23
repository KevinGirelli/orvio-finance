import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { useTheme, withAlpha } from "@/lib/theme"
import type { Ledger } from "../domain/ledger.ts"
import { accountGlyph, Disc, Glyph, Wash } from "./icons.tsx"
import { summarize } from "./view.ts"

export function AccountsScreen({ ledger, onCreate }: { ledger: Ledger; onCreate: () => void }) {
  const { colors } = useTheme()
  const summary = summarize(ledger)
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <Wash color="#E8B4C4" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Disc color="#E8B4C4">
            <Glyph name="wallet" color="#E8B4C4" />
          </Disc>
          <Text variant="h3">Contas</Text>
        </View>
        <Button variant="raised" accessibilityLabel="Nova conta" onPress={onCreate}>
          <View style={styles.plus}>
            <Glyph name="plus" color={colors.primaryForeground} size={18} />
            <Text>Nova</Text>
          </View>
        </Button>
        {summary.accounts.length === 0 ? (
          <View style={styles.empty}>
            <Glyph name="wallet" color={colors.mutedForeground} size={36} />
          </View>
        ) : (
          summary.accounts.map((account) => {
            const mark = accountGlyph(account.kindKey)
            return (
              <View key={account.id} style={[styles.card, { backgroundColor: withAlpha(mark.color, 0.34), borderColor: mark.color }]}>
                <Disc color={mark.color}>
                  <Glyph name={mark.name} color={mark.color} />
                </Disc>
                <View style={styles.text}>
                  <Text>{account.name}</Text>
                  <Text variant="muted" accessibilityLabel={account.kind}>
                    {account.balance}
                  </Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  plus: { flexDirection: "row", alignItems: "center", gap: 8 },
  empty: { alignItems: "center", paddingVertical: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 14 },
  text: { flex: 1, gap: 2 },
})
