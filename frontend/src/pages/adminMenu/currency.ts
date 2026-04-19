export function getCurrencySymbol(currency?: string) {
  switch ((currency ?? "USD").toUpperCase()) {
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "ILS":
      return "₪";
    case "USD":
    default:
      return "$";
  }
}
