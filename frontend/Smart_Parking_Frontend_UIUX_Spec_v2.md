# Smart Parking Management System — Admin Frontend UI/UX Specification (v2)

**Purpose of this document:** This is the **updated, authoritative** frontend specification for the Admin web application, replacing v1. It incorporates a full round of client-requested UI/UX changes on top of the original design. This version also reflects the confirmed project pivot: **this app is Admin-only** (single admin, multi-site, multi-operator). The Operator-facing experience is now a separate native Android application, built by a different team member, and is **out of scope for this document**.

**Platform:** React + TypeScript + Tailwind CSS web app (unchanged from v1).

**Scope covered:**
1. Admin Dashboard & all management screens (multi-site, multi-operator)
2. Digital Availability Display (kiosk/board screen) — unchanged from v1, included for completeness

---

## 0. Changelog — v1 → v2

This section exists so Antigravity treats this as an **edit pass on the existing codebase**, not a rebuild. Everything not listed here is unchanged from v1 — leave it as-is.

| Screen | Change Type | Summary |
|---|---|---|
| Global / Sidebar | Removed | Role toggle (Admin/Operator) — app is now Admin-only |
| Global / Sidebar | Changed | User block (avatar/name/role) moved to bottom of sidebar, merged with Sign Out |
| Global / Sidebar | Changed | Top-right header logout removed (sidebar is now the only logout location) |
| Global / Theme | Changed | Sidebar background/active-state color lightened (deep navy → muted steel-blue) |
| Header | Removed | "Live Availability" pill |
| Header | Added | Site Switcher control (replaces small terminal/gate text) |
| Header | Added | Clickable site name → new Site Details page |
| Dashboard | Changed | Occupancy cards: removed duplicate stat line, keep single "% Available" |
| Dashboard | Changed | Revenue card currency icon: `$` → `₹` |
| Dashboard | Changed | Revenue card and Transactions card are now clickable → Reports (prefiltered) |
| Site Details | **New screen** | Location, finance analysis, operator roster for the selected site |
| Slot Management | Changed | Add Slot modal now has backdrop blur |
| Slot Management | Changed | Slot detail: side drawer → dedicated full page |
| Slot Management | Removed | Sensor ID field |
| Slot Management | Changed | Deactivation requires typed free-text reason; reason shown on slot detail |
| Slot Management | **New** | Slot History table (per-slot session + deactivation log) |
| Session Detail | Removed | Redundant billing/duration summary card |
| Session Detail | Changed | Billing calculation now proportional (interim rule, pending client confirmation) |
| Receipt | Changed | "Reprint Receipt" → always "Print Receipt" |
| Receipt | Changed | Side drawer → dedicated page, generated on request, with in-page Print button |
| Receipt | Changed | Site address shown instead of static "Terminal 2" |
| Session History | Changed | Column headers now functional (sortable) |
| Session History | Changed | Fixed unnecessary horizontal scroll |
| Session History | Fixed | Export to PDF now generates a real file (CSV unchanged, already working) |
| Reports | **New tab** | "Transactions" tab added alongside Revenue / Occupancy / Avg. Duration |
| Reports | Fixed | Both CSV and PDF export now generate real files |
| User Management | Reframed | Now "Operator Management" — global list across all sites, with site filter |
| User Management | Added | Site assignment/reassignment per operator |
| User Management | Added | Operator profile detail page (mock personal/identity data) |
| User Management | Added | Google Sign-In placeholder note in Add Operator flow |
| Settings | Added | "Add New Site" sub-section (site fields, mock data) |
| Kiosk Display | No change | Unchanged from v1 |

---

## 1. Design Direction

Parking software lives on two very different surfaces — a data-dense admin dashboard, and a glanceable public sign read from a moving car. The visual system below serves both from one shared design language.

**Overall style:** Clean, modern, utilitarian-industrial. Confident, high-contrast, unfussy — airport signage crossed with a modern logistics dashboard, not a playful consumer app.

### 1.1 Color Palette (v2 — sidebar lightened)

