# Company Brain — Bubble Frontend Design

| | |
|---|---|
| **Document** | Bubble.md |
| **Version** | 1.0 |
| **Status** | Draft — pending approval |
| **Platform** | Bubble (responsive web, mobile-friendly). Specs & style guide mirror to `/frontend`. |
| **Related** | [UI screens ← this doc] · [API.md](API.md) · [AI.md](AI.md) · [Architecture.md](Architecture.md) |

> **Bubble's job is UI only.** No business logic, no data, no secrets, no role decisions live in Bubble — it authenticates, calls Xano APIs (via the API Connector), holds display state, and renders. Every role check is *also* enforced server-side in Xano; Bubble merely hides what the API would refuse.

---

## 1. Design Principles

1. **Answer-first** — every screen leads with the number the user came for; raw tables are one click deeper.
2. **Freshness always visible** — every data view shows the report date it reflects; stale/missing data is flagged, never shown as current.
3. **Precomputed reads** — dashboard/analytics bind to Xano endpoints that read the Market Intelligence Engine's precomputed tables, so pages load fast (NFR-2).
4. **Role-shaped UI** — Viewers never see upload/admin affordances.
5. **Mobile-friendly by construction** — built on Bubble's responsive engine; tables degrade to cards; chat is full-screen on phones.
6. **Every data element declares 3 states** — loading (skeleton), empty (guidance + CTA), error (retry).

---

## 2. Global Shell & Navigation

Implemented as **reusable elements** so navigation/auth/notifications are defined once.

| Reusable element | Contents | Notes |
|------------------|----------|-------|
| **`RE-Sidebar`** | Dashboard · Chat · Upload* · Product Explorer · Country Explorer · Reports · Settings*/Admin* · (future-module slots below a divider) | `*` visible by role; collapses to bottom tab bar < 768px |
| **`RE-TopBar`** | Global product search, **freshness chip** (`Data: 6 Jul 2026 ✓` / `⚠ No report today`), notification bell (+ unread badge), user avatar menu | Bell polls `GET /notifications/unread-count` |
| **`RE-AuthGuard`** | Redirects unauthenticated users to `/login`; preserves `?next=` deep link | On every page load |
| **`RE-RoleGate`** | Shows/hides children by current user role | Wraps admin-only UI |

**Navigation model:** single-page-feel via Bubble page groups where practical; distinct Bubble pages for the heavy screens (Dashboard, Chat, Upload, Explorers, Reports, Settings, Admin). Deep-linkable URLs with parameters (e.g. `/analytics?product_id=45&range=30d`) so **chat answers can link into Analytics** with filters pre-applied.

**State management:** JWT + current-user (id, role, org) held in Bubble custom states / browser storage, set at login, cleared at logout, refreshed transparently.

---

## 3. Reusable Components (build once, use everywhere — mirrors "no duplication" rule)

| Component | Used on | Purpose |
|-----------|---------|---------|
| `RE-KpiCard` | Dashboard | Label, value, trend arrow+%, click-through |
| `RE-PriceRow` | Explorers, Product Detail, Compare | One product/origin price line (name, flag, shipment, packing, price, Δ%, availability chip) |
| `RE-TrendChart` | Dashboard, Analytics, Chat, Product Detail | Line chart (min–max band) bound to `GET /analytics/price-history` |
| `RE-BarChart` | Compare, Chat | Comparison bars |
| `RE-DistributionDonut` | Dashboard, Country/Shipment views | Country/shipment/availability distribution |
| `RE-FilterRail` | Explorers, Reports | Search + category/country/shipment/availability/price filters, synced to URL |
| `RE-DataTable` | Explorers, Admin | Server-paginated, sortable table (never "load all") |
| `RE-StatusChip` | Upload, Admin | Pipeline/validation/severity chips (color + icon + label) |
| `RE-EmptyState` / `RE-Skeleton` / `RE-ErrorRetry` | everywhere | The mandatory 3 states |
| `RE-ProductPicker` / `RE-CountryPicker` | Review grid, Compare, Admin | Canonical-catalog pickers |
| `RE-Toast` / `RE-NotificationPanel` | shell | Transient + persistent notifications |
| `RE-ConfirmModal` | destructive actions | Replace day, deactivate user, merge product |

**Charts:** use a Bubble charting plugin fed *only* by Xano API data; every chart is paired with hover values / a data-table toggle (accessibility + trust).

---

## 4. Pages

