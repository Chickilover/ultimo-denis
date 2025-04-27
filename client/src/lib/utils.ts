import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale: string = 'es-UY'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getRelativeTimeString(date: Date | string, locale: string = 'es-UY'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMilliseconds = now.getTime() - dateObj.getTime();
  
  // Convert to seconds
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  
  // Define time intervals in seconds
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  
  // Get an instance of the Intl.RelativeTimeFormat constructor
  const relativeTimeFormat = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
  });
  
  if (diffInSeconds < minute) {
    return relativeTimeFormat.format(-Math.floor(diffInSeconds), 'second');
  } else if (diffInSeconds < hour) {
    return relativeTimeFormat.format(-Math.floor(diffInSeconds / minute), 'minute');
  } else if (diffInSeconds < day) {
    return relativeTimeFormat.format(-Math.floor(diffInSeconds / hour), 'hour');
  } else if (diffInSeconds < week) {
    return relativeTimeFormat.format(-Math.floor(diffInSeconds / day), 'day');
  } else {
    return formatDate(dateObj, locale);
  }
}

export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  const progress = (current / target) * 100;
  return Math.min(100, Math.max(0, progress));
}

export function generateRandomId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

export function parseAmount(amount: string): number {
  // Remove all non-numeric characters except decimal separator (can be . or ,)
  const cleanedAmount = amount.replace(/[^\d.,]/g, '');
  
  // Replace comma with dot for standard decimal handling
  const standardized = cleanedAmount.replace(',', '.');
  
  // Parse as float
  const parsedAmount = parseFloat(standardized);
  
  // Return 0 if parsing failed
  return isNaN(parsedAmount) ? 0 : parsedAmount;
}
