import { useEffect, useState } from "react"
import { ActivityIndicator, Platform, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import {
  emptyLedger,
  openAccount,
  postExpense,
  postIncome,
  postOpening,
  postTransfer,
  type Ledger,
} from "../domain/ledger.ts"
import { DomainError, parseBrl } from "../domain/money.ts"
import { openDeviceLedger, type LedgerStore } from "../persistence/device-ledger.ts"
import { AccountForm } from "./AccountForm.tsx"
import { HomeScreen } from "./HomeScreen.tsx"
import { messageFor } from "./messages.ts"
import { MovementForm, type MovementDraft } from "./MovementForm.tsx"

type Screen = "home" | "account" | "movement"

export function PilotApp() {
  const { colors } = useTheme()
  const [ledger, setLedger] = useState<Ledger | null>(null)
  const [store, setStore] = useState<LedgerStore | null>(null)
  const [memoryOnly, setMemoryOnly] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>("home")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (Platform.OS === "web") {
      setMemoryOnly(true)
      setLedger(emptyLedger())
      return
    }
    openDeviceLedger()
      .then(async (opened) => {
        const loaded = await opened.load()
        if (cancelled) return
        setStore(opened)
        setLedger(loaded)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof DomainError && error.code === "sqlcipher.unavailable") {
          setMemoryOnly(true)
          setLedger(emptyLedger())
          return
        }
        setFailure(messageFor(error))
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function commit(recipe: (current: Ledger) => Ledger) {
    if (!ledger) return
    try {
      const next = recipe(ledger)
      if (store) await store.save(next)
      setLedger(next)
      setFormError(null)
      setScreen("home")
    } catch (error) {
      setFormError(messageFor(error))
    }
  }

  if (failure) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text variant="h3">Não abri seus dados</Text>
        <Text variant="muted">{failure}</Text>
      </SafeAreaView>
    )
  }

  if (!ledger) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.foreground} />
        <Text variant="muted">Abrindo seus dados…</Text>
      </SafeAreaView>
    )
  }

  if (screen === "account") {
    return (
      <AccountForm
        error={formError}
        onCancel={() => {
          setFormError(null)
          setScreen("home")
        }}
        onSubmit={(input) => {
          void commit((current) => {
            const id = crypto.randomUUID()
            let next = openAccount(current, { id, name: input.name, kind: input.kind })
            if (input.opening.trim().length > 0) {
              const amount = parseBrl(input.opening)
              next = postOpening(next, {
                id: crypto.randomUUID(),
                accountId: id,
                minor: amount.minor,
                occurredOn: input.occurredOn,
                note: "",
              })
            }
            return next
          })
        }}
      />
    )
  }

  if (screen === "movement") {
    return (
      <MovementForm
        accounts={ledger.accounts.filter((account) => !account.archived)}
        error={formError}
        onCancel={() => {
          setFormError(null)
          setScreen("home")
        }}
        onSubmit={(input) => {
          void commit((current) => postDraft(current, input))
        }}
      />
    )
  }

  return (
    <HomeScreen
      ledger={ledger}
      memoryOnly={memoryOnly}
      onCreateAccount={() => {
        setFormError(null)
        setScreen("account")
      }}
      onCreateMovement={() => {
        setFormError(null)
        setScreen("movement")
      }}
    />
  )
}

function postDraft(ledger: Ledger, input: MovementDraft): Ledger {
  const minor = parseBrl(input.amount).minor
  if (input.kind === "transfer") {
    return postTransfer(ledger, {
      id: crypto.randomUUID(),
      fromAccountId: input.accountId,
      toAccountId: input.toAccountId,
      minor,
      occurredOn: input.occurredOn,
      note: input.note,
    })
  }
  const posting = {
    id: crypto.randomUUID(),
    accountId: input.accountId,
    minor,
    occurredOn: input.occurredOn,
    note: input.note,
  }
  return input.kind === "income" ? postIncome(ledger, posting) : postExpense(ledger, posting)
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
})