### 4.1 Login — `/login` (public)
Split screen (brand panel + form card). Email/password → `POST /auth/login`; "Forgot password?" → `POST /auth/password/forgot` → confirmation → reset page (new password + strength meter). Inline errors: invalid credentials (never say which field), deactivated account, rate-limited. On success → Dashboard (honoring `?next=`). **No self-signup** — users are invited by admins. Responsive: single-column card on mobile.

### 4.2 Dashboard — `/` (all roles) — the auto-generated daily market
Binds to `GET /analytics/summary` (precomputed `market_summaries`).
1. **Header** — market name + freshness chip + last-upload status pill (admins see `Review pending` as a clickable warning).
2. **KPI row (`RE-KpiCard` ×4+)** — Products today · Origin countries · Avg market change vs previous · Biggest mover. Plus **Most expensive** & **Cheapest** cards.
3. **Movers** — Top gainers / Top losers (top 5 each), `RE-PriceRow`; click → Product Detail.
4. **Missing products** panel — products absent today vs recent window (supply signal).
5. **Distributions** — `RE-DistributionDonut` for country & shipment; availability breakdown.
6. **Embedded Product Explorer** — `RE-DataTable` + quick filters (25/page, server-side).
7. **Daily narrative** — the WF8 morning summary text.

States: skeleton cards; **fresh install** empty state ("Upload your first report to bring the dashboard to life", CTA for admins); **stale** amber banner ("Latest data is from 4 Jul — no report for 2 days").
Mobile: KPI cards stack 2-wide; movers as cards; donuts full-width.

### 4.3 Upload & Review (admin only)
Three-screen funnel — the most-repeated, keystroke-optimized workflow.

**4.3a Upload — `/upload`** · `POST /uploads`, `GET /uploads`
Dropzone (`.pdf .png .jpg .xlsx .xls`, ≤ 20 MB, client-side reject with reason) · report-date picker (default today; past date shows "backfilled report" note) · **duplicate guard** (409 → `RE-ConfirmModal` "A published report already exists for {date} — Replace?") · recent-uploads list with `RE-StatusChip`. Success → auto-navigate to Upload Detail.

**4.3b Upload Detail — `/uploads/{id}`** · `GET /uploads/{id}` (poll 3–5s)
Pipeline **stepper**: Uploaded → OCR → Cleaning → Validation → Review → Published (timestamps from `status_timeline`). File card (name, type, size, Drive link). On `review_pending`: summary banner + **Review rows** CTA. On `failed`: red panel with `error_log`, **Retry** (`POST /uploads/{id}/retry`), runbook link. **OCR log** panel (confidence, pages, duration).

**4.3c Review & Publish — `/uploads/{id}/review`** · `GET /uploads/{id}/rows`, `PATCH …/rows/{id}`, `POST …/rows/bulk`, `POST …/publish`
- Triage tabs: All · ⚠ Warnings · ✖ Errors · Rejected (opens on Warnings — the actual work queue).
- Grid (`RE-DataTable`): row# · raw text (monospace, tooltip = OCR confidence) · Product (`RE-ProductPicker`) · Variant · Origin (`RE-CountryPicker`) · Shipment · Weight/Unit · Packing · **Price** (shows `price_raw` incl. `NA`; NA→"Not available" chip, availability is *derived*, not an editable column) · flags · actions.
- Anomaly chips in plain words ("Price 45% above 7-day avg", "Unknown product", "Low OCR confidence").
- Inline editing, keyboard-first (Tab/Enter); edited rows auto-resolve to `edited`.
- **New-product flow**: `✨ New product: Dragon Fruit?` → Confirm (mini-form: name, category, variant) creates product + **alias** (learning loop) / Map instead → picker.
- Bulk bar: Approve selected · Reject (reason) · one-click "Approve all OK".
- Sticky **Publish footer**: live counts + **Publish N rows** (sends `confirm_row_count`; on `409 ROW_COUNT_MISMATCH` grid refreshes). Post-publish success screen with counts + links.

