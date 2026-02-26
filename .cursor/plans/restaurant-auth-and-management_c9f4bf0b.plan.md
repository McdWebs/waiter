---
name: restaurant-auth-and-management
overview: Add authentication and a management experience so restaurant owners can sign up/sign in and manage their own restaurant, menus, and settings.
todos:
  - id: backend-owner-model
    content: Add RestaurantOwner model linked one-to-one to Restaurant with email and passwordHash.
    status: completed
  - id: backend-auth-routes
    content: Implement auth routes for register, login, and current user with JWT tokens.
    status: completed
  - id: backend-auth-middleware
    content: Create auth middleware and secure admin/menu management routes to the owner’s restaurant only.
    status: completed
  - id: frontend-auth-context
    content: Create AuthContext and API helper that manages and injects auth tokens.
    status: completed
  - id: frontend-auth-pages
    content: Build owner signup and login pages with clean, responsive UI.
    status: completed
  - id: frontend-dashboard-layout
    content: Add owner dashboard layout and integrate existing AdminMenuPage as the Menu tab.
    status: completed
  - id: frontend-settings-page
    content: Create owner settings page for restaurant details and public URL.
    status: completed
  - id: error-handling-polish
    content: Unify error handling and 401 redirect behavior across owner dashboard flows.
    status: completed
isProject: false
---

## Goal

Implement a full owner-facing flow so restaurants can **sign up, sign in, and manage their single restaurant** (menu, currency, etc.), using **email/password auth first**, with the option to add social login (e.g. Google OAuth) later.

## Architecture & Data Model

- **Owner model (backend)**
  - Add a `RestaurantOwner` Mongoose model (e.g. `[backend/src/models/RestaurantOwner.ts](backend/src/models/RestaurantOwner.ts)`) with fields:
    - `email` (unique, required, lowercase)
    - `passwordHash` (hashed password using bcrypt)
    - `restaurantId` (ObjectId ref to `Restaurant`, one-to-one)
    - timestamps (`createdAt`, `updatedAt`).
- **Restaurant linkage**
  - Enforce a **one-to-one** relationship: a given `restaurantId` can appear at most once in `RestaurantOwner`.
  - Use this link in all owner-protected routes to ensure owners can only manage their own restaurant.
- **Auth tokens**
  - Use **JWT** access tokens for stateless auth, signed with a new `JWT_SECRET` in `[backend/.env](backend/.env)`.
  - Token payload: `{ ownerId, restaurantId }`, with a reasonable expiry (e.g. 12h).

## Backend Endpoints

- **Auth routes file**
  - Create `[backend/src/routes/auth.ts](backend/src/routes/auth.ts)` and mount it under `/api` in `[backend/src/server.ts](backend/src/server.ts)`.
- **POST /api/auth/register**
  - Request body: `{ email, password, restaurantName, restaurantSlug?, currency? }`.
  - Flow:
    - Validate email format, minimum password length, and restaurant name.
    - Normalize `email` to lowercase.
    - Create restaurant using existing `Restaurant` model (reusing slug-generation logic like in `POST /restaurants`).
    - Hash password with bcrypt and create `RestaurantOwner` with the new `restaurantId`.
    - Return 201 with `{ token, owner: { email }, restaurant }`.
- **POST /api/auth/login**
  - Request body: `{ email, password }`.
  - Flow:
    - Look up owner by `email` (case-insensitive).
    - Compare password with bcrypt; on failure, return 401.
    - Issue JWT `{ ownerId, restaurantId }` and return `{ token, owner, restaurant }`.
- **POST /api/auth/logout** (optional, for future refresh-tokens/cookie-based flows)
  - For now, can be a no-op on backend; frontend simply discards the token.
- **GET /api/auth/me**
  - Protected; reads JWT from `Authorization: Bearer <token>`.
  - Returns `{ owner, restaurant }` so the dashboard can bootstrap without re-login.
- **Password reset (later / stub)**
  - Reserve endpoints `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` but initially stub them or leave as TODO to avoid complexity for now.

## Backend Middleware & Protection

- **Auth middleware**
  - Create `[backend/src/middleware/auth.ts](backend/src/middleware/auth.ts)` with:
    - `authenticateOwner` that:
      - Reads `Authorization` header, verifies JWT with `JWT_SECRET`.
      - Loads `RestaurantOwner` and attaches `{ owner, restaurantId }` to `req` (e.g. `req.owner`, `req.ownerRestaurantId`).
      - Returns 401 if token is missing/invalid.
- **Protect existing admin routes**
  - In `[backend/src/routes/menu.ts](backend/src/routes/menu.ts)`:
    - Wrap `/restaurants/:restaurantId/admin-menu`, `/restaurants/:restaurantId`, `/restaurants/:restaurantId/categories`, `/categories/:categoryId`, `/categories/:categoryId/items`, `/items/:itemId`, etc., with `authenticateOwner`.
    - Inside handlers, verify that `req.ownerRestaurantId.toString() === restaurantId` (or matches the restaurant of the category/item) and return 403 if not.
  - Keep **guest-facing** routes like `GET /restaurants/:slug/menu`, `POST /orders`, and waiter calls **public**.

