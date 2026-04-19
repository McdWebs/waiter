import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MenuPage from "./pages/MenuPage";
import KitchenDashboardPage from "./pages/KitchenDashboardPage";
import AdminMenuPage from "./pages/AdminMenuPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";
import OwnerSignupPage from "./pages/OwnerSignupPage";
import OwnerSettingsPage from "./pages/OwnerSettingsPage";
import OwnerFeedbackPage from "./pages/OwnerFeedbackPage";
import OwnerStatsPage from "./pages/OwnerStatsPage";
import SuperAdminLoginPage from "./pages/SuperAdminLoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import OwnerRoute from "./components/OwnerRoute";
import SuperAdminRoute from "./components/SuperAdminRoute";
import OwnerDashboardLayout from "./layouts/OwnerDashboardLayout";
import { AuthProvider } from "./components/AuthContext";
import { SuperAdminAuthProvider } from "./components/SuperAdminAuthContext";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboardPage";

function App() {
  return (
    <AuthProvider>
      <SuperAdminAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/owner/login" replace />} />
            <Route path="/restaurant/:slug/menu" element={<MenuPage />} />
            <Route
              path="/kitchen/:restaurantId"
              element={<KitchenDashboardPage />}
            />
            {/* Legacy direct admin route by restaurantId (for debugging) */}
            <Route path="/admin/:restaurantId" element={<AdminMenuPage />} />

            <Route path="/owner/login" element={<OwnerLoginPage />} />
            <Route path="/owner/signup" element={<OwnerSignupPage />} />

            <Route
              path="/super-admin/login"
              element={<SuperAdminLoginPage />}
            />
            <Route element={<SuperAdminRoute />}>
              <Route
                path="/super-admin"
                element={<SuperAdminDashboardPage />}
              />
            </Route>

            <Route element={<OwnerRoute />}>
              <Route path="/owner" element={<OwnerDashboardLayout />}>
                <Route index element={<Navigate to="menu" replace />} />
                <Route path="menu" element={<AdminMenuPage />} />
                <Route path="stats" element={<OwnerStatsPage />} />
                <Route path="settings" element={<OwnerSettingsPage />} />
                <Route path="feedback" element={<OwnerFeedbackPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </SuperAdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
