export const HELP_CATEGORIES = [
  { id: 'getting-started', label: 'Getting started', icon: 'BookOpen' },
  { id: 'categories', label: 'Categories', icon: 'Tags' },
  { id: 'backups', label: 'Backup & restore', icon: 'Database' },
  { id: 'offline', label: 'Offline use', icon: 'Wifi' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: 'Wrench' },
]

export const HELP_ARTICLES = [
  {
    id: 'daily-kudi-basics',
    category: 'getting-started',
    title: 'What is Daily Kudi?',
    summary: 'A simple place to record money coming in and going out, on this device.',
    keywords: 'purpose expense tracker personal finance',
    steps: [
      'Use Daily Kudi to keep a record of income and expenses, see your balance, and understand spending by category.',
      'Your entries are saved in this browser on this device. There is no account or automatic cloud sync.',
    ],
  },
  {
    id: 'dashboard',
    category: 'getting-started',
    title: 'Understand your dashboard',
    summary: 'Read your balance, income, expenses, spending breakdown, and recent activity.',
    keywords: 'home balance dashboard total',
    steps: [
      'Total Balance is the total saved income minus total saved expenses across your records. It is not a bank balance.',
      'Total Income and Total Expenses show saved amounts. The spending breakdown groups expenses by category.',
      'Recent transactions shows your latest entries. Use View all when available to expand the list.',
    ],
  },
  {
    id: 'add-expense',
    category: 'getting-started',
    title: 'Add an expense',
    summary: 'Record what you spent, choose a category, and save the date.',
    keywords: 'spend bought food transport add expense record',
    steps: [
      'Choose Add expense on the dashboard or the Add button in the bottom navigation.',
      'Enter the amount, choose a category, add an optional description, and check the date.',
      'For example, record ₦2,000 for food or ₦1,500 for transport, then save.',
    ],
  },
  {
    id: 'add-income',
    category: 'getting-started',
    title: 'Add income',
    summary: 'Record money received using an income category.',
    keywords: 'salary received wages add income money in',
    steps: [
      'Choose Add income on the dashboard, or open Add and change Type to Income.',
      'Enter the amount, choose an income category, and check the date before saving.',
      'For example, record ₦20,000 received as salary. Daily Kudi records what you enter; it does not verify a payment.',
    ],
  },
  {
    id: 'edit-delete',
    category: 'getting-started',
    title: 'Edit or delete a transaction',
    summary: 'Use the edit and delete controls beside an entry in the dashboard or history.',
    keywords: 'change correct remove transaction pencil trash',
    steps: [
      'Find the transaction in Recent transactions or History. In History, use search or filters if helpful.',
      'Choose the edit control to update the saved details and save your changes.',
      'Choose delete to remove an entry. Check the transaction carefully before confirming a deletion.',
    ],
  },
  {
    id: 'history',
    category: 'getting-started',
    title: 'Find transactions in History',
    summary: 'Search, filter, and sort your saved transactions.',
    keywords: 'search filters date category newest oldest history',
    steps: [
      'Open History from the bottom navigation.',
      'Search by description or category, and filter by transaction type, category, or date range.',
      'Choose a sort order to change which dates appear first. Clear filters if an entry is missing from the results.',
    ],
  },
  {
    id: 'analytics',
    category: 'getting-started',
    title: 'Use Analytics',
    summary: 'Review income, expenses, savings, category totals, and spending trends for a period.',
    keywords: 'charts pie percentage monthly weekly all time',
    steps: [
      'Open Analytics and select a reporting period such as the last 7 days, this month, or all time.',
      'Compare income and expenses, review category totals and percentages, and explore the spending trend chart.',
      'Analytics uses saved transaction dates. If a transaction is dated outside the selected period, it is not included in that period’s figures.',
    ],
  },
  {
    id: 'create-categories',
    category: 'categories',
    title: 'Create an income or expense category',
    summary: 'Keep different kinds of money in separate category lists.',
    keywords: 'custom add category icon type income expense',
    steps: [
      'Open Settings and find Transaction categories.',
      'Choose Add beside Income categories or Expense categories, enter a name, select an icon, and save.',
      'Category names must be unique within the same transaction type. The same name can be used once for income and once for expenses.',
    ],
  },
  {
    id: 'rename-categories',
    category: 'categories',
    title: 'Rename a custom category',
    summary: 'Edit a custom category from Settings.',
    keywords: 'edit change rename category transaction labels',
    steps: [
      'Open Settings → Transaction categories and choose the edit control beside a custom category.',
      'Update the name or icon and save. If saved transactions use that category, their category labels are updated with the rename.',
      'Default categories cannot be renamed from category management.',
    ],
  },
  {
    id: 'delete-categories',
    category: 'categories',
    title: 'Delete a custom category safely',
    summary: 'Unused categories are removed; categories already in use are archived.',
    keywords: 'remove delete archive existing transaction historical label',
    steps: [
      'Choose the delete control beside a custom category and read the confirmation before proceeding.',
      'If no saved transaction uses it, the category is deleted.',
      'If saved transactions use it, the category is archived instead: it is unavailable for new entries, while the historical category label and transactions are kept.',
    ],
  },
  {
    id: 'export-backup',
    category: 'backups',
    title: 'Export a JSON backup',
    summary: 'Download a file containing your transactions and supported custom categories.',
    keywords: 'download export file JSON backup saved folder',
    steps: [
      'Open Settings → Data management and choose Export backup.',
      'Your browser downloads a dated Daily Kudi JSON file. It may appear in Downloads or another folder selected by your browser.',
      'The file contains sensitive financial details. Keep it somewhere private and protected. Local browser storage is not a backup.',
      'Export a fresh copy regularly and before changing devices, clearing browser data, or attempting a risky recovery step.',
    ],
  },
  {
    id: 'restore-backup',
    category: 'backups',
    title: 'Restore a backup',
    summary: 'Select a Daily Kudi JSON file, review it, and confirm replacement.',
    keywords: 'import upload replace restore records transactions categories',
    steps: [
      'If you need to keep your current records, export a backup of them first.',
      'In Settings → Data management, choose Restore backup and select a previously downloaded Daily Kudi JSON file.',
      'Daily Kudi validates the file before showing a confirmation. Confirming replaces current transactions and categories with the backup contents; cancelling leaves current data unchanged.',
      'Malformed, unsupported, or incompatible files are rejected. A backup only contains information that was saved when it was exported.',
    ],
  },
  {
    id: 'offline-use',
    category: 'offline',
    title: 'Use Daily Kudi offline',
    summary: 'The app can work offline after it has loaded and its application files have been cached.',
    keywords: 'internet connection airplane mode offline service worker cache',
    steps: [
      'Open Daily Kudi while online and allow the app to finish loading. The PWA caches application files for offline use.',
      'Saved transactions remain in this browser’s local storage; the app does not automatically sync them to another device.',
      'Browser storage can be cleared or lost. Keep a separate JSON backup, and do not clear site data as a troubleshooting shortcut if you need your records.',
    ],
  },
  {
    id: 'troubleshoot-opening',
    category: 'troubleshooting',
    title: 'The app will not open',
    summary: 'Try a normal reload and check your connection before changing browser storage.',
    keywords: 'blank screen loading crash startup browser',
    steps: [
      'If this is the first visit or the app files are not cached, connect to the internet and reload.',
      'Close and reopen the tab or installed app, then try a normal browser refresh.',
      'Do not clear browser/site storage if you need saved records. If the app opens later, export a backup before trying destructive browser troubleshooting.',
    ],
  },
  {
    id: 'troubleshoot-transactions',
    category: 'troubleshooting',
    title: 'A transaction is missing',
    summary: 'Check the active filters, search text, date, and browser profile.',
    keywords: 'record missing disappeared history search filters browser',
    steps: [
      'In History, clear filters and search, then check the transaction type and date range.',
      'Check that you are using the same browser and browser profile where you entered the record.',
      'If you still cannot find it, the browser data may have been cleared or the entry may not have been saved. Daily Kudi has no automatic recovery service. Avoid clearing more data.',
    ],
  },
  {
    id: 'troubleshoot-balance',
    category: 'troubleshooting',
    title: 'My balance looks incorrect',
    summary: 'The dashboard balance is calculated from all saved income and expenses.',
    keywords: 'wrong balance amount total calculation duplicate date',
    steps: [
      'Remember: balance is saved income minus saved expenses. It is not a bank balance and is not limited to the current analytics period.',
      'Review History for duplicate entries, an incorrect transaction type, amount, or date. Analytics periods use transaction dates.',
      'Correct an entry with Edit. Before making many changes, export a backup so you can keep a copy of the current records.',
    ],
  },
  {
    id: 'troubleshoot-backup',
    category: 'troubleshooting',
    title: 'Backup download or restore is not working',
    summary: 'Check browser downloads and confirm the selected file is a valid Daily Kudi backup.',
    keywords: 'download error invalid JSON backup restore file',
    steps: [
      'For a download problem, check browser download permissions, available device storage, and the Downloads folder or browser-selected destination.',
      'For a restore error, select an unmodified Daily Kudi JSON backup. Unsupported versions or malformed data are rejected.',
      'Restore replaces current transactions and categories only after confirmation. Export your current data first if you may want to keep it.',
    ],
  },
  {
    id: 'troubleshoot-offline',
    category: 'troubleshooting',
    title: 'Daily Kudi is not working offline',
    summary: 'Offline use needs an earlier successful load and cached app files.',
    keywords: 'offline service worker internet connection airplane mode',
    steps: [
      'Reconnect to the internet, open Daily Kudi, and let it finish loading before trying offline again.',
      'The app can work offline after its application files have been cached. Browser settings or storage cleanup may affect cached files.',
      'Transactions are stored separately in this browser’s local storage. Do not clear site data to troubleshoot if you need your records; back them up first whenever possible.',
    ],
  },
  {
    id: 'troubleshoot-update',
    category: 'troubleshooting',
    title: 'Daily Kudi is not updating',
    summary: 'Use the in-app update prompt and allow the new version to reload.',
    keywords: 'update service worker waiting refresh install version',
    steps: [
      'Connect to the internet and reopen Daily Kudi so the browser can check for an available app update.',
      'When an update notice appears, choose Update now and allow the app to reload. A slow connection can delay the notice.',
      'If the notice does not appear, close and reopen the app later while online. Avoid clearing site storage if it contains records; export a backup before any destructive browser troubleshooting.',
    ],
  },
]

