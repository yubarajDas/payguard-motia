# PayGuard Implementation Plan

- [x] 1. Set up project structure and core types

  - Create directory structure for PayGuard steps (api, event, cron)
  - Define TypeScript interfaces for Bill, Subscription, ReminderPolicy, EscalationContext, and DailySummary
  - Create Zod schemas for validation
  - Set up shared utilities and constants
  - _Requirements: 1.5, 2.4_

- [x] 1.1 Write property test for data structure consistency

  - **Property 5: Bill data structure consistency**
  - **Property 9: Subscription data structure consistency**
  - **Validates: Requirements 1.5, 2.4**

- [x] 2. Implement Add Bill API Step

  - Create src/payguard/api/add-bill.step.ts
  - Implement POST endpoint with Zod validation
  - Generate unique bill IDs with bill\_ prefix
  - Validate due date is not in the past
  - Store bill in state with pending status
  - Emit bill.created event on success
  - Return appropriate error responses for validation failures
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.1 Write property test for bill creation

  - **Property 1: Bill creation generates unique records**
  - **Validates: Requirements 1.1**

- [x] 2.2 Write property test for due date validation

  - **Property 2: Past due date validation**
  - **Validates: Requirements 1.2**

- [x] 2.3 Write property test for bill event emission

  - **Property 3: Bill creation event emission**
  - **Validates: Requirements 1.3**

- [x] 2.4 Write property test for bill validation errors

  - **Property 4: Bill validation error handling**
  - **Validates: Requirements 1.4**

- [x] 3. Implement Add Subscription API Step

  - Create src/payguard/api/add-subscription.step.ts
  - Implement POST endpoint with Zod validation
  - Generate unique subscription IDs with sub\_ prefix
  - Validate renewal day is between 1 and 31
  - Store subscription in state with active status
  - Emit subscription.created event on success
  - Return appropriate error responses for validation failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Write property test for subscription creation

  - **Property 6: Subscription creation generates unique records**
  - **Validates: Requirements 2.1**

- [x] 3.2 Write property test for renewal day validation

  - **Property 7: Renewal day validation**
  - **Validates: Requirements 2.2**

- [x] 3.3 Write property test for subscription event emission

  - **Property 8: Subscription creation event emission**
  - **Validates: Requirements 2.3**

- [x] 4. Implement Bill Due Date Checker Cron Step

  - Create src/payguard/cron/bill-checker.step.ts
  - Configure daily cron schedule (0 0 \* \* \*)
  - Retrieve all bills from state
  - Compare due dates against current date
  - Calculate days overdue for past due bills
  - Update bill status to overdue
  - Emit bill.overdue events with overdue duration
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 4.1 Write property test for overdue detection

  - **Property 10: Overdue bill detection**
  - **Validates: Requirements 3.2**

- [x] 4.2 Write property test for status updates

  - **Property 11: Overdue status updates**
  - **Validates: Requirements 3.4**

- [x] 4.3 Write property test for overdue duration

  - **Property 12: Overdue duration calculation**
  - **Validates: Requirements 3.5**

- [x] 5. Implement Reminder Policy Engine

  - Create src/payguard/services/reminder-policy.ts
  - Implement policy evaluation logic for notifyBeforeDays
  - Implement policy evaluation for notifyOnDueDate
  - Implement policy evaluation for repeatOverdueDaily
  - Create notification scheduling logic
  - Apply policies consistently across all bills
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.1 Write property test for reminder timing

  - **Property 13: Reminder notification timing**
  - **Validates: Requirements 4.2**

- [x] 5.2 Write property test for due date notifications

  - **Property 14: Due date notifications**
  - **Validates: Requirements 4.3**

- [x] 5.3 Write property test for daily overdue notifications

  - **Property 15: Daily overdue notifications**
  - **Validates: Requirements 4.4**

- [x] 6. Implement Escalation Engine Event Step

  - Create src/payguard/event/escalation-engine.step.ts
  - Subscribe to bill.overdue events
  - Calculate escalation level based on days overdue (INFO: 0, WARNING: 1-3, CRITICAL: >3)
  - Emit escalation.evaluate events with severity level
  - Include bill context and timestamp in events
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6.1 Write property test for escalation calculation

  - **Property 16: Escalation level calculation**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 6.2 Write property test for escalation events

  - **Property 17: Escalation event emission**
  - **Validates: Requirements 5.5**

- [x] 7. Implement Notification Handler Event Step

  - Create src/payguard/event/notification-handler.step.ts
  - Subscribe to escalation.evaluate and reminder events
  - Process notification.send events
  - Include recipient, message template, and context data
  - Log all notifications for audit
  - Maintain event traceability with trace IDs
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7.1 Write property test for notification emission

  - **Property 21: Notification event emission consistency**
  - **Validates: Requirements 7.1**

- [x] 7.2 Write property test for notification data

  - **Property 22: Notification event data completeness**
  - **Validates: Requirements 7.2**

- [x] 7.3 Write property test for event traceability

  - **Property 23: Event traceability**
  - **Validates: Requirements 7.3**

- [x] 8. Implement Daily Summary Generator Cron Step

  - Create src/payguard/cron/daily-summary.step.ts
  - Configure daily cron schedule (0 1 \* \* \*)
  - Retrieve all bills from state
  - Calculate total bills count
  - Calculate overdue bills count
  - Calculate critical bills count (>3 days overdue)
  - Calculate total and overdue amounts
  - Emit daily.summary.generated event with statistics
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 8.1 Write property test for summary calculation

  - **Property 18: Daily summary calculation accuracy**
  - **Validates: Requirements 6.1, 6.3**

- [x] 8.2 Write property test for summary events

  - **Property 19: Summary event emission**
  - **Validates: Requirements 6.2**

- [x] 8.3 Write property test for summary completeness

  - **Property 20: Summary data completeness**
  - **Validates: Requirements 6.5**

- [x] 9. Implement Bill Created Event Handler

  - Create src/payguard/event/bill-created-handler.step.ts
  - Subscribe to bill.created events
  - Initialize reminder tracking for new bills
  - Apply default reminder policies
  - Log bill creation for audit trail
  - _Requirements: 1.3, 7.3_

- [x] 10. Implement Subscription Created Event Handler

  - Create src/payguard/event/subscription-created-handler.step.ts
  - Subscribe to subscription.created events
  - Initialize renewal tracking for new subscriptions
  - Calculate next renewal date based on renewalDay
  - Log subscription creation for audit trail
  - _Requirements: 2.3, 7.3_

- [x] 11. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Write integration tests for complete workflows

  - Test end-to-end bill creation to notification flow
  - Test subscription creation and renewal tracking
  - Test overdue detection and escalation workflow
  - Test daily summary generation with various bill states
  - Verify event chains and state consistency

- [x] 13. Write property tests for event format consistency

  - **Property 24: Event format consistency**
  - **Property 25: Event logging completeness**
  - **Validates: Requirements 7.4, 7.5**
