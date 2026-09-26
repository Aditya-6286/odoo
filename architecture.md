# StockSense Architecture Blueprint

## System Overview
StockSense is a modular Inventory Management System designed to handle high-velocity stock operations with strict accounting integrity, role-based visibility, and zero data drift.

---

## Core Pillars

### 1. Double-Entry Stock Movement
Every movement has both a `source_location` and a `destination_location`.
- **Receipts**: `Vendor Location (Virtual)` $\rightarrow$ `Internal Storage Location`
- **Deliveries**: `Internal Storage Location` $\rightarrow$ `Customer Location (Virtual)`
- **Internal Transfers**: `Internal Storage A` $\rightarrow$ `Internal Storage B`
- **Adjustments**: `Inventory Discrepancy (Virtual)` $\leftrightarrow$ `Internal Storage`

### 2. Dual-Layer Storage Pattern
- **`StockLedger` (Source of Truth)**: Immutable append-only log of every single movement event.
- **`StockQuant` (Performance Accelerator)**: Materialized real-time balance cache for $O(1)$ fast lookups in the UI and Dashboard.

### 3. Role-Based Access Control
- **`MANAGER`**: Full authority over product catalog, warehouses, locations, inventory count adjustments, and approvals.
- **`WAREHOUSE_STAFF`**: Day-to-day warehouse operations: receiving stock, picking, packing, and moving inventory between locations.

---

## 4-Developer Parallel Workflow

1. **Dev 1 (Backend Core & Ledger)**:
   - Database Schema, Prisma setup, Seed script
   - Authentication (JWT + OTP password reset)
   - Stock Engine Service & Stock Ledger Service
2. **Dev 2 (Backend Operations & Dashboard APIs)**:
   - Products CRUD & Category endpoints
   - Operations CRUD (Receipts, Deliveries, Transfers, Adjustments)
   - Dashboard KPI & operations filter endpoints
3. **Dev 3 (Frontend Shell & Dashboard)**:
   - App Layout, Sidebar, Breadcrumbs, Profile
   - Auth pages (Login, Register, Forgot Password OTP)
   - Dashboard View with KPI cards and dynamic filters
4. **Dev 4 (Frontend Operations & Ledger)**:
   - Operations forms & Steppers (Pick / Pack / Validate)
   - Physical count adjustment modal
   - Move History / Ledger table