| Token | Hex | Usage | Change |
|---|---|---|---|
| `--color-sidebar-bg` | `#1E3A5F` | Sidebar background | **Changed** from `#111827` (near-black) — lighter, muted steel-blue, less "AI-generated dashboard" signature |
| `--color-sidebar-active` | `#2C5282` | Active nav item highlight | **Changed** from `#1E3A8A` — softer mid-blue |
| `--color-primary` | `#1E3A8A` (deep blue) | Buttons, links, active states outside sidebar | Unchanged |
| `--color-primary-light` | `#3B5FCC` | Hover states, links | Unchanged |
| `--color-accent` | `#F59E0B` (amber) | Highlights, "attention" badges, rate change indicators | Unchanged |
| `--color-success` | `#16A34A` | Available slots, successful actions, "vacant" | Unchanged |
| `--color-danger` | `#DC2626` | Full/occupied, errors, denied entry | Unchanged |
| `--color-warning` | `#D97706` | Low availability (<15% slots left), pending states | Unchanged |
| `--color-neutral-900` | `#111827` | Primary text, kiosk background (dark mode) | Unchanged |
| `--color-neutral-700` | `#374151` | Secondary text | Unchanged |
| `--color-neutral-400` | `#9CA3AF` | Disabled text, placeholders | Unchanged |
| `--color-neutral-200` | `#E5E7EB` | Borders, dividers | Unchanged |
| `--color-neutral-50` | `#F9FAFB` | Dashboard background | Unchanged |
| `--color-white` | `#FFFFFF` | Cards, surfaces | Unchanged |

**Sidebar text/icons** remain white/light-gray for contrast against the new lighter blue background.

### 1.2 Typography — Unchanged from v1

- **Font family:** `Inter` (UI/dashboard). Fallback: `system-ui, -apple-system, sans-serif`.
- **Kiosk display font:** `Inter` heavy weights, or `Archivo Black` for large numerals.

| Style | Size | Weight | Usage |
|---|---|---|---|
| Kiosk Mega Number | 180–260px | 800 | Car/scooter/total slot counts |
| Kiosk Label | 32–40px | 600 | "CAR SLOTS LEFT" labels |
| Dashboard H1 | 28px | 700 | Page titles |
| Dashboard H2 | 20px | 600 | Section/card headers |
| Dashboard Body | 14–15px | 400 | Table content, form labels |
| Dashboard Small | 12px | 500 | Timestamps, meta text, badges |

### 1.3 Spacing & Grid — Unchanged from v1

- Base unit: 8px. Card radius: 12px. Buttons/inputs: 8px. Badges/pills: fully round.
- Dashboard: 12-column grid, max content width 1440px, 24px gutters/padding (16px tablet, 12px mobile).
- Soft shadows only — `0 1px 2px rgba(0,0,0,0.05)` resting, `0 4px 12px rgba(0,0,0,0.08)` hover/modal.

### 1.4 Iconography — Unchanged from v1

**Lucide** icon set throughout. 20px nav/buttons, 16px inline, 24px+ empty-state illustrations.

---

## 2. Information Architecture

### 2.1 Admin Dashboard — Sitemap (v2)

```
/login
/dashboard                     (admin — only role in this app)
/sites/:siteId                 (NEW — Site Details page)
/slots                         (site-scoped)
/slots/:slotId                 (NEW — dedicated slot detail page, replaces drawer)
/rates                         (site-scoped)
/sessions                      (site-scoped)
/sessions/:id                  (session detail)
/sessions/:id/receipt          (NEW — dedicated receipt page, generated on request)
/reports                       (tabs: Revenue / Occupancy / Avg. Duration / Transactions [NEW])
/operators                     (renamed from /users — global, all sites, with site filter)
/operators/:operatorId         (NEW — operator profile detail page)
/settings                      (includes new "Add New Site" sub-section)
```

**Note:** No `/users` role-based restriction logic is needed anymore — this entire app is Admin-only, so all routes above are accessible without role checks. The Operator role and its permission logic from v1 (`role: admin, operator`, hidden nav items, etc.) is removed entirely; that logic now lives in the separate Android app.

### 2.2 Kiosk Display — Sitemap (unchanged)

