import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useQuoteWorkspaceStore } from "../../app/stores/quote-workspace"

describe("quote workspace filters", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("starts without a status filter", () => {
    const store = useQuoteWorkspaceStore()

    expect(store.filters).toStrictEqual({})
  })

  it("adds and clears the backend status filter", () => {
    const store = useQuoteWorkspaceStore()

    store.setStatus("ouvert")
    expect(store.filters).toStrictEqual({ statut: "ouvert" })

    store.setStatus(undefined)
    expect(store.filters).toStrictEqual({})
  })

  it("resets the status filter", () => {
    const store = useQuoteWorkspaceStore()
    store.setStatus("archive")

    store.$reset()

    expect(store.filters).toStrictEqual({})
  })
})
