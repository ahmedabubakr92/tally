# Tally — Expense Splitting App

Split shared expenses with your group, track who owes what, and settle up — with live updates when anyone makes a change.

**Live demo:** [tally-production-6a92.up.railway.app](https://tally-production-6a92.up.railway.app)

---

## Screenshots

| | |
|---|---|
| ![Login](tally-login.png) | ![Groups](tally-account-logged-in.png) |
| ![Group Detail](tally-group-details.png) | ![Add Expense](tally-added-expense.png) |
| ![Activity Log](tally-activity-log.png) | |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components + Route Handlers in one project |
| Language | TypeScript | Type safety across API and UI |
| Database | PostgreSQL | Relational model fits expenses/splits/settlements well |
| ORM | Prisma 7 | Type-safe queries, migrations, clean schema |
| Auth | JWT (jose) + bcrypt-ts | Stateless, httpOnly cookie, no external dependency |
| Styling | Tailwind CSS v4 + shadcn/ui | Semantic tokens make dark mode free |
| Real-time | Server-Sent Events (SSE) | Simple, native browser support, no extra infra |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/ahmedabubakr92/tally.git
cd tally
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tally
DIRECT_URL=postgresql://user:password@localhost:5432/tally
JWT_SECRET=your-secret-here
```

`DATABASE_URL` is used by the app at runtime. `DIRECT_URL` is used by Prisma CLI for migrations. For local development they are the same value.

### 3. Database setup

```bash
npx prisma migrate dev
npx prisma db seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

| Name | Email | Password |
|---|---|---|
| Rahul | rahul@example.com | password123 |
| Sneha | sneha@example.com | password123 |
| Pranay | pranay@example.com | password123 |

The seed creates a "Goa Trip" group with these three users, two expenses, and one settlement so you can see balances immediately.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | List the current user's groups |
| GET | `/api/groups/:id` | Group detail — members, expenses, settlements, activity |
| POST | `/api/groups/:id/members` | Add a member by email |
| POST | `/api/groups/:id/expenses` | Add an expense (equal split) |
| POST | `/api/groups/:id/settlements` | Record a settlement |
| GET | `/api/groups/:id/events` | SSE stream for real-time updates |

All endpoints require an authenticated session (JWT cookie). All mutations validate the request body with Zod and verify group membership before writing.

---

## Architecture

### Request flow

```
Browser
  │
  ├── Page navigation  →  Server Component  →  Prisma  →  PostgreSQL
  │                       (reads data directly, no API round-trip)
  │
  └── Form submit      →  fetch()  →  Route Handler  →  Prisma  →  PostgreSQL
                          (client component calls our own API for mutations)
```

- **Server Components** fetch directly from Prisma — no round-trip through our own API, faster initial load.
- **Client Components** call Route Handlers via `fetch()` for all mutations.
- **Server Actions** are used only for auth (signup, login, logout) since they need to set httpOnly cookies.
- **Route Handlers** handle all other mutations and the SSE stream.

### Data model

```
User ──< GroupMember >── Group
                          │
                          ├──< Expense >──< ExpenseSplit
                          ├──< Settlement
                          └──< ActivityLog
```

| Entity | Purpose |
|---|---|
| `User` | Account with email/password |
| `Group` | Named collection of members |
| `GroupMember` | Join table — a user belongs to many groups |
| `Expense` | Amount paid by one member, belonging to a group |
| `ExpenseSplit` | One row per participant — stores their share |
| `Settlement` | Records a payment between two members |
| `ActivityLog` | Append-only history of all actions in a group |

### Balance calculation

Balances are **calculated on read**, never stored. The `computeBalances()` function in `lib/balances.ts` takes the full list of expenses + splits + settlements and produces a minimal set of net debts.

**Algorithm:**
1. For each expense split where the participant is not the payer, record `participant → payer: shareAmount`.
2. For each settlement, subtract from the reverse direction (`paidBy → paidTo: -amount`).
3. For each unique pair (A, B), compute `net = ledger[A→B] - ledger[B→A]`. Positive means A owes B. Negative means B owes A.
4. Round to 2 decimal places. Discard amounts below 0.001 (floating-point epsilon).

**Equal split with rounding:** The total is converted to integer "fils" (×100), divided with `Math.floor`, and any remainder fils are distributed one-by-one to the first participants. This ensures splits always sum exactly to the total with no floating-point drift.

### Real-time updates

The app uses **Server-Sent Events (SSE)**:

1. `lib/sse.ts` maintains an in-memory `Map<groupId, Set<Controller>>` of open connections.
2. When a group page is opened, the browser connects to `GET /api/groups/:id/events`, which registers the response stream controller and sends a heartbeat every 30 seconds to keep the connection alive through proxies.
3. When any mutation completes (add expense, settle up, add member), `broadcast(groupId)` pushes `data: refresh\n\n` to all open controllers for that group.
4. The `GroupEventListener` client component receives the event and calls `router.refresh()`, which re-runs the Server Component and re-fetches fresh data from Prisma.
5. On permanent failure (401/404), the client detects `readyState === CLOSED` and reconnects after 5 seconds.

### Edge cases handled

| Case | How it's handled |
|---|---|
| Non-member adds expense | Route handler checks membership before any write — returns 403 |
| Split with non-member | Every `splitBetween` userId is validated against the group's member list |
| Unequal rounding | Fils-based integer arithmetic distributes remainder deterministically |
| Duplicate requests | Client generates a UUID `idempotencyKey` per submission — unique DB constraint returns the existing record on retry |
| Over-settlement | Allowed — balance flips direction, matching real-world behaviour |
| Concurrent settlements | Idempotency key prevents exact-duplicate races; DB constraints prevent corrupt state |
| SSE disconnect | `request.signal` abort cleans up the subscriber; browser auto-reconnects via native `EventSource` retry |
| Proxy idle timeout | 30-second SSE heartbeat (`: ping\n\n`) keeps connection alive |

### What I would improve with more time

- **Replace in-memory SSE registry with Redis pub/sub** — the current approach breaks in a multi-instance deployment since broadcast only reaches subscribers on the same process.
- **Unequal and percentage splits** — the schema already supports arbitrary share amounts via `ExpenseSplit.shareAmount`, only the UI and validation need to be added.
- **Expense editing and deletion** — deletion is straightforward since balances are recalculated from scratch; editing would reuse the same pattern.
- **Pagination** — expenses and activity logs are currently unbounded; large groups would need cursor-based pagination.
- **End-to-end tests** — the balance calculation logic especially deserves property-based tests with complex multi-expense/multi-settlement scenarios.
- **Push notifications** — notify members of new expenses even when they're not viewing the group.