```
/display                       (public, no auth, single full-screen route)
/display?state=full            (optional query param to preview "facility full" state)
```

### 2.3 Navigation Structure (v2)

Persistent left sidebar, in the new lighter steel-blue (§1.1):

- 🏠 Dashboard
- 🅿️ Slot Management
- 💲 Rate Configuration
- 📋 Session History
- 📊 Reports
- 👤 Operator Management *(renamed from User Management)*
- ⚙️ Settings
- 🎦 Open Kiosk Display *(external link, unchanged position)*
- **[Bottom of sidebar — merged block, NEW placement]:** Avatar + Name + Role badge, directly above a "Sign Out" action.

**Top bar (v2):**
- Left: facility/site logo
- Center-left: **Site Switcher** (NEW — replaces the old small terminal/gate text) — see §3.2.2
- Center: **current site name**, clickable → Site Details page (NEW — see §3.2.3), replacing the removed "Live Availability" pill
- Right: *(role toggle removed entirely)*
- **No header-level logout** — logout now lives only in the sidebar (§2.3 above)

---

## 3. Screen-by-Screen Specifications

### 3.1 Login Screen (`/login`) — Unchanged from v1

**Layout:** Centered card (max-width 400px) on `--color-neutral-50` background, facility logo above.

**Elements:** Username field, password field (show/hide toggle), "Sign In" button, inline error banner for invalid credentials, account-lockout state after repeated failures, "Forgot your password? Contact your administrator" text (no self-service reset).

**States:** default, field validation error, submitting, invalid credentials, account locked.

---

### 3.2 Dashboard / Overview (`/dashboard`)

**Purpose:** Single-glance operational summary for the currently selected site.

**Layout:** 12-column grid.

#### 3.2.1 Sidebar — Bottom User Block (CHANGED)
- Remove the previous top-right header logout entirely.
- Move the user identity block (avatar "R" + "Rajesh Sharma" + "Admin" badge) to the **bottom of the sidebar**, directly above the "Sign Out" action, forming one cohesive unit: avatar/name/role, then Sign Out beneath it.

#### 3.2.2 Header — Site Switcher (NEW)
- Replaces the previous small "Terminal 2 · Gates 1 & 2" text with a **prominent, clearly clickable control** — button showing current site name + dropdown chevron, sized for easy visibility (not the old tiny text).
- Clicking it opens a small dynamically rendered popover/modal listing all available sites (mock data), each showing site name + a quick live occupancy summary for context.
- Selecting a site: closes the popover, **refreshes all site-scoped data** on the current screen, and **persists the selection** across navigation (Slot Management, Sessions, Reports, etc. all stay scoped to the selected site until changed again).

#### 3.2.3 Header — Site Name → Site Details Page (NEW)
- Where the old "Live Availability" pill sat, show the **current site's name**, styled clearly, clickable.
- Clicking navigates to a new full page: **Site Details** (`/sites/:siteId`) — see §3.10.

#### 3.2.4 Occupancy Cards — Simplified (CHANGED)
- **Car Slots / Scooter Slots / Total Slots** cards: keep the number ("13 / 39 slots"), the progress bar, and exactly **one** stat line — **"% Available"** only. Remove the redundant second line (previously showing both "% Left" and "% Occupied"/"% Available" together).
- Card border color logic unchanged: green >30% available, amber 10–30%, red <10%/full.

#### 3.2.5 Header — Remove "Live Availability" Pill (REMOVED)
- The green "Live Available: X/58 Slots (%)" pill is removed entirely — superseded by §3.2.3 and the Total Slots card.

#### 3.2.6 Remove Admin/Operator Toggle (REMOVED)
- The header's "Admin | Operator" segmented toggle is removed entirely — this app is Admin-only.

#### 3.2.7 Today's Revenue Card (CHANGED)
- Currency icon (top-right of card) changed from `$` to `₹`, matching the ₹ amount already shown in the card body.
- Card becomes clickable → navigates to **Reports → Revenue tab** (prefiltered to today), scoped to the current site.