## Frontend Auth Flows (UI/UX)

- **Auth state & storage**
  - Create an `AuthContext` in `[frontend/src/components/AuthContext.tsx](frontend/src/components/AuthContext.tsx)` to hold:
    - `token`, `owner`, `restaurant`.
    - `login`, `logout`, `bootstrap` methods.
  - Persist token in `localStorage` (e.g. key `ai-waiter:owner-token`) and re-bootstrap on app load with `/api/auth/me`.
- **API helper**
  - Create a small fetch wrapper (e.g. `[frontend/src/lib/api.ts](frontend/src/lib/api.ts)`) that:
    - Adds `Authorization: Bearer <token>` when a token exists.
    - Handles JSON, basic error messages, and 401 handling (auto-logout and redirect to login if desired).
- **Owner sign-up page**
  - New route and page `[frontend/src/pages/OwnerSignupPage.tsx](frontend/src/pages/OwnerSignupPage.tsx)`.
  - UX:
    - Clean, single-column card with fields: **Email**, **Password**, **Restaurant name**, optional **Slug**, **Currency select**.
    - On submit, call `POST /api/auth/register`; on success, save token, push to owner dashboard.
- **Owner login page**
  - New route and page `[frontend/src/pages/OwnerLoginPage.tsx](frontend/src/pages/OwnerLoginPage.tsx)`.
  - UX:
    - Email + Password, link to “Create a new restaurant” (signup).
    - On submit, call `POST /api/auth/login`; on success, store token and redirect to dashboard.
- **Owner dashboard shell**
  - Introduce a shared layout `[frontend/src/layouts/OwnerDashboardLayout.tsx](frontend/src/layouts/OwnerDashboardLayout.tsx)` containing:
    - Top bar with restaurant name, minimal nav (e.g. **Menu**, **Settings**), and account dropdown (email + **Sign out**).
    - Primary content area that renders nested routes.
  - Implement **protected route** logic (e.g. `OwnerRoute`) that checks `AuthContext` and redirects to `/owner/login` if unauthenticated.
- **Connecting to existing Admin UI**
  - Update `[frontend/src/pages/AdminMenuPage.tsx](frontend/src/pages/AdminMenuPage.tsx)`:
    - Instead of reading `restaurantId` from unprotected URL, load it from `AuthContext.restaurant._id`.
    - Optionally keep a fallback param for dev but hide it in prod.
  - Add routing so that owner dashboard’s “Menu” tab renders `AdminMenuPage` inside `OwnerDashboardLayout`.

## Owner Settings Page & Restaurant Management

- **Basic restaurant settings page**
  - New page `[frontend/src/pages/OwnerSettingsPage.tsx](frontend/src/pages/OwnerSettingsPage.tsx)` for:
    - Changing restaurant **name** and **currency** (using existing `/api/restaurants/:restaurantId` PATCH route).
    - Displaying the **public menu URL** (`https://.../menu/:slug?table=12`) with a copy button.
  - UX:
    - Clean form with inline validation and clear success/error states.
- **Dashboard navigation & IA**
  - In the owner dashboard layout, define navigation:
    - **Menu** → `AdminMenuPage` (already implemented, now just auth-protected).
    - **Settings** → `OwnerSettingsPage`.
    - Later, **Orders**, **Analytics**, etc. can be added.

## Security & UX Details

- **Password & validation rules**
  - Minimum password length (e.g. 8 characters) and basic complexity message.
  - Normalize email to lowercase both client and server side.
- **Error handling**
  - Return consistent `{ message: string }` error shapes from auth routes.
  - On the frontend, display errors in small inline banners/toasts in forms.
- **Session UX**
  - Show a small “Signed in as {email}” indicator in the dashboard.
  - Provide a clear **Sign out** button that clears the token and owner state, then redirects to login.
  - Handle token expiry by sending the user back to login if `/api/auth/me` or any protected call returns 401.

## Future Social Login (Google OAuth) Hook

- **Backend stub**
  - Reserve a route like `POST /api/auth/google` for exchanging a Google ID token for a JWT, without implementing it fully now.
- **Frontend stub**
  - On login/signup pages, render a secondary button “Continue with Google” that is currently disabled or marked as “Coming soon”, so the UI doesn’t need rework later.

## Implementation Todos

- **backend-owner-model**: Add `RestaurantOwner` model and link it to `Restaurant`.
- **backend-auth-routes**: Implement `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` with JWT.
- **backend-auth-middleware**: Add `authenticateOwner` middleware and apply it to admin/menu management routes.
- **frontend-auth-context**: Create `AuthContext` and an API helper that injects the bearer token.
- **frontend-auth-pages**: Build owner sign-up and login pages with modern, mobile-friendly UI.
- **frontend-dashboard-layout**: Create an owner dashboard layout with nav, sign-out, and integrate `AdminMenuPage`.
- **frontend-settings-page**: Add an Owner Settings page for updating restaurant name/currency and showing the public menu URL.
- **error-handling-polish**: Standardize error messages and handle 401 redirects across the owner dashboard.

