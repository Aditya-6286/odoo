# StockSense - Modern Inventory Management System (IMS)

An enterprise-grade, modular Inventory Management System built for high-velocity warehouse operations, incoming receipts, outgoing delivery picking/packing, internal transfers, and physical stock count adjustments with an immutable Stock Ledger.

Built for the **Odoo 8-Hour Hackathon Challenge**.

---

## 🏗️ Architecture & Tech Stack

- **Monorepo Architecture**:
  - `backend/`: Node.js, Express, TypeScript, Prisma ORM, SQLite
  - `frontend/`: React, TypeScript, Vite, Modern Responsive UI
  - `contracts/`: API Contracts & Data Specifications
  - `docs/`: Architecture blueprints, team roles, and calculation engine specs

---

## 👥 4-Developer Parallel Workflow

| Developer | Domain | Core Responsibilities |
| :--- | :--- | :--- |
| **Dev 1** | **Backend Lead & Engine** | Database Schema, Prisma setup, Auth (JWT + OTP), Stock Calculation Engine, Stock Ledger Service, Database Seed. |
| **Dev 2** | **Backend Operations API**| Products CRUD, Operation handlers (Receipts, Deliveries, Transfers, Adjustments), Dashboard KPI aggregation endpoints. |
| **Dev 3** | **Frontend Shell & Dash**| App Layout/Sidebar, Auth pages (Login/Register/OTP), Dashboard with KPI cards & dynamic filter controls, Products view. |
| **Dev 4** | **Frontend Operations**  | Operation Workflows (Receipts, Deliveries with Pick/Pack/Validate steps, Internal Transfer modal, Quick Adjustment dialog, Move History ledger table). |

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
Backend runs on: `http://localhost:5000`  
Health check: `http://localhost:5000/api/health`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173` (with `/api` proxied to backend `5000`).

---

## 📋 Source of Truth
- [Frontend Integration Reference](docs/frontend-integration-reference.md)
- [API Contracts](contracts/api-contracts.md)
- [Architecture Blueprint](docs/architecture.md)
