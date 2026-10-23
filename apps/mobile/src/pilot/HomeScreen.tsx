import { Image, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { CountUp } from "@/components/ui/count-up"
import { Progress } from "@/components/ui/progress"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import { netWorth, type Ledger } from "../domain/ledger.ts"
import { formatBrl, money } from "../domain/money.ts"
import type { Profile } from "../domain/profile.ts"
import { CategoryChart, MonthChart } from "./Charts.tsx"
import { categorySeries, monthSeries } from "./charts.ts"
import { assess, type Mood, type Shield } from "./game.ts"
import { summarize, todayIso } from "./view.ts"

const moodCopy: Record<Mood, string> = {
  quiet: "Nada lançado ainda.",
  steady: "O mês está em ordem.",
  proud: "Sequência firme.",
  worried: "O teto deste mês passou.",
}

const shieldCopy: Record<Shield, string> = {
  none: "Sete dias seguidos ganham um escudo.",
  held: "Escudo pronto.",
  spent: "O escudo segurou um dia.",
}

type HomeScreenProps = {
  ledger: Ledger
  profile: Profile
  memoryOnly: boolean
  onCreateMovement: () => void
}

export function HomeScreen({ ledger, profile, memoryOnly, onCreateMovement }: HomeScreenProps) {
  const { colors } = useTheme()
  const today = todayIso(new Date())
  const summary = summarize(ledger)
  const game = assess(ledger, profile, today)
  const worth = netWorth(ledger).minor

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Image source={require("../../assets/logo-orvio.png")} style={styles.logo} accessibilityLabel="Orvio" />
          <View style={styles.brandText}>
            <Text variant="h3">{profile.name ? `Olá, ${profile.name}` : "Orvio"}</Text>
            <Text variant="muted">{moodCopy[game.mood]}</Text>
          </View>
        </View>
        {memoryOnly ? (
          <Text variant="muted">Neste navegador nada é gravado. No Android, o arquivo fica criptografado.</Text>
        ) : null}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text variant="small">Patrimônio</Text>
          <CountUp value={worth} duration={0} format={(value) => formatBrl(money(value))} />
          <View style={styles.streak}>
            <Text variant="display" style={{ color: colors.ring, fontSize: 40, lineHeight: 46 }}>
              {game.streak}
            </Text>
            <View style={styles.brandText}>
              <Text>dias seguidos</Text>
              <Text variant="muted">{shieldCopy[game.shield]}</Text>
            </View>
          </View>
          <Text variant="small">
            Nível {game.level}
            {game.nextLevelAt === null ? "" : ` · faltam ${game.nextLevelAt - game.points} dias`}
          </Text>
          <Progress
            value={Math.round(game.levelProgress * 100)}
            accessibilityLabel="Nível"
            indicatorStyle={{ backgroundColor: colors.ring }}
          />
          {game.ceiling ? (
            <Text variant="muted">
              Saídas do mês {formatBrl(money(game.ceiling.spent))} de {formatBrl(money(game.ceiling.limit))}
            </Text>
          ) : null}
        </View>
        <Text variant="h4">Últimos meses</Text>
        <MonthChart bars={monthSeries(ledger, today)} />
        <Text variant="h4">Saídas do mês</Text>
        <CategoryChart bars={categorySeries(ledger, today)} />
        <Button variant="raised" onPress={onCreateMovement}>
          Novo lançamento
        </Button>
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
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  streak: { flexDirection: "row", alignItems: "center", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rowText: { flex: 1, gap: 2 },
})
