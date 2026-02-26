---
name: ai-waiter-mvp
overview: Implement a mobile-first QR-based restaurant ordering MVP with an AI menu assistant, Express/Mongo backend, and real-time kitchen dashboard in a single repo.
todos:
  - id: setup-repo
    content: Initialize monorepo with `frontend/` (Vite + React + Tailwind) and `backend/` (Express + TypeScript + Mongoose + Socket.io) projects
    status: completed
  - id: db-models-seed
    content: Implement Mongoose models for Restaurant, MenuCategory, MenuItem, Order, and OrderItem plus a seed script for a demo restaurant and menu
    status: completed
  - id: backend-routes-realtime
    content: Implement Express REST API routes for menu, orders, and chat plus Socket.io events for real-time kitchen updates
    status: completed
  - id: ai-menu-assistant
    content: Create menu-aware OpenAI chat endpoint constrained to restaurant menu data
    status: completed
  - id: frontend-menu-cart-chat
    content: Build customer-facing menu page with cart management and integrated AI chat workflow
    status: completed
  - id: frontend-kitchen-dashboard
    content: Implement real-time kitchen dashboard showing orders and allowing status updates
    status: completed
  - id: deploy-and-test
    content: Deploy backend, database, and frontend to chosen platforms and manually test end-to-end flows
    status: completed
isProject: false
---

# AI Waiter MVP Implementation Plan

## 1. Repository & Project Structure

- **Monorepo layout**
  - `frontend/` – Vite + React + Tailwind app
  - `backend/` – Express.js + Mongoose + Socket.io API
  - `shared/` (optional later) – shared TypeScript types for DTOs
- **Environment management**
  - `.env` files for frontend (Vite `VITE_` vars) and backend (Mongo URI, OpenAI key, CORS origins)

## 2. Data Model & MongoDB Setup

- **Mongoose connection**
  - Create `backend/src/config/db.ts` for MongoDB connection using connection string from env.
- **Core models** (Mongoose schemas in `backend/src/models/`)
  - `Restaurant`
    - Fields: `_id`, `name`, `slug`
  - `MenuCategory`
    - Fields: `_id`, `restaurantId` (ObjectId ref `Restaurant`), `name`
  - `MenuItem`
    - Fields: `_id`, `categoryId` (ObjectId ref `MenuCategory`), `name`, `description`, `price`, `allergens: string[]`, `tags: string[]`
  - `Order`
    - Fields: `_id`, `restaurantId` (ref `Restaurant`), `status: 'new' | 'preparing' | 'ready'`, `createdAt` (timestamps)
  - `OrderItem`
    - Fields: `_id`, `orderId` (ref `Order`), `menuItemId` (ref `MenuItem`), `quantity`, `notes` (optional)
- **Initial seed script**
  - Add `backend/src/scripts/seed.ts` to create one `Restaurant` with a slug (e.g. `demo-bistro`), categories, and menu items for development.

## 3. Backend API Design (Express + Socket.io)

- **App bootstrap** in `backend/src/server.ts`
  - Set up Express app with JSON parsing and CORS.
  - Attach Socket.io to the HTTP server (`/socket.io` namespace, CORS allowed from frontend origin).
- **Routes**
  - `GET /api/restaurants/:slug/menu`
    - Returns restaurant info and nested categories + items:
    - Response shape (simplified):
      - `{ restaurant, categories: [{ _id, name, items: MenuItem[] }] }`
  - `POST /api/orders`
    - Body: `{ restaurantId, tableNumber?, items: [{ menuItemId, quantity, notes? }] }`
    - Creates `Order` + `OrderItem[]` in a transaction-like flow (or sequential with validation).
    - Emits Socket.io event `order:new` with order summary payload.
    - Returns `{ orderId, status }`.
  - `GET /api/restaurants/:restaurantId/orders`
    - Query: `status?` (optional filter).
    - Returns list of recent orders with populated items and menu item details.
  - `PATCH /api/orders/:orderId/status`
    - Body: `{ status: 'new' | 'preparing' | 'ready' }`.
    - Updates order status and emits `order:updated` via Socket.io.
  - `POST /api/chat`
    - Body: `{ restaurantId, messages: [{ role, content }], contextFilters? }`.
    - Fetches restaurant menu data from DB, constructs system prompt + tools/context, calls OpenAI chat completion, returns assistant message.
