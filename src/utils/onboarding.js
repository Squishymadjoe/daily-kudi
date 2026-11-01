export const ONBOARDING_STORAGE_KEY = 'daily-kudi-onboarding-complete'

export function isOnboardingComplete(storage = globalThis.localStorage) {
  return storage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
}

export function shouldShowOnboarding(storage = globalThis.localStorage, existingDataKeys = []) {
  if (isOnboardingComplete(storage)) return false
  const hasExistingData = existingDataKeys.some((key) => storage.getItem(key) !== null)
  if (hasExistingData) {
    markOnboardingComplete(storage)
    return false
  }
  return true
}

export function markOnboardingComplete(storage = globalThis.localStorage) {
  storage.setItem(ONBOARDING_STORAGE_KEY, 'true')
}
