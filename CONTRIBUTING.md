# Contributing

Thanks for helping out. By taking part you agree to the [code of conduct](./CODE_OF_CONDUCT.md). Security issues go through [SECURITY.md](./SECURITY.md), not public issues. Privacy expectations are in [PRIVACY.md](./PRIVACY.md).

## Pull requests are the only way onto `main`

`main` is protected. Direct pushes, force pushes and merge commits are rejected.

- Branch off `main` with a descriptive name (`feat/…`, `fix/…`, `chore/…`).
- Open a pull request. The template asks what changed, why, and how you checked it.
- PRs are **squash-merged**, so write the PR title as the commit you want on `main`.
- Do not merge your own PR unless the maintainer has said so.
- Do not disable required checks to force a merge.
- Dependabot opens dependency updates on Mondays; they go through the same process.

## Secrets and financial data

- Never commit API keys, tokens, keystore files, or `.env` files.
- Never put real transactions, statements, or backups in fixtures, screenshots or logs.
- Use made-up amounts and account names in tests and examples.
- Do not add `Co-authored-by` trailers for Cursor, coding agents, or chat assistants.

## Local-first

The financial core must keep working with the network off and with every optional integration disabled.

- Do not add a required Orvio backend.
- Do not embed a shared developer key in the APK.
- New integrations are optional, behind consent, and documented in [PRIVACY.md](./PRIVACY.md).
- The domain layer must not import a specific bank, aggregator, or model vendor.

## UI

The Android UI is built with [Corsair Native](https://corsairui.vercel.app/native), installed as source with the shadcn CLI (`@corsair-native`). Do not import web-only `@corsair-ui` items into React Native screens. Do not modify the [corsair-ui](https://github.com/KevinGirelli/corsair-ui) repository from this project. If a native piece is missing, implement it here in Orvio, using the same tokens and conventions.

## What this repository is not

- Not a SaaS. Users are not asked to register with us.
- Not investment advice. Do not add copy that tells someone to buy, sell or hold a security as a product recommendation.
- Not a place to paste Twilio, Gemini, xAI, Pluggy, or bank credentials.

## Setup

The application code is not in the tree yet. When the Expo app lands, this section will list Node.js 22+, pnpm, and the commands to typecheck, lint and test.

Until then, repository changes still go through a pull request.
