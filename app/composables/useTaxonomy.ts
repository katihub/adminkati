import type { Categorie, Marque, Rayon, TaxonomieResponse } from "@/types/api/taxonomie"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"
import { apiQueryKeys } from "@/utils/api-query-keys"

export function useTaxonomy() {
  const query = useQuery<TaxonomieResponse>({
    queryKey: apiQueryKeys.taxonomy.all,
    queryFn: () => useApiFetch()<TaxonomieResponse>("/catalogue/administration/taxonomie"),
  })

  return {
    ...query,
    categories: computed<Categorie[]>(() => query.data.value?.categories ?? []),
    departments: computed<Rayon[]>(() => query.data.value?.rayons ?? []),
    brands: computed<Marque[]>(() => query.data.value?.marques ?? []),
  }
}
