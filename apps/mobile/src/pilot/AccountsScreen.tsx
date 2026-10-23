import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { Ledger } from "../domain/ledger.ts"
import { summarize } from "./view.ts"

export function AccountsScreen({ ledger, onCreate }: { ledger: Ledger; onCreate: () => void }) {
  const { colors } = useTheme()
  const summary = summarize(ledger)
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h3">Contas</Text>
        <Button onPress={onCreate}>Nova conta</Button>
        {summary.accounts.length === 0 ? (
          <Text variant="muted">Abra Inter, Nubank, uma poupança ou o dinheiro em espécie.</Text>
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
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
})
