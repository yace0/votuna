export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type ApiFetchOptions = RequestInit & {
  authRequired?: boolean
}

export type ApiError = Error & {
  status?: number
  detail?: string
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { authRequired, ...init } = options
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...init,
  })

  if (authRequired && response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('votuna:auth-expired'))
  }

  return response
}

export async function apiJson<T>(path: string, options: ApiFetchOptions = {}) {
  const response = await apiFetch(path, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const error: ApiError = new Error(body.detail ?? 'Request failed')
    error.status = response.status
    error.detail = body.detail
    throw error
  }
  return (await response.json()) as T
}

export async function apiJsonOrNull<T>(path: string, options: ApiFetchOptions = {}) {
  const response = await apiFetch(path, options)
  if (!response.ok) {
    return null
  }
  return (await response.json()) as T
}