#### 3.2.8 Today's Transactions Card (CHANGED)
- Card becomes clickable → navigates to **Reports → Transactions tab** (NEW tab, see §3.6.1), prefiltered to today, scoped to current site.
- The Transactions tab is also independently reachable from the Reports sidebar item — both entry points land on the same screen.

**Row 3 — Recent Transactions (unchanged):** Table, most recent 10 sessions, columns: Vehicle No. | Category | In-Time | Out-Time | Duration | Amount | Status. "View all →" link to `/sessions`.

**Row 4 — Quick Alerts panel (unchanged):** Compact list of system flags. Empty state: *"No alerts — everything's running smoothly."*

**Refresh behavior (unchanged):** Occupancy cards and transaction table auto-refresh every 5–10 seconds, subtle pulse/highlight animation on changed numbers.

---

### 3.3 Slot Management (`/slots`)

**Purpose:** View and manage the physical slot inventory for the currently selected site.

**Layout (unchanged structure):**
- Top toolbar: search box, category filter, status filter, "+ Add Slot" button.
- Main content: grid of slot tiles (Grid/Table view toggle).

#### 3.3.1 Add Slot Modal — Backdrop Blur (CHANGED)
- When the "Add New Parking Slot" modal opens, apply a subtle backdrop blur (`backdrop-filter: blur(4–6px)` + semi-transparent dark overlay) behind it, replacing the current plain dim/no-blur background.

**Add/Edit Slot modal fields (unchanged):** Slot ID, Category, Location code, Status. Validation: Slot ID required and unique.

**Empty state (unchanged):** *"No slots configured yet. Add your first slot to get started."*

---

### 3.4 Slot Detail — Dedicated Page (`/slots/:slotId`) (CHANGED — was a side drawer in v1)

**Purpose:** Full detail and history for one specific slot.

- Navigated to by clicking a slot tile in Slot Management. Not listed in sidebar nav — dynamic route only.
- **Back navigation:** leaving this page returns to wherever the admin came from (standard router back behavior), not a hardcoded redirect.
- **Layout:** must not require scrolling for a normal amount of content — use a two-column layout (status/config on one side, active session + history on the other) rather than a single narrow stacked column.

**Content:**
- **Current Status** badge (Occupied / Vacant / Deactivated)
- **Configuration Details:** Vehicle Category, Location Code — **Sensor ID field removed entirely** (no physical sensors planned)
- **Active Session** (if occupied): vehicle number, session ID, "View Session" link
- **Deactivation Reason** (CHANGED — new required field): before deactivating a slot, admin must type a reason into a free-text textarea (not a dropdown) — deactivation cannot proceed with empty text. Once deactivated, this reason is displayed clearly next to the "Deactivated" badge.
- **Administrative Actions:** Deactivate/Reactivate controls

#### 3.4.1 Slot History Table (NEW)
- A table on this page showing the slot's full chronological history:
  - Columns: Vehicle Number, Category, In-Time, Out-Time, Duration, Amount — plus, for deactivation events: Deactivation Reason, who deactivated/reactivated it, and when.
  - Sessions and deactivation events shown together, most recent first, so the admin sees both "who parked here" and "when/why it went out of service" in one place.
  - Built from existing session records (already linked to slot ID) plus a new simple deactivation-event record type — no major new data model required.

---

### 3.5 Rate Configuration (`/rates`) — Unchanged from v1

Card per vehicle category, editable inline rate with confirmation modal, Rate Change History table below.

---

### 3.6 Session History (`/sessions`)

**Layout (mostly unchanged):** Filter bar, data table, pagination, row click → `/sessions/:id`.

#### 3.6.1 Column Headers — Now Functional (CHANGED)
- Every column header is now sortable: click toggles ascending/descending on that column, with a ▲/▼ indicator on the active sort column. Only one column sorts at a time.

#### 3.6.2 Horizontal Scroll Fix (CHANGED)
- Adjust column width allocation so the full table fits within the viewport at standard desktop widths without horizontal scrolling. Use truncation + tooltip-on-hover for any inherently long cell content instead of forcing a scrollbar.

#### 3.6.3 Export to CSV — Unchanged
Confirmed working, no changes.