### 4.4 Chat — `/chat` (all roles) · `POST /chat/messages`, `GET /chat/sessions`, …
Two-pane: session sidebar (25%) + conversation (75%); mobile = full-screen conversation, sessions in a drawer.
- **Sidebar**: New chat, session list (title + relative time), rename/delete.
- **Empty state**: greeting + 6 suggestion chips from `GET /chat/suggestions` ("Tomato price today", "Onion prices last 30 days", "Compare Pakistan vs India potatoes", "Which products increased most today?", "Show Air shipment products", "Average onion price this month").
- **Assistant bubble**: answer text · inline chart (`RE-TrendChart`/`RE-BarChart`) when returned · **source line** ("📅 Based on the report of 6 Jul 2026", click → that day's data) · 👍/👎 feedback · "Open in Analytics" deep link.
- **Clarify** → quick-reply chips; **Refusal** → capability hint.
- **Composer**: 1,000-char limit + counter, Enter-to-send / Shift+Enter newline, disabled with "Checking the market data…" while in flight; 20s timeout → error bubble + Retry; 429 → gentle "slow down" notice.
No streaming in v1 (orchestrator returns complete turns); the loader carries the wait. Multi-turn context is server-side — Bubble just always sends `session_id`.

### 4.5 Product Explorer — `/products` (all roles) · `GET /prices/latest`
Full `RE-FilterRail` (search, category, country, shipment, **availability** (derived: available / not-available), price range — synced to URL) + `RE-DataTable` (Product · Variant · Category · Origin · Shipment · Packing · **Price** (NA shown as "Not available") · Price/kg · Δ% · date). Sortable, server-paginated (50/page). Row → **Product Detail drawer**: today's observations per origin/shipment (with per-row provenance link → source upload), 30-day `RE-TrendChart`, admin extras (edit product, aliases, merge). Export (analyst+) → `GET /prices/export`.

### 4.6 Country Explorer — `/countries` (all roles) · `GET /analytics/summary`, `GET /prices/latest?country_id=`
Left: country list with flag + product count + avg price (from country distribution). Select a country → its products grid + shipment mix + a **compare origins** shortcut for any product. Answers "Show UAE products", "which origins are cheapest for onion".

### 4.7 Reports — `/reports` (analyst+, viewer read-only where allowed)
Tabbed analytics workspace (deep-linkable; chat links land here):
- **Trends**: product picker + range pills (7/30/90/365/custom) + origin filter + granularity; `RE-TrendChart` (avg + min–max band), stats strip; multi-origin overlay (≤5 lines).
- **Compare**: product + dimension toggle (By country / By shipment) + date; `RE-BarChart` + table; optional 30-day trend overlay.
- **Market Structure**: shipment donut + avg price/mode; category overview bars ("what got expensive today").
- **Export**: current view → async CSV/XLSX (`GET /prices/export`), toast on ready. Viewer sees no export button.

### 4.8 Settings — `/settings/*`
- **Profile** (all): name, avatar, password, notification prefs (email column "coming soon" until Phase 5).
- **Users** (admin): user table; invite modal → `POST /admin/users/invite`; role change / deactivate via `RE-ConfirmModal` (self-demotion/self-deactivation blocked).
- **Catalog & Reference** (admin; analyst read-only): products/variants CRUD; alias editor; **Merge** wizard (preview "moves 3 aliases + 1,240 rows" → confirm, audited); countries/shipment/packing CRUD with synonym editors.
- **Market & Pipeline** (admin): org settings (`GET/PATCH /admin/settings`: anomaly threshold, auto-publish toggle with warning copy, missing-product window, retention); extraction-template versions.

### 4.9 Admin Panel — `/admin` (admin only)
Ops cockpit: usage cards (`GET /admin/usage`: ingestion success rate, chat volume, **AI cost this month by feature**), audit log table (`GET /admin/audit-log`, filter by actor/action/entity), OCR logs browser, pipeline health (recent uploads + statuses). Read-heavy; actions gated by `RE-ConfirmModal`.

---

## 5. Responsive Behaviour (mobile-friendly, NFR-9)

| Breakpoint | Layout |
|-----------|--------|
| **Desktop ≥ 1024px** | Sidebar + multi-column dashboards; full tables; two-pane chat |
| **Tablet 768–1023px** | Collapsible sidebar; 2-col KPI grid; tables scroll horizontally in a container |
| **Mobile < 768px** | Bottom tab bar; KPI cards stack; **tables become card lists** (`RE-PriceRow` cards); chat full-screen with session drawer; filters in a slide-over sheet |

Rules: relative units & Bubble responsive containers; min 44px touch targets; wide tables/charts scroll inside their own container (page never scrolls horizontally); images `max-width:100%`.

---

## 6. Style & Copy Standards (full guide in `/frontend/style-guide.md`)

- **Semantic color** = meaning only: green = price down/favorable-for-buyer & success, red = price up & error, amber = warning/stale. **Always pair color with a direction arrow** (color-blind safety).
- **Numbers**: prices 2 dp + `AED`, tabular numerals; percent changes signed with arrow (▲ 4.2%).
- **Dates**: absolute for data ("6 Jul 2026"), relative for activity ("2 h ago").
- **States**: skeletons over spinners for content; every error says what happened *and* what to do.
- **Accessibility**: WCAG AA contrast; keyboard-reachable; charts always paired with values/table.
