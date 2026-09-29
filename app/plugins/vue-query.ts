import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'

/**
 * Wires up TanStack Vue Query (already a dependency).
 * Use it for server state: `const { data } = useQuery({ queryKey, queryFn })`.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30s before refetching
        retry: 1,
      },
    },
  })

  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  return {
    provide: { queryClient },
  }
})
