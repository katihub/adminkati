import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { readBody } from "h3"
import { afterEach, describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  useArchiveDeliveryInterval,
  useCreateDeliveryInterval,
  useRestoreDeliveryInterval,
  useUpdateDeliveryInterval,
} from "@/composables/useDeliveryIntervalMutations"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BASE = "/api/v1/catalogue/administration/delais-livraison"
const PRODUCTS_KEY = apiQueryKeys.products.list({ etat: "actifs" })

const CREATED: DelaiLivraison = {
  id: 5,
  min_valeur: 2,
  max_valeur: 4,
  unite: "jours",
  est_defaut: false,
  actif: true,
  utilise_par: 0,
}

function seed() {
  const queryClient = useNuxtApp().$queryClient
  queryClient.setQueryData(apiQueryKeys.deliveryIntervals.all, [])
  queryClient.setQueryData(PRODUCTS_KEY, { produits: [], total: 0, page: 1, pages: 1, taille: 50 })
  return queryClient
}

function isInvalidated(queryClient: ReturnType<typeof useNuxtApp>["$queryClient"], key: readonly unknown[]) {
  return queryClient.getQueryState(key)?.isInvalidated
}

async function run<T>(action: () => Promise<T>): Promise<{ result?: T; error?: unknown }> {
  const outcome: { result?: T; error?: unknown } = {}
  const Probe = defineComponent({
    async setup() {
      try {
        outcome.result = await action()
      } catch (error) {
        outcome.error = error
      }
      return () => h("div")
    },
  })
  const wrapper = await mountSuspended(Probe)
  await flushPromises()
  wrapper.unmount()
  return outcome
}

describe("delivery interval mutations", () => {
  afterEach(() => useNuxtApp().$queryClient.clear())

  it("creates by POSTing the body as given, returning the created option and refreshing only the interval list", async () => {
    const queryClient = seed()
    let body: unknown
    const cleanup = registerEndpoint(BASE, {
      method: "POST",
      handler: async event => {
        body = await readBody(event)
        return CREATED
      },
    })

    const outcome = await run(() =>
      useCreateDeliveryInterval().mutateAsync({ min_valeur: 2, max_valeur: 4, unite: "jours" }),
    )

    expect(body).toEqual({ min_valeur: 2, max_valeur: 4, unite: "jours" })
    expect(outcome.result).toMatchObject({ id: 5 })
    expect(isInvalidated(queryClient, apiQueryKeys.deliveryIntervals.all)).toBe(true)
    expect(isInvalidated(queryClient, PRODUCTS_KEY)).toBe(false)
    cleanup()
  })

  it("updates by PATCHing the patch to the option's URL and refreshes intervals and products", async () => {
    const queryClient = seed()
    let body: unknown
    const cleanup = registerEndpoint(`${BASE}/9`, {
      method: "PATCH",
      handler: async event => {
        body = await readBody(event)
        return { ...CREATED, id: 9 }
      },
    })

    await run(() => useUpdateDeliveryInterval().mutateAsync({ id: 9, patch: { max_valeur: 6 } }))

    expect(body).toEqual({ max_valeur: 6 })
    expect(isInvalidated(queryClient, apiQueryKeys.deliveryIntervals.all)).toBe(true)
    expect(isInvalidated(queryClient, PRODUCTS_KEY)).toBe(true)
    cleanup()
  })

  it("archives by PATCHing exactly { actif: false } and refreshes intervals and products", async () => {
    const queryClient = seed()
    let body: unknown
    const cleanup = registerEndpoint(`${BASE}/3`, {
      method: "PATCH",
      handler: async event => {
        body = await readBody(event)
        return { ...CREATED, id: 3, actif: false }
      },
    })

    await run(() => useArchiveDeliveryInterval().mutateAsync(3))

    expect(body).toEqual({ actif: false })
    expect(isInvalidated(queryClient, apiQueryKeys.deliveryIntervals.all)).toBe(true)
    expect(isInvalidated(queryClient, PRODUCTS_KEY)).toBe(true)
    cleanup()
  })

  it("restores by PATCHing exactly { actif: true } and leaves products alone", async () => {
    const queryClient = seed()
    let body: unknown
    const cleanup = registerEndpoint(`${BASE}/4`, {
      method: "PATCH",
      handler: async event => {
        body = await readBody(event)
        return { ...CREATED, id: 4 }
      },
    })

    await run(() => useRestoreDeliveryInterval().mutateAsync(4))

    expect(body).toEqual({ actif: true })
    expect(isInvalidated(queryClient, apiQueryKeys.deliveryIntervals.all)).toBe(true)
    expect(isInvalidated(queryClient, PRODUCTS_KEY)).toBe(false)
    cleanup()
  })
})
