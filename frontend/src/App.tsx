import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MenuPage from './pages/MenuPage'
import KitchenDashboardPage from './pages/KitchenDashboardPage'
import AdminMenuPage from './pages/AdminMenuPage'
import OwnerLoginPage from './pages/OwnerLoginPage'
import OwnerSignupPage from './pages/OwnerSignupPage'
import OwnerSettingsPage from './pages/OwnerSettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import OwnerRoute from './components/OwnerRoute'
import OwnerDashboardLayout from './layouts/OwnerDashboardLayout'
import { AuthProvider } from './components/AuthContext'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/restaurant/demo-bistro/menu" replace />} />
          <Route path="/restaurant/:slug/menu" element={<MenuPage />} />
          <Route path="/kitchen/:restaurantId" element={<KitchenDashboardPage />} />
          {/* Legacy direct admin route by restaurantId (for debugging) */}
          <Route path="/admin/:restaurantId" element={<AdminMenuPage />} />

          <Route path="/owner/login" element={<OwnerLoginPage />} />
          <Route path="/owner/signup" element={<OwnerSignupPage />} />

          <Route element={<OwnerRoute />}>
            <Route path="/owner" element={<OwnerDashboardLayout />}>
              <Route index element={<Navigate to="menu" replace />} />
              <Route path="menu" element={<AdminMenuPage />} />
              <Route path="settings" element={<OwnerSettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
