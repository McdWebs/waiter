const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

interface ApiOptions extends RequestInit {
  token?: string | null
}

export async function apiFetch<TResponse>(
  path: string,
  { token, headers, ...init }: ApiOptions = {}
): Promise<TResponse> {
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(headers ?? {}),
  }

  if (token) {
    ;(finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: finalHeaders,
  })

  const text = await res.text()
  let json: { message?: string } = {}
  try {
    json = text ? (JSON.parse(text) as { message?: string }) : {}
  } catch {
    json = {}
  }

  if (!res.ok) {
    const error = new Error(json?.message ?? 'Request failed') as Error & { status?: number }
    error.status = res.status
    throw error
  }

  return json as TResponse
}

