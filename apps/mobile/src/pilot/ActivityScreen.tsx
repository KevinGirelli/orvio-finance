import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { Ledger } from "../domain/ledger.ts"
import { summarize } from "./view.ts"

export function ActivityScreen({ ledger, onCreate }: { ledger: Ledger; onCreate: () => void }) {
  const { colors } = useTheme()
  const summary = summarize(ledger)
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h3">Lançamentos</Text>
        <Button onPress={onCreate}>Novo lançamento</Button>
        {summary.activity.length === 0 ? (
          <Text variant="muted">Quando você lançar uma entrada, saída ou transferência, ela aparece aqui.</Text>
        ) : (
          summary.activity.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text>{item.title}</Text>
                <Text variant="muted">
                  {item.detail} · {item.when}
                </Text>
              </View>
              <Text>{item.amount}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rowText: { flex: 1, gap: 2 },
})
