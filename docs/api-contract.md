# External API Contracts — Frozen Endpoints

These three routes have a **frozen external contract** with the Chrome extension. They are never wrapped in the standard success/failure envelope because the extension reads their top-level keys directly and ships through the Chrome Web Store independently of `apps/web`. Enveloping them breaks silently — pairing polls forever, upload reports a bogus URL.

The contract is enforced by the `contract-frozen` rule in `apps/web/scripts/check-pattern.mjs` and recorded in `apps/web/scripts/frozen-contracts.json`.

## POST /api/extension/pair/init

**Purpose:** Register a pairing code (UUID) generated locally by the extension. Returns the code and expiry.

**Request:**
```
POST /api/extension/pair/init
Content-Type: application/json

{ "code": "550e8400-e29b-41d4-a716-446655440000" } # optional; server generates if omitted
```

**Success Response (201):**
```json
{
 "success": true,
 "code": "550e8400-e29b-41d4-a716-446655440000",
 "expiresAt": "2026-08-21T19:13:45.123Z"
}
```

**Failure Responses:**
- **400:** `{ "error": "code must be a UUID" }`
- **409:** `{ "error": "code already in use" }`
- **500:** `{ "error": "Failed to initialize pairing" }`

**Extension Consumer:** `apps/extension/src/pages/Background/pairing/pairingClient.js:246` — reads `data.code`.

## GET /api/extension/pair/status

**Purpose:** Poll pairing status by code. Returns terminal status ("approved", "expired") or "pending". Token is returned exactly once after approval, then cleared server-side.

**Request:**
```
GET /api/extension/pair/status?code=550e8400-e29b-41d4-a716-446655440000
```

**Success Response (200):**
```json
{
 "status": "approved|pending|expired",
 "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
(token field omitted or null if not yet approved or already claimed)

**Failure Responses:**
- **400:** `{ "error": "code is required" }`
- **404:** `{ "error": "Pairing request not found" }`
- **500:** `{ "error": "Failed to get pairing status" }`

**Extension Consumers:**
- `apps/extension/src/pages/Background/pairing/pairingClient.js:130` — reads `data.status === "approved"` and `data.token`.
- `apps/extension/src/pages/Background/pairing/pairingClient.js:145` — reads `data.status === "expired"`.

## POST /api/upload

**Purpose:** Upload a single video file (plus optional metadata and thumbnail). Multipart form-data. Returns storage URL and video record.

**Request:**
```
POST /api/upload
Authorization: Bearer <device-pairing-token>
Content-Type: multipart/form-data

video: <binary file>      # required
title: "My Recording"     # optional
duration: 1234         # optional (milliseconds)
workspaceId: "workspace-uuid" # optional; defaults to user's active workspace
thumbnail: <binary image>   # optional, must be image/*
```

**Success Response (201):**
```json
{
 "success": true,
 "url": "https://cdn.bunny.com/videos/abc123.mp4",
 "video": {
  "id": "video-uuid",
  "title": "My Recording",
  "duration": 1234,
  "workspaceId": "workspace-uuid",
  ...
 },
 "service": "bunny"
}
```

**Failure Responses:**
- **400:** `{ "error": "..." }` (no video file, or validation error)
- **401:** `{ "error": "Unauthorized" }` (missing or invalid auth token)
- **413:** `{ "error": "File too large (...MB). Use the chunked upload API." }`
- **503:** `{ "error": "Storage is not configured (BUNNY_STORAGE_ZONE/...)" }`
- **500:** `{ "error": "Upload failed", "details": "..." }`

**Extension Consumer:** `apps/extension/src/pages/Background/upload/uploadToWeb.js:84` — reads `body.error` to populate error messages.

**Web Client Consumer:** `components/shell/upload-button.tsx:35` — can upload from both web and extension clients; unchanged by the frozen contract (frozen means response shape stays fixed, not that clients can't call it).

## Enforcement

The three routes are listed in `apps/web/scripts/check-pattern.mjs` EXEMPT entries with rule `["contract-frozen"]`. The rule verifies:

1. **No envelope functions imported:** Routes must not import `ok()`, `fail()`, or `handleApiError()` from `@/lib/shared/api-response` — these wrap responses, breaking the extension's key reads.
2. **Response shape matches fixture:** Top-level JSON keys and HTTP status codes must match the schema in `apps/web/scripts/frozen-contracts.json`.

To intentionally change a frozen contract (a breaking change requiring extension update and Web Store resubmission):

1. Update `apps/web/scripts/frozen-contracts.json` with the new shape.
2. Modify the route handler.
3. Update `apps/extension/src/pages/Background/{pairing,upload}/*.js` to read the new keys.
4. Increment the extension's `manifest.json` version and re-submit to the Chrome Web Store.
5. Coordinate the web deploy to land AFTER the extension is approved and live (Web Store review lag is 1–3 days).

These steps are rarely needed; the contract is frozen precisely because uncoordinated changes break silently.
