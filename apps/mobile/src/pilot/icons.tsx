import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Circle, Path, Svg } from "react-native-svg"

import { useDockTone } from "@/components/ui/dock"
import { useTheme, withAlpha } from "@/lib/theme"
import type { Category } from "../domain/categories.ts"
import type { AccountKind } from "../domain/ledger.ts"

export const palette = {
  lilac: "#D2B4EF",
  pink: "#E8B4C4",
  coral: "#F19456",
  rose: "#F0A0B4",
} as const

const names = [
  "home",
  "list",
  "wallet",
  "user",
  "plus",
  "back",
  "flame",
  "shield",
  "moon",
  "check",
  "alert",
  "house",
  "fork",
  "car",
  "heart",
  "spark",
  "bag",
  "coin",
  "dots",
  "up",
  "down",
  "swap",
  "album",
  "sliders",
] as const

export type GlyphName = (typeof names)[number]

const pen = {
  fill: "none" as const,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

function stroke(color: string, d: string) {
  return <Path d={d} stroke={color} {...pen} />
}

const draw: Record<GlyphName, (color: string) => ReactNode> = {
  home: (color) => stroke(color, "M4 11 12 4l8 7v9H4zM9 20v-6h6v6"),
  list: (color) => (
    <>
      {stroke(color, "M9 7h11M9 12h11M9 17h11")}
      <Circle cx={5} cy={7} r={1} fill={color} />
      <Circle cx={5} cy={12} r={1} fill={color} />
      <Circle cx={5} cy={17} r={1} fill={color} />
    </>
  ),
  wallet: (color) => stroke(color, "M4 8h16v11H4zM4 8l2-3h12M16 13.5h3"),
  user: (color) => (
    <>
      <Circle cx={12} cy={8} r={3} stroke={color} {...pen} />
      {stroke(color, "M5 19c1.4-3 3.6-4.5 7-4.5S17.6 16 19 19")}
    </>
  ),
  plus: (color) => stroke(color, "M12 5v14M5 12h14"),
  back: (color) => stroke(color, "M15 5 8 12l7 7"),
  flame: (color) => stroke(color, "M12 3c1.5 3 5 4 5 9a5 5 0 0 1-10 0c0-2 1.2-3.2 2.2-4.6.2 2 1.2 2.8 2.8 2.6C11 7 11.2 5 12 3z"),
  shield: (color) => stroke(color, "M12 3 19 6v6c0 4.2-2.8 7.2-7 8.8C7.8 19.2 5 16.2 5 12V6z"),
  moon: (color) => stroke(color, "M16 3.5A8 8 0 1 0 20 16 6.2 6.2 0 0 1 16 3.5z"),
  check: (color) => stroke(color, "M5 12.5 9.5 17 19 7"),
  alert: (color) => (
    <>
      {stroke(color, "M12 4 20 18H4z")}
      {stroke(color, "M12 10v4")}
      <Circle cx={12} cy={16.5} r={0.8} fill={color} />
    </>
  ),
  house: (color) => stroke(color, "M4 11 12 4l8 7v9H4z"),
  fork: (color) => stroke(color, "M8 3v6M12 3v6M16 3v6M8 9h8M12 9v12"),
  car: (color) => stroke(color, "M4 15h16v4H4zM6 15l2-5h8l2 5M7 19v1M17 19v1"),
  heart: (color) => stroke(color, "M12 19s-6.5-4-6.5-8.2A3.4 3.4 0 0 1 12 8a3.4 3.4 0 0 1 6.5 2.8C18.5 15 12 19 12 19z"),
  spark: (color) => stroke(color, "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.4 2.4M15.6 15.6 18 18M18 6l-2.4 2.4M8.4 15.6 6 18"),
  bag: (color) => stroke(color, "M6 8h12l-1 12H7zM9 8V6.5a3 3 0 0 1 6 0V8"),
  coin: (color) => (
    <>
      <Circle cx={12} cy={12} r={8} stroke={color} {...pen} />
      {stroke(color, "M12 8v8M9.5 10.2h3.2a1.8 1.8 0 0 1 0 3.6H9.5")}
    </>
  ),
  dots: (color) => (
    <>
      <Circle cx={6} cy={12} r={1.4} fill={color} />
      <Circle cx={12} cy={12} r={1.4} fill={color} />
      <Circle cx={18} cy={12} r={1.4} fill={color} />
    </>
  ),
  up: (color) => stroke(color, "M12 19V5M6 11l6-6 6 6"),
  down: (color) => stroke(color, "M12 5v14M6 13l6 6 6-6"),
  swap: (color) => stroke(color, "M7 7h11l-3-3M17 17H6l3 3"),
  album: (color) => (
    <>
      {stroke(color, "M5 4h14v16H5z")}
      <Circle cx={12} cy={12} r={3} stroke={color} {...pen} />
    </>
  ),
  sliders: (color) => stroke(color, "M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M8 14v4"),
}

export function Glyph({ name, color, size = 22 }: { name: GlyphName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {draw[name](color)}
    </Svg>
  )
}

export function DockGlyph({ name }: { name: GlyphName }) {
  const tone = useDockTone()
  const { colors } = useTheme()
  return <Glyph name={name} color={tone ?? colors.mutedForeground} />
}

export function Disc({ color, children, size = 40 }: { color: string; children: ReactNode; size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: withAlpha(color, 0.38) }]}>
      {children}
    </View>
  )
}

export function Wash({ color }: { color: string }) {
  return <View pointerEvents="none" style={[styles.wash, { backgroundColor: withAlpha(color, 0.28) }]} />
}

export function categoryGlyph(category: Category | null): GlyphName {
  switch (category) {
    case "moradia":
      return "house"
    case "alimentacao":
      return "fork"
    case "transporte":
      return "car"
    case "saude":
      return "heart"
    case "lazer":
      return "spark"
    case "compras":
      return "bag"
    case "salario":
      return "coin"
    default:
      return "dots"
  }
}

export function categoryInk(category: Category | null, success: string, muted: string): string {
  switch (category) {
    case "moradia":
      return palette.lilac
    case "alimentacao":
      return palette.coral
    case "transporte":
      return palette.pink
    case "saude":
      return palette.rose
    case "lazer":
      return palette.lilac
    case "compras":
      return palette.pink
    case "salario":
      return success
    default:
      return muted
  }
}

export function movementMark(
  kind: "income" | "expense" | "transfer" | "opening",
  category: Category | null,
  success: string,
  muted: string,
): { name: GlyphName; color: string } {
  if (kind === "transfer") return { name: "swap", color: palette.pink }
  if (kind === "income") return { name: "up", color: success }
  if (kind === "opening") return { name: "wallet", color: palette.lilac }
  return { name: categoryGlyph(category), color: categoryInk(category, success, muted) }
}

export function accountGlyph(kind: AccountKind): { name: GlyphName; color: string } {
  if (kind === "savings") return { name: "coin", color: palette.lilac }
  if (kind === "cash") return { name: "bag", color: palette.coral }
  return { name: "wallet", color: palette.pink }
}

const styles = StyleSheet.create({
  disc: { alignItems: "center", justifyContent: "center" },
  wash: { position: "absolute", top: -80, right: -30, width: 220, height: 220, borderRadius: 110 },
})
