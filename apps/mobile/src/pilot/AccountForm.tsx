import { useState, type ReactNode } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { AccountKind } from "../domain/ledger.ts"
import { todayIso } from "./view.ts"

type AccountFormProps = {
  error: string | null
  onCancel: () => void
  onSubmit: (input: { name: string; kind: AccountKind; opening: string; occurredOn: string }) => void
}

export function AccountForm({ error, onCancel, onSubmit }: AccountFormProps) {
  const { colors } = useTheme()
  const [name, setName] = useState("")
  const [kind, setKind] = useState<AccountKind>("checking")
  const [opening, setOpening] = useState("")
  const [occurredOn, setOccurredOn] = useState(() => todayIso(new Date()))

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="h3">Nova conta</Text>
        <Field label="Nome">
          <Input accessibilityLabel="Nome da conta" value={name} onChangeText={setName} placeholder="Inter" />
        </Field>
        <Field label="Tipo">
          <SegmentedControl value={kind} onValueChange={(value) => setKind(value as AccountKind)}>
            <SegmentedControlItem value="checking">Conta</SegmentedControlItem>
            <SegmentedControlItem value="savings">Poupança</SegmentedControlItem>
            <SegmentedControlItem value="cash">Dinheiro</SegmentedControlItem>
          </SegmentedControl>
        </Field>
        <Field label="Saldo inicial, se houver">
          <Input
            accessibilityLabel="Saldo inicial"
            value={opening}
            onChangeText={setOpening}
            placeholder="0,00"
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label="Data">
          <Input accessibilityLabel="Data do saldo inicial" value={occurredOn} onChangeText={setOccurredOn} />
        </Field>
        {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
        <Button
          onPress={() => onSubmit({ name, kind, opening, occurredOn })}
        >
          Salvar conta
        </Button>
        <Button variant="ghost" onPress={onCancel}>
          Voltar
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="small">{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16 },
  field: { gap: 8 },
})
