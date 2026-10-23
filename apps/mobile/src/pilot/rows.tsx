import { StyleSheet, View } from "react-native"

import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import { Disc, Glyph, movementMark } from "./icons.tsx"
import type { ActivityRow } from "./view.ts"

export function MovementRow({ item }: { item: ActivityRow }) {
  const { colors } = useTheme()
  const mark = movementMark(item.kind, item.category, colors.success, colors.mutedForeground)
  const amountColor = item.kind === "expense" ? "#F19456" : item.kind === "income" ? colors.success : colors.foreground
  return (
    <View style={styles.row}>
      <Disc color={mark.color}>
        <Glyph name={mark.name} color={mark.color} />
      </Disc>
      <View style={styles.text}>
        <Text numberOfLines={1}>{item.title}</Text>
        <Text variant="muted" numberOfLines={1}>
          {item.when}
        </Text>
      </View>
      <Text style={{ color: amountColor }}>{item.amount}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  text: { flex: 1, gap: 2 },
})
