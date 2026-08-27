export function useApiBaseUrl() {
  const { public: { apiBaseUrl } } = useRuntimeConfig()
  return apiBaseUrl as string
}

export function useWsBaseUrl() {
  const { public: { wsBaseUrl, apiBaseUrl } } = useRuntimeConfig()
  const baseUrl = (wsBaseUrl as string) || (apiBaseUrl as string).replace(/^http/, 'ws')

  return baseUrl.replace(/\/+$/, '')
}
