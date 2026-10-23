# Security policy

Orvio stores personal financial records on the user's device. Treat reports that could expose those records, backups, encryption keys, or third-party credentials as urgent.

## Reporting a vulnerability

Please report it privately through [GitHub's private vulnerability reporting](https://github.com/KevinGirelli/orvio-finance/security/advisories/new) rather than in a public issue or pull request.

Include:

- The affected surface (app, backup format, optional integration, download site)
- How it can be exploited
- Whether financial data, keys, or credentials could leave the device
- A suggested fix, if you have one

Do **not** attach real backups, bank statements, API keys, or production credentials. Use synthetic examples.

## Supported versions

There is no production release yet. Fixes land on `main` through pull requests. Once APKs are published, advisories will name the affected release tags.

## What this project will not do

- Ship a developer API key, bank credential, or shared secret inside the APK
- Collect telemetry or financial data by default
- Keep a central database of user wealth
- Accept security reports that include other people's real financial data
