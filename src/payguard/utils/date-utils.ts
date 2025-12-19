/**
 * Gets the current date in ISO format (YYYY-MM-DD)
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Gets the current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Validates if a date string is not in the past
 */
export function isDateInFuture(dateString: string): boolean {
  const inputDate = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to start of day
  
  return inputDate >= today
}

/**
 * Calculates the number of days between two dates
 */
export function calculateDaysDifference(fromDate: string, toDate: string): number {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  const diffTime = to.getTime() - from.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculates days overdue from a due date to current date
 */
export function calculateDaysOverdue(dueDate: string): number {
  const today = getCurrentDate()
  const daysDiff = calculateDaysDifference(dueDate, today)
  return Math.max(0, daysDiff)
}