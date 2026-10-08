import type { ProductListQuery } from "@/types/api/produits"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

type ProductListFilters = Omit<ProductListQuery, "page" | "taille">

/**
 * Included only when truthy — an empty string means "no filter set" for every field
 *  `filters` uses this for, so it's excluded from the query rather than sent as `""`.
 */
function whenTruthy<K extends string, V extends string>(key: K, value: V | "" | undefined): Partial<Record<K, V>> {
  return value ? ({ [key]: value } as Record<K, V>) : {}
}

/**
 * `category` is the one field where `0` is a real, meaningful id — truthy would wrongly
 *  drop it, so this checks presence instead.
 */
function whenDefined<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value !== undefined ? ({ [key]: value } as Record<K, V>) : {}
}

/**
 * `next.field ?? fallback`, named — `replaceFilters` reads as a flat list of
 *  assignments instead of that fallback expression repeated once per field.
 */
function orDefault<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback
}

export const useProductListStore = defineStore("product-list", () => {
  const searchTerm = ref("")
  const rayon = ref("")
  const category = ref<number | undefined>()
  const brand = ref("")
  const stock = ref<ProductListQuery["stock"]>()
  const state = ref<ProductListQuery["etat"]>("tous")
  const sort = ref<ProductListQuery["tri"]>("recent")
  const page = ref(1)
  const pageSize = ref(50)

  function resetPage() {
    page.value = 1
  }

  const filters = computed<ProductListQuery>(() => ({
    ...whenTruthy("q", searchTerm.value.trim()),
    ...whenTruthy("rayon", rayon.value),
    ...whenDefined("categorie", category.value),
    ...whenTruthy("marque", brand.value),
    ...whenTruthy("stock", stock.value),
    ...whenTruthy("etat", state.value),
    ...whenTruthy("tri", sort.value),
    page: page.value,
    taille: pageSize.value,
  }))

  function setSearchTerm(value: string) {
    searchTerm.value = value
    resetPage()
  }

  function setRayon(value: string) {
    rayon.value = value
    resetPage()
  }

  function setCategory(value: number | undefined) {
    category.value = value
    resetPage()
  }

  function setBrand(value: string) {
    brand.value = value
    resetPage()
  }

  function setStock(value: ProductListQuery["stock"]) {
    stock.value = value
    resetPage()
  }

  function setState(value: ProductListQuery["etat"]) {
    state.value = value
    resetPage()
  }

  function setSort(value: ProductListQuery["tri"]) {
    sort.value = value
    resetPage()
  }

  function setPage(value: number) {
    page.value = Math.max(1, value)
  }

  function setPageSize(value: number) {
    pageSize.value = value
    resetPage()
  }

  function replaceFilters(next: ProductListFilters) {
    searchTerm.value = orDefault(next.q, "")
    rayon.value = orDefault(next.rayon, "")
    category.value = next.categorie
    brand.value = orDefault(next.marque, "")
    stock.value = next.stock
    state.value = orDefault(next.etat, "tous")
    sort.value = orDefault(next.tri, "recent")
    resetPage()
  }

  function $reset() {
    searchTerm.value = ""
    rayon.value = ""
    category.value = undefined
    brand.value = ""
    stock.value = undefined
    state.value = "tous"
    sort.value = "recent"
    page.value = 1
    pageSize.value = 50
  }

  return {
    filters,
    replaceFilters,
    setSearchTerm,
    setRayon,
    setCategory,
    setBrand,
    setStock,
    setState,
    setSort,
    setPage,
    setPageSize,
    $reset,
  }
})
