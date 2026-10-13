import { mountSuspended, registerEndpoint } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { getQuery, readBody } from "h3"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  buildSellerPayoutProofFormData,
  useSellerFinanceMutations,
  useSellerWithdrawals,
} from "@/composables/useMarketplaceOperations"

describe("seller finance API integration", () => {
  it("reads the withdrawal queue and sends the exact financial workflow contracts", async () => {
    const commands: Array<{ path: string; body: unknown }> = []
    let observedQuery: Record<string, unknown> | undefined
    const cleanups = [
      registerEndpoint("/api/v1/marketplace/finance/retraits", {
        method: "GET",
        handler: event => {
          observedQuery = getQuery(event)
          return {
            total: 1,
            page: 1,
            taille: 25,
            elements: [{ id: "withdrawal-1", reference: "RET-001", statut: "demande" }],
          }
        },
      }),
      registerEndpoint("/api/v1/marketplace/finance/commissions/acquisition", {
        method: "POST",
        handler: async event => {
          commands.push({ path: "acquire", body: await readBody(event) })
          return { examinees: 1, acquises: 1, commissionTotaleFcfa: 1000, netVendeurTotalFcfa: 9000 }
        },
      }),
      registerEndpoint("/api/v1/marketplace/finance/retraits/withdrawal-1/decision", {
        method: "POST",
        handler: async event => {
          commands.push({ path: "approve", body: await readBody(event) })
          return { ok: true }
        },
      }),
      registerEndpoint("/api/v1/marketplace/finance/retraits/withdrawal-1/reversement", {
        method: "POST",
        handler: async event => {
          commands.push({ path: "transfer", body: await readBody(event) })
          return { ok: true }
        },
      }),
      registerEndpoint("/api/v1/marketplace/finance/retraits/withdrawal-1/reversement/rapprocher", {
        method: "POST",
        handler: () => {
          commands.push({ path: "reconcile", body: undefined })
          return { ok: true }
        },
      }),
    ]
    let list: ReturnType<typeof useSellerWithdrawals> | undefined
    const Probe = defineComponent({
      async setup() {
        list = useSellerWithdrawals({ statut: "demande", taille: 25 })
        const mutations = useSellerFinanceMutations()
        await mutations.acquireCommissions.mutateAsync(100)
        await mutations.decideWithdrawal.mutateAsync({ id: "withdrawal-1", decision: "approuve" })
        await mutations.initiateTransfer.mutateAsync({ id: "withdrawal-1", telephone: "+237699000001" })
        await mutations.reconcileTransfer.mutateAsync("withdrawal-1")
        return () => h("div")
      },
    })

    const wrapper = await mountSuspended(Probe)
    await flushPromises()

    expect(observedQuery).toEqual({ statut: "demande", taille: "25" })
    expect(list?.data.value?.elements[0]?.reference).toBe("RET-001")
    expect(commands).toEqual([
      { path: "acquire", body: { limite: 100 } },
      { path: "approve", body: { decision: "approuve" } },
      {
        path: "transfer",
        body: { telephone: "+237699000001" },
      },
      { path: "reconcile", body: undefined },
    ])

    cleanups.forEach(cleanup => cleanup())
    wrapper.unmount()
    useNuxtApp().$queryClient.clear()
  })

  it("builds a multipart proof without exposing a storage key or client-provided hash", () => {
    const file = new File(["%PDF-1.7 proof"], "receipt.pdf", { type: "application/pdf" })
    const body = buildSellerPayoutProofFormData(file)

    expect(body.get("fichier")).toBe(file)
    expect([...body.keys()]).toEqual(["fichier"])
  })
})
