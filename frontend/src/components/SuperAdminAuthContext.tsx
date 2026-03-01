import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from '../lib/api'

interface SuperAdminInfo {
  email: string
}

interface SuperAdminAuthState {
  token: string | null
  superAdmin: SuperAdminInfo | null
  loading: boolean
  loginSuperAdmin: (email: string, password: string) => Promise<void>
  logoutSuperAdmin: () => void
}

const SuperAdminAuthContext = createContext<SuperAdminAuthState | undefined>(undefined)

const STORAGE_KEY = 'ai-waiter:super-admin-token'

interface SuperAdminMeResponse {
  superAdmin: SuperAdminInfo
}

interface SuperAdminLoginResponse {
  token: string
  superAdmin: SuperAdminInfo
}

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [superAdmin, setSuperAdmin] = useState<SuperAdminInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setSuperAdmin(null)
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await apiFetch<SuperAdminMeResponse>('/api/auth/super-admin/me', { token })
        if (cancelled) return
        setSuperAdmin(data.superAdmin)
      } catch {
        if (cancelled) return
        setToken(null)
        setSuperAdmin(null)
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  const loginSuperAdmin = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<SuperAdminLoginResponse>('/api/auth/super-admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    setSuperAdmin(data.superAdmin)
    try {
      window.localStorage.setItem(STORAGE_KEY, data.token)
    } catch {
      // ignore
    }
  }, [])

  const logoutSuperAdmin = useCallback(() => {
    setToken(null)
    setSuperAdmin(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo(
    () => ({
      token,
      superAdmin,
      loading,
      loginSuperAdmin,
      logoutSuperAdmin,
    }),
    [token, superAdmin, loading, loginSuperAdmin, logoutSuperAdmin]
  )

  return (
    <SuperAdminAuthContext.Provider value={value}>
      {children}
    </SuperAdminAuthContext.Provider>
  )
}

export function useSuperAdminAuth() {
  const ctx = useContext(SuperAdminAuthContext)
  if (!ctx) {
    throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider')
  }
  return ctx
}