export const HELP_FAQS = [
  {
    id: 'account',
    question: 'Does Daily Kudi require an account?',
    answer: 'No. Daily Kudi does not require registration or an account.',
    keywords: 'sign up login register',
  },
  {
    id: 'cloud',
    question: 'Is my financial data uploaded to the cloud?',
    answer: 'The app stores transaction and category records in this browser’s local storage. It does not automatically upload them or sync them to a Daily Kudi cloud account. If you choose to share a report, the selected share destination may receive that report.',
    keywords: 'server sync synchronisation privacy',
  },
  {
    id: 'internet',
    question: 'Can I use Daily Kudi without internet?',
    answer: 'It can work offline after it has loaded successfully and its app files have been cached. First-time loading and some updates require a connection.',
    keywords: 'offline connection network',
  },
  {
    id: 'another-device',
    question: 'Can I use my records on another phone?',
    answer: 'Records do not transfer automatically. You can export a JSON backup and manually move that file to the other device, then select Restore backup there. Keep the file private.',
    keywords: 'move transfer phone device sync',
  },
  {
    id: 'uninstall',
    question: 'What happens if I uninstall the app?',
    answer: 'Whether browser storage remains after uninstalling depends on the browser and operating system. Back up your records before uninstalling or clearing browser data.',
    keywords: 'remove delete pwa',
  },
  {
    id: 'recover',
    question: 'How do I recover lost transactions?',
    answer: 'Restore a previously exported backup if you have one. Daily Kudi has no cloud copy or automatic recovery service, so records that were cleared without a backup may not be recoverable.',
    keywords: 'lost restore recovery deleted',
  },
  {
    id: 'edit',
    question: 'Can I edit a transaction?',
    answer: 'Yes. Use the edit control beside the transaction in Recent transactions or History, make your changes, and save.',
    keywords: 'change update correct',
  },
  {
    id: 'own-categories',
    question: 'Can I create my own categories?',
    answer: 'Yes. In Settings, add a custom category under Income categories or Expense categories. Names must be unique within that type.',
    keywords: 'custom category income expense',
  },
  {
    id: 'backup',
    question: 'How do I back up my records?',
    answer: 'Open Settings → Data management → Export backup. Store the downloaded JSON file somewhere private. Browser storage itself is not a guaranteed backup.',
    keywords: 'download export JSON',
  },
  {
    id: 'balance',
    question: 'Why is my balance different from what I expected?',
    answer: 'The dashboard adds all saved income and subtracts all saved expenses, across all dates. It is not a bank balance. Check for duplicate entries or an incorrect amount or transaction type in History.',
    keywords: 'calculation total bank amount',
  },
  {
    id: 'bank',
    question: 'Does Daily Kudi connect to my bank?',
    answer: 'No. There is no bank connection or automatic transaction import. You enter income and expenses yourself.',
    keywords: 'bank integration statement import',
  },
]

function searchableText(item) {
  return [
    item.title,
    item.summary,
    item.question,
    item.answer,
    item.keywords,
    ...(item.steps || []),
  ].filter(Boolean).join(' ').toLocaleLowerCase('en-NG')
}

export function searchHelpContent(query = '', category = 'all') {
  const normalizedQuery = query.trim().toLocaleLowerCase('en-NG')
  const articles = HELP_ARTICLES.filter((article) => {
    const matchesCategory = normalizedQuery || category === 'all' || article.category === category
    return matchesCategory && (!normalizedQuery || searchableText(article).includes(normalizedQuery))
  })
  const faqs = HELP_FAQS.filter((faq) => !normalizedQuery || searchableText(faq).includes(normalizedQuery))
  return { articles, faqs }
}
