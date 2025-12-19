// Event Topics
export const EVENT_TOPICS = {
  BILL_CREATED: 'bill.created',
  SUBSCRIPTION_CREATED: 'subscription.created',
  BILL_OVERDUE: 'bill.overdue',
  ESCALATION_EVALUATE: 'escalation.evaluate',
  NOTIFICATION_SEND: 'notification.send',
  DAILY_SUMMARY_GENERATED: 'daily.summary.generated',
} as const

// State Keys
export const STATE_KEYS = {
  BILLS: 'bills',
  SUBSCRIPTIONS: 'subscriptions',
  REMINDER_POLICIES: 'reminder_policies',
} as const

// Default Reminder Policy
export const DEFAULT_REMINDER_POLICY = {
  notifyBeforeDays: 3,
  notifyOnDueDate: true,
  repeatOverdueDaily: true,
} as const

// API Paths
export const API_PATHS = {
  ADD_BILL: '/payguard/bills',
  ADD_SUBSCRIPTION: '/payguard/subscriptions',
  GET_BILLS: '/payguard/bills',
  GET_SUBSCRIPTIONS: '/payguard/subscriptions',
  GET_SUMMARY: '/payguard/summary',
} as const

// Cron Schedules
export const CRON_SCHEDULES = {
  BILL_CHECKER: '0 0 * * *', // Daily at midnight
  DAILY_SUMMARY: '0 1 * * *', // Daily at 1 AM
} as const