# Smart Parking Management System

> *To design and develop an automated smart parking management system that displays real-time car and scooter slot availability on digital boards and issues time-based billing receipts using recorded vehicle entry and exit timestamps.*

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](#5-tech-stack)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178C6?logo=typescript&logoColor=white)](#5-tech-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.15-38B2AC?logo=tailwind-css&logoColor=white)](#5-tech-stack)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?logo=vite&logoColor=white)](#5-tech-stack)

---

## 1. Overview

The **Smart Parking Management System** is an automated multi-site facility management solution designed for commercial and institutional parking installations. In typical parking facilities, arriving motorists lack real-time visibility into whether car or scooter bays are available, causing entrance congestion, unnecessary circling, and fuel waste. Furthermore, manual logging of vehicle entry and exit timestamps is slow, prone to reconciliation errors, and difficult to audit.

This application provides the complete web interface for the system across its two primary user surfaces:

1. **Central Admin Management Dashboard**: A responsive, data-dense operations portal used by administrators to oversee multi-site parking facilities (e.g. AeroPark Hadapsar, Camp, and Kothrud), switch active site contexts, monitor bay occupancies, inspect individual slot histories, configure hourly tariffs, analyze revenue and transaction reports, issue thermal receipts, and govern cross-site operator rosters. *(Note: On-ground operator interactions are handled via a companion native Android application).*
2. **Digital Availability Display (Kiosk Screen)**: A high-contrast, glanceable public billboard display designed for outdoor LED/LCD installations positioned above or below parking hoardings. It displays mega-scale availability counts legible from moving vehicles at distances of 10–15 meters.

> [!IMPORTANT]
> **Current Project Phase:** Frontend-only implementation (v2 architecture) — the user interface, interaction states, multi-site scoping, and design system are complete and running on mocked data matching the formal API contracts. Backend API development, PostgreSQL database configuration, and physical hardware/sensor integration are planned for the next development phase.

---

## 2. Current Status & Scope (v2 Architecture)

The table below outlines the implementation status of the system against the updated **UI/UX Spec v2**:

| Area | Component / Requirement | Status | Traceability & Notes |
|---|---|---|---|
| **System Model** | Single Admin, Multi-Site, Multi-Operator Model | Completed | Admin-only web app; removed Operator role toggles per v2 |
| **Site Scoping** | Global Header Site Switcher & Persistent Context | Completed | Switch between Hadapsar, Camp, Kothrud & dynamic new sites |
| **Site Details** | Dedicated `/sites/:siteId` Page | Completed | Location, gate info, 7-day revenue trend, & assigned operators |
| **Slot Management** | Dedicated `/slots/:slotId` Page & History Log | Completed | Replaced side drawer with 2-column detail page & audit history |
| **Slot Deactivation** | Mandatory Typed Deactivation Reason | Completed | Requires free-text maintenance reason before deactivating |
| **Thermal Receipt** | Dedicated `/sessions/:id/receipt` & In-page Print | Completed | Proportional billing calculation; site address; window.print() |
| **Session Detail** | Cleaned Lifecycle Stepper (`/sessions/:id`) | Completed | Removed duplicate billing cards; streamlined stepper |
| **Session History** | Sortable Column Headers & Clean Table Fit | Completed | Interactive sorting (▲/▼) across all headers; no horizontal scroll |
| **File Exports** | Direct File Download for CSV & PDF | Completed | Built with `jspdf` & `jspdf-autotable` without print dialogs |
| **Reports** | New "Transactions" Tab & Prefiltered Drilldown | Completed | 4 tabs: Revenue, Occupancy, Duration, & Transactions |
| **Operator Management** | Global Operator Roster & Reassignments (`/operators`) | Completed | Cross-site staff list, site filtering, site reassignment modal |
| **Operator Profile** | Dedicated `/operators/:operatorId` Page | Completed | Identity details, Google verification, site transfer history |
| **Settings** | "Add New Site" Sub-section | Completed | Add dynamic parking facilities with live switcher integration |
| **Digital Kiosk** | Standalone Full-screen Billboard (`/display`) | Completed | High-contrast mega numerals, 16:9/9:16 responsive reflow |

---

## 3. Features

### Admin Management Dashboard
- **Authentication & Security Simulation**: Admin username and password authentication with field validation, visibility toggles, and account-lockout simulation.
- **Global Header Site Switcher**:
  - Switch active operational context between physical sites (Hadapsar, Camp, Kothrud) with instant data re-scoping across slots, sessions, rates, and occupancy cards.
  - Clickable active site banner navigating directly to the comprehensive **Site Details** screen.
- **Live Occupancy Overview**:
  - Streamlined occupancy cards for Car, Scooter, and Total slots featuring single **"% Available"** indicator and threshold color shifts (>30% green, 10–30% amber, <10% red).
  - Revenue card with Indian Rupee (`₹`) symbol, clickable directly into Reports prefiltered to Today.
  - Transactions card clickable directly into the new **Reports → Transactions** tab.
- **Dedicated Site Details Screen (`/sites/:siteId`)**:
  - Location and gate terminal parameters, capacity split, active hourly rates.
  - 7-day revenue trend visual and assigned on-ground operator roster.
- **Slot Management & Dedicated Slot Detail (`/slots` & `/slots/:slotId`)**:
  - Interactive grid and table views with subtle backdrop-blur modal for adding new parking bays.
  - Dedicated full-page slot detail view replacing the v1 side drawer: category details, active parked vehicle status, mandatory typed deactivation reasons, and a comprehensive **Slot History** table merging past sessions and maintenance events.
- **Session History & Proportional Billing (`/sessions`)**:
  - Fully sortable table headers with ascending/descending indicators (▲/▼).
  - Column width balancing eliminating horizontal scrolling.
  - One-click direct file export for both **CSV** and **PDF** using client-side generators (no print dialog required).
  - **Proportional Billing Calculation**: `amount = (duration_in_minutes / 60) * hourly_rate` computed to 2 decimal places.
- **Dedicated Receipt Page (`/sessions/:id/receipt`)**:
  - Clean monospace thermal layout displaying site address, ANPR timestamps, vehicle details, duration, rate, and proportional total.
  - Always labeled "Print Receipt" with in-page print button invoking `@media print` styling.
- **Reports & Analytics (`/reports`)**:
  - Four analysis tabs: **Revenue**, **Occupancy %**, **Avg. Duration**, and **Transactions**.
  - Direct CSV and PDF export of report datasets and charts with facility header attribution.
- **Operator Management & Profiles (`/operators` & `/operators/:operatorId`)**:
  - Global cross-site operator roster with site filter dropdown.
  - Add Operator modal with Google Sign-In helper notice.
  - Interactive site reassignment action modal.
  - Dedicated operator profile page displaying identity verification, contact information, processed session counts, and a complete **Site Reassignment History** audit log.
- **System Settings & Add New Site (`/settings`)**:
  - Facility operational profiles, exit grace period controls, edge hardware monitors, and a new **Add New Site** modal allowing administrators to register new facilities that appear immediately in the Site Switcher.

### Digital Availability Display (Kiosk Screen)
- **Zero-Chrome Full-Screen Sign**: Dedicated `/display` route without dashboard navigation, rendered on a dark background (`--color-neutral-900`) for outdoor LED billboard readability and reduced glare.
- **Mega Numerals (180–260px)**: Massive typography legible from moving vehicles at 10–15 meters, dynamically color-coded (Green for healthy, Amber for <15% capacity, Red/Flashing for `0 / FULL`).
- **Live Heartbeat**: Pulsing green status beacon and real-time counter (`Updated Xs ago`) verifying display freshness.
- **"Facility Full" Emergency Banner**: Automatic or simulated full-screen emergency takeover banner (`PARKING FULL`) with category breakdown, also accessible via `/display?state=full`.
- **Responsive Board Formats**: Automatic layout reflow between standard 16:9 landscape controllers (1920×1080) and 9:16 portrait boards (1080×1920).

---

## 4. Tech Stack

The technologies and packages used in this project are strictly limited to those installed in `package.json`:

| Layer / Tool | Technology | Version | Purpose |
|---|---|---|---|
| **Core Framework** | React | `^18.3.1` | Component-driven frontend user interface |
| **Language** | TypeScript | `^5.6.3` | Static type definitions and data contract safety |
| **Build Tool & Server** | Vite | `^5.4.11` | Fast HMR development server and production bundler |
| **Styling** | Tailwind CSS | `^3.4.15` | Utility-first styling configured with custom design tokens |
| **Routing** | React Router DOM | `^6.28.0` | Client-side routing with clean route protection |
| **PDF Generation** | jsPDF & jspdf-autotable | `^4.2.1` / `^5.0.8` | Direct client-side PDF document generation and file downloads |
| **Icons** | Lucide React | `^0.460.0` | Clean, consistent utilitarian iconography set |
| **Class Utilities** | clsx & tailwind-merge | `^2.1.1` / `^2.5.4` | Dynamic conditional Tailwind class merging |
| **PostCSS & Tooling** | PostCSS & Autoprefixer | `^8.4.49` / `^10.4.20` | CSS processing and vendor prefixing |
| **Data Visualizations** | Custom SVG Charts | — | Lightweight, performant Sparklines, Bar Charts, & Line Charts |

---

## 5. Project Structure

```
d:/Industry project frontend/
├── index.html                              # Entry HTML document with Inter & Archivo Black fonts
├── package.json                            # Project dependencies, scripts, and metadata
├── postcss.config.js                       # PostCSS plugin pipeline configuration
├── tailwind.config.js                      # Design tokens, color palette, custom radii & animations
├── tsconfig.json                           # TypeScript compiler options
├── tsconfig.node.json                      # TypeScript configuration for Vite build tools
├── vite.config.ts                          # Vite server configuration (port 3000)
├── Smart_Parking_Frontend_UIUX_Spec_v2.md  # Authoritative v2 UI/UX Design Specification document
├── Smart_Parking_Management_System_Requirement_Documentation.md # Requirements & domain documentation
└── src/
    ├── main.tsx                            # Application entrypoint rendering App into root DOM
    ├── App.tsx                             # Route definitions (/sites, /slots, /sessions, /operators)
    ├── index.css                           # CSS variables, root tokens, scrollbars, and print layout
    ├── types/                              # TypeScript interfaces & domain models
    │   └── index.ts                        # Models: Site, ParkingSlot, ParkingSession, OperatorAccount, etc.
    ├── data/                               # Mock datasets conforming to Section 7 API contracts
    │   └── mockData.ts                     # Multi-site slots, sessions, rates, reports, operators, alerts
    ├── context/                            # Application state providers
    │   ├── AuthContext.tsx                 # Single admin authentication state and lockout simulation
    │   ├── LiveDataContext.tsx             # Multi-site scoping, slots, sessions, rates, operators state
    │   └── ToastContext.tsx                # Global notification toast provider (success, warning, error, info)
    ├── utils/                              # Utility helpers
    │   └── exportUtils.ts                  # Direct file export helpers for CSV and PDF generation
    ├── components/
    │   ├── common/                         # Reusable UI component library (UI/UX Spec §4)
    │   │   ├── Badge.tsx                   # Status pills (Vacant, Occupied, Active, Completed, Locked)
    │   │   ├── Button.tsx                  # Primary, Secondary, Destructive, Ghost, Icon buttons
    │   │   ├── Card.tsx                    # Standard Card, StatCard, and simplified OccupancyCard
    │   │   ├── EmptyState.tsx              # Standard empty state placeholder with CTAs
    │   │   ├── Input.tsx                   # Text, Search, Select, and Password inputs
    │   │   ├── Modal.tsx                   # Base dialog (backdrop-blur-md) & ConfirmationModal
    │   │   ├── ProgressBar.tsx             # Threshold-colored progress bar for bay capacity
    │   │   ├── Skeleton.tsx                # Skeleton loaders for cards, tables, and charts
    │   │   └── Table.tsx                   # Generic sortable table with header sort indicators & pagination
    │   ├── layout/                         # Application shell layouts
    │   │   ├── DashboardLayout.tsx         # Authenticated shell layout (Sidebar + Topbar + Content)
    │   │   ├── Sidebar.tsx                 # Muted steel-blue sidebar (#1E3A5F) with merged user logout
    │   │   ├── Topbar.tsx                  # Top bar with Site Switcher & clickable site details link
    │   │   └── DevControlBar.tsx           # Floating toolbar for manual entry/exit & simulation controls
    │   └── charts/                         # Lightweight data visualizations
    │       └── SimpleCharts.tsx            # Custom SVG Sparkline, BarChart, and LineChart components
    └── pages/                              # Application screens and views
        ├── Login.tsx                       # /login — Sign-in screen with account lockout logic
        ├── Dashboard.tsx                   # /dashboard — Operational overview & live occupancy
        ├── SiteDetails.tsx                 # /sites/:siteId — Dedicated site details, trend & operator roster
        ├── SlotManagement.tsx              # /slots — Interactive bay grid, table, and add slot modal
        ├── SlotDetail.tsx                  # /slots/:slotId — Full-page slot inspection & history table
        ├── RateConfiguration.tsx           # /rates — Admin hourly rate adjustment & audit history
        ├── SessionHistory.tsx              # /sessions — Sortable audit log with direct CSV/PDF export
        ├── SessionDetail.tsx               # /sessions/:id — Streamlined record view with lifecycle stepper
        ├── ReceiptPage.tsx                 # /sessions/:id/receipt — Dedicated thermal ticket receipt page
        ├── Reports.tsx                     # /reports — Revenue, occupancy, duration, & transactions
        ├── OperatorManagement.tsx          # /operators — Cross-site operator roster & reassignments
        ├── OperatorProfile.tsx             # /operators/:operatorId — Operator identity & transfer history
        ├── Settings.tsx                    # /settings — Facility settings & Add New Site sub-section
        └── KioskDisplay.tsx                # /display — Standalone full-screen outdoor availability sign
```

---

## 6. Screens & Routes

| Route | Screen Name | Description |
|---|---|---|
| `/login` | **Login Screen** | Centered authentication card with form validation, quick-fill demo credentials, and 5-minute lockout simulation upon 3 failed attempts. |
| `/dashboard` | **Dashboard / Overview** | Single-glance operational summary with simplified "% Available" occupancy cards, clickable revenue/transaction cards, recent transactions table, and quick alerts. |
| `/sites/:siteId` | **Site Details** | Dedicated screen reached via header site name displaying location gates, capacity split, 7-day revenue trend, and currently assigned operator roster. |
| `/slots` | **Slot Management** | Physical slot inventory toggleable between visual parking bay Grid view and Table view, clicking any slot navigates to its dedicated full-page detail view. |
| `/slots/:slotId` | **Slot Detail** | Dedicated full-page slot screen with vehicle configuration, mandatory typed deactivation reasons, and a chronological Slot History table merging sessions and maintenance logs. |
| `/rates` | **Rate Configuration** | Hourly tariff rates for cars and scooters with input validation, destructive confirmation modal, and audit change history. |
| `/sessions` | **Session History** | Searchable audit log of parking sessions with functional sorting on all column headers (▲/▼), horizontal scroll fix, and direct CSV/PDF download buttons. |
| `/sessions/:id` | **Session Detail** | Cleaned lifecycle stepper (`Entry → Parked → Exit → Complete`) and vehicle/gate facts (billing amounts removed and consolidated to dedicated receipt). |
| `/sessions/:id/receipt` | **Dedicated Receipt Page** | Dedicated thermal receipt ticket displaying site address, ANPR timestamps, duration, proportional billing total, and in-page print button. |
| `/reports` | **Analytics & Reports** | Multi-tab analytics suite covering **Revenue**, **Occupancy %**, **Avg. Duration**, and **Transactions**, with direct CSV and PDF exports. |
| `/operators` | **Operator Management** | Global staff roster across all sites with site filtering, Add Operator modal (Google Sign-In note), and Site Reassignment action. |
| `/operators/:operatorId` | **Operator Profile** | Dedicated operator profile page with Google verification badge, processed session statistics, and a complete Site Reassignment History table. |
| `/settings` | **System Settings** | Facility identity, exit grace periods, peripheral status, and an **Add New Site** sub-section to register new parking locations dynamically. |
| `/display` | **Kiosk Availability Sign** | Standalone full-screen outdoor billboard screen with high-contrast mega numbers, live pulsing indicator, 16:9/9:16 reflow, and full-facility emergency takeover. |

---

## 7. Getting Started

### Prerequisites
- **Node.js**: Version `18.0.0` or higher
- **Package Manager**: `npm` (`v10.0.0` or higher)

### Installation & Setup

1. **Navigate to the project directory:**
   ```bash
   cd "d:/Industry project frontend"
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local Vite development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **To test the production build:**
   ```bash
   npm run build
   npm run preview
   ```

### Demo Credentials

| Role | Username | Password | Accessible Screens |
|---|---|---|---|
| **Facility Administrator** | `rajesh.admin` (or click **Admin** on login) | `admin123` | Full access across all sites, rates, reports, operators, and settings |

> [!TIP]
> **Switching Sites On The Fly:** Use the **Site Switcher** dropdown in the top-left header bar to instantly toggle the active management scope between **AeroPark – Hadapsar**, **AeroPark – Camp**, and **AeroPark – Kothrud**, or add your own site via **Settings → Add New Site**.

---

## 8. Mock Data Layer & API Contracts

All application state is initialized from `src/data/mockData.ts` and governed by the TypeScript interfaces in `src/types/index.ts`. The data structures strictly adhere to the API data contract outlined in **Section 7 of the UI/UX Specification**:

- **Availability Endpoint Shape** (`GET /api/v1/availability`):
  ```json
  {
    "carAvailable": 12,
    "carTotal": 40,
    "scooterAvailable": 8,
    "scooterTotal": 20,
    "totalAvailable": 20,
    "totalSlots": 60,
    "updatedAt": "2026-09-04T10:00:00.000Z"
  }
  ```
- **Session Endpoint Shape** (`GET /api/v1/sessions`):
  ```json
  {
    "sessions": [
      {
        "id": "SESS-2026-0904-001",
        "vehicleNumber": "MH12XY7788",
        "category": "Car",
        "slotId": "C-14",
        "inTime": "04-Sep-2026, 09:12 AM",
        "outTime": "04-Sep-2026, 11:45 AM",
        "durationMinutes": 153,
        "amount": 90,
        "status": "Completed"
      }
    ],
    "totalCount": 25,
    "page": 1
  }
  ```
- **Rates Endpoint Shape** (`GET /api/v1/rates`):
  ```json
  [
    {
      "id": "rate-car",
      "category": "Car",
      "hourlyRate": 30,
      "lastUpdatedAt": "01-Sep-2026, 10:30 AM",
      "lastUpdatedBy": "Rajesh Sharma (Facility Admin)"
    }
  ]
  ```

> **Backend Hand-off Advantage:** Because components consume data through `useLiveData()` and `useAuth()` React context hooks rather than hardcoded markup, integrating a real backend requires only swapping the state update functions inside `LiveDataContext.tsx` with standard `fetch` or `axios` calls against the actual REST API.

---

## 9. Design System Reference

The visual design follows the utilitarian-industrial aesthetic specified in the design guide, implemented in `src/index.css` and `tailwind.config.js`:

### Color Palette

| Token | Variable | Hex | Semantic Meaning / Usage |
|---|---|---|---|
| **Primary** | `--color-primary` | `#1E3A8A` | Deep blue; trustworthy infrastructure, primary actions, active navigation |
| **Primary Light** | `--color-primary-light` | `#3B5FCC` | Interactive hover states, link highlights |
| **Accent** | `--color-accent` | `#F59E0B` | Amber; Scooter category badges, attention alerts |
| **Success** | `--color-success` | `#16A34A` | Vacant/available bays (>30%), valid operational states |
| **Danger** | `--color-danger` | `#DC2626` | Full/occupied bays (<10%), denied entries, account lockouts, destructive actions |
| **Warning** | `--color-warning` | `#D97706` | Low capacity (<15% left), hardware maintenance warnings |
| **Neutral 900** | `--color-neutral-900` | `#111827` | High-contrast dark background for Kiosk billboard, primary typography |
| **Neutral 50** | `--color-neutral-50` | `#F9FAFB` | Dashboard canvas background |
| **White** | `--color-white` | `#FFFFFF` | Card surfaces, modals, popovers |

### Typography & Layout Radii
- **UI Font Family:** `Inter`, sans-serif (clean, readable at data-dense sizes).
- **Kiosk Display Font:** `Inter` (heavy weights) / `Archivo Black` for high outdoor readability.
- **Corner Radii:**
  - Cards: `12px` (`rounded-card`)
  - Inputs & Buttons: `8px` (`rounded-control`)
  - Badges & Pills: `999px` (`rounded-pill`)
- **Accessibility:** Minimum WCAG AA contrast (4.5:1 body text); status badges always pair color with text or icons to ensure full colorblind accessibility.

---

## 10. Roadmap / Next Steps

Based on the specifications in the Project Requirement & Technical Documentation, the subsequent phases will encompass:

- [ ] **Backend Service Development (Req Doc §12):** Implement a Node.js REST API with Express or Fastify.
- [ ] **Database & ORM Setup (Req Doc §9):** Configure PostgreSQL relational database with Prisma ORM schema covering Vehicles, Slots, ParkingSessions, RateMaster, and Receipts.
- [ ] **Concurrent Slot Allocations:** Enforce database transactions and row-level locking to prevent race conditions during simultaneous vehicle entries.
- [ ] **Authentication & Security (Req Doc §8):** Implement bcrypt salted password hashing, JWT token authentication, and server-side rate limiting.
- [ ] **Hardware Peripheral Integration (Req Doc §16):**
  - Connect ANPR camera feeds for automatic license plate capture.
  - Integrate IR/ultrasonic slot occupancy sensors via MQTT/WebSocket edge gateways.
  - Connect boom barrier Modbus relay controllers for gate opening/closing.
  - Thermal ESC/POS receipt printer driver integration.
- [ ] **WebSocket Push Updates:** Replace frontend interval polling with WebSocket pushes so availability updates reach kiosk screens in < 2 seconds.

---

## 11. Reference Documents

The original source specifications governing this codebase are included in this repository:

1. [Smart_Parking_Frontend_UIUX_Spec.md](./Smart_Parking_Frontend_UIUX_Spec.md) — The primary UI/UX design specification covering design system tokens, screen wireframes, state patterns, and API data contracts.
2. [Smart_Parking_Management_System_Requirement_Documentation.md](./Smart_Parking_Management_System_Requirement_Documentation.md) — The comprehensive project requirement documentation defining domain business logic, hardware modules, security, and database schemas.

---

## 12. Project & Author Information

- **Project:** Smart Parking Management System (Frontend Application)
- **Course / Track:** Industry Project / Advanced Software Engineering
- **Author:** *[Author Name / Team Name]*
- **Date:** September 2026
- **License:** Proprietary / Academic Project