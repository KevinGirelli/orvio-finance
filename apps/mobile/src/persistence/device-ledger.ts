import {
  deleteDatabaseAsync,
  openDatabaseAsync,
  type SQLiteBindValue,
  type SQLiteDatabase,
} from "expo-sqlite"
import * as SecureStore from "expo-secure-store"
import type { Ledger } from "../domain/ledger.ts"
import { DomainError } from "../domain/money.ts"
import type { Profile } from "../domain/profile.ts"
import { loadLedger, loadProfile, migrate, saveLedger, saveProfile, type Sql } from "./ledger-db.ts"
import { pragmaKeyStatement, requireCipherVersion } from "./sqlcipher.ts"

const databaseName = "orvio.db"
const keyName = "orvio.database-key"

export type LedgerStore = {
  load(): Promise<Ledger>
  save(ledger: Ledger): Promise<void>
  loadProfile(): Promise<Profile>
  saveProfile(profile: Profile): Promise<void>
}

export async function openDeviceLedger(): Promise<LedgerStore> {
  const database = await openDatabaseAsync(databaseName)
  const cipher = await database.getFirstAsync<{ cipher_version: string | null }>("PRAGMA cipher_version")
  try {
    requireCipherVersion(cipher)
  } catch (error) {
    await database.closeAsync()
    await deleteDatabaseAsync(databaseName)
    throw error
  }

  await database.execAsync(pragmaKeyStatement(await loadOrCreateKey()))
  const sql = expoSql(database)
  await migrate(sql)
  return {
    load: () => loadLedger(sql),
    save: (ledger) => saveLedger(sql, ledger),
    loadProfile: () => loadProfile(sql),
    saveProfile: (profile) => saveProfile(sql, profile),
  }
}

async function loadOrCreateKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(keyName)
  if (existing !== null) return hexToBytes(existing)
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  await SecureStore.setItemAsync(keyName, hex)
  return bytes
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new DomainError("sqlcipher.key_length")
  const bytes = new Uint8Array(32)
  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function expoSql(database: SQLiteDatabase): Sql {
  return {
    async exec(statement, params = []) {
      const bound = params.map(bind)
      if (bound.length === 0) {
        await database.execAsync(statement)
        return
      }
      await database.runAsync(statement, bound)
    },
    async all(statement, params = []) {
      return database.getAllAsync<Record<string, unknown>>(statement, params.map(bind))
    },
  }
}

function bind(value: unknown): SQLiteBindValue {
  if (typeof value === "string" || typeof value === "number" || value === null) return value
  throw new DomainError("persistence.corrupt")
}
