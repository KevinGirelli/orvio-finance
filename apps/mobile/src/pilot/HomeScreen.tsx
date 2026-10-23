import { Image, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { Ledger } from "../domain/ledger.ts"
import { CategoryChart, MonthChart } from "./Charts.tsx"
import { categorySeries, monthSeries } from "./charts.ts"
import { summarize, todayIso } from "./view.ts"

type HomeScreenProps = {
  ledger: Ledger
  memoryOnly: boolean
  onCreateMovement: () => void
}

export function HomeScreen({ ledger, memoryOnly, onCreateMovement }: HomeScreenProps) {
  const { colors } = useTheme()
  const today = todayIso(new Date())
  const summary = summarize(ledger)

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Image source={require("../../assets/logo-orvio.png")} style={styles.logo} accessibilityLabel="Orvio" />
          <View style={styles.brandText}>
            <Text variant="h3">Orvio</Text>
            <Text variant="muted">Seus dados ficam neste aparelho.</Text>
          </View>
        </View>
        {memoryOnly ? (
          <Card>
            <CardContent>
              <Text>Neste navegador nada é gravado. No Android, um build de desenvolvimento criptografa o arquivo.</Text>
            </CardContent>
          </Card>
        ) : null}
        <View style={styles.net}>
          <Text variant="small">Patrimônio</Text>
          <Text variant="h1">{summary.netWorth}</Text>
        </View>
        <Text variant="h4">Últimos meses</Text>
        <MonthChart bars={monthSeries(ledger, today)} />
        <Text variant="h4">Saídas do mês</Text>
        <CategoryChart bars={categorySeries(ledger, today)} />
        <Button onPress={onCreateMovement}>Novo lançamento</Button>
        <Text variant="h4">Recentes</Text>
        {summary.activity.length === 0 ? (
          <Text variant="muted">Nada lançado ainda.</Text>
        ) : (
          summary.activity.slice(0, 5).map((item) => (
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
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandText: { flex: 1, gap: 2 },
  logo: { width: 56, height: 56 },
  net: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rowText: { flex: 1, gap: 2 },
})
