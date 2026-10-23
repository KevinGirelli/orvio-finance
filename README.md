<p align="center">
  <img src="logo-orvio.png" alt="Orvio" width="220" />
</p>

<h1 align="center">Orvio</h1>

<p align="center">
  Open-source, local-first personal finance for Android.<br />
  Your records stay on your device. No account, no telemetry, no central ledger.
</p>

<p align="center">
  <a href="./PRIVACY.md">Privacy</a> ·
  <a href="./SECURITY.md">Security</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a> ·
  <a href="./LICENSE">MIT</a>
</p>

---

Orvio is a free Android app you install yourself. It is meant to feel like a private finance desk: accounts, cards, invoices, budgets, net worth and investments on the phone, with an optional assistant later — including WhatsApp — that you turn on only if you want it.

The project is in early development. There is no APK yet. Releases will be published on GitHub when they exist; you will not need to sign up anywhere to download them.

## Principles

- **Local-first.** Install and start. Core ledgers, charts and reports work offline.
- **You hold the data.** Export, restore and delete are yours. There is no Orvio cloud copy of your wealth.
- **Optional network.** AI, Open Finance, market data and WhatsApp are off until you consent. Each one uses *your* credentials, never a key baked into the APK.
- **No silent collection.** No required analytics. No hidden crash pipeline for financial data.
- **Not a bank, not an advisor.** Orvio does not execute trades and does not give personalised investment recommendations.

## What will live here

| Path | Role |
| --- | --- |
| Android app (Expo / React Native) | The product. UI from [Corsair Native](https://corsairui.vercel.app/native). |
| Local database | Encrypted SQLite on the device. |
| GitHub Releases | Public APK downloads. |
| Download site (later) | A static page that points at those releases. |

Integrations that need the internet (xAI, bank aggregators, market data, a self-hosted WhatsApp bridge) will be adapters behind the financial core, not the other way around.

## Status

The Android app lives in `apps/mobile` (Expo SDK 57, TypeScript, [Corsair Native](https://corsairui.vercel.app/native)). The pilot has accounts, movements, monthly charts and an assistant. Amounts are centavos. A transfer does not change net worth, and it is not drawn as income or spending. Phrases such as “gastei 32,50 no mercado” stay on the device until you confirm them. A key from [console.x.ai](https://console.x.ai) is optional and is stored in the Android keystore; the Cursor Grok Bot is not an API key and is not used. WhatsApp goes through `apps/bridge`, a server you run yourself with your Twilio credentials. The web preview keeps everything in memory. There is no APK yet. `main` only changes through pull requests.

See [CONTRIBUTING.md](./CONTRIBUTING.md) if you want to help, and [PRIVACY.md](./PRIVACY.md) for what is allowed to leave the device.

## WhatsApp and xAI

Twilio credentials stay in a bridge you run. Copy `apps/bridge/.env.example` to `apps/bridge/.env`, fill your account and a secret you choose, and publish `ORVIO_PUBLIC_WEBHOOK_URL` over public HTTPS. Twilio does not accept a self-signed certificate. From `apps/bridge`, run:

```bash
node --experimental-strip-types --env-file=.env src/main.ts
```

In the app, open Assistente and then “WhatsApp e chave da xAI”. Put the address the phone can reach and the same secret. The app only pulls messages while it is open. A posting is written after you reply SIM or tap Confirmar.

The model is `grok-4.7` on `https://api.x.ai/v1/responses`, with your key from [console.x.ai](https://console.x.ai). The Cursor Grok Bot is not that key. Requests ask xAI not to store them (`store: false`). The prompt carries account names and this month's totals, not the database file.

## License

[MIT](./LICENSE).
