import { Image, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { Ledger } from "../domain/ledger.ts"
import { summarize } from "./view.ts"

type HomeScreenProps = {
  ledger: Ledger
  memoryOnly: boolean
  onCreateAccount: () => void
  onCreateMovement: () => void
}

export function HomeScreen({ ledger, memoryOnly, onCreateAccount, onCreateMovement }: HomeScreenProps) {
  const { colors } = useTheme()
  const summary = summarize(ledger)

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Image
            source={require("../../assets/logo-orvio.png")}
            style={styles.logo}
            accessibilityLabel="Orvio"
          />
          <View style={styles.brandText}>
            <Text variant="h3">Orvio</Text>
            <Text variant="muted">Seus dados ficam neste aparelho.</Text>
          </View>
        </View>

        {memoryOnly ? (
          <Card>
            <CardContent>
              <Text>
                Neste navegador os lançamentos ficam só na memória e somem ao recarregar. No Android,
                um build de desenvolvimento grava o arquivo criptografado no aparelho.
              </Text>
            </CardContent>
          </Card>
        ) : null}

        <View style={styles.net}>
          <Text variant="small">Patrimônio</Text>
          <Text variant="h1">{summary.netWorth}</Text>
        </View>

        <View style={styles.actions}>
          <Button onPress={onCreateAccount} style={styles.action}>
            Nova conta
          </Button>
          <Button variant="outline" onPress={onCreateMovement} style={styles.action}>
            Novo lançamento
          </Button>
        </View>

        <Text variant="h4">Contas</Text>
        {summary.accounts.length === 0 ? (
          <Text variant="muted">Nenhuma conta ainda. Abra a primeira para registrar um saldo.</Text>
        ) : (
          summary.accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle>{account.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text variant="muted">{account.kind}</Text>
                <Text variant="large">{account.balance}</Text>
              </CardContent>
            </Card>
          ))
        )}

        <Text variant="h4">Lançamentos</Text>
        {summary.activity.length === 0 ? (
          <Text variant="muted">Nada lançado ainda.</Text>
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
  content: { padding: 20, gap: 16 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandText: { flex: 1, gap: 2 },
  logo: { width: 56, height: 56 },
  net: { gap: 4 },
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  rowText: { flex: 1, gap: 2 },
})
