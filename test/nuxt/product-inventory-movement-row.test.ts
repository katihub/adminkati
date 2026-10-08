import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import InventoryMovementRow from "@/components/products/InventoryMovementRow.vue"
import { makeMovement } from "./inventory-fixture"

const mounted: Array<{ unmount: () => void }> = []

afterEach(() => mounted.splice(0).forEach(wrapper => wrapper.unmount()))

async function variationCell(variation: number, type: "initialisation" | "reception" | "correction" = "reception") {
  const wrapper = await mountSuspended(InventoryMovementRow, {
    props: {
      movement: makeMovement({ variation, type, quantite_avant: 0, quantite_apres: variation }),
    },
    attachTo: document.body,
  })
  mounted.push(wrapper)
  const cell = wrapper.findAll("td")[2]
  if (!cell) throw new Error("variation cell missing")
  return cell
}

describe("product inventory movement row: variation", () => {
  it("shows an initialisation of 0 as a neutral 0, not as a loss", async () => {
    const cell = await variationCell(0, "initialisation")

    expect(cell.text()).toBe("0")
    expect(cell.classes()).not.toContain("text-destructive")
    expect(cell.classes()).toContain("text-muted-foreground")
  })

  it("shows a gain in the success colour", async () => {
    const cell = await variationCell(5)

    expect(cell.text()).toBe("5")
    expect(cell.classes()).toContain("text-success")
    expect(cell.classes()).not.toContain("text-destructive")
  })

  it("shows a loss in the destructive colour", async () => {
    const cell = await variationCell(-3, "correction")

    expect(cell.text()).toContain("3")
    expect(cell.classes()).toContain("text-destructive")
    expect(cell.classes()).not.toContain("text-success")
  })
})
