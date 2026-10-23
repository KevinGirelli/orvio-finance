import { useEffect, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { CountUp } from "@/components/ui/count-up"
import { Input } from "@/components/ui/input"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import { useTheme, withAlpha } from "@/lib/theme"
import { fetchQuotes } from "../domain/quotes.ts"
import {
  formatChange,
  formatQuantity,
  holdingSymbol,
  parseQuantity,
  portfolioMinor,
  valueMinor,
  type Holding,
  type HoldingKind,
} from "../domain/investments.ts"
import { formatBrl, money, DomainError } from "../domain/money.ts"
import { Disc, Glyph, palette } from "./icons.tsx"
import { messageFor } from "./messages.ts"
import { Pop } from "./motion.tsx"

const ideas: { kind: HoldingKind; symbol: string }[] = [
  { kind: "stock", symbol: "PETR4" },
  { kind: "stock", symbol: "VALE3" },
  { kind: "crypto", symbol: "BTC" },
  { kind: "crypto", symbol: "ETH" },
]

type InvestScreenProps = {
  holdings: Holding[]
  onChange: (holdings: Holding[]) => void
  onBack: () => void
}

export function InvestScreen({ holdings, onChange, onBack }: InvestScreenProps) {
  const { colors } = useTheme()
  const [kind, setKind] = useState<HoldingKind>("stock")
  const [symbol, setSymbol] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refresh(holdings, onChange, setBusy)
  }, [])

  async function add(nextKind: HoldingKind, nextSymbol: string, nextQuantity: string) {
    try {
      const parsedSymbol = holdingSymbol(nextKind, nextSymbol)
      const quantityMicros = parseQuantity(nextQuantity)
      if (holdings.some((holding) => holding.kind === nextKind && holding.symbol === parsedSymbol)) {
        throw new DomainError("investment.duplicate")
      }
      const holding: Holding = {
        id: crypto.randomUUID(),
        kind: nextKind,
        symbol: parsedSymbol,
        quantityMicros,
        priceMinor: null,
        changeHundredths: null,
      }
      const next = [...holdings, holding]
      onChange(next)
      setSymbol("")
      setError(null)
      await refresh(next, onChange, setBusy)
    } catch (caught) {
      setError(messageFor(caught))
    }
  }

  const total = portfolioMinor(holdings)

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} style={styles.back}>
          <Glyph name="back" color={colors.foreground} />
        </Pressable>
        <Text variant="h4">Investir</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Atualizar cotações" onPress={() => void refresh(holdings, onChange, setBusy)} style={styles.back}>
          <Glyph name="spark" color={busy ? colors.mutedForeground : colors.ring} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Pop token={total}>
          <View style={[styles.total, { backgroundColor: withAlpha(palette.lilac, 0.35), borderColor: palette.lilac }]}>
            <Disc color={palette.lilac}>
              <Glyph name="coin" color={palette.lilac} />
            </Disc>
            <CountUp value={total} duration={800} format={(value) => formatBrl(money(value))} />
          </View>
        </Pop>
        <View style={styles.ideas}>
          {ideas.map((idea) => (
            <Pressable
              key={idea.symbol}
              accessibilityRole="button"
              accessibilityLabel={idea.symbol}
              onPress={() => void add(idea.kind, idea.symbol, "1")}
              style={[styles.idea, { borderColor: idea.kind === "crypto" ? palette.coral : palette.pink, backgroundColor: withAlpha(idea.kind === "crypto" ? palette.coral : palette.pink, 0.28) }]}
            >
              <Glyph name={idea.kind === "crypto" ? "spark" : "up"} color={idea.kind === "crypto" ? palette.coral : palette.pink} size={16} />
              <Text variant="small">{idea.symbol}</Text>
            </Pressable>
          ))}
        </View>
        {holdings.map((holding) => {
          const ink = holding.kind === "crypto" ? palette.coral : palette.pink
          const change = holding.changeHundredths
          const changeColor = change === null ? colors.mutedForeground : change >= 0 ? colors.success : palette.coral
          return (
            <View key={holding.id} style={[styles.row, { borderColor: ink, backgroundColor: withAlpha(ink, 0.22) }]}>
              <Disc color={ink}>
                <Glyph name={holding.kind === "crypto" ? "spark" : "up"} color={ink} />
              </Disc>
              <View style={styles.text}>
                <Text>{holding.symbol}</Text>
                <Text variant="muted">{formatQuantity(holding.quantityMicros)}</Text>
              </View>
              <View style={styles.quote}>
                <Text>{holding.priceMinor === null ? "—" : formatBrl(money(valueMinor(holding.quantityMicros, holding.priceMinor)))}</Text>
                <Text variant="small" style={{ color: changeColor }}>
                  {change === null ? "sem cotação" : formatChange(change)}
                </Text>
              </View>
            </View>
          )
        })}
        <SegmentedControl value={kind} onValueChange={(value) => setKind(value as HoldingKind)}>
          <SegmentedControlItem value="stock">Ação</SegmentedControlItem>
          <SegmentedControlItem value="crypto">Cripto</SegmentedControlItem>
        </SegmentedControl>
        <Input accessibilityLabel="Código" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" placeholder="PETR4 ou BTC" />
        <Input accessibilityLabel="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="1 ou 0,015" />
        {error ? <Text variant="muted">{error}</Text> : null}
        <Button
          variant="raised"
          onPress={() => void add(kind, symbol, quantity)}
        >
          <View style={styles.plus}>
            <Glyph name="plus" color={colors.primaryForeground} size={18} />
            <Text>Adicionar</Text>
          </View>
        </Button>
        <Text variant="muted">Cotação em reais. Não é recomendação e não mexe no saldo.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

async function refresh(holdings: Holding[], onChange: (holdings: Holding[]) => void, setBusy: (busy: boolean) => void) {
  if (holdings.length === 0) return
  setBusy(true)
  try {
    const quotes = await fetchQuotes(holdings)
    onChange(
      holdings.map((holding) => {
        const quote = quotes.get(holding.id)
        if (!quote) return holding
        return { ...holding, priceMinor: quote.priceMinor, changeHundredths: quote.changeHundredths }
      }),
    )
  } finally {
    setBusy(false)
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 8 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  total: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 20, padding: 16 },
  ideas: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  idea: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 12 },
  text: { flex: 1, gap: 2 },
  quote: { alignItems: "flex-end", gap: 2 },
  plus: { flexDirection: "row", alignItems: "center", gap: 8 },
})
