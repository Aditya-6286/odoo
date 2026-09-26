# StockSense API Contracts & Data Specifications

**Version**: 1.0.0  
**Source of Truth**: StockSense Architecture & Live Backend Implementation  
**Base URL**: `http://localhost:5000/api` (or `/api` in Vite frontend via dev proxy)

---

## 1. Global Response Format

### Success Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable explanation of the failure"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` (401): Missing, malformed, or expired Bearer JWT token.
- `FORBIDDEN` (403): User role does not have required permissions (e.g. non-manager trying to adjust stock).
- `NOT_FOUND` (404): Target entity (product, operation, warehouse, location, user) does not exist.
- `VALIDATION_ERROR` (400): Missing or invalid input fields.
- `INSUFFICIENT_STOCK` (400): Stock quant balance at source location is lower than requested quantity.
- `INVALID_STATUS_TRANSITION` (400): Attempting to validate a cancelled or already completed operation.
- `USER_EXISTS` / `EMAIL_EXISTS` (409): User with this email is already registered.
- `SKU_EXISTS` (409): Product with this SKU already exists.
- `WAREHOUSE_EXISTS` (409): Warehouse code already exists.
- `LOCATION_EXISTS` (409): Location code already exists.

---

## 2. Health Check

### `GET /api/health`
Checks API server and database connection status.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "version": "1.0.0",
    "timestamp": "2026-09-26T09:30:00.000Z",
    "environment": "development"
  },
  "message": "StockSense API is running smoothly"
}
```

---

## 3. Authentication & User Foundation

### `POST /api/auth/register`
Creates a new manager or warehouse staff account.

**Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@stocksense.com",
  "password": "Password123!",
  "role": "MANAGER" 
}
```
*`role` must be either `"MANAGER"` or `"WAREHOUSE_STAFF"`. Defaults to `"WAREHOUSE_STAFF"` if omitted.*

**Response `201 Created`**:
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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### `POST /api/auth/login`
Authenticates user and returns JWT token.

**Request Body**:
```json
{
  "email": "jane@stocksense.com",
  "password": "Password123!"
}
```

**Response `200 OK`**:
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
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### `POST /api/auth/forgot-password`
Generates a 6-digit OTP for password reset. In development mode, the OTP is returned directly in the response payload.

**Request Body**:
```json
{
  "email": "jane@stocksense.com"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "email": "jane@stocksense.com",
    "otp": "492019" 
  },
  "message": "OTP has been generated. In development mode, OTP is returned in response."
}
```

### `POST /api/auth/reset-password`
Verifies OTP and resets user password.

**Request Body**:
```json
{
  "email": "jane@stocksense.com",
  "otp": "492019",
  "newPassword": "NewSecurePassword123!"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Password has been successfully updated. Please log in with your new password."
}
```

### `GET /api/auth/me`
*Headers: `Authorization: Bearer <token>`*

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "cmuhy3...",
    "name": "Jane Doe",
    "email": "jane@stocksense.com",
    "role": "MANAGER"
  }
}
```

---

## 4. Dashboard & KPI Aggregations

### `GET /api/dashboard/kpis`
*Headers: `Authorization: Bearer <token>`*

**Response `200 OK`**:
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
*Headers: `Authorization: Bearer <token>`*  
**Query Parameters**:
- `type`: `RECEIPT` | `DELIVERY` | `INTERNAL` | `ADJUSTMENT`
- `status`: `DRAFT` | `WAITING` | `READY` | `DONE` | `CANCELED`
- `warehouseId`: string
- `categoryId`: string
- `search`: string (matches documentNumber, partnerName, or notes)

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "op_001",
      "documentNumber": "REC-2026-0001",
      "type": "RECEIPT",
      "status": "DONE",
      "partnerName": "Tata Steel Ltd",
      "sourceLocation": { "name": "Vendor Transit" },
      "destinationLocation": { "name": "Main Store" },
      "itemsCount": 1,
      "createdAt": "2026-09-26T08:00:00.000Z",
      "validatedAt": "2026-09-26T08:45:00.000Z"
    }
  ]
}
```

---

## 5. Product Management & Categories

### `GET /api/products`
Lists products with current aggregate stock and low stock flags.

