import { useState } from "react"
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/lib/theme"
import { accentColor, accentLabel, accents, profileName, type Accent, type Profile } from "../domain/profile.ts"
import { Glyph } from "./icons.tsx"
import { messageFor } from "./messages.ts"

type OnboardingScreenProps = {
  onFinish: (profile: Profile) => void
  onSkip: () => void
  onAccent: (accent: Accent) => void
}

export function OnboardingScreen({ onFinish, onSkip, onAccent }: OnboardingScreenProps) {
  const { colors } = useTheme()
  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [accent, setAccent] = useState<Accent>("lilac")
  const [error, setError] = useState<string | null>(null)

  function choose(next: Accent) {
    setAccent(next)
    onAccent(next)
  }

  function continueName() {
    try {
      const next = profileName(name)
      if (next.length === 0) {
        setError("Diga como o polvo te chama, ou pule.")
        return
      }
      setName(next)
      setError(null)
      setStep(1)
    } catch (caught) {
      setError(messageFor(caught))
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel={step === 0 ? "Pular" : "Voltar"} onPress={() => (step === 0 ? onSkip() : setStep(0))}>
          <Text variant="muted">{step === 0 ? "Pular" : "Voltar"}</Text>
        </Pressable>
        <View style={styles.progress}>
          {[0, 1].map((index) => (
            <View key={index} style={[styles.bar, { backgroundColor: index <= step ? colors.ring : colors.muted }]} />
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={require("../../assets/logo-orvio.png")} style={styles.logo} accessibilityLabel="Orvio" />
        {step === 0 ? (
          <View style={styles.block}>
            <Text variant="h3">Como o polvo te chama?</Text>
            <Input accessibilityLabel="Nome" value={name} onChangeText={setName} maxLength={24} placeholder="Seu nome" />
            {error ? <Text variant="muted">{error}</Text> : null}
            <Button variant="raised" onPress={continueName}>
              Continuar
            </Button>
          </View>
        ) : (
          <View style={styles.block}>
            <Text variant="h3">Qual cor acende o app?</Text>
            <View style={styles.swatches}>
              {accents.map((item) => {
                const selected = item === accent
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel={accentLabel[item]}
                    accessibilityState={{ selected }}
                    onPress={() => choose(item)}
                    style={[styles.swatch, { backgroundColor: accentColor[item], borderColor: selected ? colors.foreground : "transparent" }]}
                  >
                    {selected ? <Glyph name="check" color="#0A0A0A" /> : null}
                  </Pressable>
                )
              })}
            </View>
            <Button
              variant="raised"
              onPress={() => onFinish({ name: profileName(name), accent, ceilingMinor: null, ready: true })}
            >
              Entrar
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 20, paddingTop: 8 },
  progress: { flex: 1, flexDirection: "row", gap: 8 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  content: { padding: 20, gap: 20 },
  logo: { width: 88, height: 88, alignSelf: "center" },
  block: { gap: 16 },
  swatches: { flexDirection: "row", justifyContent: "center", gap: 16 },
  swatch: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: "center", justifyContent: "center" },
})
