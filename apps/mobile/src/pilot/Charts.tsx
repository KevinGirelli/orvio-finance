import { StyleSheet, View } from "react-native"

import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import { formatBrl, money } from "../domain/money.ts"
import type { CategoryBar, MonthBar } from "./charts.ts"

export function MonthChart({ bars }: { bars: MonthBar[] }) {
  const { colors } = useTheme()
  const max = Math.max(1, ...bars.flatMap((bar) => [bar.income, bar.expense]))
  return (
    <View style={styles.block}>
      <View style={styles.months}>
        {bars.map((bar) => (
          <View key={bar.key} style={styles.month}>
            <View style={styles.pair}>
              <View style={[styles.bar, { height: height(bar.income, max), backgroundColor: colors.success }]} />
              <View style={[styles.bar, { height: height(bar.expense, max), backgroundColor: "#F19456" }]} />
            </View>
            <Text variant="small">{bar.label}</Text>
          </View>
        ))}
      </View>
      <Text variant="muted">Verde é entrada, coral é saída. Transferência fica de fora.</Text>
    </View>
  )
}

export function CategoryChart({ bars }: { bars: CategoryBar[] }) {
  const { colors } = useTheme()
  const max = Math.max(1, ...bars.map((bar) => bar.minor))
  if (bars.length === 0) {
    return <Text variant="muted">Nenhuma saída neste mês.</Text>
  }
  return (
    <View style={styles.block}>
      {bars.map((bar) => (
        <View key={bar.category} style={styles.category}>
          <View style={styles.categoryLabel}>
            <Text>{bar.label}</Text>
            <Text variant="muted">{formatBrl(money(bar.minor))}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.muted }]}>
            <View style={[styles.fill, { width: `${Math.max(6, (bar.minor / max) * 100)}%`, backgroundColor: colors.ring }]} />
          </View>
        </View>
      ))}
    </View>
  )
}

function height(value: number, max: number) {
  if (value <= 0) return 0
  return Math.max(4, Math.round((value / max) * 96))
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  months: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 128 },
  month: { flex: 1, alignItems: "center", gap: 6 },
  pair: { height: 96, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  bar: { width: 8, borderRadius: 4 },
  category: { gap: 6 },
  categoryLabel: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 8, borderRadius: 999, overflow: "hidden" },
  fill: { height: 8, borderRadius: 999 },
})
