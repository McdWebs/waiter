---
name: kitchen-tables-and-order-history
overview: Add a persistent table model plus UI to create tables, and introduce an order history tab in the kitchen dashboard with filtering by table, status, and date range.
todos:
  - id: backend-tables-model
    content: Implement Table model and tables routes in backend
    status: completed
  - id: backend-order-filters
    content: Extend restaurant orders endpoint with tableNumber and date range filters
    status: completed
  - id: frontend-fetch-tables
    content: Fetch restaurant tables and expose them to KitchenDashboardPage tables view
    status: completed
  - id: frontend-create-table-ui
    content: Add UI to create new tables from the kitchen Tables tab
    status: completed
  - id: frontend-order-history-tab
    content: Add Order history tab with filters and connect it to filtered orders endpoint
    status: completed
  - id: frontend-close-table-behavior
    content: Update Tables tab logic so closed tables still appear from the persisted tables list
    status: completed
isProject: false
---

### Goal

Implement persistent restaurant tables and enhance the kitchen dashboard with:

- An option to create/manage tables.
- A new "Order history" tab with filters by table number, order status, and date range.

### Data model & backend changes

- **Add `Table` model**
  - Create a new Mongoose model in `[backend/src/models/Table.ts](backend/src/models/Table.ts)` with fields:
    - `restaurantId: ObjectId` (ref `Restaurant`, required)
    - `name: string` (display name, e.g. "Table 5")
    - `number: string` (short code used in URLs / QR codes; can match current `tableNumber` strings)
    - `status: 'active' | 'inactive'` (for enabling/disabling tables)
    - timestamps (`createdAt`, `updatedAt`).
- **Add table routes** in `[backend/src/routes/tables.ts](backend/src/routes/tables.ts)` and mount in `[backend/src/server.ts](backend/src/server.ts)`:
  - `GET /api/restaurants/:restaurantId/tables` – list tables for the restaurant (with optional `status` filter).
  - `POST /api/restaurants/:restaurantId/tables` – create a new table (validate `number` uniqueness per restaurant; return created table).
  - (Optional for later but structure for) `PATCH /api/tables/:tableId` – update table name/status.
- **Align orders with tables**
  - Keep existing `Order.tableNumber?: string` so current QR-code flow keeps working.
  - When creating a table, the `number` should be the value used in `tableNumber` and QR links (e.g. `?table=5`), but no hard coupling is required yet beyond consistency in UI.
- **Extend orders endpoint to support history filters**
  - Update `GET /api/restaurants/:restaurantId/orders` in `[backend/src/routes/orders.ts](backend/src/routes/orders.ts)` to accept optional query params:
    - `tableNumber` (string): filter to orders for that table.
    - `status` (`new|preparing|ready`): already present, keep behavior.
    - `from` / `to` (ISO date strings): filter `createdAt` between these bounds.
  - Implement these filters in the Mongo query (`match` object) and keep existing sort by `createdAt` desc.
- **Revisit `DELETE /api/restaurants/:restaurantId/orders**`
  - Keep the route for "Close table" behavior (clearing active orders for that table).
  - Note in code comments that this affects what appears in order history: history will only show orders that are still in the collection; if you want long-term history later, we can add an archive mechanism instead of hard-deleting.

### Frontend: tables management (Kitchen dashboard)

- **Add tables fetching**
  - In `[frontend/src/pages/KitchenDashboardPage.tsx](frontend/src/pages/KitchenDashboardPage.tsx)`, add a fetch on mount to `GET /api/restaurants/:restaurantId/tables` and store in new state, e.g. `tablesList`.
  - Use this list to:
    - Display known tables even if they currently have no orders or waiter calls.
    - Still derive `tables` grouping from current `orders` and `waiterCalls`, but merge in any extra `tablesList` entries with zero orders/calls.
- **Add "Create table" UI**
  - In the `Tables` tab header area, add a small button like `+ New table`.
  - Clicking opens a lightweight modal or inline form with inputs:
    - `Table number` (required, unique per restaurant; used as `number` and as `tableNumber` in URLs).
    - `Display name` (optional; default to `"Table {number}"`).
  - On submit:
    - Call `POST /api/restaurants/:restaurantId/tables`.
    - On success, update `tablesList` state to include the new table so it appears immediately in the list.
  - Validate on frontend: non-empty number, show backend error if duplicate.
- **Integrate with existing "Close table"**
  - Keep current `closeTableOrders` behavior (calling `DELETE /api/restaurants/:restaurantId/orders`).
  - After a close, the table card should remain visible (since it’s defined in `tablesList`), but show "0 orders" and no active/ready order sections.
  - Adjust `tables` composition logic so table entries from `tablesList` are always present, even if there are no orders, and the "Close table" button only appears when `table.orders.length > 0`.

### Frontend: new "Order history" tab

- **Add tab and basic layout**
  - Extend `activeTab` union in `KitchenDashboardPage` to `'orders' | 'tables' | 'history'`.
  - Add a third tab button labeled `History` alongside existing `Orders` and `Tables` buttons.
  - When `activeTab === 'history'`, render a new section below with filters and a list.
- **History filters UI**
  - Add local state for filters: `historyTableNumber`, `historyStatus`, `historyFrom`, `historyTo`.
  - Render a compact filter bar:
    - Dropdown for `Table`:
      - Options built from known table numbers (from `tablesList` and/or distinct table numbers in `orders`).
      - Include an "All tables" default.
    - Dropdown for `Status`: `All`, `New`, `Preparing`, `Ready`.
    - Date pickers or `<input type="date">` for `From` and `To`.
    - A "Apply" button that triggers reloading history.
- **Fetching and displaying history**
  - Add new state `historyOrders` and `historyLoading` / `historyError`.
  - On entering the `history` tab or pressing "Apply", call `GET /api/restaurants/:restaurantId/orders` with appropriate query params based on selected filters (only send params that are set).
  - Render results in a scrollable list:
    - Each entry shows order short id, table (if any), status, created time, and a compact list of items.
    - Keep design similar to existing order cards but simplified for overview.
- **Interaction with live updates**
  - Keep the existing socket listeners for `order:new` and `order:updated` for the main `orders` tab; history view can be request-based only (no need to live-update) to keep logic simple.

### Reuse and consistency

- **Shared type and formatting**
  - Reuse the existing `KitchenOrder` type and list rendering where possible for history items (e.g. a smaller variant of `KitchenOrderCard` or a new, simpler component).
  - Reuse status labels and time formatting patterns already used in `KitchenDashboardPage` and `MenuPage` to keep the UI consistent.

### Todos

- **backend-tables-model**: Implement `Table` Mongoose model and new tables routes; mount routes in the server.
- **backend-order-filters**: Extend `GET /restaurants/:restaurantId/orders` with `tableNumber`, `from`, and `to` filters.
- **frontend-fetch-tables**: Fetch and store restaurant tables in `KitchenDashboardPage`, merging them with derived table groups.
- **frontend-create-table-ui**: Add `+ New table` action and creation form in the `Tables` tab, wiring it to the table creation endpoint.
- **frontend-order-history-tab**: Add `History` tab with filters (table, status, date range) and list rendering using the extended orders endpoint.
- **frontend-close-table-behavior**: Ensure closed tables remain visible as empty (0 orders) entries based on the persisted tables list.

