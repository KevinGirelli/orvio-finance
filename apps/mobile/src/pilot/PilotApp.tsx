import * as Haptics from "expo-haptics"
import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Image, Platform, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Dock, DockItem, DockMark } from "@/components/ui/dock"
import { Text } from "@/components/ui/text"
import { ThemeProvider, useTheme } from "@/lib/theme"
import { applyProposal, describeProposal, interpret, type Proposal } from "../assistant/commands.ts"
import { askLedger } from "../assistant/grok.ts"
import { ackInbox, pullInbox, pushReply } from "../assistant/remote.ts"
import { emptySettings, loadSettings, saveSettings, type AssistantSettings } from "../assistant/settings.ts"
import {
  emptyLedger,
  openAccount,
  postExpense,
  postIncome,
  postOpening,
  postTransfer,
  type Ledger,
  type MovementSource,
} from "../domain/ledger.ts"
import { DomainError, parseBrl } from "../domain/money.ts"
import { accentColor, emptyProfile, type Accent, type Profile } from "../domain/profile.ts"
import { openDeviceLedger, type LedgerStore } from "../persistence/device-ledger.ts"
import { AccountForm } from "./AccountForm.tsx"
import { AccountsScreen } from "./AccountsScreen.tsx"
import { ActivityScreen } from "./ActivityScreen.tsx"
import { AlbumScreen } from "./AlbumScreen.tsx"
import { AssistantScreen, type ChatLine } from "./AssistantScreen.tsx"
import { DockGlyph } from "./icons.tsx"
import { HomeScreen } from "./HomeScreen.tsx"
import { messageFor } from "./messages.ts"
import { MovementForm, type MovementDraft } from "./MovementForm.tsx"
import { OnboardingScreen } from "./OnboardingScreen.tsx"
import { ProfileScreen } from "./ProfileScreen.tsx"
import { todayIso } from "./view.ts"

type TabId = "home" | "activity" | "assistant" | "accounts" | "profile"

