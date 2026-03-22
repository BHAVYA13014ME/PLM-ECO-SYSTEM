# PLM System — Architecture Documentation

> **Project:** PLM — Engineering Changes, Executed with Control  
> **Version:** 1.5  
> **Stack:** React 18 + Vite · Node.js + Express · MongoDB (Replica Set) · Mongoose · Zustand · React Query  

---
You are building a Production-Grade PLM (Product Lifecycle Management) system called
"PLM — Engineering Changes, Executed with Control."

This is an Engineering Change Order (ECO) platform. The core rule of the entire system is:
NO direct edits to active Products or Bills of Materials are EVER allowed.
All changes MUST flow through the ECO (Engineering Change Order) workflow.

TECH STACK (Non-negotiable):
- Frontend: React 18 + Vite + Zustand (state) + React Query (server state) + Tailwind CSS
- Backend: Node.js + Express.js
- Database: MongoDB with Mongoose (use Replica Sets for transactions)
- Validation: Zod (backend) + React Hook Form (frontend)
- Auth: JWT (access token) + httpOnly cookie refresh token
- API: RESTful, all responses use { success, message, data } envelope

GLOBAL INVARIANTS (violating these = broken system):
1. A Product/BoM with status "ACTIVE" MUST have ALL edit inputs disabled or read-only.
2. There is ALWAYS exactly ONE "ACTIVE" version per Product at any time.
3. All changes to ACTIVE data MUST go through an ECO workflow.
4. ARCHIVED data is immutable — no modifications ever.
5. BoMs always reference a specific Product + version pair.
6. ECO approval execution is atomic (MongoDB transaction, 8-step engine).
7. Frontend NEVER bypasses backend validation — both layers enforce rules.
8. UI components are conditionally rendered (not just disabled) based on role.

ROLES:
- ADMIN: Full access everywhere
- ENGINEER: Create/edit ECOs, propose changes, initiate approvals
- APPROVER: Review and approve/reject ECOs
- OPERATIONS: Read-only access to ACTIVE Products and BoMs only

API RESPONSE CONTRACT (use this exact shape everywhere):
{
  "success": true | false,
  "message": "Human-readable description",
  "data": { ... } | null
}

HTTP Status codes:
200 = Success, 201 = Created, 400 = Validation Error,
401 = Unauthorized, 403 = Forbidden, 404 = Not Found, 500 = Server Error

FOLDER STRUCTURE:
/plm-backend
  /src
    /models         ← Mongoose schemas
    /controllers    ← Route handlers
    /routes         ← Express routers
    /middleware     ← auth, rbac, errorHandler, validate
    /services       ← Business logic (especially ECO engine)
    /utils          ← helpers, constants, asyncHandler
  server.js
  .env

/plm-frontend
  /src
    /api            ← Axios instances + API functions
    /components     ← Reusable UI components
    /pages          ← Route-level page components
    /store          ← Zustand stores
    /hooks          ← Custom hooks
    /utils          ← helpers, formatters
  vite.config.js
