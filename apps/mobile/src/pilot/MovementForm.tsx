import type { ReactNode } from "react"
import { useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import type { Account } from "../domain/ledger.ts"
import { categoryIds, categoryLabel, type Category } from "../domain/categories.ts"
import { todayIso } from "./view.ts"

export type MovementKindDraft = "income" | "expense" | "transfer"

export type MovementDraft = {
  kind: MovementKindDraft
  accountId: string
  toAccountId: string
  amount: string
  occurredOn: string
  note: string
  category: Category
}

type MovementFormProps = {
  accounts: Account[]
  error: string | null
  onCancel: () => void
  onSubmit: (input: MovementDraft) => void
}

export function MovementForm({ accounts, error, onCancel, onSubmit }: MovementFormProps) {
  const { colors } = useTheme()
  const [kind, setKind] = useState<MovementKindDraft>("income")
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "")
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "")
  const [amount, setAmount] = useState("")
  const [occurredOn, setOccurredOn] = useState(() => todayIso(new Date()))
  const [note, setNote] = useState("")
  const [category, setCategory] = useState<Category>("outros")
  const transferNeedsAnother = kind === "transfer" && accounts.length < 2

  if (accounts.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <Text variant="h3">Novo lançamento</Text>
          <Text variant="muted">Abra uma conta antes de lançar um valor.</Text>
          <Button variant="ghost" onPress={onCancel}>
            Voltar
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="h3">Novo lançamento</Text>
        <SegmentedControl
          value={kind}
          onValueChange={(value) => {
            const next = value as MovementKindDraft
            setKind(next)
            setCategory(next === "income" ? "salario" : "outros")
          }}
        >
          <SegmentedControlItem value="income">Entrada</SegmentedControlItem>
          <SegmentedControlItem value="expense">Saída</SegmentedControlItem>
          <SegmentedControlItem value="transfer">Transferir</SegmentedControlItem>
        </SegmentedControl>
        <Field label={kind === "transfer" ? "De" : "Conta"}>
          <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
        </Field>
        {kind === "transfer" ? (
          <Field label="Para">
            <AccountPicker accounts={accounts} value={toAccountId} onChange={setToAccountId} />
          </Field>
        ) : null}
        {kind === "transfer" ? null : (
          <Field label="Categoria">
            <View style={styles.chips}>
              {categoryIds.map((id) => (
                <Button key={id} size="sm" variant={category === id ? "default" : "outline"} onPress={() => setCategory(id)}>
                  {categoryLabel[id]}
                </Button>
              ))}
            </View>
          </Field>
        )}
        <Field label="Valor">
          <Input
            accessibilityLabel="Valor"
            value={amount}
            onChangeText={setAmount}
            placeholder="10,50"
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label="Data">
          <Input accessibilityLabel="Data" value={occurredOn} onChangeText={setOccurredOn} />
        </Field>
        <Field label="Descrição">
          <Input accessibilityLabel="Descrição" value={note} onChangeText={setNote} placeholder="Opcional" />
        </Field>
        {transferNeedsAnother ? (
          <Text variant="muted">Abra outra conta para transferir.</Text>
        ) : null}
        {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
        <Button
          disabled={transferNeedsAnother}
          onPress={() => onSubmit({ kind, accountId, toAccountId, amount, occurredOn, note, category })}
        >
          Salvar lançamento
        </Button>
        <Button variant="ghost" onPress={onCancel}>
          Voltar
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <View style={styles.picker}>
      {accounts.map((account) => (
        <Button
          key={account.id}
          variant={account.id === value ? "default" : "outline"}
          onPress={() => onChange(account.id)}
        >
          {account.name}
        </Button>
      ))}
    </View>
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
  picker: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})
