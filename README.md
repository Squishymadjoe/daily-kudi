# Daily Kudi

Daily Kudi is an offline-first personal expense tracker. Income and expense
transactions are saved in the browser's LocalStorage under
`daily-kudi-transactions`, so records remain available after refreshes and
browser restarts on the same device.

The dashboard starts with an empty transaction history. It calculates income,
expenses, balance, and spending categories from saved transactions. Users can
add, edit, and delete entries; deleting an entry requires confirmation.

## Sharing a financial summary

The dashboard and analytics screen let you preview and share today's, this
week's, this month's, or all-time totals and expense categories. Reports are
calculated from the saved transactions in this browser. You can use the
browser's share sheet, copy the report, or open a pre-filled WhatsApp message;
Daily Kudi does not send reports to a backend.

## Backing up and restoring data

Open Settings to download all saved transactions as a versioned JSON backup or
restore a compatible Daily Kudi backup. Restore validates the entire file and
asks for confirmation before replacing local records and categories. Settings
also includes a confirmed action to clear local records and custom categories.
Backup files contain sensitive financial details; downloaded files are not
removed when app data is cleared. No backup or restore data is uploaded to a
server.

## Privacy and app information

The Privacy Policy and About Daily Kudi screens are available in Settings.
Daily Kudi stores transactions and custom categories in browser LocalStorage;
it has no account requirement or automatic cloud sync. Optional summary
sharing sends report text only when the user chooses a share destination.
Netlify hosts the app and may process technical request information separately
from the app's local financial records. Clearing browser storage can
permanently remove local records, so keep a protected backup if you need one.

## Onboarding and custom categories

New users can take a short introduction to recording transactions, reading the
dashboard and analytics, and keeping data private. It can be skipped and
reopened from Settings. Completion is stored in LocalStorage; existing
transaction or category data suppresses first-run onboarding after an update.

Settings also lets you create, rename, and delete custom income and expense
categories, with a choice of icons. Categories are stored locally under
`daily-kudi-custom-categories`. Renaming updates matching transaction labels;
deleting a category already used in transactions archives it so its history
remains intact. Version 2 backups include custom categories and continue to
restore version 1 backups.

## Install and use offline

Daily Kudi can be installed from supported browsers using the **Install**
action, or from the browser menu (on iOS Safari, use Share → Add to Home
Screen). After the first successful online visit, the service worker caches
the production app shell and static assets for offline use. Transaction
records remain only in LocalStorage; private financial data is not cached by
the service worker. When an update is available, Daily Kudi offers an
**Update now** action.

## Development

```sh
npm install
npm run dev
```

Run the production build and linter with:

```sh
npm run build
npm run lint
```

## Deploy to Netlify

Connect the repository to Netlify and use these build settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: leave blank (the repository root)
- Node version: `22` (set in `netlify.toml`; required by Vite 8)

The root `netlify.toml` also configures the SPA fallback and prevents stale
service-worker and manifest responses. Deploy the site at the domain root so
the PWA manifest, icons, and service worker use their configured root paths.
No environment variables or backend services are required.
