import fc from 'fast-check'
import {
  evaluateNotifyBeforeDays,
  evaluateNotifyOnDueDate,
  evaluateRepeatOverdueDaily,
  applyPoliciesAcrossBills,
  createNotificationSchedule,
} from './reminder-policy'
import { Bill, ReminderPolicy } from '../types/index'

// **Feature: payguard, Property 13: Reminder notification timing**
// **Feature: payguard, Property 14: Due date notifications**
// **Feature: payguard, Property 15: Daily overdue notifications**

describe('Reminder Policy Engine Property Tests', () => {
  
  // Generators for property-based testing
  const dateArb = fc.integer({ min: 0, max: 1095 }) // 3 years worth of days
    .map(daysFromNow => {
      const date = new Date('2024-01-01')
      date.setDate(date.getDate() + daysFromNow)
      return date.toISOString().split('T')[0]
    })

  const billArb = fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    amount: fc.integer({ min: 1, max: 10000 }),
    dueDate: dateArb,
    status: fc.constantFrom('pending', 'overdue', 'paid'),
    createdAt: fc.string(),
    updatedAt: fc.string(),
  }) as fc.Arbitrary<Bill>

  const reminderPolicyArb = fc.record({
    notifyBeforeDays: fc.integer({ min: 0, max: 30 }),
    notifyOnDueDate: fc.boolean(),
    repeatOverdueDaily: fc.boolean(),
  }) as fc.Arbitrary<ReminderPolicy>

  // Property 13: Reminder notification timing
  test('Property 13: Reminder notification timing - notifications sent exactly specified days before due date', async () => {
    await fc.assert(
      fc.property(billArb, reminderPolicyArb, dateArb, (bill, policy, currentDate) => {
        // Skip if policy doesn't specify before-due notifications
        if (policy.notifyBeforeDays <= 0) {
          const result = evaluateNotifyBeforeDays(bill, policy, currentDate)
          expect(result).toBeNull()
          return
        }

        const result = evaluateNotifyBeforeDays(bill, policy, currentDate)
        
        // Calculate expected notification date
        const dueDate = new Date(bill.dueDate)
        const expectedNotificationDate = new Date(dueDate)
        expectedNotificationDate.setDate(expectedNotificationDate.getDate() - policy.notifyBeforeDays)
        const expectedDateString = expectedNotificationDate.toISOString().split('T')[0]

        if (currentDate === expectedDateString) {
          // Should notify on the exact day
          expect(result).not.toBeNull()
          expect(result?.shouldNotify).toBe(true)
          expect(result?.notificationType).toBe('before_due')
          expect(result?.scheduledDate).toBe(currentDate)
          expect(result?.daysBeforeDue).toBe(policy.notifyBeforeDays)
        } else {
          // Should not notify on any other day
          expect(result).toBeNull()
        }
      }),
      { numRuns: 100 }
    )
  })

  // Property 14: Due date notifications
  test('Property 14: Due date notifications - notifications sent on exact due date when enabled', async () => {
    await fc.assert(
      fc.property(billArb, reminderPolicyArb, dateArb, (bill, policy, currentDate) => {
        const result = evaluateNotifyOnDueDate(bill, policy, currentDate)

        if (policy.notifyOnDueDate && currentDate === bill.dueDate) {
          // Should notify on due date when policy is enabled
          expect(result).not.toBeNull()
          expect(result?.shouldNotify).toBe(true)
          expect(result?.notificationType).toBe('on_due_date')
          expect(result?.scheduledDate).toBe(currentDate)
        } else {
          // Should not notify when policy is disabled or not due date
          expect(result).toBeNull()
        }
      }),
      { numRuns: 100 }
    )
  })

  // Property 15: Daily overdue notifications
  test('Property 15: Daily overdue notifications - daily notifications for overdue bills when enabled', async () => {
    await fc.assert(
      fc.property(billArb, reminderPolicyArb, dateArb, (bill, policy, currentDate) => {
        const result = evaluateRepeatOverdueDaily(bill, policy, currentDate)

        // Calculate if bill is actually overdue
        const dueDate = new Date(bill.dueDate)
        const current = new Date(currentDate)
        const isOverdue = current > dueDate && bill.status === 'overdue'

        if (policy.repeatOverdueDaily && isOverdue) {
          // Should notify for overdue bills when policy is enabled
          expect(result).not.toBeNull()
          expect(result?.shouldNotify).toBe(true)
          expect(result?.notificationType).toBe('overdue_daily')
          expect(result?.scheduledDate).toBe(currentDate)
          expect(result?.daysOverdue).toBeGreaterThan(0)
        } else {
          // Should not notify when policy is disabled, bill is not overdue, or bill is not in overdue status
          expect(result).toBeNull()
        }
      }),
      { numRuns: 100 }
    )
  })

  // Additional property: Policy consistency across bills
  test('Policies applied consistently across all bills', async () => {
    await fc.assert(
      fc.property(
        fc.array(billArb, { minLength: 1, maxLength: 10 }),
        reminderPolicyArb,
        dateArb,
        (bills, policy, currentDate) => {
          const results = applyPoliciesAcrossBills(bills, policy, currentDate)

          // Verify each result corresponds to a valid bill
          for (const result of results) {
            const correspondingBill = bills.find(bill => bill.id === result.billId)
            expect(correspondingBill).toBeDefined()
            
            // Verify paid bills are excluded
            expect(correspondingBill?.status).not.toBe('paid')
            
            // Verify notification type is valid
            expect(['before_due', 'on_due_date', 'overdue_daily']).toContain(result.notificationType)
            
            // Verify shouldNotify is always true for returned results
            expect(result.shouldNotify).toBe(true)
          }

          // Verify no duplicate notifications for the same bill and type
          const notificationKeys = results.map(r => `${r.billId}-${r.notificationType}`)
          const uniqueKeys = new Set(notificationKeys)
          expect(notificationKeys.length).toBe(uniqueKeys.size)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property: Notification schedule creation
  test('Notification schedules created correctly for bills', async () => {
    await fc.assert(
      fc.property(billArb, reminderPolicyArb, dateArb, (bill, policy, startDate) => {
        const schedules = createNotificationSchedule(bill, policy, startDate)

        // Verify all schedules are for the correct bill
        for (const schedule of schedules) {
          expect(schedule.billId).toBe(bill.id)
          expect(['before_due', 'on_due_date', 'overdue_daily']).toContain(schedule.notificationType)
          
          // Verify scheduled dates are not in the past
          expect(schedule.scheduledDate >= startDate).toBe(true)
        }

        // Verify before_due schedule logic
        const beforeDueSchedules = schedules.filter(s => s.notificationType === 'before_due')
        if (policy.notifyBeforeDays > 0) {
          const expectedDate = new Date(bill.dueDate)
          expectedDate.setDate(expectedDate.getDate() - policy.notifyBeforeDays)
          const expectedDateString = expectedDate.toISOString().split('T')[0]
          
          if (expectedDateString >= startDate) {
            expect(beforeDueSchedules.length).toBe(1)
            expect(beforeDueSchedules[0].scheduledDate).toBe(expectedDateString)
            expect(beforeDueSchedules[0].daysBeforeDue).toBe(policy.notifyBeforeDays)
          } else {
            expect(beforeDueSchedules.length).toBe(0)
          }
        } else {
          expect(beforeDueSchedules.length).toBe(0)
        }

        // Verify due date schedule logic
        const dueDateSchedules = schedules.filter(s => s.notificationType === 'on_due_date')
        if (policy.notifyOnDueDate && bill.dueDate >= startDate) {
          expect(dueDateSchedules.length).toBe(1)
          expect(dueDateSchedules[0].scheduledDate).toBe(bill.dueDate)
        } else {
          expect(dueDateSchedules.length).toBe(0)
        }
      }),
      { numRuns: 100 }
    )
  })
})