import type { CommandeLigneEquipe } from "@/types/api/commandes"
import { PhCalendarBlank } from "@phosphor-icons/vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createSSRApp, defineComponent, h, nextTick } from "vue"
import { renderToString } from "vue/server-renderer"
import OrdersLineImage from "@/components/orders/LineImage.vue"
import { Button } from "@/components/vuzeno/button"
import { DatePicker } from "@/components/vuzeno/date-picker"
import DatePickerTrigger from "@/components/vuzeno/date-picker/DatePickerTrigger.vue"

const orderLine: CommandeLigneEquipe = {
  id: "line-1",
  rang: 1,
  produitId: 42,
  slug: "rice-25kg",
  nomCapture: "Rice 25kg",
  quantite: 1,
  quantiteRemise: 0,
  statutLigne: "commandee",
  motifEcart: null,
  prixCapture: 62_500,
  prixFerme: null,
}

const DatePickerHydrationProbe = defineComponent({
  setup() {
    return () =>
      h(
        DatePicker.Root,
        {
          selectionMode: "range",
          lazyMount: true,
        },
        {
          default: () => [
            h(DatePickerTrigger, () =>
              h(Button, { variant: "outline", size: "sm" }, () => ["Select dates", h(PhCalendarBlank)]),
            ),
            h(DatePicker.Content, { class: "p-3" }, () => h("div", "Calendar")),
          ],
        },
      )
  },
})

const NuxtImgStub = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => h("img", attrs)
  },
})

function createLineImageApp() {
  const app = createSSRApp(OrdersLineImage, { src: "/rice.jpg", alt: orderLine.nomCapture })
  app.component("NuxtImg", NuxtImgStub)
  return app
}

describe("orders hydration", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    vi.restoreAllMocks()
  })

  it("hydrates the closed range picker without changing its trigger or popup tree", async () => {
    const html = await renderToString(createSSRApp(DatePickerHydrationProbe))
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html).not.toContain('data-part="positioner"')
    const host = document.createElement("div")
    host.innerHTML = html
    document.body.append(host)
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const app = createSSRApp(DatePickerHydrationProbe)

    app.mount(host)
    await nextTick()

    const hydrationMessages = [...warnings.mock.calls, ...errors.mock.calls]
      .flatMap(args => args.map(String))
      .filter(message => message.includes("Hydration"))

    expect(hydrationMessages).toEqual([])

    host.querySelector<HTMLButtonElement>("[aria-label='Open calendar']")?.click()
    await nextTick()
    expect(host.textContent).toContain("Calendar")

    app.unmount()
  })

  it("hydrates the order-line placeholder before revealing an already available image", async () => {
    const html = await renderToString(createLineImageApp())

    expect(html).toContain("svg")
    expect(html).not.toContain('data-testid="orders-detail-line-image"')

    const host = document.createElement("div")
    host.innerHTML = html
    document.body.append(host)
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {})
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const app = createLineImageApp()

    app.mount(host)
    await nextTick()

    const hydrationMessages = [...warnings.mock.calls, ...errors.mock.calls]
      .flatMap(args => args.map(String))
      .filter(message => message.includes("Hydration"))

    expect(hydrationMessages).toEqual([])
    expect(host.querySelector("[data-testid='orders-detail-line-image']")).not.toBeNull()

    app.unmount()
  })
})
