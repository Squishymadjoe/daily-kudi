import { useState } from 'react'
import {
  CUSTOM_CATEGORIES_STORAGE_KEY,
  loadCustomCategories,
  validateCustomCategories,
} from '../utils/categories.js'

function readStoredCategories() {
  if (typeof window === 'undefined') return { categories: [], error: null }
  try {
    return { categories: loadCustomCategories(window.localStorage), error: null }
  } catch (error) {
    console.error('Unable to read Daily Kudi categories from LocalStorage.', error)
    return {
      categories: [],
      error: 'Saved custom categories could not be read. They have not been changed.',
    }
  }
}

export function useCategories() {
  const [storedState] = useState(readStoredCategories)
  const [customCategories, setCustomCategories] = useState(storedState.categories)
  const [categoryPersistenceError, setCategoryPersistenceError] = useState(storedState.error)

  function acceptCustomCategories(categories) {
    setCustomCategories(categories)
    setCategoryPersistenceError(null)
  }

  function setCategoryError(message) {
    setCategoryPersistenceError(message)
  }

  function saveCustomCategories(categories) {
    if (categoryPersistenceError) return false
    try {
      const validated = validateCustomCategories(categories)
      window.localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(validated))
      acceptCustomCategories(validated)
      return true
    } catch (error) {
      console.error('Unable to save Daily Kudi categories to LocalStorage.', error)
      setCategoryPersistenceError('Your category changes could not be saved to this browser.')
      return false
    }
  }

  return {
    customCategories,
    categoryPersistenceError,
    acceptCustomCategories,
    setCategoryError,
    saveCustomCategories,
  }
}
