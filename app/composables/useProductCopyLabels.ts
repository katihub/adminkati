import { computed } from "vue"
import { useTaxonomie } from "@/composables/useTaxonomie"

/** Suggestions carry slugs and ids; the operator reads the names the pickers show. */
export function useProductCopyLabels() {
  const { data: taxonomie } = useTaxonomie()
  const departmentNames = computed(
    () => new Map((taxonomie.value?.rayons ?? []).map(department => [department.slug, department.nom])),
  )
  const categoryNames = computed(
    () => new Map((taxonomie.value?.categories ?? []).map(category => [category.id, category.nom])),
  )

  return {
    departmentName: (slug: string) => departmentNames.value.get(slug) ?? slug,
    categoryName: (id: number) => categoryNames.value.get(id) ?? String(id),
  }
}
