export function isValidNairaAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0.01) return false

  const [coefficient, exponentText] = amount.toString().toLowerCase().split('e')
  const decimalPlaces = (coefficient.split('.')[1]?.length || 0) - Number(exponentText || 0)
  return decimalPlaces <= 2
}
