import { useAuth } from '@clerk/clerk-react'

const API_BASE = '/api'

export function useApi() {
  const { getToken } = useAuth()

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    return res
  }

  return { fetchWithAuth }
}

export async function apiFetch(endpoint: string, token: string | null, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
}
