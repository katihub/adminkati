/**
 * `localStorage` is not always reachable. Safari in private mode and any browser
 * with site data blocked throw on access rather than returning null, and Node 26
 * exposes an experimental global that stays `undefined` unless the process was
 * started with `--localstorage-file`.
 *
 * GOTCHA: reaching for it unguarded inside a Nuxt plugin does not fail locally —
 * it aborts the whole plugin chain, so every plugin registered after it silently
 * never runs. That is how a storage read took `vue-query` down with it.
 */
export function readStoredValue(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    // Unreachable storage is indistinguishable from an unset key to every
    // caller here, so report it as one.
    return null
  }
}

export function writeStoredValue(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // Every value written through here is a convenience that is re-derived on
    // the next boot, so a refused or full store costs the user nothing.
  }
}
