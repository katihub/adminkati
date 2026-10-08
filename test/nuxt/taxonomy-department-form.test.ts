import type { Rayon } from "@/types/api/taxonomie"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import DepartmentForm from "@/components/taxonomy/DepartmentForm.vue"

const rayon: Rayon = { id: "network", slug: "network", nom: "Network", nom_court: "Net", compte_total: 2 }

describe("department form", () => {
  it("refuses an identifier the backend pattern would reject, and says the rule", async () => {
    const wrapper = await mountSuspended(DepartmentForm, { props: { department: null, pending: false } })

    await wrapper.get("[data-testid='department-form-name']").setValue("Gros Électroménager")
    await wrapper.get("[data-testid='department-form-short-name']").setValue("Gros électro")
    await wrapper.get("[data-testid='department-form-id']").setValue("Gros Électroménager")
    await wrapper.get("[data-testid='department-form']").trigger("submit")

    expect(wrapper.emitted("submit")).toBeUndefined()
    /* Clé OU phrase : sous vitest le chargeur de locales aboutit une fois sur deux,
       et l'assertion porte sur le message rendu, pas sur ce hasard. */
    expect(wrapper.get("[data-testid='department-form-id-error']").text()).toMatch(
      /validation\.format|gros-electromenager/,
    )
  })

  it("offers the slug the name would produce and applies it on click", async () => {
    const wrapper = await mountSuspended(DepartmentForm, { props: { department: null, pending: false } })

    await wrapper.get("[data-testid='department-form-name']").setValue("Gros Électroménager")
    await wrapper.get("[data-testid='department-form-id']").setValue("Gros Électroménager")
    await wrapper.get("[data-testid='department-form-id-suggestion']").trigger("click")

    expect(wrapper.get<HTMLInputElement>("[data-testid='department-form-id']").element.value).toBe(
      "gros-electromenager",
    )
  })

  it("carries the tagline into the creation payload", async () => {
    const wrapper = await mountSuspended(DepartmentForm, { props: { department: null, pending: false } })

    await wrapper.get("[data-testid='department-form-name']").setValue("Gros électroménager")
    await wrapper.get("[data-testid='department-form-short-name']").setValue("Gros électro")
    await wrapper.get("[data-testid='department-form-accroche']").setValue("Tout pour équiper la cuisine.")
    await wrapper.get("[data-testid='department-form']").trigger("submit")

    expect(wrapper.emitted("submit")?.[0]).toEqual([
      {
        id: "gros-electromenager",
        slug: "gros-electromenager",
        nom: "Gros électroménager",
        nom_court: "Gros électro",
        accroche: "Tout pour équiper la cuisine.",
      },
    ])
  })

  it("clears a tagline with an explicit null rather than an empty string", async () => {
    const wrapper = await mountSuspended(DepartmentForm, {
      props: { department: { ...rayon, accroche: "Le réseau, de la prise au routeur." }, pending: false },
    })

    await wrapper.get("[data-testid='department-form-accroche']").setValue("")
    await wrapper.get("[data-testid='department-form']").trigger("submit")

    expect(wrapper.emitted("submit")?.[0]).toEqual([{ accroche: null }])
  })

  it("refuses a short name longer than the forty characters the backend allows", async () => {
    const wrapper = await mountSuspended(DepartmentForm, { props: { department: rayon, pending: false } })

    await wrapper.get("[data-testid='department-form-short-name']").setValue("x".repeat(41))
    await wrapper.get("[data-testid='department-form']").trigger("submit")

    expect(wrapper.emitted("submit")).toBeUndefined()
    expect(wrapper.get("[data-testid='department-form-short-name-error']").text()).toMatch(/validation\.tooLong|40/)
  })
})
