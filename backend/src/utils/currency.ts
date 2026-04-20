/**
 * Shared currency utility — single source of truth for symbol lookup.
 * Used by both the menu assistant and any route that formats prices.
 */
export function getCurrencySymbol(currency?: string): string {
  switch ((currency ?? 'USD').toUpperCase()) {
    case 'EUR': return '€'
    case 'GBP': return '£'
    case 'ILS': return '₪'
    case 'USD':
    default:    return '$'
  }
}

export function formatPrice(amount: number, currency?: string): string {
  return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`
}
