# StockSense API Contracts

This document is the shared API contract for the team.

## Rules

- Backend owns business logic and database access.
- Frontend communicates with backend through documented APIs.
- Do not create a separate database for a feature.
- Changes to shared contracts should be coordinated before implementation.

## Planned API Areas

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/me

### Products
- GET /api/products
- POST /api/products
- GET /api/products/:id
- PATCH /api/products/:id

### Operations
- GET /api/operations
- POST /api/operations
- GET /api/operations/:id
- POST /api/operations/:id/validate

### Dashboard
- GET /api/dashboard/kpis

### Stock / Ledger
- GET /api/stock
- GET /api/stock-ledger

These endpoints are the initial contract and will be expanded with request/response schemas as implementation proceeds.
