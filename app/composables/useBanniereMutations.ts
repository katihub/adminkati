import type {
  BanniereAdmin,
  CreerBanniereInput,
  ModifierBanniereInput,
  ReordonnerBannieresInput,
  SuppressionBanniere,
  VarianteBanniere,
} from "@/types/api/vitrine"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

const BANNIERES_PATH = "/vitrine/administration/bannieres"

export interface CreerBanniereVariables {
  large: File
  /** Optional: without it, the storefront crops the large artwork on a phone. */
  mobile?: File | null
  fields: CreerBanniereInput
}

/**
 * Exported standalone so the multipart shape is unit-testable without mounting the
 * mutation. Numeric/boolean fields are stringified — `FormData` parts are always strings
 * or files, never their original JS type. An absent `mobile` sends no part at all: an empty
 * part would reach the backend as a file it cannot read.
 */
export function buildCreerBanniereFormData({ large, mobile, fields }: CreerBanniereVariables): FormData {
  const formData = new FormData()
  formData.append("large", large)
  if (mobile) formData.append("mobile", mobile)
  if (fields.emplacement !== undefined) formData.append("emplacement", fields.emplacement)
  formData.append("href", fields.href)
  formData.append("libelle", fields.libelle)
  formData.append("alt", fields.alt)
  if (fields.focus !== undefined) formData.append("focus", String(fields.focus))
  if (fields.active !== undefined) formData.append("active", String(fields.active))
  if (fields.ordre !== undefined) formData.append("ordre", String(fields.ordre))
  return formData
}

export function useBanniereMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()

  const invalidateBannieres = () => queryClient.invalidateQueries({ queryKey: apiQueryKeys.banners.all })

  const create = useMutation<BanniereAdmin, Error, CreerBanniereVariables>({
    mutationFn: variables =>
      apiWrite<BanniereAdmin>(BANNIERES_PATH, {
        method: "POST",
        body: buildCreerBanniereFormData(variables),
      }),
    onSuccess: invalidateBannieres,
  })

  const update = useMutation<BanniereAdmin, Error, { id: number; patch: ModifierBanniereInput }>({
    mutationFn: ({ id, patch }) =>
      apiWrite<BanniereAdmin>(`${BANNIERES_PATH}/${id}`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: invalidateBannieres,
  })

  /** Replaces either artwork, or adds the phone one a banner does not have yet. */
  const replaceImage = useMutation<BanniereAdmin, Error, { id: number; variante: VarianteBanniere; fichier: File }>({
    mutationFn: ({ id, variante, fichier }) => {
      const formData = new FormData()
      formData.append("fichier", fichier)
      return apiWrite<BanniereAdmin>(`${BANNIERES_PATH}/${id}/image/${variante}`, {
        method: "POST",
        body: formData,
      })
    },
    onSuccess: invalidateBannieres,
  })

  /**
   * Only the phone artwork can be removed: the large one is the banner itself. Removing one that
   * is already gone returns the banner unchanged rather than an error.
   */
  const removeMobileImage = useMutation<BanniereAdmin, Error, number>({
    mutationFn: id => apiWrite<BanniereAdmin>(`${BANNIERES_PATH}/${id}/image/mobile`, { method: "DELETE" }),
    onSuccess: invalidateBannieres,
  })

  /** One carousel at a time: every id of that placement, and only those. */
  const reorder = useMutation<BanniereAdmin[], Error, ReordonnerBannieresInput>({
    mutationFn: ({ emplacement, ids }) =>
      apiWrite<BanniereAdmin[]>(`${BANNIERES_PATH}/reordonner`, {
        method: "POST",
        body: { emplacement, ids },
      }),
    onSuccess: invalidateBannieres,
  })

  const remove = useMutation<SuppressionBanniere, Error, number>({
    mutationFn: id => apiWrite<SuppressionBanniere>(`${BANNIERES_PATH}/${id}`, { method: "DELETE" }),
    onSuccess: invalidateBannieres,
  })

  return { create, update, replaceImage, removeMobileImage, reorder, remove }
}