#### 3.6.4 Export to PDF — Fixed (CHANGED)
- Now generates an actual downloadable PDF of the currently filtered/sorted table data, in a clean readable layout. Shares the same underlying export utility as the Reports PDF export (§3.8.3) to avoid duplicate implementation.

---

### 3.7 Session Detail (`/sessions/:id`) & Receipt (`/sessions/:id/receipt`)

#### 3.7.1 Session Detail — Remove Redundant Billing Card (CHANGED)
- The billing/duration summary card previously shown inside Session Detail is **removed**. Session Detail keeps: vehicle/category/slot facts, timestamps, status, and the entry→exit lifecycle stepper — billing details now live only in the Receipt.

#### 3.7.2 Billing Calculation — Fixed Logic (CHANGED)
- **Formula (interim rule, pending client confirmation):** `amount = (duration_in_minutes / 60) × hourly_rate`, computed proportionally to 2 decimal places — **not** rounded up to the next full hour.
- Applies consistently everywhere duration-based billing appears: Session Detail, Receipt, Session History table.

#### 3.7.3 Receipt — Dedicated Page, "Print Receipt" Label (CHANGED)
- Button is always labeled **"Print Receipt"** (never "Reprint Receipt"), regardless of how many times generated.
- Opens as a **dedicated page** (`/sessions/:id/receipt`), generated only on request — not pre-rendered. Styled cleanly for on-screen viewing, with an in-page "Print" button that triggers `window.print()` using a `@media print` stylesheet (hides nav/sidebar/header, shows only the receipt, sized for standard paper or thermal-printer width).

#### 3.7.4 Receipt — Site-Specific Address (CHANGED)
- Replace the static "Terminal 2" label with the actual selected site's address, pulled from that site's record (see §3.11 Site data model).

**Receipt layout (unchanged structure, address now dynamic):**
```
──────────────────────────────
      [Facility Name/Logo]
      Parking Receipt
──────────────────────────────
Vehicle No.:      MH12AB1234
Category:         Car
Slot:              C-14
Site Address:      [site.address]
Date:              04-Sep-2026
In-Time:           09:12 AM
Out-Time:          11:45 AM
Duration:          2h 33m
Rate:              ₹30/hr
──────────────────────────────
TOTAL AMOUNT:      ₹[proportional calc]
──────────────────────────────
      Thank you — Drive safe
──────────────────────────────
```

---

### 3.8 Reports (`/reports`)

**Layout (mostly unchanged):** Tabs, date range selector, category filter, chart area, stat cards, data table.

#### 3.8.1 New "Transactions" Tab (NEW)
- Fourth tab alongside Revenue / Occupancy / Avg. Duration.
- Content: transaction count over the selected date range, split by category, bar/line chart (transactions per day), summary stat cards (Total Transactions, Avg. Transactions/Day, Car vs. Scooter split).
- Reachable via: (1) Reports sidebar item directly, (2) Dashboard's "Today's Transactions" card (prefiltered to today).
- Scoped to the currently selected site, same as the other tabs.

#### 3.8.2 Export to CSV — Fixed (CHANGED)
- Generates a real CSV of the currently displayed report's data (whichever tab is active), respecting current date range and site.

#### 3.8.3 Export to PDF — Fixed (CHANGED)
- Generates an actual formatted PDF: chart rendered as an image, underlying data in a clean table below it, header with site name/report type/date range. Shares the same export utility as Session History's PDF export (§3.6.4).

**Loading state (unchanged):** Skeleton chart + skeleton stat cards.

---

### 3.9 Operator Management (`/operators`) (RENAMED from User Management, restructured)

**Purpose:** Manage all operators across all sites (single Admin, multiple Operators model).

#### 3.9.1 Operator List
- Shows **all operators across all sites by default** (not scoped to the currently selected site elsewhere in the app).
- Includes a **Site filter** to narrow the list to a specific site.
- Columns: Name, Assigned Site, Status (Active/Terminated), Date Added, Actions.

