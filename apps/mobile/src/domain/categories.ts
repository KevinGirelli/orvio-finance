export const categoryIds = [
  "moradia",
  "alimentacao",
  "transporte",
  "saude",
  "lazer",
  "compras",
  "salario",
  "outros",
] as const

export type Category = (typeof categoryIds)[number]

export const categoryLabel: Record<Category, string> = {
  moradia: "Moradia",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  saude: "Saúde",
  lazer: "Lazer",
  compras: "Compras",
  salario: "Salário",
  outros: "Outros",
}

const hints: { word: string; category: Category }[] = [
  { word: "aluguel", category: "moradia" },
  { word: "moradia", category: "moradia" },
  { word: "condominio", category: "moradia" },
  { word: "mercado", category: "alimentacao" },
  { word: "ifood", category: "alimentacao" },
  { word: "comida", category: "alimentacao" },
  { word: "alimentacao", category: "alimentacao" },
  { word: "alimentação", category: "alimentacao" },
  { word: "uber", category: "transporte" },
  { word: "transporte", category: "transporte" },
  { word: "gasolina", category: "transporte" },
  { word: "farmacia", category: "saude" },
  { word: "farmácia", category: "saude" },
  { word: "saude", category: "saude" },
  { word: "saúde", category: "saude" },
  { word: "lazer", category: "lazer" },
  { word: "compras", category: "compras" },
  { word: "salario", category: "salario" },
  { word: "salário", category: "salario" },
]

export function isCategory(value: string): value is Category {
  return (categoryIds as readonly string[]).includes(value)
}

export function categoryFromText(text: string): Category | null {
  const folded = text.toLocaleLowerCase("pt-BR")
  const found = hints.find((hint) => folded.includes(hint.word))
  return found?.category ?? null
}
