# Privacy

Orvio is local-first. The core of the app is meant to work after you install the APK, without creating an account and without talking to servers run by this project.

This document describes the intent of the product. The pilot can record accounts and movements offline. If you paste an xAI API key, a question that the local phrases do not understand is sent to xAI with the account names and this month's totals, not the whole database. If you run `apps/bridge` and point Twilio at it, WhatsApp texts are fetched by the phone and replies go back through your Twilio account. Both stay off until those fields are filled.

## On the device

- Financial records stay in a local database on the Android device.
- There is no required Orvio account and no Orvio cloud database.
- Uninstalling the app on Android removes locally stored secrets. Export a backup first if you want to restore later.

## What never happens by default

- No automatic sync to infrastructure owned by this project
- No required analytics, crash reporters, or advertising identifiers
- No silent upload of the local database to an AI model

## Optional features that leave the device

Each of the following is off until the user turns it on. The UI should say that data will be sent, and to whom.

| Feature | Who receives data | What is sent |
| --- | --- | --- |
| Encrypted backup file | Wherever the user saves it (Files, Drive, USB, …) | An encrypted archive the user chose to export |
| Large language model | The provider of the key the user pasted (for example xAI) | The minimum prompt needed for that request, never the whole ledger |
| Market data | The provider of the key the user pasted | Tickers and queries, not account numbers |
| Open Finance | The aggregator and bank the user authorised | Whatever that consent screen grants |
| WhatsApp assistant | The user's own bridge, plus Twilio/Meta | Message text or audio for that conversation |

Turning any of these off must leave the rest of the app usable offline.

## Backups

A backup that can only be opened with a key locked in the old phone is not a restore path. Recovery uses a passphrase and/or a recovery kit the user stores, not biometrics alone.

## Issues, PRs and logs

Do not put real names, account numbers, statements, or API keys in issues, pull requests, screenshots, fixtures or logs. Use synthetic data.
