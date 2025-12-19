# PayGuard – Step-by-Step Downloadable Guide (AI & Motia)

This document is designed to be downloaded and consumed by AI tools (Cursor, Kiro, Copilot) as well as beginners. It explains what to build, why to build it, and how to extend it step by step.

---

## 0. What This Project Is

PayGuard Flow is an event-driven backend system that automatically tracks bills and subscriptions, applies reminder rules, escalates overdue items, and generates daily summaries.

It is built entirely using Motia Steps:
- API Steps
- Event Steps
- Cron Steps
- State

---

## 1. Prerequisites

- Node.js 18+
- npm
- Basic understanding of JSON

Verify:
```bash
node -v
npm -v
```

---

## 2. Project Creation

```bash
npx motia@latest create payguard
cd payguard
npx motia dev
```

Open Workbench:
http://localhost:3000

---

## 3. Project Structure

```
src/
 ├── steps/
 │   ├── api/
 │   ├── event/
 │   └── cron/
 ├── types/
 └── policies/
```

Rules:
- Every executable file must end with `.step.ts`
- No routing or main file is required

---

## 4. Core Data Models

### Bill
```json
{
  "id": "bill_001",
  "name": "Electricity",
  "amount": 1200,
  "dueDate": "2025-01-25",
  "status": "pending"
}
```

### Subscription
```json
{
  "id": "sub_001",
  "name": "Netflix",
  "amount": 499,
  "renewalDay": 15
}
```

---

## 5. Step 1 – API: Add Bill

Goal: Allow users to register bills.

- File: src/steps/api/add-bill.step.ts
- Type: api
- Emits: bill.created

---

## 6. Step 2 – API: Add Subscription

- File: src/steps/api/add-subscription.step.ts
- Emits: subscription.created

---

## 7. Step 3 – Cron: Bill Due-Date Checker

- File: src/steps/cron/bill-checker.step.ts
- Schedule: Daily
- Emits: bill.overdue

---

## 8. Reminder Policy

```json
{
  "notifyBeforeDays": 3,
  "notifyOnDueDate": true,
  "repeatOverdueDaily": true
}
```

---

## 9. Escalation Engine

| Days Overdue | Level |
|-------------|-------|
| 0 | INFO |
| 1–3 | WARNING |
| >3 | CRITICAL |

Flow:
bill.overdue → escalation.evaluate → notification.send

---

## 10. Daily Summary

```json
{
  "totalBills": 5,
  "overdue": 2,
  "critical": 1
}
```

Emits:
daily.summary.generated

---

## 11. AI Usage

Feed this document to Cursor/Kiro and ask it to implement one step at a time.

---

## 12. Git Versioning

```
v0.1-project-setup
v0.2-basic-bills
v0.3-subscriptions
v0.4-cron-checker
v0.5-reminder-policy
v0.6-escalation
v0.7-daily-summary
```

---

End of document.