- **Socket.io events**
  - Namespace: default (`io`), optionally room by `restaurantId`.
  - Events from server:
    - `order:new` – payload: `{ orderId, restaurantId, items, notes, createdAt, status }`.
    - `order:updated` – payload: `{ orderId, status }`.
  - Kitchen clients join a room for `restaurantId` on connect for scoped updates.

## 4. AI Integration (OpenAI)

- **OpenAI client setup**
  - `backend/src/services/openaiClient.ts` – configure with API key from env.
- **Menu-aware chat service** in `backend/src/services/menuAssistant.ts`
  - Load menu for `restaurantId` and serialize into a compact context (categories, item names, short descriptions, allergens, tags).
  - System prompt (base): "You are a restaurant assistant. You can answer questions ONLY using the provided menu data. If a question is not related to the menu, politely decline. You can recommend items, suggest add-ons, and filter by allergens or preferences."
  - Add the menu context either as:
    - A long system message containing formatted menu text, or
    - A separate `context` message the model can reference.
  - Implement simple guardrails:
    - If model response appears to reference content outside menu context, prepend an additional system message and retry (MVP optional).

## 5. Frontend Architecture (Vite + React + Tailwind)

- **App structure** in `frontend/src/`
  - `main.tsx` – React root with router and global providers.
  - `App.tsx` – routing setup using React Router:
    - `/restaurant/:slug/menu`
    - `/kitchen/:restaurantId`
  - `components/`
    - `MenuCategoryList.tsx`
    - `MenuItemCard.tsx`
    - `CartSummary.tsx`
    - `ChatPanel.tsx`
    - `OrderConfirmationModal.tsx`
    - `KitchenOrderCard.tsx`
  - `pages/`
    - `MenuPage.tsx`
    - `KitchenDashboardPage.tsx`
- **Styling**
  - Tailwind configured via `tailwind.config.js` with mobile-first breakpoints.
  - Global styles for typography and layout in `index.css`.

## 6. Customer Flow – UI & Logic

### 6.1 Menu page `/restaurant/:slug/menu`

- **Data loading**
  - On mount, call `GET /api/restaurants/:slug/menu` to fetch restaurant + categories + items.
  - Store in React state (or React Query for caching if desired).
- **Layout**
  - Mobile-first single-column layout:
    - Top: restaurant name and optional subtitle.
    - Scrollable categories with sticky category tabs at top.
    - Floating/cart summary bar at bottom on mobile.
- **Cart state**
  - React context or Zustand store for cart:
    - Shape: `{ items: { menuItemId, name, price, quantity, notes? }[] }`.
  - Actions: add item, remove item, update quantity, add notes.
- **Interactions**
  - Tapping a `MenuItemCard` opens a bottom sheet or modal:
    - Show full description, allergens, tags.
    - Allow quantity selection and notes.
  - Cart summary shows:
    - Total items, total price.
    - "Ask before ordering" button.

### 6.2 AI Chat – `ChatPanel`

- **UI**
  - Slide-up panel from bottom or full-screen modal on mobile.
  - Message list + input box and send button.
- **Behavior**
  - Maintain local `messages` state mirroring OpenAI format: `[{ role: 'user' | 'assistant', content }]`.
  - On send:
    - Append user message to state.
    - POST to `/api/chat` with conversation history and `restaurantId`.
    - Show loading state and append assistant reply on response.
  - Optionally show quick chips like "Show vegan options", "No nuts", "Spicy recommendations" that prefill user messages.
