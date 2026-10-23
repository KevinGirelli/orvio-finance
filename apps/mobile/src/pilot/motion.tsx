import { useEffect, useRef, type ReactNode } from "react"
import { Animated, Easing, StyleSheet, View } from "react-native"

import { useReducedMotion } from "@/hooks/use-reduced-motion"

const sparks = ["#D2B4EF", "#E8B4C4", "#F19456", "#3DDC97", "#D2B4EF", "#F19456", "#E8B4C4", "#3DDC97"]

export function Wiggle({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduced) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(spin, { toValue: -1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [reduced, spin])

  const rotate = spin.interpolate({ inputRange: [-1, 1], outputRange: ["-7deg", "7deg"] })
  return <Animated.View style={{ transform: [{ rotate }] }}>{children}</Animated.View>
}

export function Pop({ token, children }: { token: number; children: ReactNode }) {
  const reduced = useReducedMotion()
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (reduced) return
    scale.setValue(0.86)
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: false }).start()
  }, [reduced, scale, token])

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
}

export function Burst() {
  const reduced = useReducedMotion()
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduced) return
    Animated.timing(progress, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [progress, reduced])

  if (reduced) return null
  return (
    <View pointerEvents="none" style={styles.burst}>
      {sparks.map((color, index) => {
        const angle = (Math.PI * 2 * index) / sparks.length
        const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] })
        const scale = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.3, 1.3, 0.5] })
        return (
          <Animated.View
            key={color + index}
            style={[
              styles.spark,
              {
                backgroundColor: color,
                opacity,
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 88] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 70 - 16] }) },
                  { scale },
                ],
              },
            ]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  burst: { position: "absolute", top: 96, left: 0, right: 0, height: 160, alignItems: "center", justifyContent: "center", zIndex: 4 },
  spark: { position: "absolute", width: 12, height: 12, borderRadius: 6 },
})