export function PilotApp() {
  const { colors } = useTheme()
  const [ledger, setLedger] = useState<Ledger | null>(null)
  const [store, setStore] = useState<LedgerStore | null>(null)
  const [memoryOnly, setMemoryOnly] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>("home")
  const [form, setForm] = useState<"account" | "movement" | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [lines, setLines] = useState<ChatLine[]>([])
  const [pending, setPending] = useState<Proposal | null>(null)
  const [settings, setSettings] = useState<AssistantSettings>(emptySettings)
  const [bridgeNote, setBridgeNote] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [album, setAlbum] = useState(false)
  const [ring, setRing] = useState<Accent>("lilac")
  const ledgerRef = useRef<Ledger | null>(null)
  const pendingRef = useRef<Proposal | null>(null)
  const storeRef = useRef<LedgerStore | null>(null)
  const settingsRef = useRef(settings)
  ledgerRef.current = ledger
  pendingRef.current = pending
  storeRef.current = store
  settingsRef.current = settings

  useEffect(() => {
    if (!profile?.ready || tab === "profile" || album) return
    setRing(profile.accent)
  }, [album, profile, tab])

  useEffect(() => {
    let cancelled = false
    loadSettings().then((loaded) => {
      if (!cancelled) setSettings(loaded)
    })
    if (Platform.OS === "web") {
      setMemoryOnly(true)
      setLedger(emptyLedger())
      setProfile(emptyProfile())
      return () => {
        cancelled = true
      }
    }
    openDeviceLedger()
      .then(async (opened) => {
        const [loaded, storedProfile] = await Promise.all([opened.load(), opened.loadProfile()])
        if (cancelled) return
        setStore(opened)
        setLedger(loaded)
        setProfile(storedProfile)
        setRing(storedProfile.accent)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof DomainError && error.code === "sqlcipher.unavailable") {
          setMemoryOnly(true)
          setLedger(emptyLedger())
          setProfile(emptyProfile())
          return
        }
        setFailure("Não consegui abrir o arquivo criptografado neste aparelho.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ledger || settings.bridgeUrl.trim().length === 0 || settings.bridgeSecret.trim().length === 0) return
    let cancelled = false
    let busy = false
    const tick = async () => {
      if (busy || cancelled) return
      busy = true
      const baseUrl = settings.bridgeUrl.trim()
      const secret = settings.bridgeSecret.trim()
      try {
        const messages = await pullInbox(baseUrl, secret)
        for (const message of messages) {
          const reply = await respond(message.body, "whatsapp")
          await pushReply(baseUrl, secret, message.from, reply)
          await ackInbox(baseUrl, secret, [message.id])
        }
        if (!cancelled) setBridgeNote(null)
      } catch {
        if (!cancelled) setBridgeNote("Não alcancei o bridge agora. Os lançamentos feitos aqui continuam no aparelho.")
      } finally {
        busy = false
      }
    }
    void tick()
    const timer = setInterval(() => void tick(), 8000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [ledger, settings.bridgeUrl, settings.bridgeSecret])

  async function persistProfile(next: Profile) {
    setProfile(next)
    setRing(next.accent)
    if (storeRef.current) await storeRef.current.saveProfile(next)
  }

  async function persist(next: Ledger) {
    if (storeRef.current) await storeRef.current.save(next)
    ledgerRef.current = next
    setLedger(next)
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }

  async function commit(recipe: (current: Ledger) => Ledger) {
    const current = ledgerRef.current
    if (!current) return
    try {
      await persist(recipe(current))
      setFormError(null)
      setForm(null)
    } catch (error) {
      setFormError(messageFor(error))
    }
  }

  async function respond(text: string, source: MovementSource): Promise<string> {
    const current = ledgerRef.current
    if (!current) return "Ainda estou abrindo os dados."
    const today = todayIso(new Date())
    const local = interpret(current, text, today, source)
    if (local.type === "confirm") {
      const proposal = pendingRef.current
      if (!proposal) return "Não tenho um lançamento esperando confirmação."
      try {
        await persist(applyProposal(current, proposal, crypto.randomUUID()))
        pendingRef.current = null
        setPending(null)
        return `Lancei. ${describeProposal(proposal)}`
      } catch (error) {
        return messageFor(error)
      }
    }
    if (local.type === "cancel") {
      pendingRef.current = null
      setPending(null)
      return "Cancelei."
    }
    if (local.type === "reply") return local.text
    if (local.type === "proposal") return hold(current, local.proposal)
    if (settingsRef.current.xaiKey.trim().length === 0) {
      return "Não entendi. Sem a chave da API da xAI eu reconheço saldo, resumo e frases como “gastei 32,50 no mercado”."
    }
    try {
      const answer = await askLedger({
        apiKey: settingsRef.current.xaiKey.trim(),
        ledger: current,
        today,
        message: text,
        source,
      })
      if (answer.type === "reply") return answer.text
      return hold(current, answer.proposal)
    } catch {
      return "Não consegui falar com a xAI. O lançamento não foi feito."
    }
  }

  function hold(current: Ledger, proposal: Proposal): string {
    try {
      applyProposal(current, proposal, crypto.randomUUID())
    } catch (error) {
      return messageFor(error)
    }
    pendingRef.current = proposal
    setPending(proposal)
    return `${describeProposal(proposal)} Responda SIM para confirmar.`
  }

  function pushLine(role: ChatLine["role"], text: string) {
    setLines((current) => [...current, { id: crypto.randomUUID(), role, text }].slice(-40))
  }

  async function ask(text: string) {
    pushLine("user", text)
    pushLine("orvio", await respond(text, "assistant"))
  }

  if (failure) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text variant="h3">Não abri seus dados</Text>
        <Text variant="muted">{failure}</Text>
      </SafeAreaView>
    )
  }

  if (!ledger || !profile) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.foreground} />
        <Text variant="muted">Abrindo seus dados…</Text>
      </SafeAreaView>
    )
  }

  if (form === "account") {
    return (
      <AccountForm
        error={formError}
        onCancel={() => {
          setFormError(null)
          setForm(null)
        }}
        onSubmit={(input) => {
          void commit((current) => {
            const id = crypto.randomUUID()
            let next = openAccount(current, { id, name: input.name, kind: input.kind })
            if (input.opening.trim().length > 0) {
              next = postOpening(next, {
                id: crypto.randomUUID(),
                accountId: id,
                minor: parseBrl(input.opening).minor,
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

  if (form === "movement") {
    return (
      <MovementForm
        accounts={ledger.accounts.filter((account) => !account.archived)}
        error={formError}
        onCancel={() => {
          setFormError(null)
          setForm(null)
        }}
        onSubmit={(input) => {
          void commit((current) => postDraft(current, input))
        }}
      />
    )
  }

  const shell = !profile.ready ? (
    <OnboardingScreen
      onAccent={setRing}
      onSkip={() => {
        void persistProfile(emptyProfileReady())
      }}
      onFinish={(next) => {
        void persistProfile(next)
      }}
    />
  ) : album ? (
    <AlbumScreen ledger={ledger} profile={profile} onBack={() => setAlbum(false)} />
  ) : (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.body}>
        {tab === "home" ? (
          <HomeScreen
            ledger={ledger}
            profile={profile}
            memoryOnly={memoryOnly}
            onCreateMovement={() => setForm("movement")}
          />
        ) : null}
        {tab === "activity" ? <ActivityScreen ledger={ledger} onCreate={() => setForm("movement")} /> : null}
        {tab === "accounts" ? <AccountsScreen ledger={ledger} onCreate={() => setForm("account")} /> : null}
        {tab === "profile" ? (
          <ProfileScreen
            profile={profile}
            memoryOnly={memoryOnly}
            onAccent={setRing}
            onSave={(next) => {
              void persistProfile(next)
            }}
            onOpenAlbum={() => setAlbum(true)}
          />
        ) : null}
        {tab === "assistant" ? (
          <AssistantScreen
            lines={lines}
            pending={pending}
            settings={settings}
            memoryOnly={memoryOnly}
            bridgeNote={bridgeNote}
            onChangeSettings={setSettings}
            onSaveSettings={() => {
              void saveSettings(settings).then(() => {
                setBridgeNote(memoryOnly ? "Vale só até recarregar esta página." : "Guardado no cofre deste aparelho.")
              })
            }}
            onSend={(text) => void ask(text)}
            onConfirm={() => void ask("sim")}
            onCancel={() => void ask("não")}
          />
        ) : null}
      </View>
      <Dock value={tab} onValueChange={(value) => setTab(value as TabId)}>
        <DockItem value="home" label="Início">
          <DockGlyph name="home" />
        </DockItem>
        <DockItem value="activity" label="Lista">
          <DockGlyph name="list" />
        </DockItem>
        <DockMark value="assistant" label="Orvio">
          <Image source={require("../../assets/logo-orvio.png")} style={styles.mark} accessibilityLabel="Orvio" />
        </DockMark>
        <DockItem value="accounts" label="Contas">
          <DockGlyph name="wallet" />
        </DockItem>
        <DockItem value="profile" label="Perfil">
          <DockGlyph name="user" />
        </DockItem>
      </Dock>
    </View>
  )

  return (
    <ThemeProvider scheme="dark" ring={accentColor[ring]}>
      {shell}
    </ThemeProvider>
  )
}

function emptyProfileReady(): Profile {
  return { ...emptyProfile(), ready: true }
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
    category: input.category,
    source: "manual" as const,
  }
  return input.kind === "income" ? postIncome(ledger, posting) : postExpense(ledger, posting)
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  mark: { width: 40, height: 40 },
})
