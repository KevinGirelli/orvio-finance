import { Image, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { CountUp } from "@/components/ui/count-up"
import { Progress } from "@/components/ui/progress"
import { Text } from "@/components/ui/text"
import { useTheme, withAlpha } from "@/lib/theme"
import { netWorth, type Ledger } from "../domain/ledger.ts"
import { formatBrl, money } from "../domain/money.ts"
import type { Profile } from "../domain/profile.ts"
import { CategoryChart, MonthChart } from "./Charts.tsx"
import { categorySeries, monthSeries } from "./charts.ts"
import { assess, type Mood, type Shield } from "./game.ts"
import { Disc, Glyph, type GlyphName, Wash } from "./icons.tsx"
import { MovementRow } from "./rows.tsx"
import { summarize, todayIso } from "./view.ts"

const moodMark: Record<Mood, { name: GlyphName; label: string }> = {
  quiet: { name: "moon", label: "Quieto" },
  steady: { name: "check", label: "Em ordem" },
  proud: { name: "flame", label: "Firme" },
  worried: { name: "alert", label: "Teto" },
}

const shieldLabel: Record<Shield, string> = {
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

export function HomeScreen({ ledger, profile, onCreateMovement }: HomeScreenProps) {
  const { colors } = useTheme()
  const today = todayIso(new Date())
  const summary = summarize(ledger)
  const game = assess(ledger, profile, today)
  const worth = netWorth(ledger).minor
  const mood = moodMark[game.mood]
  const moodColor = game.mood === "worried" ? "#F19456" : game.mood === "quiet" ? colors.mutedForeground : colors.ring
  const recent = summary.activity.slice(0, 5)

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <Wash color={colors.ring} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Image source={require("../../assets/logo-orvio.png")} style={styles.logo} accessibilityLabel="Orvio" />
          <View style={styles.brandText}>
            <Text variant="h3">{profile.name ? profile.name : "Orvio"}</Text>
            <View style={[styles.pill, { backgroundColor: withAlpha(moodColor, 0.45) }]}>
              <Glyph name={mood.name} color={moodColor} size={16} />
              <Text variant="small" style={{ color: moodColor }}>
                {mood.label}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: withAlpha(colors.ring, 0.28), borderColor: colors.ring }]}>
          <Text variant="small">Patrimônio</Text>
          <CountUp value={worth} duration={0} format={(value) => formatBrl(money(value))} />
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text variant="display" style={{ color: colors.ring, fontSize: 40, lineHeight: 46 }}>
                {game.streak}
              </Text>
              <Glyph name="flame" color={colors.ring} size={18} />
            </View>
            <View style={styles.brandText}>
              <View style={styles.stat}>
                <Glyph name="shield" color={game.shield === "none" ? colors.mutedForeground : colors.ring} size={18} />
                <Text accessibilityLabel={shieldLabel[game.shield]}>Nível {game.level}</Text>
              </View>
              <Progress
                value={Math.round(game.levelProgress * 100)}
                accessibilityLabel="Nível"
                indicatorStyle={{ backgroundColor: colors.ring }}
              />
            </View>
          </View>
          {game.ceiling ? (
            <View style={styles.stat}>
              <Glyph name="bag" color="#F19456" size={16} />
              <Text variant="muted">
                {formatBrl(money(game.ceiling.spent))} / {formatBrl(money(game.ceiling.limit))}
              </Text>
            </View>
          ) : null}
        </View>
        <MonthChart bars={monthSeries(ledger, today)} />
        <CategoryChart bars={categorySeries(ledger, today)} />
        <Button variant="raised" accessibilityLabel="Novo lançamento" onPress={onCreateMovement}>
          <View style={styles.stat}>
            <Glyph name="plus" color={colors.primaryForeground} size={18} />
            <Text>Novo</Text>
          </View>
        </Button>
        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Disc color={colors.mutedForeground} size={56}>
              <Glyph name="moon" color={colors.mutedForeground} />
            </Disc>
          </View>
        ) : (
          recent.map((item) => <MovementRow key={item.id} item={item} />)
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandText: { flex: 1, gap: 6 },
  logo: { width: 56, height: 56 },
  pill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 },
  stats: { flexDirection: "row", alignItems: "center", gap: 12 },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  empty: { alignItems: "center", paddingVertical: 8 },
})
