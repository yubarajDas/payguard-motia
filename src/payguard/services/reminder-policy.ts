import { Bill, ReminderPolicy } from '../types/index'
import { getCurrentDate, calculateDaysDifference } from '../utils/date-utils'

/**
 * Notification type for reminder scheduling
 */
export interface NotificationSchedule {
  billId: string
  notificationType: 'before_due' | 'on_due_date' | 'overdue_daily'
  scheduledDate: string
  daysBeforeDue?: number
  daysOverdue?: number
}

/**
 * Result of policy evaluation for a bill
 */
export interface PolicyEvaluationResult {
  billId: string
  shouldNotify: boolean
  notificationType: 'before_due' | 'on_due_date' | 'overdue_daily'
  scheduledDate: string
  daysBeforeDue?: number
  daysOverdue?: number
}

/**
 * Evaluates reminder policy for notifyBeforeDays setting
 * Determines if a notification should be sent X days before due date
 */
export function evaluateNotifyBeforeDays(
  bill: Bill,
  policy: ReminderPolicy,
  currentDate: string = getCurrentDate()
): PolicyEvaluationResult | null {
  if (policy.notifyBeforeDays <= 0) {
    return null
  }

  const daysToDue = calculateDaysDifference(currentDate, bill.dueDate)
  
  // Check if today is exactly the number of days before due date specified in policy
  if (daysToDue === policy.notifyBeforeDays) {
    return {
      billId: bill.id,
      shouldNotify: true,
      notificationType: 'before_due',
      scheduledDate: currentDate,
      daysBeforeDue: policy.notifyBeforeDays,
    }
  }

  return null
}

/**
 * Evaluates reminder policy for notifyOnDueDate setting
 * Determines if a notification should be sent on the exact due date
 */
export function evaluateNotifyOnDueDate(
  bill: Bill,
  policy: ReminderPolicy,
  currentDate: string = getCurrentDate()
): PolicyEvaluationResult | null {
  if (!policy.notifyOnDueDate) {
    return null
  }

  // Check if today is the due date
  if (currentDate === bill.dueDate) {
    return {
      billId: bill.id,
      shouldNotify: true,
      notificationType: 'on_due_date',
      scheduledDate: currentDate,
    }
  }

  return null
}

/**
 * Evaluates reminder policy for repeatOverdueDaily setting
 * Determines if a daily notification should be sent for overdue bills
 */
export function evaluateRepeatOverdueDaily(
  bill: Bill,
  policy: ReminderPolicy,
  currentDate: string = getCurrentDate()
): PolicyEvaluationResult | null {
  if (!policy.repeatOverdueDaily) {
    return null
  }

  // Only apply to overdue bills
  if (bill.status !== 'overdue') {
    return null
  }

  const daysOverdue = calculateDaysDifference(bill.dueDate, currentDate)
  
  // Only send notifications if bill is actually overdue (positive days)
  if (daysOverdue > 0) {
    return {
      billId: bill.id,
      shouldNotify: true,
      notificationType: 'overdue_daily',
      scheduledDate: currentDate,
      daysOverdue,
    }
  }

  return null
}

/**
 * Creates notification schedules for a bill based on reminder policy
 * This function determines all future notification dates for a bill
 */
export function createNotificationSchedule(
  bill: Bill,
  policy: ReminderPolicy,
  startDate: string = getCurrentDate()
): NotificationSchedule[] {
  const schedules: NotificationSchedule[] = []

  // Schedule before due date notification
  if (policy.notifyBeforeDays > 0) {
    const notificationDate = new Date(bill.dueDate)
    notificationDate.setDate(notificationDate.getDate() - policy.notifyBeforeDays)
    const scheduledDate = notificationDate.toISOString().split('T')[0]

    // Only schedule if the notification date is in the future or today
    if (scheduledDate >= startDate) {
      schedules.push({
        billId: bill.id,
        notificationType: 'before_due',
        scheduledDate,
        daysBeforeDue: policy.notifyBeforeDays,
      })
    }
  }

  // Schedule due date notification
  if (policy.notifyOnDueDate && bill.dueDate >= startDate) {
    schedules.push({
      billId: bill.id,
      notificationType: 'on_due_date',
      scheduledDate: bill.dueDate,
    })
  }

  // Note: Overdue daily notifications are handled dynamically by the cron job
  // since we don't know in advance how many days a bill will be overdue

  return schedules
}

/**
 * Applies reminder policies consistently across all bills
 * Returns all bills that should receive notifications on the given date
 */
export function applyPoliciesAcrossBills(
  bills: Bill[],
  policy: ReminderPolicy,
  currentDate: string = getCurrentDate()
): PolicyEvaluationResult[] {
  const results: PolicyEvaluationResult[] = []

  for (const bill of bills) {
    // Skip paid bills
    if (bill.status === 'paid') {
      continue
    }

    // Evaluate each policy type
    const beforeDueResult = evaluateNotifyBeforeDays(bill, policy, currentDate)
    const onDueDateResult = evaluateNotifyOnDueDate(bill, policy, currentDate)
    const overdueResult = evaluateRepeatOverdueDaily(bill, policy, currentDate)

    // Add non-null results
    if (beforeDueResult) {
      results.push(beforeDueResult)
    }
    if (onDueDateResult) {
      results.push(onDueDateResult)
    }
    if (overdueResult) {
      results.push(overdueResult)
    }
  }

  return results
}

/**
 * Gets the default reminder policy
 */
export function getDefaultReminderPolicy(): ReminderPolicy {
  return {
    notifyBeforeDays: 3,
    notifyOnDueDate: true,
    repeatOverdueDaily: true,
  }
}