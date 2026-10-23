import { Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"

export type TabId = "home" | "activity" | "accounts" | "assistant"

const tabs: { id: TabId; label: string }[] = [
  { id: "home", label: "Início" },
  { id: "activity", label: "Lançamentos" },
  { id: "accounts", label: "Contas" },
  { id: "assistant", label: "Assistente" },
]

export function TabBar({ value, onChange }: { value: TabId; onChange: (tab: TabId) => void }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const selected = tab.id === value
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={styles.tab}
          >
            <Text style={{ color: selected ? colors.ring : colors.mutedForeground }}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1, paddingTop: 8 },
  tab: { flex: 1, alignItems: "center", minHeight: 44, justifyContent: "center" },
})
