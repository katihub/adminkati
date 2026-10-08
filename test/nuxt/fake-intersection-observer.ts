import { vi } from "vitest"

interface Entry {
  isIntersecting: boolean
  target: Element
}

/** happy-dom never computes intersections: tests decide when a watched element comes into view. */
class FakeIntersectionObserver {
  static live = new Set<FakeIntersectionObserver>()
  private targets = new Set<Element>()

  constructor(private callback: (entries: Entry[], observer: FakeIntersectionObserver) => void) {
    FakeIntersectionObserver.live.add(this)
  }

  observe(element: Element) {
    this.targets.add(element)
  }

  unobserve(element: Element) {
    this.targets.delete(element)
  }

  disconnect() {
    this.targets.clear()
    FakeIntersectionObserver.live.delete(this)
  }

  takeRecords() {
    return []
  }

  fire(isIntersecting: boolean) {
    const entries = [...this.targets].map(target => ({ isIntersecting, target }))
    if (entries.length) this.callback(entries, this)
  }
}

export function installFakeIntersectionObserver() {
  FakeIntersectionObserver.live.clear()
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
  Object.defineProperty(window, "IntersectionObserver", {
    value: FakeIntersectionObserver,
    configurable: true,
    writable: true,
  })

  return {
    /** Everything currently watched enters (or leaves) the viewport. */
    setVisible(isIntersecting: boolean) {
      FakeIntersectionObserver.live.forEach(observer => observer.fire(isIntersecting))
    },
    restore() {
      FakeIntersectionObserver.live.clear()
      vi.unstubAllGlobals()
    },
  }
}