#### 3.9.2 Add Operator (CHANGED)
- "+ Add Operator" opens a modal: Name, Assigned Site (dropdown), contact fields — mock data.
- Includes visible helper text: *"Operator will verify identity via Google Account sign-in. Additional verification (e.g., Aadhaar) may be added pending client confirmation."*

#### 3.9.3 Terminate Operator (unchanged pattern)
- "Terminate" action with confirmation modal; sets status to Terminated rather than deleting the record (preserves historical association with sessions/sites).

#### 3.9.4 Assign / Reassign Site (NEW)
- Each operator row has a "Reassign Site" action → dropdown/modal to pick a new site, updating "Assigned Site" immediately (mock data update).

#### 3.9.5 Operator Profile — Detail Page (`/operators/:operatorId`) (NEW)
- Dedicated page (consistent pattern with Slot Detail — not a drawer):
  - Basic info: name, contact, assigned site, status, date added
  - Simulated identity section: e.g., "Verification: Google Account Linked" (placeholder for future Aadhaar/verification data)
  - Activity summary: sessions processed, site reassignment history (mock data)
- Built with realistic mock data, structured to be swapped for real data later without restructuring the page.

#### 3.9.6 Noted for Future (Not Built Now)
- Salary and attendance calculation per operator — explicitly deferred pending client confirmation.

---

### 3.10 Site Details (`/sites/:siteId`) (NEW SCREEN)

**Purpose:** Full detail view for a single site, reached only by clicking the site name in the header (§3.2.3).

**Content:**
- **Location:** site address, gate/terminal info, map placeholder/coordinates (mock)
- **Finance Analysis:** revenue trend chart for this site — reuses the Reports module's chart component scoped to this site (avoids duplicating chart logic)
- **Operator Roster:** operators currently assigned to this site (name, role, status) — pulled from the same data source as Operator Management (§3.9), filtered to this site (avoids duplicating data structures)

Not listed in sidebar nav — reachable only via the header site name.

---

### 3.11 Settings (`/settings`)

**Existing settings content:** unchanged from v1.

#### 3.11.1 Add New Site (NEW sub-section within Settings — not a separate nav item)
- "+ Add New Site" button opens a form (mock data, since this feature is still being defined):

| Field | Purpose |
|---|---|
| Site Name | Identifies the site (e.g., "AeroPark – Hadapsar") |
| Address | Used on receipts (§3.7.4) and Site Details (§3.10) |
| Total Car Slots | Initial occupancy math for the site |
| Total Scooter Slots | Same, for scooters |
| Gate/Terminal Info | Per-site version of the existing "Terminal 2 · Gates 1 & 2" descriptor |
| Default Hourly Rate (Car / Scooter) | Starting value for Rate Configuration on this site |
| Status (Active / Coming Soon) | Lets a site be added without appearing live in the Site Switcher yet |

- On submission, the new site becomes selectable in the Site Switcher (§3.2.2) and behaves like any other site for demo purposes.
- Keep validation minimal — this feature is intentionally not fully defined yet.

---

### 3.12 Receipt / Ticket Layout — See §3.7.3–3.7.4 (moved from standalone §3.8 in v1)

---

### 3.13 Digital Availability Display (`/display`) — Unchanged from v1

**Purpose:** Full-screen, no-chrome public sign, legible from a moving vehicle.

**Layout:** Full-viewport, dark background, three-panel horizontal layout (Car / Scooter / Total), reflows to stacked on portrait boards.

- Numerals colored by availability threshold (green/amber/red), "FULL" label when a category hits zero.
- "Live" pulsing indicator + "Updated Xs ago" timestamp.
- Auto-refresh within 2 seconds of entry/exit events, brief scale/fade transition animation.
- "Facility Full" full-screen red takeover state when both categories are full.
- Responsive targets: 1920×1080 (landscape) and 1080×1920 (portrait).

*(No changes requested to this screen in this round.)*

---

## 4. Component Library — Unchanged from v1, with one addition

