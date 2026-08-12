declare global {
  interface Window {
    __SEEV_RUNTIME_CONFIG__?: {
      VITE_API_URL?: string
    }
  }
}

export function getApiBaseUrl() {
  return (
    window.__SEEV_RUNTIME_CONFIG__?.VITE_API_URL?.trim() ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:3000'
  )
}
