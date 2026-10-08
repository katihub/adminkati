import type { ProduitCreateInput, ProduitUpdateInput } from "@/schemas/produit"
import type { ProductDetail } from "@/types/api/produits"
import type { MaybeRefOrGetter } from "vue"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { toValue } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

const PRODUITS_PATH = "/api/v1/catalogue/administration/produits"

export function useCreateProduit() {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, ProduitCreateInput>({
    mutationFn: payload => $csrfFetch<ProductDetail>(PRODUITS_PATH, { method: "POST", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
    },
  })
}

export function useUpdateProduit(id: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, ProduitUpdateInput>({
    mutationFn: payload =>
      $csrfFetch<ProductDetail>(`${PRODUITS_PATH}/${toValue(id)}`, { method: "PATCH", body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(toValue(id)) })
    },
  })
}

export interface WithdrawProduitVariables {
  motif?: string
}

export function useWithdrawProduit(id: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, WithdrawProduitVariables>({
    mutationFn: ({ motif } = {}) =>
      $csrfFetch<ProductDetail>(`${PRODUITS_PATH}/${toValue(id)}/retirer`, {
        method: "POST",
        body: motif ? { motif } : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(toValue(id)) })
    },
  })
}

/**
 * The body IS the file, `Content-Type` is the file's own MIME type — no `FormData`. This
 * mirrors the backend's documented contract (`administration.controller.ts:186-212`), and
 * `$csrfFetch`/`ofetch` pass a `File` body through untouched with a caller-supplied header.
 */
export function useUploadProduitImage(id: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, File>({
    mutationFn: file =>
      $csrfFetch<ProductDetail>(`${PRODUITS_PATH}/${toValue(id)}/images`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(toValue(id)) })
    },
  })
}

/**
 * `rang` is the zero-based, gap-closing position `nowtech.produit_images` actually stores —
 *  never a client-renumbered value (`administration.service.ts:516-544`).
 */
export function useDeleteProduitImage(id: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, number>({
    mutationFn: rang =>
      $csrfFetch<ProductDetail>(`${PRODUITS_PATH}/${toValue(id)}/images/${rang}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(toValue(id)) })
    },
  })
}

/**
 * LA FICHE TECHNIQUE DU CONSTRUCTEUR, EN PDF.
 *
 * Meme patron que les images — le corps EST le fichier — a deux details pres
 * qui viennent du backend : le type est toujours `application/pdf`, et le nom
 * d'origine voyage dans `X-Nom-Fichier`, parce que l'objet est range sous un
 * UUID mais que le visiteur qui telecharge doit recevoir `APC-BV1000I.pdf`.
 *
 * VINGT-CINQ MEBIOCTETS, ET LE CHEMIN LE PERMET ENFIN. Le proxy plafonnait
 * tout corps non-multipart a 5 Mo : le plus gros catalogue constructeur de
 * cette boutique en fait 22,6, et l'envoi tombait en 413 sans rien expliquer.
 * Voir `server/api/v1/[...path].ts`.
 */
export function useUploadProduitFiche(id: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, File>({
    mutationFn: file =>
      $csrfFetch<ProductDetail>(`${PRODUITS_PATH}/${toValue(id)}/fiche`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": "application/pdf", "X-Nom-Fichier": file.name },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(toValue(id)) })
    },
  })
}

/** Retire le document. Le texte de la fiche reste : ce sont deux choses. */
export function useDeleteProduitFiche(id: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, void>({
    mutationFn: () => $csrfFetch<ProductDetail>(`${PRODUITS_PATH}/${toValue(id)}/fiche`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(toValue(id)) })
    },
  })
}

export function useRestoreProduit(id: MaybeRefOrGetter<number>) {
  const queryClient = useQueryClient()
  const { $csrfFetch } = useNuxtApp()

  return useMutation<ProductDetail, Error, void>({
    mutationFn: () => $csrfFetch<ProductDetail>(`${PRODUITS_PATH}/${toValue(id)}/restaurer`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.detail(toValue(id)) })
    },
  })
}
