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

The Android app lives in `apps/mobile` (Expo SDK 57, TypeScript, [Corsair Native](https://corsairui.vercel.app/native)). The pilot screen lists accounts, income, expenses and transfers. Amounts are centavos. A transfer does not change net worth. On Android, a development build stores that ledger in SQLCipher; the web preview keeps it in memory only, because that build cannot encrypt the file. There is no APK release yet. `main` only changes through pull requests.

See [CONTRIBUTING.md](./CONTRIBUTING.md) if you want to help, and [PRIVACY.md](./PRIVACY.md) for what is allowed to leave the device.

## License

[MIT](./LICENSE).
