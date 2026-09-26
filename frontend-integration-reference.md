# StockSense Frontend Integration Reference

**Version**: 1.0.0  
**Source of Truth**: Live Working Backend (`http://localhost:5000/api`)  
**Target Audience**: Frontend Engineers (Dev 3 - Shell & Dashboard, Dev 4 - Operations & Ledger)  

---

## Table of Contents
1. [Base API URL & Network Setup](#1-base-api-url--network-setup)
2. [Authentication, Login Flow & JWT](#2-authentication-login-flow--jwt)
3. [Error Response Format & Error Codes](#3-error-response-format--error-codes)
4. [Master Endpoints Directory](#4-master-endpoints-directory)
5. [Products API](#5-products-api)
6. [Categories API](#6-categories-api)
7. [Warehouses API](#7-warehouses-api)
8. [Locations API](#8-locations-api)
9. [Receipts Workflow & APIs](#9-receipts-workflow--apis)
10. [Deliveries Workflow & APIs](#10-deliveries-workflow--apis)
11. [Transfers Workflow & APIs](#11-transfers-workflow--apis)
12. [Adjustments Workflow & APIs](#12-adjustments-workflow--apis)
13. [Stock Calculations & Real-Time Balances](#13-stock-calculations--real-time-balances)
14. [Stock Ledger & Move History Audit Trail](#14-stock-ledger--move-history-audit-trail)
15. [Dashboard & KPI APIs](#15-dashboard--kpi-apis)
16. [TypeScript Interfaces for Frontend State](#16-typescript-interfaces-for-frontend-state)

---

## 1. Base API URL & Network Setup

- **Vite Dev Server (Frontend)**: `http://localhost:5173`
- **Backend API Server**: `http://localhost:5000`
- **Base API URL for Frontend**: `/api` (configured in `frontend/src/api/client.ts`)

In [`frontend/vite.config.ts`](file:///d:/stocksence/frontend/vite.config.ts), all requests starting with `/api` are automatically proxied to `http://localhost:5000`:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

Direct backend base URL when not using the proxy: `http://localhost:5000/api`.

---

## 2. Authentication, Login Flow & JWT

### Session & JWT Usage
- Tokens are standard JSON Web Tokens (HMAC SHA-256) with a 7-day expiration.
- Upon login or registration, the frontend receives `token` and `user` payload: `{ id, name, email, role }`.
- Save token to `localStorage.setItem('stocksense_token', token)`.
- Attach token to all protected API calls as an HTTP Header:
  ```http
  Authorization: Bearer <token>
  ```
- User roles: `"MANAGER"` (catalog, warehouses, count adjustments) or `"WAREHOUSE_STAFF"` (day-to-day warehouse movements).

### Axios Setup & Interceptors (`frontend/src/api/client.ts`)
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach JWT token automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('stocksense_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401 Unauthorized errors and redirect to /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('stocksense_token');
      localStorage.removeItem('stocksense_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### Authentication Endpoints

#### `POST /api/auth/register`
Creates a new account (`MANAGER` or `WAREHOUSE_STAFF`).
- **Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@stocksense.com",
  "password": "Password123!",
  "role": "MANAGER"
}
```
*`role` is optional and defaults to `"WAREHOUSE_STAFF"`.*
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmuhy3...",
      "name": "Jane Doe",
      "email": "jane@stocksense.com",
      "role": "MANAGER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  },
  "message": "User registered successfully"
}
```

#### `POST /api/auth/login`
Authenticates with email and password.
- **Body**:
```json
{
  "email": "manager@stocksense.com",
  "password": "Password123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmuhy3...",
      "name": "Jane Doe",
      "email": "manager@stocksense.com",
      "role": "MANAGER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  },
  "message": "Login successful"
}
```

#### `POST /api/auth/forgot-password`
Generates a 6-digit OTP for resetting password (valid for 15 minutes).
- **Body**:
```json
{
  "email": "manager@stocksense.com"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "email": "manager@stocksense.com",
    "otp": "492019"
  },
  "message": "OTP has been generated. In development mode, OTP is returned in response."
}
```
*Note: In development mode, `otp` is returned directly in the response payload for easy testing without SMTP.*

#### `POST /api/auth/reset-password`
Verifies OTP and sets a new password.
- **Body**:
```json
{
  "email": "manager@stocksense.com",
  "otp": "492019",
  "newPassword": "NewSecurePassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Password has been successfully updated. Please log in with your new password."
}
```

#### `GET /api/auth/me`
Retrieves current authenticated profile.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "cmuhy3...",
    "name": "Jane Doe",
    "email": "manager@stocksense.com",
    "role": "MANAGER"
  }
}
```

---

## 3. Error Response Format & Error Codes

### Standard Error Envelope
All error responses from the backend follow this strict structure:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable explanation"
  }
}
```

### Error Code Reference
| Code | HTTP Status | Meaning | Suggested Frontend Handling |
| :--- | :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | Missing or invalid Bearer token | Redirect to `/login` |
| `FORBIDDEN` | 403 | Missing required role (`MANAGER`) | Display access-denied modal or toast |
| `NOT_FOUND` | 404 | Entity ID not found in database | Show 404 state / message |
| `VALIDATION_ERROR` | 400 | Missing required input or bad format | Mark field errors on form |
| `INSUFFICIENT_STOCK`| 400 | Not enough stock at source location | Show warning: "Insufficient stock available" |
| `INVALID_STATUS_TRANSITION` | 400 | Invalid state transition (e.g. validating completed op) | Disable validate/cancel buttons |
| `USER_EXISTS` | 409 | Email already registered | Display "Email already registered" |
| `SKU_EXISTS` | 409 | Product SKU already registered | Highlight SKU field as duplicate |
| `CATEGORY_EXISTS`| 409 | Category name already exists | Highlight Category name field |
| `WAREHOUSE_EXISTS`| 409 | Warehouse code already exists | Highlight Warehouse code field |
| `LOCATION_EXISTS` | 409 | Location code already exists | Highlight Location code field |

---

## 4. Master Endpoints Directory

| Domain | Method | Endpoint | Auth | Required Role | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/health` | None | Any | Server and database health check |
| **Auth** | `POST` | `/api/auth/register` | None | Any | Register user account |
| | `POST` | `/api/auth/login` | None | Any | User login, returns JWT |
| | `POST` | `/api/auth/forgot-password` | None | Any | Generate 6-digit OTP |
| | `POST` | `/api/auth/reset-password` | None | Any | Reset password via OTP |
| | `GET` | `/api/auth/me` | Bearer | Any | Current user profile |
| **Products**| `GET` | `/api/products` | None | Any | List products with `totalStock` & `isLowStock` |
| | `GET` | `/api/products/:id` | None | Any | Product details with per-location stock |
| | `POST` | `/api/products` | Bearer | `MANAGER` | Create product (optional initial stock) |
| **Categories**| `GET` | `/api/categories` | None | Any | List product categories |
| | `POST` | `/api/categories` | Bearer | `MANAGER` | Create product category |
| **Warehouses**| `GET` | `/api/warehouses` | None | Any | List warehouses with nested locations |
| | `POST` | `/api/warehouses` | Bearer | `MANAGER` | Create warehouse |
| **Locations**| `GET` | `/api/locations` | None | Any | List locations (type/physical filters) |
| | `POST` | `/api/locations` | Bearer | `MANAGER` | Create location |
| **Operations**| `GET` | `/api/operations` | Bearer | Any | List operations with filters |
| | `GET` | `/api/operations/:id` | Bearer | Any | Full operation details with items |
| | `POST` | `/api/operations` | Bearer | Any | Create operation (Receipt, Delivery, Transfer) |
| | `POST` | `/api/operations/:id/action-ready` | Bearer | Any | Mark operation as `READY` |
| | `POST` | `/api/operations/:id/validate` | Bearer | Any | Validate & move stock (`DONE`) |
| | `POST` | `/api/operations/:id/cancel` | Bearer | Any | Cancel pending operation |
| **Adjustments**| `POST` | `/api/adjustments` | Bearer | `MANAGER` | Physical stock count reconciliation |
| **Ledger** | `GET` | `/api/ledger` | Bearer | Any | Immutable move history / audit log |
| **Dashboard**| `GET` | `/api/dashboard/kpis` | Bearer | Any | Live warehouse KPIs |
| | `GET` | `/api/dashboard/operations` | Bearer | Any | Filterable operations table for dashboard |

---

## 5. Products API

### `GET /api/products`
Lists all products with real-time aggregate stock across physical storage locations and automatic low-stock status.

- **Query Parameters**:
  - `search` (optional): search text matching product name or SKU
  - `categoryId` (optional): category ID filter
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmuhy39v0000gnjssl2er77nt",
      "name": "Steel Rod 12mm",
      "sku": "STL-ROD-12",
      "category": {
        "id": "cmuhy39nt000cnjss9cri2i3k",
        "name": "Raw Materials"
      },
      "uom": "kg",
      "minStockAlert": 100,
      "reorderQuantity": 200,
      "totalStock": 85,
      "isLowStock": true
    }
  ]
}
```

### `GET /api/products/:id`
Retrieves product details with per-location stock breakdown for physical storage locations.

- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "cmuhy39v0000gnjssl2er77nt",
    "name": "Steel Rod 12mm",
    "sku": "STL-ROD-12",
    "uom": "kg",
    "minStockAlert": 100,
    "reorderQuantity": 200,
    "category": {
      "id": "cmuhy39nt000cnjss9cri2i3k",
      "name": "Raw Materials"
    },
    "locations": [
      {
        "locationId": "cmuhy39es0007njsszfb9jsxq",
        "locationName": "Main Store",
        "warehouseName": "Main Warehouse",
        "quantityOnHand": 50
      },
      {
        "locationId": "cmuhy39he0009njss8pfi0q6v",
        "locationName": "Production Floor",
        "warehouseName": "Main Warehouse",
        "quantityOnHand": 35
      }
    ],
    "totalStock": 85,
    "isLowStock": true
  }
}
```

### `POST /api/products`
Creates a product. If `initialStock > 0` is provided, `initialLocationId` is required. The stock engine automatically initializes the `StockQuant` and writes an `INITIAL` ledger entry.

- **Headers**: `Authorization: Bearer <token>` (`MANAGER` role required)
- **Body**:
```json
{
  "name": "Hex Bolt M8",
  "sku": "HEX-BOLT-M8",
  "categoryId": "cmuhy39nt000cnjss9cri2i3k",
  "uom": "pcs",
  "minStockAlert": 50,
  "reorderQuantity": 200,
  "initialStock": 150,
  "initialLocationId": "cmuhy39es0007njsszfb9jsxq"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "cmuhy3...",
    "name": "Hex Bolt M8",
    "sku": "HEX-BOLT-M8",
    "categoryId": "cmuhy39nt000cnjss9cri2i3k",
    "uom": "pcs",
    "minStockAlert": 50,
    "reorderQuantity": 200,
    "createdAt": "2026-09-26T05:00:00.000Z"
  },
  "message": "Product created successfully"
}
```

---

## 6. Categories API

### `GET /api/categories`
Lists all product categories for category filter dropdowns.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmuhy39nt000cnjss9cri2i3k",
      "name": "Raw Materials",
      "description": "Metals, plastics, raw wires, and bulk stock"
    }
  ]
}
```

### `POST /api/categories`
Creates a new product category.
- **Headers**: `Authorization: Bearer <token>` (`MANAGER` role required)
- **Body**:
```json
{
  "name": "Fasteners & Hardware",
  "description": "Nuts, bolts, screws, and washers"
}
```
- **Response `201 Created`**: Returns created category.

---

## 7. Warehouses API

### `GET /api/warehouses`
Returns all warehouses with nested locations.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmuhy39540002njss0c08i466",
      "name": "Main Warehouse",
      "code": "MWH",
      "address": "Plot 42, Industrial Logistics Zone, Sector 5",
      "locations": [
        {
          "id": "cmuhy39es0007njsszfb9jsxq",
          "name": "Main Store",
          "code": "LOC-MAIN-STORE",
          "type": "STORAGE",
          "warehouseId": "cmuhy39540002njss0c08i466"
        }
      ]
    }
  ]
}
```

### `POST /api/warehouses`
Creates a new warehouse.
- **Headers**: `Authorization: Bearer <token>` (`MANAGER` role required)
- **Body**:
```json
{
  "name": "East Coast Distribution Center",
  "code": "ECDC",
  "address": "Pier 9, Logistics Harbor"
}
```
- **Response `201 Created`**: Returns created warehouse.

---

## 8. Locations API

### `GET /api/locations`
Returns locations for dropdown selectors in operations and adjustment forms.

- **Query Parameters**:
  - `warehouseId` (optional): filter by warehouse ID
  - `type` (optional): `STORAGE` | `INTERNAL` | `PRODUCTION` | `TRANSIT` | `VENDOR` | `CUSTOMER` | `ADJUSTMENT`
  - `physicalOnly` (optional): `true` (filters only physical storage locations: `STORAGE`, `INTERNAL`, `PRODUCTION`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmuhy39es0007njsszfb9jsxq",
      "name": "Main Store",
      "code": "LOC-MAIN-STORE",
      "type": "STORAGE",
      "isActive": true,
      "warehouseId": "cmuhy39540002njss0c08i466",
      "warehouse": {
        "id": "cmuhy39540002njss0c08i466",
        "name": "Main Warehouse",
        "code": "MWH"
      }
    }
  ]
}
```

### `POST /api/locations`
Creates a location.
- **Headers**: `Authorization: Bearer <token>` (`MANAGER` role required)
- **Body**:
```json
{
  "name": "Quality Inspection Zone",
  "code": "LOC-QA-ZONE",
  "type": "INTERNAL",
  "warehouseId": "cmuhy39540002njss0c08i466"
}
```
- **Response `201 Created`**: Returns created location.

---

## 9. Receipts Workflow & APIs

### Receipt Concept
- **Source**: Virtual Vendor Location (`type: "VENDOR"`, e.g. `Vendor Transit`)
- **Destination**: Internal Storage Location (`type: "STORAGE"` or `"INTERNAL"`, e.g. `Main Store`)
- **Stock Impact**: Increases stock quant balance at destination upon validation. No availability check required (vendors have infinite supply).

### Receipt Step-by-Step Flow

#### 1. Create Receipt
`POST /api/operations`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "type": "RECEIPT",
  "partnerName": "Tata Steel Supplies",
  "sourceLocationId": "<vendor_location_id>",
  "destinationLocationId": "<main_store_location_id>",
  "notes": "PO-9921 incoming shipment",
  "items": [
    {
      "productId": "<product_id>",
      "expectedQty": 100
    }
  ]
}
```
- **Response `201 Created`**: Returns operation with `documentNumber: "REC-2026-XXXX"` and `status: "WAITING"`.

#### 2. Mark Ready
`POST /api/operations/:id/action-ready`
- **Headers**: `Authorization: Bearer <token>`
- Moves operation from `WAITING` $\rightarrow$ `READY` (unloading and inspection finished).

#### 3. Validate & Intake Stock
`POST /api/operations/:id/validate`
- **Headers**: `Authorization: Bearer <token>`
- **Body** *(Optional — if omitted, defaults to full expected quantity)*:
```json
{
  "items": [
    {
      "productId": "<product_id>",
      "doneQty": 100
    }
  ]
}
```
- **Stock Action**: Increases `StockQuant` at destination location by `doneQty`. Creates `StockLedger` entry with `operationType: "RECEIPT"`. Sets operation `status: "DONE"`.

---

## 10. Deliveries Workflow & APIs

### Delivery Concept
- **Source**: Internal Storage Location (`type: "STORAGE"` or `"INTERNAL"`, e.g. `Main Store`)
- **Destination**: Virtual Customer Location (`type: "CUSTOMER"`, e.g. `Customer Delivery`)
- **Stock Impact**: Checks stock availability at source location. If `quantityOnHand < doneQty`, rejects with `INSUFFICIENT_STOCK` (400). Decreases stock quant balance at source upon validation.

### Delivery Step-by-Step Flow

#### 1. Create Delivery Order
`POST /api/operations`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "type": "DELIVERY",
  "partnerName": "Metro Infrastructure Ltd",
  "sourceLocationId": "<main_store_location_id>",
  "destinationLocationId": "<customer_location_id>",
  "notes": "Sales Order SO-4401",
  "items": [
    {
      "productId": "<product_id>",
      "expectedQty": 25
    }
  ]
}
```
- **Response `201 Created`**: Returns operation with `documentNumber: "DEL-2026-XXXX"` and `status: "WAITING"`.

#### 2. Mark Ready (Picking & Packing Completed)
`POST /api/operations/:id/action-ready`
- Moves operation from `WAITING` $\rightarrow$ `READY`.

#### 3. Validate & Dispatch
`POST /api/operations/:id/validate`
- **Stock Action**:
  - Verifies `StockQuant.quantityOnHand >= doneQty`.
  - Decrements `StockQuant` at source location by `doneQty`.
  - Creates immutable `StockLedger` entry with `operationType: "DELIVERY"`.
  - Sets operation `status: "DONE"`.

---

## 11. Transfers Workflow & APIs

### Internal Transfer Concept
- **Source**: Physical Storage Location A (e.g. `Main Store`)
- **Destination**: Physical Storage Location B (e.g. `Production Floor`)
- **Stock Impact**: Relocates stock between physical locations. Total company stock remains unchanged. Verifies source location availability. Decrements source quant, increments destination quant.

### Transfer Step-by-Step Flow

#### 1. Create Transfer Request
`POST /api/operations`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "type": "INTERNAL",
  "sourceLocationId": "<main_store_location_id>",
  "destinationLocationId": "<prod_floor_location_id>",
  "notes": "Production line replenishment",
  "items": [
    {
      "productId": "<product_id>",
      "expectedQty": 20
    }
  ]
}
```
- **Response `201 Created`**: Returns operation with `documentNumber: "INT-2026-XXXX"` and `status: "WAITING"`.

#### 2. Mark Ready
`POST /api/operations/:id/action-ready`
- Moves operation from `WAITING` $\rightarrow$ `READY`.

#### 3. Validate & Move Stock
`POST /api/operations/:id/validate`
- **Stock Action**:
  - Decrements `StockQuant` at source location by `doneQty`.
  - Increments `StockQuant` at destination location by `doneQty`.
  - Creates `StockLedger` entry with `operationType: "INTERNAL"`.
  - Sets operation `status: "DONE"`.

---

## 12. Adjustments Workflow & APIs

### Physical Count Adjustment Concept
- Direct physical stock reconciliation endpoint used by warehouse managers after a physical cycle count.
- Compares actual counted quantity (`countedQty`) against recorded `StockQuant.quantityOnHand`.
- Calculates difference: `difference = countedQty - currentQty`.
- If `difference > 0`: Source is Virtual Discrepancy location, destination is Physical location.
- If `difference < 0`: Source is Physical location, destination is Virtual Discrepancy location.
- Sets exact `StockQuant.quantityOnHand = countedQty`.
- Logs an `ADJUSTMENT` operation and immutable `StockLedger` entry.

### `POST /api/adjustments`
- **Headers**: `Authorization: Bearer <token>` (`MANAGER` role required)
- **Body**:
```json
{
  "productId": "<product_id>",
  "locationId": "<physical_location_id>",
  "countedQty": 45,
  "reason": "Scrapped 5 damaged units during monthly audit"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "operationId": "cmuhy3...",
    "documentNumber": "ADJ-2026-0001",
    "product": {
      "id": "cmuhy39v0000gnjssl2er77nt",
      "name": "Steel Rod 12mm",
      "sku": "STL-ROD-12"
    },
    "location": {
      "id": "cmuhy39he0009njss8pfi0q6v",
      "name": "Production Floor"
    },
    "previousQuantity": 50,
    "countedQuantity": 45,
    "difference": -5,
    "reason": "Scrapped 5 damaged units during monthly audit"
  },
  "message": "Inventory adjustment completed successfully"
}
```

---

## 13. Stock Calculations & Real-Time Balances

### Dual-Layer Storage Pattern
1. **`StockQuant` (Real-Time Performance Accelerator)**:
   - Stores current balance for each `(productId, locationId)` pair.
   - Enables fast $O(1)$ stock lookups for the UI and operations forms without having to sum millions of ledger rows.
2. **`StockLedger` (Immutable Source of Truth)**:
   - Append-only log of every single physical or virtual stock movement.

### Key Calculation Rules
- **Physical Locations**: Locations where `type IN ('STORAGE', 'INTERNAL', 'PRODUCTION')`.
- **Virtual Locations**: `VENDOR`, `CUSTOMER`, `ADJUSTMENT`, `TRANSIT`.
- **`totalStock` (Product Level)**: Sum of all positive `StockQuant.quantityOnHand` across physical locations.
- **`isLowStock` Alert**: `totalStock <= product.minStockAlert`. When true, display a warning badge in the product catalog and increment the dashboard low-stock count.

---

## 14. Stock Ledger & Move History Audit Trail

### `GET /api/ledger`
Retrieves immutable move history / audit logs with filtering.

- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `productId` (optional): filter entries for a specific product
  - `locationId` (optional): filter entries where source OR destination matches location ID
  - `operationType` (optional): `RECEIPT` | `DELIVERY` | `INTERNAL` | `ADJUSTMENT` | `INITIAL`
  - `dateFrom` (optional): ISO date (e.g. `2026-09-01`)
  - `dateTo` (optional): ISO date (e.g. `2026-09-30`)
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmuhy3av3001anjss4v8e5fqb",
      "referenceNumber": "REC-2026-0001",
      "operationType": "RECEIPT",
      "product": {
        "id": "cmuhy39v0000gnjssl2er77nt",
        "name": "Steel Rod 12mm",
        "sku": "STL-ROD-12"
      },
      "sourceLocation": { "name": "Vendor Transit" },
      "destinationLocation": { "name": "Main Store" },
      "quantity": 100,
      "performedBy": { "name": "John Smith" },
      "createdAt": "2026-09-26T04:24:26.176Z"
    }
  ]
}
```

---

## 15. Dashboard & KPI APIs

### `GET /api/dashboard/kpis`
Provides real-time aggregated metrics for Dashboard summary cards.

- **Headers**: `Authorization: Bearer <token>`
- **KPI Metrics**:
  - `totalProductsInStock`: Sum of all units in physical storage locations.
  - `lowStockItemsCount`: Number of products where `totalStock <= minStockAlert`.
  - `pendingReceipts`: Count of incoming receipts in `DRAFT`, `WAITING`, or `READY` status.
  - `pendingDeliveries`: Count of delivery orders in `DRAFT`, `WAITING`, or `READY` status.
  - `internalTransfersScheduled`: Count of transfers in `DRAFT`, `WAITING`, or `READY` status.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "totalProductsInStock": 570,
    "lowStockItemsCount": 2,
    "pendingReceipts": 1,
    "pendingDeliveries": 1,
    "internalTransfersScheduled": 1
  }
}
```

### `GET /api/dashboard/operations`
Returns operations for the Dashboard operations table with dynamic filters.

- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `type` (optional): `RECEIPT` | `DELIVERY` | `INTERNAL` | `ADJUSTMENT`
  - `status` (optional): `DRAFT` | `WAITING` | `READY` | `DONE` | `CANCELED`
  - `warehouseId` (optional): filter by warehouse
  - `categoryId` (optional): filter by product category
  - `search` (optional): text search on document number, partner name, or notes
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cmuhy3...",
      "documentNumber": "REC-2026-0001",
      "type": "RECEIPT",
      "status": "DONE",
      "partnerName": "Tata Steel Ltd",
      "sourceLocation": { "name": "Vendor Transit" },
      "destinationLocation": { "name": "Main Store" },
      "itemsCount": 1,
      "createdAt": "2026-09-26T04:24:26.176Z",
      "validatedAt": "2026-09-26T04:24:26.176Z"
    }
  ]
}
```

---

## 16. TypeScript Interfaces for Frontend State

Frontend developers can copy these interfaces directly into `frontend/src/types/api.ts`:

```typescript
// Authentication & User
export type UserRole = 'MANAGER' | 'WAREHOUSE_STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Products & Catalog
export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
}

export interface ProductLocationStock {
  locationId: string;
  locationName: string;
  warehouseName: string;
  quantityOnHand: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: { id: string; name: string };
  uom: string;
  minStockAlert: number;
  reorderQuantity: number;
  totalStock: number;
  isLowStock: boolean;
  locations?: ProductLocationStock[];
}

// Warehouses & Locations
export type LocationType =
  | 'STORAGE'
  | 'INTERNAL'
  | 'PRODUCTION'
  | 'TRANSIT'
  | 'VENDOR'
  | 'CUSTOMER'
  | 'ADJUSTMENT';

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  isActive: boolean;
  warehouseId?: string | null;
  warehouse?: { id: string; name: string; code: string } | null;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  locations: Location[];
}

// Operations & Movements
export type OperationType = 'RECEIPT' | 'DELIVERY' | 'INTERNAL' | 'ADJUSTMENT';
export type OperationStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';

export interface OperationItem {
  id: string;
  productId: string;
  expectedQty: number;
  doneQty: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    uom: string;
  };
}

export interface Operation {
  id: string;
  documentNumber: string;
  type: OperationType;
  status: OperationStatus;
  partnerName?: string | null;
  sourceLocationId?: string | null;
  sourceLocation?: { name: string; code?: string; type?: string } | null;
  destinationLocationId?: string | null;
  destinationLocation?: { name: string; code?: string; type?: string } | null;
  items: OperationItem[];
  itemsCount?: number;
  notes?: string | null;
  createdAt: string;
  validatedAt?: string | null;
  createdBy?: { id: string; name: string; email: string };
  validatedBy?: { id: string; name: string; email: string };
}

// Physical Count Adjustments
export interface AdjustmentResult {
  operationId: string;
  documentNumber: string;
  product: { id: string; name: string; sku: string };
  location: { id: string; name: string };
  previousQuantity: number;
  countedQuantity: number;
  difference: number;
  reason?: string | null;
}

// Dashboard & KPIs
export interface DashboardKpis {
  totalProductsInStock: number;
  lowStockItemsCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  internalTransfersScheduled: number;
}

export interface DashboardOperationSummary {
  id: string;
  documentNumber: string;
  type: OperationType;
  status: OperationStatus;
  partnerName?: string | null;
  sourceLocation?: { name: string } | null;
  destinationLocation?: { name: string } | null;
  itemsCount: number;
  createdAt: string;
  validatedAt?: string | null;
}

// Immutable Stock Ledger
export interface StockLedgerEntry {
  id: string;
  referenceNumber: string;
  operationType: string;
  product: { id: string; name: string; sku: string };
  sourceLocation: { name: string };
  destinationLocation: { name: string };
  quantity: number;
  performedBy: { name: string };
  createdAt: string;
}
```
