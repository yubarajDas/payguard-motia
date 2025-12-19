# PayGuard Design Document

## Overview

PayGuard is an event-driven bill and subscription management system built on Motia's Step architecture. The system provides automated tracking, reminder notifications, escalation management, and daily reporting for financial obligations. The design leverages Motia's native capabilities for API endpoints, event processing, scheduled tasks, and state management to create a robust, scalable solution.

## Architecture

The PayGuard system follows an event-driven microservices architecture using Motia Steps:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Steps     │    │   Event Steps    │    │   Cron Steps    │
│                 │    │                  │    │                 │
│ • Add Bill      │───▶│ • Bill Created   │    │ • Bill Checker  │
│ • Add Sub       │    │ • Bill Overdue   │◀───│ • Summary Gen   │
│                 │    │ • Escalation     │    │                 │
│                 │    │ • Notification   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   State Store   │
                       │                 │
                       │ • Bills         │
                       │ • Subscriptions │
                       │ • Policies      │
                       └─────────────────┘
```

## Components and Interfaces

### API Layer

- **Add Bill API**: Accepts bill registration requests and validates input data
- **Add Subscription API**: Handles subscription creation with renewal cycle validation

### Event Processing Layer

- **Bill Created Handler**: Processes new bill events and initializes tracking
- **Bill Overdue Handler**: Manages overdue bill processing and escalation triggers
- **Escalation Engine**: Evaluates severity levels and triggers appropriate notifications
- **Notification Handler**: Sends notifications based on reminder policies and escalation levels

### Scheduled Tasks Layer

- **Bill Due Date Checker**: Daily cron job that identifies overdue bills
- **Daily Summary Generator**: Creates and distributes daily status reports

### State Management Layer

- **Bill Repository**: Persistent storage for bill records and status tracking
- **Subscription Repository**: Storage for recurring payment configurations
- **Policy Store**: Configuration storage for reminder and escalation policies

## Data Models

### Bill Entity

```typescript
interface Bill {
  id: string; // Unique identifier (bill_xxx format)
  name: string; // Human-readable bill name
  amount: number; // Payment amount in cents
  dueDate: string; // ISO date string (YYYY-MM-DD)
  status: "pending" | "overdue" | "paid";
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

### Subscription Entity

```typescript
interface Subscription {
  id: string; // Unique identifier (sub_xxx format)
  name: string; // Human-readable subscription name
  amount: number; // Payment amount in cents
  renewalDay: number; // Day of month (1-31)
  isActive: boolean; // Subscription status
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

### Reminder Policy

```typescript
interface ReminderPolicy {
  notifyBeforeDays: number; // Days before due date to notify
  notifyOnDueDate: boolean; // Send notification on due date
  repeatOverdueDaily: boolean; // Daily notifications for overdue bills
}
```

### Escalation Level

```typescript
type EscalationLevel = "INFO" | "WARNING" | "CRITICAL";

interface EscalationContext {
  billId: string;
  daysOverdue: number;
  level: EscalationLevel;
  timestamp: string;
}
```

### Daily Summary

```typescript
interface DailySummary {
  date: string; // ISO date string
  totalBills: number; // Total active bills
  overdue: number; // Count of overdue bills
  critical: number; // Count of critical (>3 days overdue) bills
  totalAmount: number; // Total amount of all bills
  overdueAmount: number; // Total amount of overdue bills
}
```

## Error Handling

The system implements comprehensive error handling across all layers:

### API Error Responses

- **400 Bad Request**: Invalid input data or validation failures
- **404 Not Found**: Requested bill or subscription not found
- **409 Conflict**: Duplicate bill or subscription creation attempts
- **500 Internal Server Error**: System failures or unexpected errors

### Event Processing Errors

- **Retry Logic**: Failed event processing automatically retries with exponential backoff
- **Dead Letter Queue**: Events that fail after maximum retries are stored for manual review
- **Error Logging**: All errors are logged with context for debugging and monitoring

### Validation Rules

- Bill due dates must not be in the past
- Subscription renewal days must be between 1 and 31
- Bill and subscription amounts must be positive numbers
- All required fields must be present and non-empty

## Testing Strategy

The PayGuard system employs a dual testing approach combining unit tests and property-based tests to ensure comprehensive coverage and correctness.

### Unit Testing Approach

Unit tests will verify specific examples, edge cases, and integration points:

- API endpoint validation and response formatting
- Event handler processing with known inputs
- Cron job execution with fixed test data
- Error handling scenarios with invalid inputs
- State management operations with sample records

### Property-Based Testing Approach

Property-based tests will verify universal properties across all inputs using **fast-check** library:

- Each property-based test will run a minimum of 100 iterations
- Tests will use smart generators that constrain inputs to valid domains
- All property tests will be tagged with comments referencing design document properties

**Property-Based Testing Library**: fast-check (JavaScript/TypeScript)
**Configuration**: Minimum 100 iterations per property test
**Tagging Format**: `// **Feature: payguard, Property {number}: {property_text}**`

### Test Organization

- Unit tests: Co-located with source files using `.test.ts` suffix
- Property tests: Separate files using `.property.test.ts` suffix
- Integration tests: End-to-end workflow validation
- Test utilities: Shared generators and fixtures for consistent test data

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Property 1: Bill creation generates unique records
_For any_ valid bill input, creating a bill should result in exactly one new record with a unique identifier that differs from all existing bill IDs
**Validates: Requirements 1.1**

Property 2: Past due date validation
_For any_ bill creation request with a due date in the past, the system should reject the request and return a validation error
**Validates: Requirements 1.2**

Property 3: Bill creation event emission
_For any_ successful bill creation, the system should emit exactly one bill.created event containing the bill data
**Validates: Requirements 1.3**

Property 4: Bill validation error handling
_For any_ invalid bill input, the system should return appropriate error messages without creating a bill record
**Validates: Requirements 1.4**

Property 5: Bill data structure consistency
_For any_ bill stored in the system, the record should contain exactly the fields: id, name, amount, dueDate, and status
**Validates: Requirements 1.5**

Property 6: Subscription creation generates unique records
_For any_ valid subscription input, creating a subscription should result in exactly one new record with a unique identifier
**Validates: Requirements 2.1**

Property 7: Renewal day validation
_For any_ subscription creation request with renewalDay outside the range 1-31, the system should reject the request
**Validates: Requirements 2.2**

Property 8: Subscription creation event emission
_For any_ successful subscription creation, the system should emit exactly one subscription.created event
**Validates: Requirements 2.3**

Property 9: Subscription data structure consistency
_For any_ subscription stored in the system, the record should contain exactly the fields: id, name, amount, and renewalDay
**Validates: Requirements 2.4**

Property 10: Overdue bill detection
_For any_ collection of bills, when the cron job runs, all bills with due dates in the past and pending status should emit bill.overdue events
**Validates: Requirements 3.2**

Property 11: Overdue status updates
_For any_ bill that becomes overdue, the system should update its status from pending to overdue
**Validates: Requirements 3.4**

Property 12: Overdue duration calculation
_For any_ overdue bill, the emitted bill.overdue event should include the correct number of days between due date and current date
**Validates: Requirements 3.5**

Property 13: Reminder notification timing
_For any_ bill with notifyBeforeDays policy, notifications should be sent exactly the specified number of days before the due date
**Validates: Requirements 4.2**

Property 14: Due date notifications
_For any_ bill with notifyOnDueDate policy set to true, a notification should be sent on the exact due date
**Validates: Requirements 4.3**

Property 15: Daily overdue notifications
_For any_ overdue bill with repeatOverdueDaily policy set to true, notifications should be sent daily while the bill remains overdue
**Validates: Requirements 4.4**

Property 16: Escalation level calculation
_For any_ overdue bill, the escalation level should be INFO for 0 days, WARNING for 1-3 days, and CRITICAL for >3 days overdue
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

Property 17: Escalation event emission
_For any_ bill escalation evaluation, the system should emit an escalation.evaluate event with the calculated severity level
**Validates: Requirements 5.5**

Property 18: Daily summary calculation accuracy
_For any_ collection of bills, the daily summary should correctly count total bills, overdue bills, and critical bills
**Validates: Requirements 6.1, 6.3**

Property 19: Summary event emission
_For any_ daily summary generation, the system should emit exactly one daily.summary.generated event
**Validates: Requirements 6.2**

Property 20: Summary data completeness
_For any_ generated daily summary, it should include timestamp and all required summary statistics
**Validates: Requirements 6.5**

Property 21: Notification event emission consistency
_For any_ reminder or escalation trigger, the system should emit a notification.send event
**Validates: Requirements 7.1**

Property 22: Notification event data completeness
_For any_ notification event, it should include recipient, message template, and context data
**Validates: Requirements 7.2**

Property 23: Event traceability
_For any_ bill lifecycle, all emitted events should contain consistent trace information linking them together
**Validates: Requirements 7.3**

Property 24: Event format consistency
_For any_ event emitted by the system, it should follow the same structural format for external system integration
**Validates: Requirements 7.4**

Property 25: Event logging completeness
_For any_ event emitted by the system, it should be logged for audit and debugging purposes
**Validates: Requirements 7.5**