**Query Parameters**:
- `search`: string (matches name or SKU)
- `categoryId`: string

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "prod_001",
      "name": "Steel Rod 12mm",
      "sku": "STL-ROD-12",
      "category": { "id": "cat_001", "name": "Raw Materials" },
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
Retrieves product details with per-location stock breakdown.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": "prod_001",
    "name": "Steel Rod 12mm",
    "sku": "STL-ROD-12",
    "uom": "kg",
    "minStockAlert": 100,
    "reorderQuantity": 200,
    "category": { "id": "cat_001", "name": "Raw Materials" },
    "locations": [
      {
        "locationId": "loc_main_store",
        "locationName": "Main Store",
        "warehouseName": "Main Warehouse",
        "quantityOnHand": 50
      },
      {
        "locationId": "loc_prod_rack",
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
Creates a new product with optional initial stock.  
*Headers: `Authorization: Bearer <token>` (MANAGER role required)*

**Request Body**:
```json
{
  "name": "Steel Rod 12mm",
  "sku": "STL-ROD-12",
  "categoryId": "cat_001",
  "uom": "kg",
  "minStockAlert": 100,
  "reorderQuantity": 200,
  "initialStock": 50,
  "initialLocationId": "loc_main_store"
}
```
*`initialLocationId` is required if `initialStock > 0`.*

### `GET /api/categories`
Lists all product categories.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_001",
      "name": "Raw Materials",
      "description": "Metals, plastics, raw wires, and bulk stock"
    }
  ]
}
```

### `POST /api/categories`
*Headers: `Authorization: Bearer <token>` (MANAGER role required)*

**Request Body**:
```json
{
  "name": "Packaging",
  "description": "Boxes, tapes, wraps, and shipping materials"
}
```

---

## 6. Warehouse & Location Management

### `GET /api/warehouses`
Lists all warehouses with nested locations.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "wh_001",
      "name": "Main Warehouse",
      "code": "MWH",
      "address": "Plot 42, Industrial Logistics Zone, Sector 5",
      "locations": [
        {
          "id": "loc_main_store",
          "name": "Main Store",
          "code": "LOC-MAIN-STORE",
          "type": "STORAGE"
        }
      ]
    }
  ]
}
```

### `POST /api/warehouses`
*Headers: `Authorization: Bearer <token>` (MANAGER role required)*

**Request Body**:
```json
{
  "name": "Secondary Annex",
  "code": "SEC-ANNEX",
  "address": "Warehouse 12, Terminal 2"
}
```

### `GET /api/locations`
Lists locations with optional filters.

**Query Parameters**:
- `warehouseId` (optional): filter by warehouse
- `type` (optional): `STORAGE` | `INTERNAL` | `PRODUCTION` | `TRANSIT` | `VENDOR` | `CUSTOMER` | `ADJUSTMENT`
- `physicalOnly` (optional): `true` (returns only STORAGE, INTERNAL, PRODUCTION)

---

## 7. Operations (Receipts, Deliveries, Transfers)

### `GET /api/operations`
*Headers: `Authorization: Bearer <token>`*  
**Query Parameters**: `type`, `status`, `warehouseId`, `categoryId`, `search`.

### `GET /api/operations/:id`
*Headers: `Authorization: Bearer <token>`*  
Returns full details of an operation including items, locations, creator, validator, and associated ledger entries.

### `POST /api/operations`
Creates a new movement header in `WAITING` status.  
*Headers: `Authorization: Bearer <token>`*

**Request Body**:
```json
{
  "type": "RECEIPT",
  "partnerName": "Tata Steel Supplies",
  "sourceLocationId": "loc_vendor_virtual",
  "destinationLocationId": "loc_main_store",
  "notes": "Incoming order #PO-9921",
  "items": [
    {
      "productId": "prod_001",
      "expectedQty": 100
    }
  ]
}
```

### `POST /api/operations/:id/action-ready`
Marks operation as `READY` (picking and packing completed).  
*Headers: `Authorization: Bearer <token>`*

### `POST /api/operations/:id/validate`
**Stock Calculation Engine Trigger**. Validates lines, checks availability, creates immutable ledger entries, updates quant balances, and sets status to `DONE`.  
*Headers: `Authorization: Bearer <token>`*

**Request Body** *(Optional — defaults to expectedQty if omitted)*:
```json
{
  "items": [
    {
      "productId": "prod_001",
      "doneQty": 100
    }
  ]
}
```

### `POST /api/operations/:id/cancel`
Cancels a non-completed operation.  
*Headers: `Authorization: Bearer <token>`*

---

## 8. Inventory Adjustments & Stock Ledger

### `POST /api/adjustments`
Direct physical stock reconciliation endpoint.  
*Headers: `Authorization: Bearer <token>` (MANAGER role required)*

**Request Body**:
```json
{
  "productId": "prod_001",
  "locationId": "loc_prod_rack",
  "countedQty": 32,
  "reason": "Damaged goods scrapped during inspection"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "operationId": "op_cuid...",
    "documentNumber": "ADJ-2026-0001",
    "product": { "id": "prod_001", "name": "Steel Rod 12mm", "sku": "STL-ROD-12" },
    "location": { "id": "loc_prod_rack", "name": "Production Floor" },
    "previousQuantity": 35,
    "countedQuantity": 32,
    "difference": -3,
    "reason": "Damaged goods scrapped during inspection"
  },
  "message": "Inventory adjustment completed successfully"
}
```

### `GET /api/ledger`
Retrieves immutable stock ledger / move history.  
*Headers: `Authorization: Bearer <token>`*

**Query Parameters**: `productId`, `locationId`, `operationType`, `dateFrom`, `dateTo`.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ledg_001",
      "referenceNumber": "REC-2026-0001",
      "operationType": "RECEIPT",
      "product": { "id": "prod_001", "name": "Steel Rod 12mm", "sku": "STL-ROD-12" },
      "sourceLocation": { "name": "Vendor Transit" },
      "destinationLocation": { "name": "Main Store" },
      "quantity": 100,
      "performedBy": { "name": "Warehouse Staff 1" },
      "createdAt": "2026-09-26T08:45:00.000Z"
    }
  ]
}
```
