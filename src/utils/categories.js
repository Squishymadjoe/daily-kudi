export const CUSTOM_CATEGORIES_STORAGE_KEY = 'daily-kudi-custom-categories'

export const CATEGORY_ICONS = Object.freeze([
  { id: 'BriefcaseBusiness', label: 'Work', color: '#4d947a' },
  { id: 'Utensils', label: 'Food', color: '#d99b58' },
  { id: 'CarFront', label: 'Transport', color: '#79968a' },
  { id: 'ShoppingBag', label: 'Shopping', color: '#b48088' },
  { id: 'Smartphone', label: 'Phone and bills', color: '#8b88b8' },
  { id: 'HeartPulse', label: 'Health', color: '#c77a68' },
  { id: 'Home', label: 'Home', color: '#829bb0' },
  { id: 'Landmark', label: 'Finance', color: '#668b73' },
  { id: 'Wallet', label: 'Wallet', color: '#bd9a45' },
  { id: 'ReceiptText', label: 'Receipt', color: '#8c8a7b' },
  { id: 'BookOpen', label: 'Education', color: '#7187a4' },
  { id: 'Gift', label: 'Gifts', color: '#b77f91' },
  { id: 'Plane', label: 'Travel', color: '#5d9ba4' },
  { id: 'Wrench', label: 'Services', color: '#a27b5b' },
  { id: 'PawPrint', label: 'Pets', color: '#9a8b67' },
  { id: 'MoreHorizontal', label: 'Other', color: '#a5a18e' },
])

export const DEFAULT_CATEGORIES = Object.freeze([
  { name: 'Salary', type: 'income', icon: 'BriefcaseBusiness', color: '#4d947a', isDefault: true },
  { name: 'Other', type: 'income', icon: 'MoreHorizontal', color: '#a5a18e', isDefault: true },
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#d99b58', isDefault: true },
  { name: 'Transport', type: 'expense', icon: 'CarFront', color: '#79968a', isDefault: true },
  { name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#b48088', isDefault: true },
  { name: 'Bills & utilities', type: 'expense', icon: 'Smartphone', color: '#8b88b8', isDefault: true },
  { name: 'Health', type: 'expense', icon: 'HeartPulse', color: '#c77a68', isDefault: true },
  { name: 'Housing', type: 'expense', icon: 'Home', color: '#829bb0', isDefault: true },
  { name: 'Other', type: 'expense', icon: 'MoreHorizontal', color: '#a5a18e', isDefault: true },
])

export function getAllCategories(customCategories = []) {
  return [...DEFAULT_CATEGORIES, ...customCategories].map((category) => ({
    ...category,
    isDefault: category.isDefault === true,
  }))
}

export function getCategoryIcon(id) {
  return CATEGORY_ICONS.find((icon) => icon.id === id) || CATEGORY_ICONS.at(-1)
}

export function validateCustomCategories(categories) {
  if (!Array.isArray(categories)) throw new Error('Categories must be a list.')

  const seen = new Set()
  const defaults = new Set(DEFAULT_CATEGORIES.map((category) => `${category.type}:${category.name.toLocaleLowerCase('en-NG')}`))
  return categories.map((category) => {
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      throw new Error('A custom category is malformed.')
    }

    const name = typeof category.name === 'string' ? category.name.trim() : ''
    const type = category.type
    const icon = category.icon
    const color = category.color
    const archived = category.archived === true
    const key = `${type}:${name.toLocaleLowerCase('en-NG')}`

    if (!name || name.length > 32 || (type !== 'income' && type !== 'expense')) {
      throw new Error('A custom category needs a name of 1–32 characters and a valid type.')
    }
    if (!CATEGORY_ICONS.some((option) => option.id === icon)) {
      throw new Error(`The icon for "${name}" is not supported.`)
    }
    if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) {
      throw new Error(`The color for "${name}" is invalid.`)
    }
    if (defaults.has(key) || seen.has(key)) {
      throw new Error(`A ${type} category named "${name}" already exists.`)
    }
    seen.add(key)

    return { name, type, icon, color, ...(archived ? { archived: true } : {}) }
  })
}

export function loadCustomCategories(storage = globalThis.localStorage) {
  const stored = storage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY)
  if (stored === null) return []
  return validateCustomCategories(JSON.parse(stored))
}

export function isKnownTransactionCategory(type, name, customCategories = []) {
  const normalizedName = typeof name === 'string' ? name.trim().toLocaleLowerCase('en-NG') : ''
  return getAllCategories(customCategories).some((category) => (
    category.type === type
    && category.name.toLocaleLowerCase('en-NG') === normalizedName
  ))
}

export function createCustomCategory(categories, draft) {
  const nextCategories = validateCustomCategories([...categories, {
    name: draft.name,
    type: draft.type,
    icon: draft.icon,
    color: draft.color || getCategoryIcon(draft.icon).color,
  }])
  return nextCategories
}

export function renameCustomCategory(categories, oldCategory, draft, transactions) {
  const nextCategories = validateCustomCategories(categories.map((category) => (
    category.type === oldCategory.type && category.name === oldCategory.name
      ? {
          name: draft.name,
          type: category.type,
          icon: draft.icon,
          color: draft.color || getCategoryIcon(draft.icon).color,
        }
      : category
  )))
  const nextTransactions = transactions.map((transaction) => (
    transaction.type === oldCategory.type && transaction.category === oldCategory.name
      ? { ...transaction, category: draft.name.trim() }
      : transaction
  ))
  return { customCategories: nextCategories, transactions: nextTransactions }
}

export function deleteCustomCategory(categories, target, transactions) {
  const isUsed = transactions.some((transaction) => (
    transaction.type === target.type && transaction.category === target.name
  ))
  const nextCategories = isUsed
    ? categories.map((category) => (
        category.type === target.type && category.name === target.name
          ? { ...category, archived: true }
          : category
      ))
    : categories.filter((category) => !(category.type === target.type && category.name === target.name))
  return {
    customCategories: validateCustomCategories(nextCategories),
    transactions,
    archived: isUsed,
  }
}
