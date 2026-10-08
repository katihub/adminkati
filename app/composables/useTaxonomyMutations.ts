import type {
  CategorieCreateInput,
  CategorieDeleteResult,
  CategoriePatchInput,
  Rayon,
  RayonCreateInput,
  RayonDeleteResult,
  RayonPatchInput,
  RecalculTaxonomieResult,
} from "@/types/api/taxonomie"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useTaxonomyMutations() {
  const apiWrite = useApiWrite()
  const queryClient = useQueryClient()

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.taxonomy.all })
    await queryClient.invalidateQueries({ queryKey: apiQueryKeys.products.all })
  }
  const category = useMutation({
    mutationFn: ({ id, input }: { id: number; input: CategoriePatchInput }) =>
      apiWrite<unknown>(`/catalogue/administration/categories/${id}`, { method: "PATCH", body: input }),
    onSuccess: invalidate,
  })
  const create = useMutation({
    mutationFn: (input: CategorieCreateInput) =>
      apiWrite<{ id: number }>("/catalogue/administration/categories", { method: "POST", body: input }),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) =>
      apiWrite<CategorieDeleteResult>(`/catalogue/administration/categories/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })
  const department = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RayonPatchInput }) =>
      apiWrite<Rayon>(`/catalogue/administration/rayons/${id}`, { method: "PATCH", body: input }),
    onSuccess: invalidate,
  })
  const createDepartment = useMutation({
    mutationFn: (input: RayonCreateInput) =>
      apiWrite<Rayon>("/catalogue/administration/rayons", { method: "POST", body: input }),
    onSuccess: invalidate,
  })
  const removeDepartment = useMutation({
    mutationFn: (id: string) =>
      apiWrite<RayonDeleteResult>(`/catalogue/administration/rayons/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })
  const recalculate = useMutation({
    mutationFn: () =>
      apiWrite<RecalculTaxonomieResult>("/catalogue/administration/taxonomie/recalculer", { method: "POST" }),
    onSuccess: invalidate,
  })

  return { category, create, remove, department, createDepartment, removeDepartment, recalculate }
}
