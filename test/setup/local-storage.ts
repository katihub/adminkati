/**
 * Node 26 ships an experimental `localStorage` global that stays `undefined`
 * unless the process was started with `--localstorage-file`. It occupies the
 * slot as an own accessor on `globalThis` — which is the same object as
 * `window` here — so happy-dom never installs its own over the top.
 *
 * `sessionStorage` is untouched by this and works, which is the tell: happy-dom
 * is fine, only this one property is squatted on. The descriptor is
 * configurable, so handing the slot back to happy-dom's own `Storage` is all
 * that is needed, and specs get real persistence rather than a stub.
 *
 * Node 24 defines no such global, so this is a no-op there.
 */
if (globalThis.localStorage === undefined) {
  Object.defineProperty(globalThis, "localStorage", {
    value: new Storage(),
    configurable: true,
    writable: true,
  })
}