---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Core Philosophy & Non-Negotiable Invariants](#2-core-philosophy--non-negotiable-invariants)
3. [Repository Structure](#3-repository-structure)
4. [Tech Stack & Dependency Map](#4-tech-stack--dependency-map)
5. [Data Models & Schema Design](#5-data-models--schema-design)
6. [Database Design — Indexes, Transactions & Replica Sets](#6-database-design--indexes-transactions--replica-sets)
7. [Backend Architecture — Layered Design](#7-backend-architecture--layered-design)
8. [Authentication & Security Architecture](#8-authentication--security-architecture)
9. [Role-Based Access Control (RBAC)](#9-role-based-access-control-rbac)
10. [ECO State Machine](#10-eco-state-machine)
11. [ECO Execution Engine — The 8-Step Atomic Transaction](#11-eco-execution-engine--the-8-step-atomic-transaction)
12. [Diff Engine](#12-diff-engine)
13. [Observability — Audit Logging & Archiving](#13-observability--audit-logging--archiving)
14. [API Contract Reference](#14-api-contract-reference)
15. [Frontend Architecture](#15-frontend-architecture)
16. [Component Hierarchy](#16-component-hierarchy)
17. [State Management Design](#17-state-management-design)
18. [Data Flow — End-to-End Request Lifecycle](#18-data-flow--end-to-end-request-lifecycle)
19. [Key Design Decisions & Rationale](#19-key-design-decisions--rationale)
20. [Environment & Configuration](#20-environment--configuration)

---

## 1. System Overview

The PLM (Product Lifecycle Management) system is a production-grade engineering change management platform. Its single most important rule is:

> **No direct edits to ACTIVE Products or Bills of Materials are ever permitted. All changes must flow through the ECO (Engineering Change Order) workflow.**

The system enforces this rule at two independent layers — the backend API (hard 403/423 guards in the service layer) and the frontend UI (read-only rendering for ACTIVE/ARCHIVED records, role-filtered DOM elements). Neither layer trusts the other to do the enforcement alone.

### What the system manages

| Entity | Purpose |
|---|---|
| **Product** | A manufactured item with versioned lifecycle: DRAFT → ACTIVE → ARCHIVED |
| **Bill of Materials (BoM)** | The component and operation list for a specific Product version |
| **Engineering Change Order (ECO)** | A formal proposal to change an ACTIVE Product or BoM, routed through configurable approval stages |
| **ECO Stage** | A configurable step in the approval pipeline (e.g. NEW → APPROVAL → DONE) |
| **Archive** | Immutable snapshots of every prior Product/BoM version |
| **AuditLog** | An append-only record of every significant system action |

---

## 2. Core Philosophy & Non-Negotiable Invariants

These invariants are enforced by **both the backend service layer and the frontend UI layer**. Violating any of them constitutes a broken system.

| # | Invariant | Enforcement Point |
|---|---|---|
| 1 | A Product/BoM with status `ACTIVE` can **never** be directly modified | Backend: service-layer guard throws 403. Frontend-: all inputs rendered as read-only text |
| 2 | There is always **exactly one** `ACTIVE` version per Product at any time | Backend: ECO execution engine atomically archives old version before activating new one |
| 3 | All changes to `ACTIVE` data **must** go through an ECO workflow | Backend: PUT/DELETE guards reject non-DRAFT entities. Frontend: banner + CTA to create ECO |
| 4 | `ARCHIVED` data is immutable and **never** modified | Backend: same status guard. Archive collection records are write-once |
| 5 | BoMs always reference a **specific Product + version pair** | Schema: `productId` (ref) + `productVersion` (Number) are both required |
| 6 | ECO approval execution is **atomic** — it either fully completes or fully rolls back | Backend: 8-step MongoDB session transaction with explicit abortTransaction on any error |
| 7 | **Idempotency** — repeated ECO approval calls produce no side effects after the first | Backend: engine checks `eco.status === 'APPROVED'` at entry and returns early |
| 8 | UI components are **conditionally rendered** (hidden from DOM), not just disabled | Frontend: roleGuard utility + conditional JSX rendering |
| 9 | Frontend **never bypasses** backend validation — both layers validate | Frontend: Zod + React Hook Form. Backend: Zod middleware on every route |

---

## 3. Repository Structure

```
plm-system/
├── plm-backend/
│   ├── server.js                    ← Express app entry point, DB connect, middleware mount
│   ├── .env / .env.example
│   └── src/
│       ├── models/
│       │   ├── User.js
│       │   ├── Product.js
│       │   ├── BoM.js
│       │   ├── ECO.js
│       │   ├── ECOStage.js
│       │   ├── Archive.js
│       │   └── AuditLog.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── productController.js
│       │   ├── bomController.js
│       │   ├── ecoController.js
│       │   ├── stageController.js
│       │   └── reportController.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── productRoutes.js
│       │   ├── bomRoutes.js
│       │   ├── ecoRoutes.js
│       │   ├── settingsRoutes.js
│       │   └── reportRoutes.js
│       ├── middleware/
│       │   ├── auth.js              ← verifyJWT
│       │   ├── rbac.js              ← authorizeRoles(...roles)
│       │   ├── errorHandler.js      ← centralized error handler (mounted LAST)
│       │   ├── asyncHandler.js      ← wraps async controllers
│       │   └── validate.js          ← validate(zodSchema) middleware factory
│       ├── services/
│       │   ├── productService.js    ← pure business logic, no req/res
│       │   ├── bomService.js
│       │   ├── ecoService.js
│       │   ├── diffService.js       ← deep diff engine
│       │   └── ecoExecutionEngine.js ← 8-step atomic transaction
│       ├── validators/
│       │   ├── productValidator.js  ← Zod schemas
│       │   ├── bomValidator.js
│       │   └── ecoValidator.js
│       └── utils/
│           ├── ApiResponse.js       ← response helper class
│           ├── auditLogger.js       ← non-blocking audit write helper
│           ├── seed.js              ← 4 base users (one per role)
│           └── demoSeeder.js        ← full demo dataset
│
└── plm-frontend/
    ├── vite.config.js
    ├── .env / .env.example
    └── src/
        ├── api/
        │   ├── axiosInstance.js     ← base Axios instance + interceptors
        │   ├── productApi.js
        │   ├── bomApi.js
        │   ├── ecoApi.js
        │   └── reportApi.js
        ├── store/
        │   ├── authStore.js         ← Zustand: user, accessToken (in-memory)
        │   └── uiStore.js           ← Zustand: selectedProduct, currentEco, sidebarCollapsed
        ├── hooks/
        │   ├── useProducts.js       ← React Query wrappers
        │   ├── useBom.js
        │   ├── useECO.js
        │   └── useReports.js
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── ProductsPage.jsx
        │   ├── BomPage.jsx
        │   ├── ECOPage.jsx
        │   ├── ECODetailPage.jsx
        │   ├── ReportsPage.jsx
        │   └── SettingsPage.jsx
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.jsx
        │   │   ├── Sidebar.jsx
        │   │   └── Topbar.jsx
        │   ├── products/
        │   │   ├── ProductTable.jsx
        │   │   ├── ProductForm.jsx
        │   │   └── ProductDetailDrawer.jsx
        │   ├── bom/
        │   │   ├── BomForm.jsx
        │   │   └── BomDiffViewer.jsx
        │   ├── eco/
        │   │   ├── ECOForm.jsx           ← multi-step wizard
        │   │   ├── StagePipelineVisualizer.jsx
        │   │   └── StageHistoryTimeline.jsx
        │   └── shared/
        │       ├── ProtectedRoute.jsx
        │       ├── StatusBadge.jsx
        │       ├── ConfirmDialog.jsx
        │       └── SkeletonLoader.jsx
        └── utils/
            └── roleGuard.js             ← canEdit(), canApprove(), canDelete()
```

---

## 4. Tech Stack & Dependency Map

### Backend

| Package | Role |
|---|---|
| `express` | HTTP server and routing |
| `mongoose` | MongoDB ODM — schemas, models, sessions |
| `jsonwebtoken` | JWT access token signing/verification |
| `bcryptjs` | Password hashing in pre-save hook |
| `cookie-parser` | Parses httpOnly refresh token cookie |
| `cors` | Allows frontend origin with `credentials: true` |
| `zod` | Runtime request validation (body, params, query) |
| `morgan` | HTTP request logging (dev) |
| `express-async-errors` | Auto-passes async errors to `next()` |
| `express-rate-limit` | Per-IP rate limiting on auth + all routes |
| `helmet` | Sets secure HTTP headers |
| `express-mongo-sanitize` | Strips `$` and `.` from user input (NoSQL injection prevention) |
| `lodash` | `_.set()` / `_.unset()` for nested path writes in ECO engine |
| `nodemon` | Dev: auto-restart on file change |

### Frontend

| Package | Role |
|---|---|
| `react` + `vite` | UI framework + build tool |
| `zustand` | Lightweight global state (auth + UI) |
| `@tanstack/react-query` | Server state management: caching, invalidation, loading states |
| `axios` | HTTP client with interceptor chain |
| `react-router-dom` v6 | Client-side routing + ProtectedRoute |
| `react-hook-form` | Form state with minimal re-renders |
| `zod` + `@hookform/resolvers` | Client-side schema validation |
| `tailwindcss` | Utility-first CSS |
| `clsx` | Conditional class composition |
| `react-hot-toast` | Success/error/warning toast notifications |

---

## 5. Data Models & Schema Design

All schemas include `{ timestamps: true }` (adds `createdAt`, `updatedAt` automatically).

### 5.1 User

```js
{
  name:          String  (required)
  email:         String  (required, unique, lowercase, trim)
  passwordHash:  String  (required, never returned in responses)
  role:          String  enum ["ADMIN", "ENGINEER", "APPROVER", "OPERATIONS"]
  refreshToken:  String  (default: null, never returned in responses)
  timestamps: true
}
```

**Instance methods:**
- `comparePassword(candidate)` → `boolean`
- `generateAccessToken()` → signed JWT (short-lived, e.g. 15m)
- `generateRefreshToken()` → signed JWT (long-lived, e.g. 7d)

**Pre-save hook:** bcrypt hashes `passwordHash` whenever it is modified.

---

### 5.2 Product

```js
{
  sku:          String   (unique; auto-generated "PRD-{timestamp}" if not supplied)
  name:         String   (required, trim)
  description:  String
  salePrice:    Number   (default: 0)
  costPrice:    Number   (default: 0)
  attachments:  [{ fileName: String, url: String, uploadedAt: Date }]
  status:       String   enum ["DRAFT", "ACTIVE", "ARCHIVED"]  default: "DRAFT"
  version:      Number   (default: 1)
  isLocked:     Boolean  (default: false) ← set true during ECO execution to prevent concurrent edits
  isDeleted:    Boolean  (default: false) ← soft delete flag
  createdBy:    ObjectId (ref: User)
  timestamps: true
}
```

**Indexes:**
```js
{ name: "text" }                    // full-text search
{ status: 1, isDeleted: 1 }         // status filter queries
```

**Static method:** `findActive()` → finds all where `status=ACTIVE` and `isDeleted=false`

**Lifecycle:** `DRAFT` → `ACTIVE` (via activate endpoint) → `ARCHIVED` (via ECO execution engine only)

---

### 5.3 Bill of Materials (BoM)

```js
{
  productId:      ObjectId (ref: Product, required)
  productVersion: Number   (required) ← snapshot of product.version at time of BoM creation
  bomVersion:     Number   (default: 1)
  components: [{
    partName:  String  (required)
    quantity:  Number  (required, min: 0)
    unit:      String  (default: "pcs")
    unitCost:  Number  (default: 0)
  }]
  operations: [{
    name:        String  (required)
    duration:    Number  (minutes)
    workCenter:  String
  }]
  status:     String   enum ["DRAFT", "ACTIVE", "ARCHIVED"]  default: "DRAFT"
  bomVersion: Number   (default: 1)
  isLocked:   Boolean  (default: false)
  isDeleted:  Boolean  (default: false)
  createdBy:  ObjectId (ref: User)
  timestamps: true
}
```

**Compound index:**
```js
{ productId: 1, bomVersion: -1 }    // fetch all versions of a BoM for a product, newest first
```

**Constraint:** A BoM can only be created for a Product with `status === "ACTIVE"`. The `productVersion` is inherited from `product.version` at creation time.

---

### 5.4 ECOStage

```js
{
  name:             String   (required, trim)
  order:            Number   (required) ← defines pipeline sequence
  requiresApproval: Boolean  (default: false) ← true = only APPROVER can advance
  approvers:        [ObjectId ref User]
  isFinal:          Boolean  (default: false) ← reaching this stage triggers Execution Engine
  isDefault:        Boolean  (default: false) ← marks the starting stage for new ECOs
  timestamps: true
}
```

**System invariants:**
- Exactly **one** stage has `isDefault: true` at any time
- Exactly **one** stage has `isFinal: true` at any time
- Default seed: `NEW (order:1, isDefault:true)` → `APPROVAL (order:2, requiresApproval:true)` → `DONE (order:3, isFinal:true)`

---

### 5.5 Engineering Change Order (ECO)

```js
{
  title:           String   (required)
  ecoType:         String   enum ["PRODUCT", "BOM"]  (required)
  targetProductId: ObjectId (ref: Product, required)
  targetBomId:     ObjectId (ref: BoM) ← populated when ecoType === "BOM"
  targetVersion:   Number   (required) ← version of entity at ECO creation time
  versionUpdate:   Boolean  (default: true) ← if true, increment version on execution
  effectiveDate:   Date
  proposedChanges: {
    fields: [{
      fieldName:  String  ← supports dot/bracket notation: "components[0].quantity"
      oldValue:   Mixed
      newValue:   Mixed
      changeType: String  enum ["ADD", "UPDATE", "REMOVE"]
    }]
  }
  stage:        ObjectId (ref: ECOStage) ← current stage
  stageHistory: [{
    stageId:    ObjectId (ref: ECOStage)
    stageName:  String
    enteredAt:  Date
    enteredBy:  ObjectId (ref: User)
    action:     String  enum ["MOVED", "APPROVED", "VALIDATED", "REJECTED"]
  }]
  status:     String   enum ["NEW", "IN_PROGRESS", "APPROVED", "REJECTED"]  default: "NEW"
  assignedTo: ObjectId (ref: User)
  createdBy:  ObjectId (ref: User)
  appliedAt:  Date     ← set when Execution Engine commits
  timestamps: true
}
```

**Indexes:**
```js
{ targetProductId: 1, status: 1 }
{ stage: 1, status: 1 }
```

---

### 5.6 Archive

```js
{
  originalEntityId:  ObjectId (required) ← ref to source Product or BoM _id
  entityType:        String   enum ["PRODUCT", "BOM"]  (required)
  version:           Number   (required)
  snapshotData:      Mixed    ← complete deep copy of entity at time of archival
  archivedAt:        Date     (default: Date.now)
  archivedByEcoId:   ObjectId (ref: ECO)
  timestamps: true
}
```

**Index:**
```js
{ originalEntityId: 1, version: -1 }
```

**Critical:** Archive documents are **write-once**. The collection has no update or delete operations. `isLocked` and `isDeleted` are not present — these records are immutable by design.

---

### 5.7 AuditLog

```js
{
  action:      String   (required) ← e.g. "ECO_APPLIED", "PRODUCT_CREATED"
  entityType:  String   enum ["PRODUCT", "BOM", "ECO", "STAGE", "USER"]
  entityId:    ObjectId
  entityName:  String
  performedBy: ObjectId (ref: User)
  oldValue:    Mixed
  newValue:    Mixed
  stackTrace:  String   ← populated only for SYSTEM_ERROR entries
  timestamp:   Date     (default: Date.now)
}
```

**Index:**
```js
{ entityId: 1, timestamp: -1 }
```

---

### 5.8 Entity Relationship Summary

```
User ─────────────────────────────────────────────────────────┐
  │ createdBy                                                  │
  ▼                                                           │
Product (1) ──────── BoM (many) ◄──── ECO (many)            │
  │  version          │  bomVersion        │  targetProductId  │
  │  status           │  productId ────────┘  targetBomId      │
  │  isLocked         │  status               proposedChanges  │
  │  isDeleted        │  isLocked             stage (ECOStage)  │
  │                   │  isDeleted            stageHistory      │
  │                   │                       createdBy ────────┘
  ▼                   ▼
Archive (write-once snapshots of Product and BoM versions)

AuditLog (append-only, refs any entityType via entityId + entityType)
ECOStage (configures the approval pipeline; referenced by ECO.stage)
```

---

## 6. Database Design — Indexes, Transactions & Replica Sets

### Why Replica Sets

MongoDB transactions (multi-document ACID) require a replica set. The ECO Execution Engine cannot function without it. Even in development, spin up a local replica set:

```bash
mongod --replSet rs0 --bind_ip localhost
mongo --eval "rs.initiate()"
```

### Compound Index Strategy

| Collection | Index | Purpose |
|---|---|---|
| Product | `{ status: 1, isDeleted: 1 }` | Filter active/draft products efficiently |
| Product | `{ name: "text" }` | Full-text search |
| BoM | `{ productId: 1, bomVersion: -1 }` | All BoM versions for a product, newest first |
| ECO | `{ targetProductId: 1, status: 1 }` | All ECOs for a product filtered by status |
| ECO | `{ stage: 1, status: 1 }` | Approver dashboard — pending ECOs per stage |
| AuditLog | `{ entityId: 1, timestamp: -1 }` | Audit trail for a specific entity, newest first |
| Archive | `{ originalEntityId: 1, version: -1 }` | Version history for any entity |

### Query Performance Rules

- All `GET` endpoints (lists, dashboards, reports) use `.lean()` — returns plain JS objects, not Mongoose documents, removing document overhead
- Reports API uses MongoDB `$lookup` in aggregation pipelines to avoid N+1 query problems
- `$match` on indexed fields (`status`, `isDeleted`, `productId`) always comes first in pipelines

---

## 7. Backend Architecture — Layered Design

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────┐
│  Express Middleware Stack (server.js)            │
│  cors → express.json → cookie-parser → morgan   │
│  express-mongo-sanitize → helmet                │
│  rate-limit (auth: 10/15m, others: 100/15m)     │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  Route Layer  (/src/routes/)                     │
│  verifyJWT → authorizeRoles → validate(schema)  │
│  → controller function                          │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  Controller Layer  (/src/controllers/)           │
│  • Parses req.body / req.params / req.query      │
│  • Calls service with plain data objects         │
│  • Calls new ApiResponse(res, ...) to respond   │
│  • Wraps in asyncHandler — errors auto-next()   │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  Service Layer  (/src/services/)                 │
│  • Pure business logic — NO req, res, next       │
│  • Accepts structured input objects              │
│  • Returns structured output OR throws           │
│    { code: Number, message: String }             │
│  • Calls Mongoose models directly                │
│  • Calls auditLogger (non-blocking)              │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│  Model Layer  (/src/models/)                     │
│  Mongoose schemas with indexes, hooks, methods   │
└─────────────────────────────────────────────────┘
     │
     ▼
   MongoDB (Replica Set)
```

### Centralized Error Handler

Mounted **last** in `server.js`. Catches all errors passed via `next(error)`:

| Error Type | HTTP Code | Behaviour |
|---|---|---|
| Mongoose `ValidationError` | 400 | Maps field-level messages |
| Mongoose `CastError` | 400 | "Invalid ID format" |
| MongoDB `code 11000` (duplicate key) | 409 | "Duplicate value for `{field}`" |
| Service-thrown `{ code, message }` | code | Passes message directly |
| Unhandled / unknown | 500 | Returns generic message, logs stack trace to AuditLog |

All error responses use the standard envelope:
```json
{ "success": false, "message": "Descriptive error", "data": null }
```

### API Response Contract

Every successful response:
```json
{
  "success": true,
  "message": "Human-readable description",
  "data": { }
}
```

HTTP status codes used: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `423`, `500`

---

## 8. Authentication & Security Architecture

### JWT Strategy

The system uses a **dual-token pattern** for security:

| Token | Storage | Lifetime | Purpose |
|---|---|---|---|
| Access Token | Zustand in-memory (JS variable) | 15 minutes | Sent as `Authorization: Bearer {token}` on every request |
| Refresh Token | httpOnly cookie | 7 days | Used to issue new access tokens; inaccessible to JS |

**Why not localStorage for the access token?** Tokens in localStorage are vulnerable to XSS. Storing in memory (Zustand) means they are lost on page refresh — the refresh token cookie silently re-issues a new access token via the interceptor chain.

### Token Refresh Flow

```
Client                         Backend
  │  ─── GET /api/v1/... ──────► 401 (access token expired)
  │
  │  ─── POST /auth/refresh-token (cookie auto-sent) ──────►
  │                              ◄── 200 new accessToken ───
  │
  │  ─── Retry original request with new token ──────►
  │                              ◄── 200 OK ──────────────
```

If refresh also fails (cookie expired/invalid) → `logout()` is dispatched → user redirected to `/login`.

### Security Middleware Stack

```
server.js middleware order:
1. helmet()                    ← Security headers (CSP, HSTS, X-Frame-Options, etc.)
2. cors({ origin: CLIENT_URL, credentials: true })
3. express.json()
4. cookie-parser()
5. express-mongo-sanitize()    ← Strips $ and . from input to prevent NoSQL injection
6. morgan('dev')
7. rateLimiter (auth routes)   ← 10 requests per 15 minutes per IP
8. rateLimiter (all routes)    ← 100 requests per 15 minutes per IP
9. ... route handlers ...
10. errorHandler               ← MUST be last
```

### Password Security

- Passwords stored as bcrypt hashes (`passwordHash` field)
- bcrypt runs on pre-save hook — only triggered when field is modified
- `comparePassword(candidate)` uses `bcrypt.compare()` — constant-time comparison
- `passwordHash` and `refreshToken` are excluded from all API responses via `.select('-passwordHash -refreshToken')`

---

## 9. Role-Based Access Control (RBAC)

### Role Permissions Matrix

| Capability | ADMIN | ENGINEER | APPROVER | OPERATIONS |
|---|:---:|:---:|:---:|:---:|
| Create DRAFT Product/BoM | ✅ | ✅ | ❌ | ❌ |
| Update DRAFT Product/BoM | ✅ | ✅ | ❌ | ❌ |
| Delete DRAFT Product | ✅ | ❌ | ❌ | ❌ |
| Activate Product (DRAFT→ACTIVE) | ✅ | ❌ | ❌ | ❌ |
| Create ECO | ✅ | ✅ | ❌ | ❌ |
| Edit ECO (NEW stage only) | ✅ | ✅ | ❌ | ❌ |
| Validate ECO (advance non-approval stages) | ✅ | ✅ | ❌ | ❌ |
| Approve ECO (advance approval stages) | ✅ | ❌ | ✅ | ❌ |
| Reject ECO | ✅ | ❌ | ✅ | ❌ |
| View DRAFT products | ✅ | ✅ | ✅ | ❌ |
| View ACTIVE products | ✅ | ✅ | ✅ | ✅ |
| View ARCHIVED products | ✅ | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ❌ |
| Manage ECO Stages (Settings) | ✅ | ❌ | ❌ | ❌ |

### Middleware Implementation

```js
// /src/middleware/rbac.js
export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Access denied for role: ${req.user.role}`, 403));
  }
  next();
};

// Usage per route:
router.post('/eco', verifyJWT, authorizeRoles('ADMIN', 'ENGINEER'), ecoController.create);
router.post('/eco/:id/advance', verifyJWT, authorizeRoles('ADMIN', 'APPROVER', 'ENGINEER'), ecoController.advance);
```

### OPERATIONS Role Special Filtering

For OPERATIONS users, the product and BoM query layer automatically filters:
```js
// productService.getAll() — when called by OPERATIONS user
const filter = { isDeleted: false, status: 'ACTIVE' };  // ACTIVE only, DRAFT excluded
```

The UI additionally hides all write action buttons via `roleGuard.js`.

### Frontend RBAC — Hidden, Not Disabled

```jsx
// ❌ Wrong — button visible, just non-functional
<button disabled={user.role !== 'ADMIN'}>Delete</button>

// ✅ Correct — button absent from DOM entirely
{canDelete(user, product) && <button onClick={handleDelete}>Delete</button>}
```

**roleGuard.js utility:**
```js
canEdit(user, entity)     // role can write AND entity.status === 'DRAFT' AND !entity.isLocked
canApprove(user, stage)   // role is APPROVER/ADMIN AND stage.requiresApproval
canDelete(user, entity)   // role is ADMIN AND entity.status === 'DRAFT'
```

---

## 10. ECO State Machine

### Stage Pipeline

ECO stages are **configurable** through the Settings UI (ADMIN only). The default pipeline is:

```
NEW (isDefault: true)
  │
  │  Action: "Validate"
  │  Actor:  ENGINEER or ADMIN
  ▼
APPROVAL (requiresApproval: true)
  │
  ├── Action: "Approve"    Actor: APPROVER or ADMIN
  │       │
  │       ▼
  │     DONE (isFinal: true) ──► triggers 8-step Execution Engine
  │
  └── Action: "Reject"     Actor: APPROVER or ADMIN
          │
          ▼
        REJECTED (terminal — no further movement ever)

APPROVED (set by Execution Engine) ──► terminal
REJECTED ──► terminal
```

### Transition Rules

| From Stage | Action | Required Role | Result |
|---|---|---|---|
| Default stage (isDefault) | Validate | ENGINEER, ADMIN | Moves to next stage in order |
| Any `requiresApproval` stage | Approve | APPROVER, ADMIN | Moves to next stage; if next is final → fires engine |
| Any `requiresApproval` stage | Reject | APPROVER, ADMIN | Sets `status = REJECTED`, terminal |
| `isFinal` stage reached | (auto) | system | ECO Execution Engine fires |
| `status === APPROVED` | any | any | 403 — terminal, cannot move |
| `status === REJECTED` | any | any | 403 — terminal, cannot move |

### Stage History

Every stage transition appends an entry to `eco.stageHistory`:

```json
{
  "stageId":   "<ObjectId>",
  "stageName": "APPROVAL",
  "enteredAt": "2025-01-15T10:32:00Z",
  "enteredBy": "<UserId>",
  "action":    "APPROVED"
}
```

Actions: `MOVED` (no approval needed) | `VALIDATED` | `APPROVED` | `REJECTED`

---

## 11. ECO Execution Engine — The 8-Step Atomic Transaction

This is the most critical service in the system. It runs when an ECO reaches the final stage (`isFinal: true`). Located at `/src/services/ecoExecutionEngine.js`.

**Function signature:** `async executeECO(ecoId, approvedByUserId) → { success: boolean, message: string }`

```
ENTRY GUARD: if eco.status === 'APPROVED' → return early (idempotency)

STEP 1 — START SESSION
  ┌─────────────────────────────────────────────────────────┐
  │  const session = await mongoose.startSession()          │
  │  session.startTransaction()                             │
  │  try { ... } catch { abortTransaction } finally { end } │
  └─────────────────────────────────────────────────────────┘

STEP 2 — FETCH & CHECK LOCK
  ┌─────────────────────────────────────────────────────────┐
  │  Fetch ECO (with session)                               │
  │  Fetch target Product or BoM (with session)             │
  │  Use findOneAndUpdate({ _id }, { $set: {isLocked:true}},│
  │    { new: false, session }) for atomic check-and-lock   │
  │  If returned doc.isLocked === true → THROW ERROR        │
  │    "Entity is locked by another operation"              │
  └─────────────────────────────────────────────────────────┘

STEP 3 — LOCK TARGET
  ┌─────────────────────────────────────────────────────────┐
  │  target.isLocked = true                                 │
  │  await target.save({ session })                         │
  └─────────────────────────────────────────────────────────┘

STEP 4 — ARCHIVE CURRENT VERSION
  ┌─────────────────────────────────────────────────────────┐
  │  const snapshot = target.toObject()                     │
  │  Create new Archive document:                           │
  │    { originalEntityId: target._id,                      │
  │      entityType: eco.ecoType,                           │
  │      version: target.version,                           │
  │      snapshotData: snapshot,                            │
  │      archivedByEcoId: eco._id }                         │
  │  await Archive.create([archiveDoc], { session })        │
  └─────────────────────────────────────────────────────────┘

STEP 5 — APPLY PROPOSED CHANGES
  ┌─────────────────────────────────────────────────────────┐
  │  for (const field of eco.proposedChanges.fields) {      │
  │    if changeType === "ADD" || "UPDATE":                  │
  │      _.set(target, field.fieldName, field.newValue)      │
  │    if changeType === "REMOVE":                           │
  │      _.unset(target, field.fieldName)                    │
  │  }                                                       │
  │  Supports deeply nested: "components[0].quantity"        │
  └─────────────────────────────────────────────────────────┘

STEP 6 — CREATE NEW VERSION
  ┌─────────────────────────────────────────────────────────┐
  │  if (eco.versionUpdate) target.version += 1             │
  │  target.status = 'ACTIVE'                               │
  │  target.isLocked = false                                │
  │  await target.save({ session })                         │
  └─────────────────────────────────────────────────────────┘

STEP 7 — COMPLETE ECO
  ┌─────────────────────────────────────────────────────────┐
  │  eco.status = 'APPROVED'                                │
  │  eco.appliedAt = new Date()                             │
  │  eco.stageHistory.push({ action: 'APPROVED', ... })     │
  │  await eco.save({ session })                            │
  └─────────────────────────────────────────────────────────┘

STEP 8 — COMMIT
  ┌─────────────────────────────────────────────────────────┐
  │  await session.commitTransaction()                      │
  │  createAuditLog({ action: 'ECO_APPLIED', ... })         │
  │  ← audit log is written AFTER commit (non-blocking)     │
  └─────────────────────────────────────────────────────────┘

CATCH (any error in steps 2–8):
  await session.abortTransaction()
  → ALL writes in this session are rolled back
  → Attempt to unlock target: target.isLocked = false (without session)
  → Re-throw error → controller returns 500

FINALLY:
  await session.endSession()
```

### Why the findOneAndUpdate lock in Step 2?

Using `{ $set: { isLocked: true } }` with `{ new: false }` (returns pre-update doc) is **atomic at the database level**. Two concurrent ECO approvals both issue this command; MongoDB guarantees only one gets the document with `isLocked: false`. The other reads `isLocked: true` and aborts.

---

## 12. Diff Engine

Located at `/src/services/diffService.js`. Used by the BoM diff endpoint and the ECO detail review screen.

### Input / Output Contract

```js
// Input: two plain objects (via .toObject() or .lean())
diffService.compute(oldDoc, newDoc) → DiffEntry[]

// Output:
[
  {
    fieldPath:  "components[0].quantity",  // dot/bracket notation
    oldValue:   5,
    newValue:   10,
    changeType: "UPDATED"  // "ADDED" | "UPDATED" | "REMOVED"
  }
]
// UNCHANGED fields are NOT emitted
```

### Algorithm

```
function diff(old, new, path = ""):
  for each key in union(keys(old), keys(new)):
    currentPath = path ? `${path}.${key}` : key
    
    if key not in old → emit ADDED for all new[key] subfields
    if key not in new → emit REMOVED for all old[key] subfields
    if both are plain objects → recurse: diff(old[key], new[key], currentPath)
    if primitive and old[key] !== new[key] → emit UPDATED
    if equal → skip (no emission)

// Array handling: bracket notation for indices
// "components" array → "components[0].quantity", "components[1].partName"
// Internal Mongoose fields ignored: _id, __v, createdAt, updatedAt, isLocked, isDeleted
```

### UI Color Coding (BomDiffViewer)

| changeType | Row Background | Hex |
|---|---|---|
| `ADDED` | Green | `#DCFCE7` |
| `REMOVED` | Red | `#FEE2E2` |
| `UPDATED` | Yellow | `#FEF3C7` |
| `UNCHANGED` | White | default |

---

## 13. Observability — Audit Logging & Archiving

### Audit Events

Every significant action writes to `AuditLog`. Writing is **non-blocking** — the HTTP response is not held waiting for the audit write to complete. Audit failures are caught and logged to `console.error` only, never propagated to the API response.

| Action Constant | Triggered By |
|---|---|
| `PRODUCT_CREATED` | productController.create |
| `PRODUCT_UPDATED` | productController.update |
| `PRODUCT_ACTIVATED` | productController.activate |
| `PRODUCT_DELETED` | productController.softDelete |
| `BOM_CREATED` | bomController.create |
| `BOM_UPDATED` | bomController.update |
| `BOM_ACTIVATED` | bomController.activate |
| `ECO_CREATED` | ecoController.create |
| `ECO_STAGE_ADVANCED` | ecoController.advance |
| `ECO_REJECTED` | ecoController.reject |
| `ECO_APPLIED` | ecoExecutionEngine (STEP 8, after commit) |
| `STAGE_CREATED` | stageController.create |
| `STAGE_UPDATED` | stageController.update |
| `SYSTEM_ERROR` | errorHandler middleware |

### auditLogger Utility

```js
// /src/utils/auditLogger.js
async function createAuditLog({ action, entityType, entityId, entityName,
                                performedBy, oldValue, newValue, stackTrace }) {
  try {
    await AuditLog.create({ action, entityType, entityId, entityName,
                            performedBy, oldValue, newValue, stackTrace, timestamp: new Date() });
  } catch (err) {
    console.error('AuditLog write failed:', err.message);
    // Never throws — audit failures must not break the main flow
  }
}
```

### Archive vs AuditLog

| Concern | Archive | AuditLog |
|---|---|---|
| **What is stored** | Full entity snapshot (deep copy) | Action metadata (who, what, when, diff summary) |
| **When written** | STEP 4 of ECO Execution Engine (inside transaction) | After every significant action (outside transaction) |
| **Mutable?** | Never | Never |
| **Purpose** | Version history, rollback reference | Compliance, tracing, debugging |

---

## 14. API Contract Reference

All endpoints are mounted under `/api/v1`. All responses use `{ success, message, data }`.

### Authentication

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/auth/register` | No | — | Create user account |
| POST | `/auth/login` | No | — | Returns accessToken + sets refresh cookie |
| POST | `/auth/logout` | Yes | All | Clears cookie, nulls refreshToken in DB |
| POST | `/auth/refresh-token` | Cookie | — | Issues new accessToken from refresh cookie |
| GET | `/auth/me` | Yes | All | Returns current user (no passwords) |

### Products

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/products` | Yes | All | Paginated, filtered list (OPERATIONS → ACTIVE only) |
| GET | `/products/:id` | Yes | All | Single product with createdBy populated |
| POST | `/products` | Yes | ADMIN, ENGINEER | Create DRAFT product |
| PUT | `/products/:id` | Yes | ADMIN, ENGINEER | Update DRAFT only (guard: 403 if ACTIVE/ARCHIVED) |
| DELETE | `/products/:id` | Yes | ADMIN | Soft delete DRAFT only |
| POST | `/products/:id/activate` | Yes | ADMIN | DRAFT → ACTIVE |
| GET | `/products/:id/diff/:compareId` | Yes | All | Structured diff between two versions |

### Bills of Materials

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/bom` | Yes | All | Paginated list, filter by productId |
| GET | `/bom/:id` | Yes | All | Full BoM with components and operations |
| POST | `/bom` | Yes | ADMIN, ENGINEER | Create BoM for ACTIVE product only |
| PUT | `/bom/:id` | Yes | ADMIN, ENGINEER | Update DRAFT BoM only |
| DELETE | `/bom/:id` | Yes | ADMIN | Soft delete DRAFT only |
| POST | `/bom/:id/activate` | Yes | ADMIN | DRAFT → ACTIVE |
| GET | `/bom/:id/diff/:compareId` | Yes | All | Structured diff (DiffEntry[]) |

### Engineering Change Orders

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/eco` | Yes | All* | Paginated list (role-filtered visibility) |
| GET | `/eco/:id` | Yes | All* | Full ECO with stageHistory populated |
| POST | `/eco` | Yes | ADMIN, ENGINEER | Create ECO (target must be ACTIVE + unlocked) |
| PUT | `/eco/:id` | Yes | ADMIN, ENGINEER | Edit ECO (only when status=NEW in default stage) |
| POST | `/eco/:id/advance` | Yes | ADMIN, ENGINEER, APPROVER | Move to next stage (role check per stage) |
| POST | `/eco/:id/reject` | Yes | ADMIN, APPROVER | Reject ECO (terminal) |

*OPERATIONS cannot access `/eco` routes.

### Settings (ECO Stages)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/settings/stages` | Yes | All* | All stages sorted by order |
| POST | `/settings/stages` | Yes | ADMIN | Create stage |
| PUT | `/settings/stages/:id` | Yes | ADMIN | Update stage |
| DELETE | `/settings/stages/:id` | Yes | ADMIN | Delete stage (guards: not referenced, not default/final) |
| GET | `/settings/stages/next/:currentStageId` | Yes | All | Next stage in pipeline order |

### Reports

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/reports/eco-summary` | Yes | ADMIN, ENGINEER, APPROVER | Aggregated ECO counts by status and type |
| GET | `/reports/eco-list` | Yes | ADMIN, ENGINEER, APPROVER | Paginated ECO report with filters |
| GET | `/reports/product-version-history/:productId` | Yes | ADMIN, ENGINEER, APPROVER | All versions of a product |
| GET | `/reports/bom-change-history/:productId` | Yes | ADMIN, ENGINEER, APPROVER | All BoM versions for a product |
| GET | `/reports/audit-trail` | Yes | ADMIN, ENGINEER, APPROVER | Paginated audit log |
| GET | `/reports/active-matrix` | Yes | ADMIN, ENGINEER, APPROVER | Active Product → BoM mapping |

### Query Parameters

All list endpoints support:
- `page` (default: 1) and `limit` (default: 20) for pagination
- `status` filter: `DRAFT`, `ACTIVE`, `ARCHIVED`
- `search`: full-text search on `name` (Products)
- `dateFrom`, `dateTo`: ISO date filters (Reports)

---

## 15. Frontend Architecture

### Layer Responsibilities

```
Pages          ← Route-level components. Compose containers + page layout.
               ← Access Zustand for global state (user, selectedProduct).
               ← Call hooks for data.

Containers     ← Stateful sections within a page.
               ← Handle loading/error/empty states.
               ← Pass data down to presentational components.

Components     ← Presentational (dumb) — receive props, emit events.
               ← No API calls. No Zustand access.
               ← Pure rendering logic only.

Hooks          ← useProducts, useBom, useECO, useReports.
               ← React Query wrappers (useQuery, useMutation).
               ← Own all loading, error, caching, invalidation logic.

API Services   ← productApi.js, bomApi.js, ecoApi.js.
               ← Axios calls only. No state. Return raw response data.
               ← Import axiosInstance (which carries auth headers).
```

### Axios Interceptor Chain

```
Request Interceptor:
  read accessToken from authStore (Zustand)
  attach "Authorization: Bearer {accessToken}" header
  if no token → pass through (public routes)

Response Interceptor:
  if response.status === 401:
    if this is NOT a retry:
      POST /auth/refresh-token (cookie sent automatically)
      update authStore.accessToken with new token
      retry original request with new token
    else (retry also failed):
      authStore.logout()
      navigate('/login')

AbortController:
  duplicate in-flight requests for same URL are cancelled
```

### React Query Configuration

```js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 minute before refetch
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

Cache invalidation on mutation:
```js
// After any product mutation:
queryClient.invalidateQueries(['products']);

// After ECO advance:
queryClient.invalidateQueries(['eco', ecoId]);
queryClient.invalidateQueries(['eco']); // refresh list
```

---

## 16. Component Hierarchy

```
App
├── <LoginPage />                          ← public route
│
└── <AppShell />                           ← authenticated wrapper
    ├── <Sidebar />                        ← role-filtered navigation items (hidden from DOM)
    │   └── nav items rendered only for authorized roles
    │
    ├── <Topbar />                         ← breadcrumb, notifications, user menu
    │   └── notification bell (APPROVER: pending approval count badge)
    │
    └── <Outlet /> (React Router)
        │
        ├── <DashboardPage />              ← 4 role-specific variants
        │   ├── (ENGINEER) MyECOsSection + RecentDraftProducts
        │   ├── (APPROVER) PendingApprovalTable
        │   ├── (ADMIN)    MetricCards + RecentAuditLog + ECOPipelineBar
        │   └── (OPERATIONS) ActiveProductsMetrics + ActiveProductTable
        │
        ├── <ProductsPage />
        │   ├── <ProductTable />           ← paginated, with StatusBadge per row
        │   ├── <ProductForm />            ← create/edit drawer; read-only if ACTIVE/ARCHIVED
        │   └── <ProductDetailDrawer />    ← full detail + version list + linked BoMs/ECOs
        │
        ├── <BomPage />
        │   ├── <BomTable />
        │   ├── <BomForm />               ← dynamic component rows + running cost total
        │   └── <BomDiffViewer />         ← reused in ECO detail
        │
        ├── <ECOPage />
        │   ├── <ECOTable />
        │   └── <ECOForm />               ← 3-step wizard
        │       ├── Step 1: Basic Info
        │       ├── Step 2: Propose Changes
        │       └── Step 3: Review (BomDiffViewer / ProductDiffViewer)
        │
        ├── <ECODetailPage />             ← /eco/:id full page
        │   ├── Left panel (1/3):
        │   │   ├── ECO metadata
        │   │   ├── <StagePipelineVisualizer />
        │   │   └── Context-aware action buttons
        │   └── Right panel (2/3) tabs:
        │       ├── Proposed Changes → <BomDiffViewer /> or <ProductDiffViewer />
        │       ├── Stage History → <StageHistoryTimeline />
        │       └── Audit Trail
        │
        ├── <ReportsPage />               ← tabs
        │   ├── ECO Report (filtered table + CSV export)
        │   ├── Product History (version timeline)
        │   ├── BoM Change History
        │   ├── Audit Trail (collapsible JSON diff)
        │   └── Active Matrix (product ↔ BoM mapping)
        │
        └── <SettingsPage />              ← ADMIN only
            └── <StageManager />          ← visual pipeline builder + StageForm
```

### Key Shared Components

| Component | Props | Purpose |
|---|---|---|
| `<ProtectedRoute>` | `allowedRoles[]` | Redirects to `/login` if unauthenticated; renders `<Forbidden403Page>` if wrong role |
| `<StatusBadge>` | `status: string` | Colored pill badge for all status strings |
| `<ConfirmDialog>` | `title, message, onConfirm` | Required before all irreversible actions |
| `<SkeletonLoader>` | `rows, cols` | Shimmer placeholder during loading |
| `<BomDiffViewer>` | `bomId, compareId` | Fetches and renders structured diff with color coding |
| `<StagePipelineVisualizer>` | `stages[], currentStageId, ecoStatus` | Horizontal stepper showing ECO progress |

---

## 17. State Management Design

### Zustand Auth Store

```js
// /src/store/authStore.js
{
  // State
  user:            null | { _id, name, email, role }
  accessToken:     null | string   ← IN MEMORY ONLY, never persisted
  isAuthenticated: boolean

  // Actions
  setCredentials(user, token)  ← called on successful login or token refresh
  logout()                     ← clears all state, called on 401 retry failure
  setUser(user)                ← called after /auth/me for profile updates
}
```

### Zustand UI Store

```js
// /src/store/uiStore.js
{
  // State
  selectedProduct:  null | Product
  selectedVersion:  null | number
  currentEco:       null | ECO
  sidebarCollapsed: boolean

  // Actions
  setSelectedProduct(product)
  setCurrentEco(eco)
  toggleSidebar()
}
```

### React Query — Server State

Server state (paginated lists, single entities, reports) lives entirely in React Query cache. Zustand is **not** used for API data.

```
React Query cache keys:
  ["products"]               ← product list
  ["products", filters]      ← filtered product list
  ["products", id]           ← single product
  ["bom", { productId }]     ← BoM list for a product
  ["bom", id]                ← single BoM
  ["eco"]                    ← ECO list
  ["eco", id]                ← single ECO
  ["stages"]                 ← ECO stage pipeline
  ["reports", "eco-summary"] ← dashboard aggregation
  ["reports", "audit-trail"] ← audit log
```

---

## 18. Data Flow — End-to-End Request Lifecycle

### Example: Engineer Creates an ECO

```
1. ECOForm submits (Step 3 review)
     │
2. useCreateECO() mutation fires
     │
3. ecoApi.create(payload) → POST /api/v1/eco
     │
4. axiosInstance injects Authorization: Bearer {token}
     │
5. Backend: verifyJWT → authorizeRoles('ADMIN','ENGINEER') → validate(ecoCreateSchema)
     │
6. ecoController.create() calls ecoService.create()
     │
7. ecoService:
     ├── Fetch target Product → GUARD: must be ACTIVE
     ├── GUARD: target.isLocked must be false
     ├── Fetch default ECOStage (isDefault: true)
     ├── Create ECO document with stage = defaultStage._id
     ├── Push first stageHistory entry (action: 'MOVED')
     └── createAuditLog({ action: 'ECO_CREATED', ... })  ← async, non-blocking
     │
8. Controller: new ApiResponse(res, 201, 'ECO created', eco)
     │
9. React Query: invalidateQueries(['eco']) → list auto-refreshes
     │
10. react-hot-toast: success toast "ECO created successfully"
     │
11. navigate('/eco/:newEcoId')
```

### Example: Approver Approves → Execution Engine Fires

```
1. ECODetailPage: "Approve" button clicked → ConfirmDialog → confirmed
     │
2. useAdvanceECO(id) mutation → POST /api/v1/eco/:id/advance
     │
3. Backend verifyJWT + authorizeRoles check
     │
4. ecoController.advance():
     ├── Fetch ECO + current stage
     ├── GUARD: eco.status not APPROVED/REJECTED
     ├── If stage.requiresApproval → confirm user.role is APPROVER/ADMIN
     ├── Fetch next stage (by order)
     ├── Push stageHistory entry (action: 'APPROVED')
     ├── Update eco.stage = nextStage._id
     └── If nextStage.isFinal → call executeECO(eco._id, user._id)
     │
5. ecoExecutionEngine runs 8-step transaction:
     STEP 1: Start MongoDB session + transaction
     STEP 2: Fetch + atomically check-and-lock target
     STEP 3: Lock target (isLocked = true)
     STEP 4: Archive current version → Archive collection
     STEP 5: Apply proposedChanges via lodash _.set / _.unset
     STEP 6: Increment version, set ACTIVE, unlock (isLocked = false)
     STEP 7: Set eco.status = 'APPROVED', eco.appliedAt = now
     STEP 8: commitTransaction()
             createAuditLog({ action: 'ECO_APPLIED' })
     │
     If ANY step throws → abortTransaction → unlock target → re-throw
     │
6. Controller: 200 { success: true, message: 'ECO approved and applied' }
     │
7. React Query: invalidateQueries(['eco', id]) + ['products'] + ['bom']
     │
8. Toast: "ECO applied — new version is now ACTIVE"
     │
9. StagePipelineVisualizer rerenders: all stages green
```

---

## 19. Key Design Decisions & Rationale

### Why service layer is completely decoupled from Express

Services accept plain data objects and return plain data objects or throw `{ code, message }`. They have zero knowledge of `req`, `res`, or `next`. This makes services:
- **Unit-testable** without an HTTP server
- **Reusable** across different transports (REST, WebSocket, cron jobs)
- **Safe** — business rules cannot accidentally short-circuit HTTP middleware

### Why MongoDB Replica Sets (not standalone)

Multi-document ACID transactions require a replica set. The ECO Execution Engine updates **5+ documents** in a single atomic operation (ECO, Product/BoM, Archive, and potentially AuditLog). Without transactions, a server crash mid-way would leave data in a corrupt intermediate state with no rollback path.

### Why versions are never mutated in-place

Instead of updating a Product document to `version: 3`, the old document is archived and a new document becomes the new canonical record. This means:
- Full version history is always queryable without needing event sourcing
- Archive snapshots are identical to what was ACTIVE at any point in time
- No risk of clobbering historical state

### Why isLocked uses findOneAndUpdate (atomic)

```js
// Naive approach (race condition):
const product = await Product.findById(id);
if (product.isLocked) throw error;
product.isLocked = true;
await product.save();
// ← Another concurrent request can read BETWEEN lines 1 and 3

// Correct approach (atomic):
const pre = await Product.findOneAndUpdate(
  { _id: id, isLocked: false },   // condition — only succeeds if not locked
  { $set: { isLocked: true } },
  { new: false, session }          // returns pre-update doc; null if condition failed
);
if (!pre) throw new Error('Entity is locked');
```

### Why accessToken lives in Zustand memory (not localStorage)

localStorage persists across tabs and survives page refresh but is **readable by any JavaScript on the page**, including injected XSS scripts. In-memory storage means a stolen token expires with the browser tab. The httpOnly refresh cookie silently re-issues tokens on reload.

### Why UI components are hidden (not disabled) based on role

Disabled buttons are still in the DOM. A malicious user can inspect, remove the `disabled` attribute, and click. Hidden elements are absent from the DOM entirely, providing genuine defense-in-depth alongside the backend RBAC guards.

### Why .lean() for all GET endpoints

Mongoose documents carry prototype methods, virtuals, and a change-tracking proxy. For read-only list endpoints, none of this overhead is needed. `.lean()` returns plain JS objects: smaller memory footprint, faster serialization, and zero risk of accidentally calling `.save()` on a list result.

---

## 20. Environment & Configuration

### Backend `.env`

```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/plm-system?replicaSet=rs0
JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:5000/api/v1
```

### Startup Validation

On `server.js` startup, validate all required env vars are present. Exit with a clear error message if any are missing — never let the server start in a broken state:

```js
const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`FATAL: Missing env var: ${key}`);
    process.exit(1);
  }
});
```

### Seed Scripts

```bash
# Create 4 base users (one per role), password: Admin@1234
npm run seed

# Create full demo dataset (products, BoMs, ECOs in all states)
npm run demo-seed
```

**Demo credentials:**

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@plm.com | Demo@1234 |
| ENGINEER | engineer@plm.com | Demo@1234 |
| APPROVER | approver@plm.com | Demo@1234 |
| OPERATIONS | ops@plm.com | Demo@1234 |

---

*Architecture document covers all 9 build phases. Last updated: v1.5*