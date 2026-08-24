# Subscription & Billing — Midtrans Design Spec

**Date:** 2026-08-24  
**Branch:** `feat/subscription-midtrans`  
**Status:** Awaiting implementation plan

---

## 1. Overview

Add a subscription system to Screenbolt with three plans. Users get a free trial (Free plan) with hard limits. Paid plans unlock higher limits and locked features. Payments are processed via Midtrans SNAP — all payment methods supported (GoPay, QRIS, transfer bank, kartu kredit), manual renewal each month. When a subscription expires and is not renewed, the user is automatically downgraded to Free.

---

## 2. Plans

| Plan | Price (IDR/month) | Max Videos | Max Recording Duration | Add Audio | Video Editing |
|---|---|---|---|---|---|
| `free` | 0 | 15 | 5 minutes | ❌ locked | Standard only |
| `pro` | 50,000 | Unlimited | 30 minutes | ✅ | Full |
| `business` | 100,000 | Unlimited | Unlimited | ✅ | Full |

**Downgrade behavior:** when a paid subscription expires without renewal, user is downgraded to Free. Existing videos are retained — none are deleted.

**Lock UX:** features unavailable on the current plan are shown disabled. Clicking a locked feature opens an upgrade modal.

---

## 3. Database Schema

Two additions to `lib/db/schema.ts`:

### 3.1 `planEnum`
```
"free" | "pro" | "business"
```

### 3.2 `subscriptionStatusEnum`
```
"active" | "expired" | "cancelled"
```

### 3.3 `subscriptions` table

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `userId` | text FK → users | cascade delete |
| `plan` | planEnum | current plan |
| `status` | subscriptionStatusEnum | |
| `midtransOrderId` | text unique | Midtrans order ID |
| `midtransTransactionId` | text nullable | Midtrans transaction ID after payment |
| `currentPeriodStart` | timestamp | start of current billing period |
| `currentPeriodEnd` | timestamp | expiry — 30 days after payment |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

One row per user. On first signup, a `free` subscription row is created automatically. When user pays, a new row is inserted (or existing row updated) with the new plan and `currentPeriodEnd = now + 30 days`.

---

## 4. Plan Enforcement

Enforced in two places:

### 4.1 Server-side (API)
`lib/billing/plans.ts` exports:
- `PLAN_LIMITS` — config object with limits per plan
- `getUserPlan(userId)` — queries DB, returns current plan (checks expiry, auto-downgrades to `free` if expired)
- `assertVideoQuota(userId)` — throws if user is on Free and already has 15 videos
- `assertDurationAllowed(userId, durationSeconds)` — throws if duration exceeds plan limit

`app/api/upload/route.ts` and `app/api/upload/complete/route.ts` call `assertVideoQuota` and `assertDurationAllowed` before processing.

### 4.2 Client-side (Extension)
Extension reads plan config from the web app via `/api/billing/plan` endpoint (returns `{ plan, maxDurationSeconds }`). Recording timer checks `maxDurationSeconds` — when reached, recording is auto-stopped and user is shown an upgrade prompt.

Extension also checks this config before enabling the "Add Audio" toggle in the recording UI.

---

## 5. Payment Flow

### 5.1 Checkout
1. User clicks upgrade on `/d/settings/billing`
2. `POST /api/billing/checkout` — creates a Midtrans SNAP token with `order_id`, `gross_amount`, plan metadata
3. Client opens Midtrans SNAP popup
4. User pays via any method (GoPay, QRIS, transfer, kartu kredit)
5. Midtrans redirects to `finish_redirect_url` (`/d/settings/billing?status=pending`)

### 5.2 Webhook
`POST /api/billing/webhook` — receives Midtrans notification:
- Verify signature (`SHA512(order_id + status_code + gross_amount + server_key)`)
- On `transaction_status === "settlement"` or `"capture"` → activate subscription, set `currentPeriodEnd = now + 30 days`
- On `"expire"` or `"cancel"` → mark subscription `cancelled`
- Idempotent — check `midtransOrderId` before updating

### 5.3 Manual Renewal
User pays again each month. New `order_id` is generated per checkout. On successful webhook, `currentPeriodEnd` is extended by 30 days from the payment date.

### 5.4 Expiry & Downgrade
A daily cron job (Next.js `route.ts` with `GET` protected by a secret header, called by Vercel Cron) checks subscriptions where `currentPeriodEnd < now` and `status = active` → sets `status = expired`, `plan = free`.

---

## 6. UI Components

### 6.1 `/d/settings/billing` page
- Shows current plan, expiry date
- "Upgrade" button for Free users
- Plan comparison table
- "Renew" button for expired subscriptions

### 6.2 `components/billing/upgrade-modal.tsx`
- Triggered by clicking a locked feature
- Shows plan comparison: Free vs Pro vs Business
- CTA buttons: "Get Pro" (50K) and "Get Business" (100K)
- Clicking CTA calls `/api/billing/checkout` and opens SNAP popup

### 6.3 Lock UI pattern
- Locked buttons/toggles: `disabled` + lock icon
- `onClick` opens `<UpgradeModal />`
- Applied to: Add Audio toggle in recording UI, advanced editing tools

---

## 7. API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/billing/plan` | Returns current user plan + limits (used by extension) |
| POST | `/api/billing/checkout` | Creates Midtrans SNAP token |
| POST | `/api/billing/webhook` | Midtrans payment notification handler |
| GET | `/api/billing/cron` | Daily expiry check (Vercel Cron, secret-protected) |

---

## 8. Environment Variables Required

```env
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false   # true for production
CRON_SECRET=random_secret_for_cron_endpoint
```

Midtrans SNAP script loaded client-side from:
- Sandbox: `https://app.sandbox.midtrans.com/snap/snap.js`
- Production: `https://app.midtrans.com/snap/snap.js`

---

## 9. Files to Create / Modify

| File | Action |
|---|---|
| `lib/db/schema.ts` | Add `planEnum`, `subscriptionStatusEnum`, `subscriptions` table |
| `lib/db/subscriptions.ts` | Query helpers: `getUserSubscription`, `getUserPlan`, `upsertSubscription` |
| `lib/billing/plans.ts` | `PLAN_LIMITS` config, `assertVideoQuota`, `assertDurationAllowed` |
| `app/api/billing/plan/route.ts` | GET — return current plan + limits |
| `app/api/billing/checkout/route.ts` | POST — create SNAP token |
| `app/api/billing/webhook/route.ts` | POST — handle Midtrans notification |
| `app/api/billing/cron/route.ts` | GET — daily expiry downgrade |
| `app/d/settings/billing/page.tsx` | New billing settings page |
| `components/billing/upgrade-modal.tsx` | Upgrade prompt modal |
| `app/api/upload/route.ts` | Add `assertVideoQuota` + `assertDurationAllowed` |
| `app/api/upload/complete/route.ts` | Add `assertVideoQuota` + `assertDurationAllowed` |
| `apps/extension/src/...` | Duration limit enforcement in recording timer |

---

## 10. Out of Scope

- True auto-recurring (kartu kredit auto-charge via Midtrans Subscriptions API) — add later
- Email reminder before expiry — add later
- Team/workspace-level billing — add later
- Embed video gating — pending `feat/embeddable-video` branch
