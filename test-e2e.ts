/**
 * StockSense End-to-End Backend Verification Test Suite
 * Tests all endpoints and business logic flows against http://localhost:5000/api
 */

import { seed } from './prisma/seed.js';

const BASE_URL = 'http://localhost:5000/api';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✅ PASS: ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message || String(err) });
    console.error(`  ❌ FAIL: ${name} -> ${err.message || String(err)}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Starting StockSense Comprehensive E2E Test Suite');
  console.log('====================================================\n');

  console.log('🔄 Initializing clean database state via seed...');
  await seed();
  console.log('✅ Clean database ready for test execution\n');

  let managerToken = '';
  let staffToken = '';
  let testProductId = '';
  let mainStoreLocationId = '';
  let prodFloorLocationId = '';
  let vendorLocationId = '';
  let customerLocationId = '';

  // 1. Health Check
  await runTest('GET /api/health - Health check endpoint', async () => {
    const res = await request('/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.data.status === 'healthy', 'Expected status: healthy');
    assert(res.data.data.database === 'connected', 'Expected database: connected');
  });

  // 2. Auth: Login existing Manager
  await runTest('POST /api/auth/login - Manager authentication', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@stocksense.com',
        password: 'Password123!',
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.data.user.role === 'MANAGER', 'Expected MANAGER role');
    assert(typeof res.data.data.token === 'string', 'Expected JWT token');
    managerToken = res.data.data.token;
  });

  // 3. Auth: Login existing Staff
  await runTest('POST /api/auth/login - Warehouse Staff authentication', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'staff@stocksense.com',
        password: 'Password123!',
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.data.user.role === 'WAREHOUSE_STAFF', 'Expected WAREHOUSE_STAFF role');
    staffToken = res.data.data.token;
  });

  // 4. Auth: Register new user
  const newEmail = `user_${Date.now()}@stocksense.com`;
  await runTest('POST /api/auth/register - Register new warehouse staff', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alex Operator',
        email: newEmail,
        password: 'Password123!',
        role: 'WAREHOUSE_STAFF',
      }),
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.data.user.email === newEmail, 'Email should match');
  });

  // 5. Auth: Forgot Password OTP flow
  let otpReceived = '';
  await runTest('POST /api/auth/forgot-password - Generate OTP', async () => {
    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: newEmail }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.data.otp.length === 6, 'Expected 6-digit OTP');
    otpReceived = res.data.data.otp;
  });

  // 6. Auth: Reset Password with OTP
  await runTest('POST /api/auth/reset-password - Reset password using OTP', async () => {
    const res = await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email: newEmail,
        otp: otpReceived,
        newPassword: 'NewPassword999!',
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
  });

  // 7. Auth: Login with New Password
  await runTest('POST /api/auth/login - Login with newly reset password', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: newEmail,
        password: 'NewPassword999!',
      }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
  });

  // 8. Auth: Me endpoint
  await runTest('GET /api/auth/me - Verify current user profile', async () => {
    const res = await request('/auth/me', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.email === 'manager@stocksense.com', 'Expected manager email');
    assert(res.data.data.role === 'MANAGER', 'Expected MANAGER role');
  });

  // 9. Warehouses & Locations
  await runTest('GET /api/warehouses & /api/locations - Fetch warehouses and locations', async () => {
    const resW = await request('/warehouses');
    assert(resW.status === 200, `Expected 200 for warehouses, got ${resW.status}`);
    assert(resW.data.data.length > 0, 'Should have seeded warehouse');

    const resL = await request('/locations');
    assert(resL.status === 200, `Expected 200 for locations, got ${resL.status}`);
    const locations = resL.data.data;
    assert(locations.length >= 5, 'Should have at least 5 locations');

    const mainStore = locations.find((l: any) => l.code === 'LOC-MAIN-STORE');
    const prodRack = locations.find((l: any) => l.code === 'LOC-PROD-RACK');
    const vend = locations.find((l: any) => l.type === 'VENDOR');
    const cust = locations.find((l: any) => l.type === 'CUSTOMER');

    assert(!!mainStore, 'Main Store location required');
    assert(!!prodRack, 'Production Floor location required');
    assert(!!vend, 'Vendor Transit location required');
    assert(!!cust, 'Customer Delivery location required');

    mainStoreLocationId = mainStore.id;
    prodFloorLocationId = prodRack.id;
    vendorLocationId = vend.id;
    customerLocationId = cust.id;
  });

  // 10. Products list & Low stock check
  await runTest('GET /api/products - Product catalog with stock aggregation & low stock flags', async () => {
    const res = await request('/products');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    const products = res.data.data;
    assert(products.length >= 4, 'Expected at least 4 products');

    const steelRod = products.find((p: any) => p.sku === 'STL-ROD-12');
    assert(!!steelRod, 'Steel Rod must exist');
    assert(steelRod.totalStock === 85, `Expected 85kg steel rod, got ${steelRod.totalStock}`);
    assert(steelRod.isLowStock === true, 'Steel Rod should have isLowStock === true (85 <= 100)');

    testProductId = steelRod.id;
  });

  // 11. Product details by ID with location breakdown
  await runTest('GET /api/products/:id - Product detail with per-location stock breakdown', async () => {
    const res = await request(`/products/${testProductId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const prod = res.data.data;
    assert(prod.id === testProductId, 'ID mismatch');
    assert(prod.locations.length >= 2, 'Expected at least 2 locations for steel rod');
    assert(prod.totalStock === 85, `Expected 85 total stock, got ${prod.totalStock}`);
  });

  // 12. Create New Product with Initial Stock (Manager role)
  let newProdId = '';
  await runTest('POST /api/products - Create product with initial stock and ledger entry', async () => {
    const catRes = await request('/categories');
    const catId = catRes.data.data[0].id;
    const testSku = `TEST-ITEM-${Date.now().toString().slice(-4)}`;

    const res = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        name: 'Hex Bolt M8',
        sku: testSku,
        categoryId: catId,
        uom: 'pcs',
        minStockAlert: 50,
        reorderQuantity: 200,
        initialStock: 150,
        initialLocationId: mainStoreLocationId,
      }),
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.success === true, 'Expected success');
    newProdId = res.data.data.id;

    // Verify it appears in product details with 150 stock
    const getRes = await request(`/products/${newProdId}`);
    assert(getRes.data.data.totalStock === 150, `Expected 150 total stock, got ${getRes.data.data.totalStock}`);
  });

  // 13. Operations: Create Receipt Operation
  let receiptOpId = '';
  await runTest('POST /api/operations - Create incoming receipt operation (WAITING)', async () => {
    const res = await request('/operations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        type: 'RECEIPT',
        partnerName: 'National Steel Corp',
        sourceLocationId: vendorLocationId,
        destinationLocationId: mainStoreLocationId,
        items: [
          {
            productId: testProductId,
            expectedQty: 50,
          },
        ],
        notes: 'Delivery PO-9002',
      }),
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.data.status === 'WAITING', 'Expected WAITING status');
    assert(res.data.data.documentNumber.startsWith('REC-'), 'Expected REC- prefix');
    receiptOpId = res.data.data.id;
  });

  // 14. Operations: Transition Receipt to READY
  await runTest('POST /api/operations/:id/action-ready - Mark operation READY', async () => {
    const res = await request(`/operations/${receiptOpId}/action-ready`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.status === 'READY', 'Expected READY status');
  });

  // 15. Operations: Validate Receipt -> StockEngine & Ledger update
  await runTest('POST /api/operations/:id/validate - Validate receipt, increase quant, create ledger entry', async () => {
    const res = await request(`/operations/${receiptOpId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [
          {
            productId: testProductId,
            doneQty: 50,
          },
        ],
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.data.status === 'DONE', 'Expected DONE status');

    // Verify stock has increased from 85 to 135
    const prodRes = await request(`/products/${testProductId}`);
    assert(prodRes.data.data.totalStock === 135, `Expected 135 stock, got ${prodRes.data.data.totalStock}`);
    assert(prodRes.data.data.isLowStock === false, 'Stock should no longer be low (135 > 100)');
  });

  // 16. Operations: Test Stock Calculation Engine INSUFFICIENT_STOCK guard
  await runTest('POST /api/operations/:id/validate - Enforce INSUFFICIENT_STOCK guard for excessive internal transfer', async () => {
    // Main store has 100kg steel rod (50 initial + 50 received). Try moving 999kg!
    const createRes = await request('/operations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        type: 'INTERNAL',
        sourceLocationId: mainStoreLocationId,
        destinationLocationId: prodFloorLocationId,
        items: [
          {
            productId: testProductId,
            expectedQty: 999,
          },
        ],
        notes: 'Excessive stock test',
      }),
    });

    const excessOpId = createRes.data.data.id;

    const valRes = await request(`/operations/${excessOpId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [
          {
            productId: testProductId,
            doneQty: 999,
          },
        ],
      }),
    });

    assert(valRes.status === 400, `Expected 400 for insufficient stock, got ${valRes.status}`);
    assert(valRes.data.error.code === 'INSUFFICIENT_STOCK', `Expected INSUFFICIENT_STOCK code, got ${valRes.data.error.code}`);
  });

  // 17. Operations: Valid Internal Transfer
  await runTest('POST /api/operations/:id/validate - Execute valid internal transfer (Main Store -> Prod Floor)', async () => {
    const createRes = await request('/operations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        type: 'INTERNAL',
        sourceLocationId: mainStoreLocationId,
        destinationLocationId: prodFloorLocationId,
        items: [
          {
            productId: testProductId,
            expectedQty: 20,
          },
        ],
        notes: 'Transfer 20kg to production floor',
      }),
    });

    const intOpId = createRes.data.data.id;

    const valRes = await request(`/operations/${intOpId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ productId: testProductId, doneQty: 20 }],
      }),
    });

    assert(valRes.status === 200, `Expected 200, got ${valRes.status}`);
    assert(valRes.data.data.status === 'DONE', 'Expected status DONE');

    // Total stock is still 135, but location distribution has changed
    const prodRes = await request(`/products/${testProductId}`);
    assert(prodRes.data.data.totalStock === 135, `Total stock should remain 135, got ${prodRes.data.data.totalStock}`);

    const mainStoreQuant = prodRes.data.data.locations.find((l: any) => l.locationId === mainStoreLocationId);
    const prodRackQuant = prodRes.data.data.locations.find((l: any) => l.locationId === prodFloorLocationId);

    // Main Store was 100, now 80. Prod Rack was 35, now 55.
    assert(mainStoreQuant.quantityOnHand === 80, `Main store should have 80, got ${mainStoreQuant.quantityOnHand}`);
    assert(prodRackQuant.quantityOnHand === 55, `Prod floor should have 55, got ${prodRackQuant.quantityOnHand}`);
  });

  // 18. Operations: Valid Delivery to Customer
  await runTest('POST /api/operations/:id/validate - Execute delivery to customer (decrements stock)', async () => {
    const createRes = await request('/operations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        type: 'DELIVERY',
        partnerName: 'Metro Infrastructure Ltd',
        sourceLocationId: mainStoreLocationId,
        destinationLocationId: customerLocationId,
        items: [
          {
            productId: testProductId,
            expectedQty: 30,
          },
        ],
        notes: 'Client delivery dispatch',
      }),
    });

    const delOpId = createRes.data.data.id;

    const valRes = await request(`/operations/${delOpId}/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        items: [{ productId: testProductId, doneQty: 30 }],
      }),
    });

    assert(valRes.status === 200, `Expected 200, got ${valRes.status}`);
    assert(valRes.data.data.status === 'DONE', 'Expected status DONE');

    // Total stock should now decrease by 30: 135 - 30 = 105
    const prodRes = await request(`/products/${testProductId}`);
    assert(prodRes.data.data.totalStock === 105, `Expected 105 total stock, got ${prodRes.data.data.totalStock}`);
  });

  // 19. Inventory Adjustment: Physical Count Reconciliation
  await runTest('POST /api/adjustments - Physical count adjustment with manager role', async () => {
    // Current Prod Floor stock is 55. Let physical count be 50 (5 scrapped / lost).
    const res = await request('/adjustments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        productId: testProductId,
        locationId: prodFloorLocationId,
        countedQty: 50,
        reason: 'Scrapped 5 damaged rods during cutting',
      }),
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    assert(res.data.data.previousQuantity === 55, `Expected previous 55, got ${res.data.data.previousQuantity}`);
    assert(res.data.data.countedQuantity === 50, `Expected counted 50, got ${res.data.data.countedQuantity}`);
    assert(res.data.data.difference === -5, `Expected difference -5, got ${res.data.data.difference}`);

    // Check product total stock updated: 105 - 5 = 100
    const prodRes = await request(`/products/${testProductId}`);
    assert(prodRes.data.data.totalStock === 100, `Expected 100 total stock, got ${prodRes.data.data.totalStock}`);
  });

  // 20. Stock Ledger: Move History Audit Trail
  await runTest('GET /api/ledger - Query immutable ledger with product and type filters', async () => {
    const res = await request(`/ledger?productId=${testProductId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    const entries = res.data.data;
    assert(entries.length >= 4, `Expected at least 4 ledger entries for test product, got ${entries.length}`);

    // Verify fields match contract
    const first = entries[0];
    assert(typeof first.referenceNumber === 'string', 'referenceNumber required');
    assert(typeof first.operationType === 'string', 'operationType required');
    assert(typeof first.quantity === 'number', 'quantity required');
    assert(typeof first.sourceLocation.name === 'string', 'sourceLocation name required');
    assert(typeof first.destinationLocation.name === 'string', 'destLocation name required');
    assert(typeof first.performedBy.name === 'string', 'performedBy name required');
  });

  // 21. Dashboard: KPIs Aggregation
  await runTest('GET /api/dashboard/kpis - Dashboard KPI aggregates', async () => {
    const res = await request('/dashboard/kpis', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Expected success: true');
    const kpis = res.data.data;

    assert(typeof kpis.totalProductsInStock === 'number', 'totalProductsInStock required');
    assert(typeof kpis.lowStockItemsCount === 'number', 'lowStockItemsCount required');
    assert(typeof kpis.pendingReceipts === 'number', 'pendingReceipts required');
    assert(typeof kpis.pendingDeliveries === 'number', 'pendingDeliveries required');
    assert(typeof kpis.internalTransfersScheduled === 'number', 'internalTransfersScheduled required');

    console.log('    📊 Current Live KPIs:', JSON.stringify(kpis));
  });

  // 22. Dashboard: Operations List with Dynamic Filters
  await runTest('GET /api/dashboard/operations - Filterable operations list', async () => {
    const resAll = await request('/dashboard/operations', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(resAll.status === 200, `Expected 200, got ${resAll.status}`);
    assert(resAll.data.data.length > 0, 'Expected operations in dashboard list');

    // Filter by type: RECEIPT
    const resRec = await request('/dashboard/operations?type=RECEIPT', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(resRec.status === 200, `Expected 200, got ${resRec.status}`);
    const receipts = resRec.data.data;
    assert(receipts.every((o: any) => o.type === 'RECEIPT'), 'All returned operations should be RECEIPT');

    // Filter by status: DONE
    const resDone = await request('/dashboard/operations?status=DONE', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(resDone.status === 200, `Expected 200, got ${resDone.status}`);
    const doneOps = resDone.data.data;
    assert(doneOps.every((o: any) => o.status === 'DONE'), 'All returned operations should be DONE');
  });

  console.log('\n====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Test Summary: ${passedCount} PASSED, ${failedCount} FAILED (Total: ${results.length})`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