| Component | Variants/Notes |
|---|---|
| Button | Primary, Secondary, Destructive, Ghost, Icon-only. States: default, hover, active, disabled, loading |
| Input field | Text, Number, Password, Search, Select/Dropdown, Date range picker |
| Badge/Pill | Vacant (green), Occupied (red), Active (blue), Completed (gray), Locked (amber) |
| Card | Standard elevated card, stat card, alert card — **stat cards now support a clickable variant** (NEW — used by Revenue/Transactions cards, §3.2.7–3.2.8) |
| Table | Sortable headers (now used more widely per §3.6.1), row hover, pagination, empty state, skeleton rows |
| Modal | Standard, confirmation (destructive variant), **now with backdrop blur support** (NEW — §3.3.1) |
| Toast/Notification | Success, Error, Info — top-right, auto-dismiss 4s |
| Sidebar nav | **No longer role-aware** (Admin-only app) — simplified from v1's role-conditional rendering |
| Progress bar | Color-coded by threshold |
| Empty state | Icon + heading + description + optional CTA |
| Skeleton loader | Tables, charts, cards during data fetch |

---

## 5. Interaction & State Patterns — Unchanged from v1

- Loading: skeletons, never blank spinners for primary content.
- Empty state: icon + explanation + CTA where actionable.
- Error state: inline for fields, banner/toast for request failures.
- Destructive actions: always a confirmation modal naming the specific item.
- Real-time updates: 150–250ms transition + highlight flash on live-changing numbers.
- **Role-based UI note removed** — no longer applicable, this app is single-role (Admin).

---

## 6. Accessibility & Responsiveness — Unchanged from v1

WCAG AA contrast, keyboard navigability, color paired with text/icon (never color alone), standard responsive breakpoints for dashboard, kiosk display fixed-purpose per board orientation.

---

## 7. Data Contract Expected by This Frontend (v2 — extended)

```
GET /api/v1/sites
[{ id, name, address, gateInfo, totalCarSlots, totalScooterSlots, defaultCarRate, defaultScooterRate, status }]

GET /api/v1/sites/:siteId
{ ...site fields, financeSummary: {...}, operators: [...] }

GET /api/v1/availability?siteId=
{ carAvailable, carTotal, scooterAvailable, scooterTotal, totalAvailable, totalSlots, updatedAt }

GET /api/v1/sessions?siteId=&status=&category=&dateFrom=&dateTo=&search=&page=&sortBy=&sortDir=
{ sessions: [{ id, vehicleNumber, category, slotId, inTime, outTime, durationMinutes, amount, status }], totalCount, page }

GET /api/v1/slots/:slotId/history
{ sessions: [...], deactivationEvents: [{ reason, actionedBy, actionedAt, action: 'deactivate'|'reactivate' }] }

GET /api/v1/rates?siteId=
[{ id, category, hourlyRate, lastUpdatedAt, lastUpdatedBy }]

GET /api/v1/reports?siteId=&type=&dateFrom=&dateTo=&category=
{ type, dataPoints: [{ label, value }], summary: { totalRevenue, peakOccupancyPct, avgDurationMinutes, totalTransactions } }

GET /api/v1/operators?siteId=
[{ id, name, assignedSiteId, status, dateAdded, contact, authMethod: 'google' }]

GET /api/v1/operators/:operatorId
{ ...operator fields, activitySummary: {...}, siteHistory: [...] }
```

---

## 8. Notes for Frontend Generation (Antigravity) — v2

- **This is an edit pass on the existing codebase**, not a rebuild. Reference the Changelog (§0) to scope changes precisely — do not regenerate screens/components that aren't listed there.
- Apply the sidebar color change (§1.1) via the existing CSS variable/Tailwind theme config — should be a small, contained change.
- Remove all Operator-role logic, conditional nav rendering, and the Admin/Operator toggle — this app is now single-role.
- Build the new Site data model and Site Switcher first (§3.2.2, §7), since Slot Management, Sessions, Rates, and Reports all become site-scoped as a result — this is the foundational change most other items depend on.
- Reuse existing chart/table/export components where new screens call for similar functionality (Site Details' finance chart, the new Transactions report tab, shared CSV/PDF export utility) rather than building duplicates.
- Flag any ambiguity before proceeding, particularly around the Site data model shape, since several screens now depend on it consistently.
