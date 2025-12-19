# PayGuard UI – Demo Dashboard Guide (Motia Backend)

This document describes a simple, visually appealing UI to demonstrate the PayGuard backend built using Motia.
It is designed for hackathon demos and non-technical audiences.

---

## 1. Purpose of the UI

The UI exists to visually answer three questions:

1. What bills and subscriptions do I have?
2. What is due, overdue, or critical?
3. Is the backend doing things automatically?

This UI is a demo dashboard, not a production frontend.

---

## 2. Recommended Tech Stack

### Frontend
- React
- Vite

Reason:
- Fast setup
- Minimal configuration
- Easy API integration

### Styling
- Tailwind CSS (recommended)
- OR simple CSS modules

### Charts (Optional)
- Chart.js or Recharts

---

## 3. Project Structure

```
payguard/
 ├── backend/          # Motia project
 └── frontend/         # React UI
     ├── src/
     │   ├── api/
     │   │   └── client.ts
     │   ├── components/
     │   ├── pages/
     │   ├── App.tsx
     │   └── main.tsx
```

Keep frontend and backend fully separated.

---

## 4. UI Pages (Minimal Set)

### 4.1 Dashboard (Main Screen)

Components:
- Summary cards:
  - Total Bills
  - Overdue Bills
  - Critical Alerts
- Chart:
  - Bills due in next 7 days
- Recent notifications list

This is the primary demo screen.

---

### 4.2 Bills & Subscriptions Page

Table columns:
| Name | Type | Amount | Due / Renewal | Status |

Status color coding:
- Green – OK / Paid
- Yellow – Due soon
- Red – Overdue / Critical

---

### 4.3 Add Bill / Subscription Form

Fields:
- Name
- Amount
- Due date OR renewal day
- Submit button

On submit:
- Calls Motia API
- Updates dashboard automatically

---

## 5. Backend APIs Used by UI

### Existing APIs
- POST /bill
- POST /bill/pay
- POST /subscription

### Required Read APIs (Add These)

```
GET /bills
GET /subscriptions
GET /summary
```

These APIs:
- Read from Motia state
- Return JSON only
- No side effects

---

## 6. API Client Example (Frontend)

```ts
// src/api/client.ts
const API_BASE = "http://localhost:3000";

export async function getBills() {
  return fetch(`${API_BASE}/bills`).then(r => r.json());
}

export async function addBill(data: any) {
  return fetch(`${API_BASE}/bill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
```

---

## 7. Demo Flow (What to Show Judges)

1. Open Dashboard
2. Show summary cards
3. Add a bill via UI
4. Switch to Motia Workbench
5. Show bill.created event
6. Trigger cron job
7. Show status update in UI

This clearly demonstrates:
UI → API → Event → Cron → Event → UI

---

## 8. Visual Design Guidelines

- Light background
- Card-based layout
- Large readable numbers
- Clear labels
- No animations required

Focus on clarity over beauty.

---

## 9. Time Estimate

| Task | Time |
|----|----|
| React + Vite setup | 15 min |
| Layout & pages | 45 min |
| API integration | 30 min |
| Polish | 15 min |

Total: ~2 hours

---

## 10. What NOT to Add

- Authentication
- Payments
- User accounts
- Mobile-first design
- Advanced animations

This keeps the demo stable and focused.

---

## 11. Summary

This UI:
- Makes backend automation visible
- Helps non-technical judges understand value
- Complements Motia Workbench
- Fits hackathon constraints

---

End of document.
