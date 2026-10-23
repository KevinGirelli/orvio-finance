import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { ThemeProvider, useTheme } from "@/lib/theme";

function Home() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Image
          source={require("./assets/logo-orvio.png")}
          style={styles.logo}
          accessibilityLabel="Orvio"
        />
        <Text variant="h2">Orvio</Text>
        <Text variant="muted" style={styles.line}>
          Seus dados ficam neste aparelho.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider scheme="dark">
          <Home />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  logo: { width: 160, height: 160, marginBottom: 8 },
  line: { textAlign: "center" },
});
