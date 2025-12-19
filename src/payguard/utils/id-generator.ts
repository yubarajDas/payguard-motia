/**
 * Generates a unique bill ID with the format: bill_<timestamp>_<random>
 */
export function generateBillId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `bill_${timestamp}_${random}`
}

/**
 * Generates a unique subscription ID with the format: sub_<timestamp>_<random>
 */
export function generateSubscriptionId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `sub_${timestamp}_${random}`
}