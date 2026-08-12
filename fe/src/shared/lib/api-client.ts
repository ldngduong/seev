import axios, { type InternalAxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
})

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
})

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean
}

let refreshRequest: Promise<void> | null = null

function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = refreshClient
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

function isNonRefreshableAuthRequest(url?: string) {
  return [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/google',
  ].some((path) => url?.startsWith(path))
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }

    const config = error.config as RetryableRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !config ||
      config._authRetry ||
      isNonRefreshableAuthRequest(config.url)
    ) {
      return Promise.reject(error)
    }

    config._authRetry = true

    try {
      await refreshAccessToken()
      return apiClient.request(config)
    } catch (refreshError) {
      window.dispatchEvent(new Event('auth:session-expired'))
      return Promise.reject(refreshError)
    }
  },
)
