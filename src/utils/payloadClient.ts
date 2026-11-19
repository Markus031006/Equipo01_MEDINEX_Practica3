const BASE_URL = (import.meta.env.VITE_PAYLOAD_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

const TOKEN_KEY = 'medinex_payload_token'

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token)
    } else {
      sessionStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // Fallback silencioso si el almacenamiento está restringido
  }
}

export interface PayloadListResponse<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export async function payloadFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getAuthToken()
    if (token) {
      headers.set('Authorization', `JWT ${token}`)
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let errorMessage = `Error ${response.status} en el servidor`
    try {
      const errorData = await response.json()
      if (errorData?.errors?.[0]?.message) {
        errorMessage = errorData.errors[0].message
      } else if (errorData?.message) {
        errorMessage = errorData.message
      }
    } catch {
      // No es JSON
    }
    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}
