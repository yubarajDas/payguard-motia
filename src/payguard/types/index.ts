import { z } from 'zod'

// Core Data Models

export const billStatusSchema = z.enum(['pending', 'overdue', 'paid'])
export type BillStatus = z.infer<typeof billStatusSchema>

export const billSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date format YYYY-MM-DD
  status: billStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Bill = z.infer<typeof billSchema>

export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number().positive(),
  renewalDay: z.number().min(1).max(31),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Subscription = z.infer<typeof subscriptionSchema>

export const reminderPolicySchema = z.object({
  notifyBeforeDays: z.number().min(0),
  notifyOnDueDate: z.boolean(),
  repeatOverdueDaily: z.boolean(),
})

export type ReminderPolicy = z.infer<typeof reminderPolicySchema>

export const escalationLevelSchema = z.enum(['INFO', 'WARNING', 'CRITICAL'])
export type EscalationLevel = z.infer<typeof escalationLevelSchema>

export const escalationContextSchema = z.object({
  billId: z.string(),
  daysOverdue: z.number().min(0),
  level: escalationLevelSchema,
  timestamp: z.string(),
})

export type EscalationContext = z.infer<typeof escalationContextSchema>

export const dailySummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date format
  totalBills: z.number().min(0),
  overdue: z.number().min(0),
  critical: z.number().min(0),
  totalAmount: z.number().min(0),
  overdueAmount: z.number().min(0),
})

export type DailySummary = z.infer<typeof dailySummarySchema>

// API Request/Response Schemas

export const createBillRequestSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type CreateBillRequest = z.infer<typeof createBillRequestSchema>

export const createSubscriptionRequestSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  renewalDay: z.number().min(1).max(31),
})

export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionRequestSchema>

// Event Schemas

export const billCreatedEventSchema = z.object({
  bill: billSchema,
  timestamp: z.string(),
})

export type BillCreatedEvent = z.infer<typeof billCreatedEventSchema>

export const subscriptionCreatedEventSchema = z.object({
  subscription: subscriptionSchema,
  timestamp: z.string(),
})

export type SubscriptionCreatedEvent = z.infer<typeof subscriptionCreatedEventSchema>

export const billOverdueEventSchema = z.object({
  bill: billSchema,
  daysOverdue: z.number().min(0),
  timestamp: z.string(),
})

export type BillOverdueEvent = z.infer<typeof billOverdueEventSchema>

export const escalationEvaluateEventSchema = z.object({
  escalationContext: escalationContextSchema,
  bill: billSchema,
  timestamp: z.string(),
})

export type EscalationEvaluateEvent = z.infer<typeof escalationEvaluateEventSchema>

export const notificationSendEventSchema = z.object({
  recipient: z.string(),
  messageTemplate: z.string(),
  contextData: z.record(z.string(), z.any()),
  timestamp: z.string(),
  traceId: z.string(),
})

export type NotificationSendEvent = z.infer<typeof notificationSendEventSchema>

export const dailySummaryGeneratedEventSchema = z.object({
  summary: dailySummarySchema,
  timestamp: z.string(),
})

export type DailySummaryGeneratedEvent = z.infer<typeof dailySummaryGeneratedEventSchema>