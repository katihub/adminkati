import type { DelaiLivraison } from "@/types/api/delais-livraison"
import type { H3Event } from "h3"
import { registerEndpoint } from "@nuxt/test-utils/runtime"
import { DOMWrapper, flushPromises } from "@vue/test-utils"
import { expect } from "vitest"

export const DELIVERY_PATH = "/api/v1/catalogue/administration/delais-livraison"

export const DEFAULT_OPTION: DelaiLivraison = {
  id: 1,
  min_valeur: 30,
  max_valeur: 4320,
  unite: "minutes",
  est_defaut: true,
  actif: true,
  utilise_par: 0,
}
export const WORKING_DAYS_OPTION: DelaiLivraison = {
  id: 2,
  min_valeur: 5,
  max_valeur: null,
  unite: "jours_ouvres",
  est_defaut: false,
  actif: true,
  utilise_par: 0,
}
export const IN_USE_OPTION: DelaiLivraison = {
  id: 3,
  min_valeur: 2,
  max_valeur: null,
  unite: "semaines",
  est_defaut: false,
  actif: true,
  utilise_par: 4,
}
export const ARCHIVED_OPTION: DelaiLivraison = {
  id: 4,
  min_valeur: 1,
  max_valeur: null,
  unite: "mois",
  est_defaut: false,
  actif: false,
  utilise_par: 0,
}

export function deliveryOptions(): DelaiLivraison[] {
  return [DEFAULT_OPTION, WORKING_DAYS_OPTION, IN_USE_OPTION, ARCHIVED_OPTION].map(option => ({ ...option }))
}

const stubs: Array<() => void> = []

/** Registered through here so a failing assertion cannot leave its handler behind for the next test. */
export function stubEndpoint(path: string, method: "GET" | "POST" | "PATCH", handler: (event: H3Event) => unknown) {
  stubs.push(registerEndpoint(path, { method, handler }))
}

export function clearEndpoints() {
  stubs.splice(0).forEach(cleanup => cleanup())
}

/** Dialogs and popovers are portalled to <body>, outside any mounted wrapper. */
export function inBody(testId: string) {
  const element = document.body.querySelector<HTMLElement>(`[data-testid='${testId}']`)
  expect(element, testId).not.toBeNull()
  return new DOMWrapper(element!)
}

export function existsInBody(testId: string) {
  return document.body.querySelector(`[data-testid='${testId}']`) !== null
}

/** Lets the query resolve or fail (retries off) and the DOM catch up. */
export async function settle() {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 50))
  await flushPromises()
}

const DIALOG_FIELDS = [
  ["unit", "delivery-dialog-unit"],
  ["min", "delivery-dialog-min"],
  ["max", "delivery-dialog-max"],
] as const

export async function fillDialog(fields: { unit?: string; min?: number | string; max?: number | string }) {
  if (fields.max !== undefined) await inBody("delivery-dialog-mode-range").trigger("click")
  for (const [field, testId] of DIALOG_FIELDS) {
    const value = fields[field]
    if (value !== undefined) await inBody(testId).setValue(String(value))
  }
}
