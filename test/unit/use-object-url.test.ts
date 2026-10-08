import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { effectScope, nextTick, ref } from "vue"
import { useObjectUrl } from "../../app/composables/useObjectUrl"

const file = (name: string) => new File(["bytes"], name, { type: "image/jpeg" })

describe("object url for a picked file", () => {
  const create = vi.fn()
  const revoke = vi.fn()
  let originalCreate: typeof URL.createObjectURL
  let originalRevoke: typeof URL.revokeObjectURL

  beforeEach(() => {
    originalCreate = URL.createObjectURL
    originalRevoke = URL.revokeObjectURL
    create.mockReset().mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second")
    revoke.mockReset()
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
  })
  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  })

  it("lets go of the previous url when another file replaces it", async () => {
    const picked = ref<File | null>(file("one.jpg"))
    const scope = effectScope()
    const url = scope.run(() => useObjectUrl(picked))!
    expect(url.value).toBe("blob:first")

    picked.value = file("two.jpg")
    await nextTick()

    expect(revoke).toHaveBeenCalledWith("blob:first")
    expect(url.value).toBe("blob:second")

    scope.stop()
  })
})
