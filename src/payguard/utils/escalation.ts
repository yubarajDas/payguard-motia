import { EscalationLevel } from '../types/index'

/**
 * Calculates escalation level based on days overdue
 * - 0 days: INFO
 * - 1-3 days: WARNING  
 * - >3 days: CRITICAL
 */
export function calculateEscalationLevel(daysOverdue: number): EscalationLevel {
  if (daysOverdue === 0) {
    return 'INFO'
  } else if (daysOverdue >= 1 && daysOverdue <= 3) {
    return 'WARNING'
  } else {
    return 'CRITICAL'
  }
}