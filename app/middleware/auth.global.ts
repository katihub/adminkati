import type { PublicSession } from "@/types/session"
import type { AccessResult } from "@/utils/access"
import type { QueryClient } from "@tanstack/vue-query"
import { createError } from "#app"
import { canAccess } from "@/utils/access"
import { isSafeRedirectPath, localeOfPath } from "@/utils/redirect"

async function loadSession(queryClient: QueryClient): Promise<PublicSession | null> {
  const cached = queryClient.getQueryData<PublicSession | null>(["v1", "moi"])
  if (cached !== undefined) return cached

  const session = await $fetch<PublicSession | null>("/api/auth/session").catch(() => null)
  queryClient.setQueryData(["v1", "moi"], session)
  return session
}

function loginTarget(fullPath: string): string {
  const i18n = useNuxtApp().$i18n
  const codes = i18n.locales.value.map(locale => (typeof locale === "string" ? locale : locale.code))
  const locale = localeOfPath(fullPath, codes, i18n.defaultLocale)
  const login = locale === "en" ? "/login" : `/${locale}/connexion`
  const next = isSafeRedirectPath(fullPath) ? `?next=${encodeURIComponent(fullPath)}` : ""
  return `${login}${next}`
}

/**
 * UNE ROUTE INCONNUE EST UNE 404, PAS UNE 500.
 *
 * Le `throw` servait d'alarme au développeur : toute page sans
 * `definePageMeta({ roles })` devait se signaler bruyamment. Mais il attrape
 * aussi ce qui n'est PAS une page — `/caisse` sans préfixe de langue, par
 * exemple, quand le chemin réel est `/fr/caisse`. L'opérateur qui tape l'URL
 * française reçoit alors « Route /caisse has no access declaration », un
 * message interne, dans un écran d'erreur serveur.
 *
 * La distinction est simple : une route que le routeur ne connaît pas est
 * introuvable ; une route qu'il connaît mais qui n'a pas déclaré ses droits
 * est un oubli de développement. Seule la seconde mérite l'alarme.
 */
function handleUndeclaredRoute(fullPath: string, routeExiste: boolean) {
  if (!routeExiste) return abortNavigation(createError({ statusCode: 404, statusMessage: "Page introuvable" }))
  if (import.meta.dev) throw new Error(`Route ${fullPath} has no access declaration`)
  return abortNavigation()
}

function redirectForAccess(result: AccessResult, fullPath: string, routeExiste: boolean) {
  if (result === "allow") return
  if (result === "undeclared") return handleUndeclaredRoute(fullPath, routeExiste)
  if (result === "anonymous") return navigateTo(loginTarget(fullPath))
  // En français, dans un panel français : « Forbidden » n'apprend rien à personne.
  return abortNavigation({ statusCode: 403, statusMessage: "Accès refusé" })
}

export default defineNuxtRouteMiddleware(async to => {
  if (to.meta.public) return
  const queryClient = useNuxtApp().$queryClient
  const session = await loadSession(queryClient)
  // `matched` vide = le routeur n'a pas de page pour ce chemin : c'est une 404,
  // pas une page qui aurait oublié de déclarer ses droits.
  return redirectForAccess(canAccess(session, to.meta), to.fullPath, to.matched.length > 0)
})
