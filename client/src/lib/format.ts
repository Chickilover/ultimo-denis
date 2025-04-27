/**
 * Formats a number according to Uruguayan locale
 * @param value Number to format
 * @param currency Currency symbol to use (optional)
 * @param decimalPlaces Number of decimal places
 * @returns Formatted string
 */
export function formatNumber(
  value: number | string,
  currency?: string,
  decimalPlaces = 2
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return currency ? `${currency} 0,00` : "0,00";
  
  const options: Intl.NumberFormatOptions = {
    style: "decimal",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  };
  
  const formatted = new Intl.NumberFormat("es-UY", options).format(numValue);
  
  return currency ? `${currency} ${formatted}` : formatted;
}

/**
 * Formats a date according to Uruguayan locale
 * @param date Date to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  includeTime = false
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return "";
  
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  
  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }
  
  return new Intl.DateTimeFormat("es-UY", options).format(dateObj);
}

/**
 * Formats a percentage
 * @param value Number to format as percentage
 * @param decimalPlaces Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number | string,
  decimalPlaces = 1
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return "0%";
  
  return new Intl.NumberFormat("es-UY", {
    style: "percent",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(numValue / 100);
}

/**
 * Formats a UYU (Uruguayan Peso) currency value
 * @param value Amount to format
 * @returns Formatted currency string
 */
export function formatUYU(value: number | string): string {
  return formatNumber(value, "$U");
}

/**
 * Formats a USD (US Dollar) currency value
 * @param value Amount to format
 * @returns Formatted currency string
 */
export function formatUSD(value: number | string): string {
  return formatNumber(value, "US$");
}

/**
 * Parses a currency string (UYU or USD format) to a number
 * @param value String to parse
 * @returns Parsed numeric value
 */
export function parseCurrencyString(value: string): number {
  // Remove currency symbols and any non-numeric characters except decimal separator
  const numericString = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(numericString);
}
