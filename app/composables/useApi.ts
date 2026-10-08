import type { QueryClient, QueryKey } from "@tanstack/vue-query"

export function useApiFetch() {
  const requestFetch = useRequestFetch()
  return <T>(path: string, options?: Parameters<typeof requestFetch>[1]) => requestFetch<T>(`/api/v1${path}`, options)
}

export function useApiWrite() {
  const { $csrfFetch } = useNuxtApp()
  return <T>(path: string, options?: Parameters<typeof $fetch>[1]) => $csrfFetch<T>(`/api/v1${path}`, options as never)
}

export function prefetchApi<T>(
  queryClient: QueryClient,
  key: QueryKey,
  path: string,
  params?: Record<string, unknown>,
) {
  return queryClient.prefetchQuery({ queryKey: key, queryFn: () => useApiFetch()<T>(path, { query: params }) })
}