- **Cart awareness (MVP light)**
  - Include current cart items in chat as an extra context message so AI can suggest add-ons.

### 6.3 Order confirmation

- **Flow**
  - From cart, tap "Confirm order".
  - Show confirmation modal with:
    - Items, quantities, subtotals.
    - Optional input for table number or name.
    - Notes field for entire order.
  - On confirm:
    - POST `/api/orders` with cart items + restaurantId + table number.
    - Clear cart on success.
    - Navigate to a simple confirmation screen summarizing the order and status `new`.

## 7. Kitchen Dashboard `/kitchen/:restaurantId`

- **Access**
  - Simple public/unguarded route for MVP (no auth).
  - URL can be bookmarked in the kitchen tablet.
- **Data loading**
  - On mount, fetch `GET /api/restaurants/:restaurantId/orders` for recent orders with items populated.
- **Real-time updates (Socket.io)**
  - Connect to Socket.io server when page mounts.
  - Join room for `restaurantId`.
  - Listen for `order:new` → prepend new order to list.
  - Listen for `order:updated` → update status in local state.
- **UI**
  - Grid or stacked list of `KitchenOrderCard`s.
  - Each card shows:
    - Order id (short), table number (if provided).
    - Items with quantities and notes.
    - Status pill (New / Preparing / Ready).
    - Timestamp (relative, e.g. "5 min ago").
- **Status updates**
  - Each card has buttons to set status:
    - New → Preparing → Ready.
  - On click, call `PATCH /api/orders/:orderId/status` and let Socket.io broadcast update (or optimistically update local state).

## 8. QR Code & Routing

- **QR code target**
  - For MVP, use a static QR code printed for the single restaurant pointing to:
    - Production URL: `https://<frontend-domain>/restaurant/demo-bistro/menu`.
- **Slug handling**
  - React Router param `slug` used to request menu from backend and map to `Restaurant`.
  - No dynamic tenant creation required in MVP.

## 9. Configuration & Environment

- **Frontend `.env**`
  - `VITE_API_BASE_URL` – backend URL (different for dev vs prod).
- **Backend `.env**`
  - `MONGODB_URI`
  - `OPENAI_API_KEY`
  - `CORS_ORIGIN` – frontend origin.
  - `PORT`

## 10. Deployment Plan

- **Backend**
  - Deploy to Render or Railway.
  - Configure build/start commands (e.g. `npm run build` + `npm run start` with `ts-node` or compiled JS).
  - Set environment variables (Mongo URI to Atlas, OpenAI key, CORS origin).
- **Database**
  - Create a MongoDB Atlas cluster and database.
  - Run seed script once for initial restaurant and menu.
- **Frontend**
  - Deploy Vite app to Vercel or Netlify.
  - Set `VITE_API_BASE_URL` env to backend URL.
  - Verify CORS and Socket.io connections from deployed frontend.

## 11. Testing & MVP Validation

- **Manual testing scenarios**
  - Customer:
    - Scan QR → menu loads correctly.
    - Browse categories and items; add/remove items; adjust quantities.
    - Use AI chat to ask about allergens and preferences and verify responses stay menu-bound.
    - Place an order and see confirmation.
  - Kitchen:
    - Open kitchen URL; see existing orders.
    - Receive new orders in real-time when customer submits.
    - Change order status and see reflected across connected clients.
- **Basic error handling**
  - Graceful error messages on network failures (frontend to show toasts or inline errors).
  - Backend validation for required fields and sane quantities.

## 12. High-Level Architecture Diagram

```mermaid
flowchart LR
  userDevice["UserMobileBrowser"] --> frontend["ReactViteApp"]
  kitchenTablet["KitchenTabletBrowser"] --> frontend

  frontend -->|HTTP REST| backend["ExpressAPI"]
  frontend <-->|WebSockets (Socket.io)| backend

  backend --> db["MongoDBAtlas"]
  backend --> openai["OpenAIAPI"]
```



