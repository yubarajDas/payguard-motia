# PayGuard Requirements Document

## Introduction

PayGuard is an event-driven backend system that automatically tracks bills and subscriptions, applies reminder rules, escalates overdue items, and generates daily summaries. The system helps users manage their financial obligations by providing automated monitoring, notifications, and escalation workflows.

## Glossary

- **PayGuard_System**: The complete bill and subscription management system
- **Bill**: A one-time payment obligation with a specific due date
- **Subscription**: A recurring payment obligation that renews on a specific day each month
- **Reminder_Policy**: Configuration rules that determine when and how notifications are sent
- **Escalation_Engine**: Component that determines severity levels based on overdue duration
- **Daily_Summary**: Automated report of bill status generated each day

## Requirements

### Requirement 1

**User Story:** As a user, I want to register bills in the system, so that I can track my payment obligations and receive automated reminders.

#### Acceptance Criteria

1. WHEN a user submits bill information via API, THE PayGuard_System SHALL create a new bill record with unique identifier
2. WHEN a bill is created, THE PayGuard_System SHALL validate that the due date is not in the past
3. WHEN a bill is successfully created, THE PayGuard_System SHALL emit a bill.created event
4. WHEN bill creation fails validation, THE PayGuard_System SHALL return appropriate error messages
5. THE PayGuard_System SHALL store bill data with id, name, amount, dueDate, and status fields

### Requirement 2

**User Story:** As a user, I want to register subscriptions in the system, so that I can track recurring payments and receive renewal reminders.

#### Acceptance Criteria

1. WHEN a user submits subscription information via API, THE PayGuard_System SHALL create a new subscription record with unique identifier
2. WHEN a subscription is created, THE PayGuard_System SHALL validate that the renewal day is between 1 and 31
3. WHEN a subscription is successfully created, THE PayGuard_System SHALL emit a subscription.created event
4. THE PayGuard_System SHALL store subscription data with id, name, amount, and renewalDay fields
5. WHEN subscription creation fails validation, THE PayGuard_System SHALL return appropriate error messages

### Requirement 3

**User Story:** As a system administrator, I want automated daily checking of bill due dates, so that overdue bills are identified and processed without manual intervention.

#### Acceptance Criteria

1. WHEN the daily cron job executes, THE PayGuard_System SHALL check all bills against current date
2. WHEN a bill due date has passed and status is pending, THE PayGuard_System SHALL emit a bill.overdue event
3. THE PayGuard_System SHALL run the bill checker daily at midnight
4. WHEN processing bills, THE PayGuard_System SHALL update bill status to overdue for past due items
5. THE PayGuard_System SHALL include overdue duration in days when emitting bill.overdue events

### Requirement 4

**User Story:** As a user, I want configurable reminder policies, so that I receive notifications according to my preferences before bills become overdue.

#### Acceptance Criteria

1. THE PayGuard_System SHALL support reminder policy with notifyBeforeDays, notifyOnDueDate, and repeatOverdueDaily settings
2. WHEN notifyBeforeDays is configured, THE PayGuard_System SHALL send notifications the specified number of days before due date
3. WHEN notifyOnDueDate is true, THE PayGuard_System SHALL send notifications on the exact due date
4. WHEN repeatOverdueDaily is true, THE PayGuard_System SHALL send daily notifications for overdue bills
5. THE PayGuard_System SHALL apply reminder policies consistently across all bills

### Requirement 5

**User Story:** As a system administrator, I want an escalation engine that categorizes overdue bills by severity, so that critical items receive appropriate attention.

#### Acceptance Criteria

1. WHEN a bill becomes overdue, THE PayGuard_System SHALL calculate escalation level based on days overdue
2. WHEN days overdue equals 0, THE PayGuard_System SHALL assign INFO level
3. WHEN days overdue is between 1 and 3, THE PayGuard_System SHALL assign WARNING level
4. WHEN days overdue exceeds 3, THE PayGuard_System SHALL assign CRITICAL level
5. THE PayGuard_System SHALL emit escalation.evaluate events with calculated severity levels

### Requirement 6

**User Story:** As a user, I want daily summaries of my bill status, so that I can quickly understand my current financial obligations.

#### Acceptance Criteria

1. THE PayGuard_System SHALL generate daily summaries containing total bills, overdue count, and critical count
2. WHEN daily summary is generated, THE PayGuard_System SHALL emit daily.summary.generated event
3. THE PayGuard_System SHALL calculate summary statistics from current bill state
4. THE PayGuard_System SHALL generate summaries automatically each day
5. THE PayGuard_System SHALL include timestamp and summary data in generated reports

### Requirement 7

**User Story:** As a developer, I want notification events for all significant system actions, so that external systems can respond to bill status changes.

#### Acceptance Criteria

1. THE PayGuard_System SHALL emit notification.send events for all reminder and escalation notifications
2. WHEN notification events are emitted, THE PayGuard_System SHALL include recipient, message template, and context data
3. THE PayGuard_System SHALL maintain event traceability across the entire bill lifecycle
4. THE PayGuard_System SHALL emit events in a consistent format for external system integration
5. THE PayGuard_System SHALL log all emitted events for audit and debugging purposes
