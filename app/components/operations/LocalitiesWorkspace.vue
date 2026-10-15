<script setup lang="ts">
// fallow-ignore-file complexity -- one declarative screen: the city form and one card per city with its neighbourhoods
import type { LocalityCity, LocalityDistrict } from "@/types/api/localities"
import { computed, reactive, ref } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLocalities, useLocalityMutations } from "@/composables/useLocalities"
import { useToastAction } from "@/composables/useToastAction"

/* THE CITIES AND NEIGHBOURHOODS OF THE STOREFRONT'S DROPDOWNS. The checkout and
   the shop signup offer these lists; an address outside them is still accepted,
   the lists mostly prevent typing mistakes that lose a courier. Deactivating
   hides an entry without deleting it, so past addresses keep their meaning. */
const { t } = useI18n()
const query = useLocalities()
const { createCity, updateCity, addDistricts, updateDistrict } = useLocalityMutations()
const run = useToastAction()
const newCity = ref("")
const drafts = reactive<Record<string, string>>({})
const pending = computed(() =>
  [createCity, updateCity, addDistricts, updateDistrict].some(mutation => mutation.isPending.value),
)
const cityError = computed(() => {
  const name = newCity.value.trim()
  if (!name) return ""
  if (name.length < 2 || name.length > 60) return t("operations.localities.cityInvalid")
  const known = (query.data.value ?? []).some(city => city.nom.toLocaleLowerCase() === name.toLocaleLowerCase())
  return known ? t("operations.localities.cityExists") : ""
})

/** One neighbourhood per line or separated by commas, trimmed and de-duplicated. */
function namesOf(draft: string | undefined) {
  const names = (draft ?? "")
    .split(/[\n,;]/)
    .map(name => name.trim().replace(/\s+/g, " "))
    .filter(name => name.length >= 2 && name.length <= 80)
  return [...new Map(names.map(name => [name.toLocaleLowerCase(), name])).values()]
}

function activeCount(city: LocalityCity) {
  return city.quartiers.filter(district => district.actif).length
}

async function addCity() {
  const nom = newCity.value.trim()
  if (!nom || cityError.value) return
  if (await run(() => createCity.mutateAsync(nom), t("operations.localities.cityCreated", { city: nom })))
    newCity.value = ""
}

function toggleCity(city: LocalityCity) {
  void run(
    () => updateCity.mutateAsync({ id: city.id, body: { active: !city.active } }),
    t(city.active ? "operations.localities.cityHidden" : "operations.localities.cityShown", { city: city.nom }),
  )
}

async function addTo(city: LocalityCity) {
  const noms = namesOf(drafts[city.id])
  if (!noms.length) return
  if (
    await run(
      () => addDistricts.mutateAsync({ cityId: city.id, noms }),
      t("operations.localities.districtsAdded", { count: noms.length, city: city.nom }),
    )
  )
    drafts[city.id] = ""
}

function toggleDistrict(district: LocalityDistrict) {
  void run(
    () => updateDistrict.mutateAsync({ id: district.id, body: { active: !district.actif } }),
    t(district.actif ? "operations.localities.districtHidden" : "operations.localities.districtShown", {
      district: district.nom,
    }),
  )
}

function districtLabel(district: LocalityDistrict) {
  return t(district.actif ? "operations.localities.hideDistrict" : "operations.localities.showDistrict", {
    district: district.nom,
  })
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="localities-workspace">
    <div
      class="flex shrink-0 flex-col gap-3 border-t border-border bg-background px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-10"
    >
      <p class="max-w-3xl text-sm text-muted-foreground">{{ t("operations.localities.help") }}</p>
      <form class="flex items-end gap-2" @submit.prevent="addCity">
        <div class="grid gap-1.5">
          <Label for="locality-new-city">{{ t("operations.localities.newCity") }}</Label>
          <Input id="locality-new-city" v-model="newCity" maxlength="60" class="w-48" data-testid="locality-new-city" />
        </div>
        <Button type="submit" size="sm" :disabled="pending || !newCity.trim() || Boolean(cityError)"
          ><Icon name="ph:plus" /> {{ t("operations.localities.addCity") }}</Button
        >
      </form>
    </div>
    <p v-if="cityError" class="px-4 pb-2 text-xs text-destructive sm:px-6 lg:px-10" role="alert">{{ cityError }}</p>

    <div class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60 p-4 sm:p-6 lg:px-10">
      <div v-if="query.isPending.value" class="space-y-2">
        <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
      <ApiErrorCard v-else-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
      <EmptyStateCard
        v-else-if="!query.data.value?.length"
        icon="ph:map-pin"
        :text="t('operations.localities.empty')"
      />
      <ul v-else class="grid gap-3 lg:grid-cols-2">
        <li
          v-for="city in query.data.value"
          :key="city.id"
          class="rounded-lg border border-border bg-card"
          :data-testid="`locality-city-${city.nom}`"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div class="flex items-center gap-2">
              <h3 class="font-heading font-semibold">{{ city.nom }}</h3>
              <Badge v-if="!city.active" variant="outline">{{ t("operations.localities.hidden") }}</Badge>
              <span class="text-xs text-muted-foreground">{{
                t("operations.localities.count", { active: activeCount(city), total: city.quartiers.length })
              }}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              :disabled="pending"
              :data-testid="`locality-toggle-${city.nom}`"
              @click="toggleCity(city)"
              >{{ city.active ? t("operations.localities.hideCity") : t("operations.localities.showCity") }}</Button
            >
          </div>
          <div class="px-4 py-3">
            <ul class="flex flex-wrap gap-1.5">
              <li v-for="district in city.quartiers" :key="district.id">
                <button
                  type="button"
                  class="rounded-full border px-2.5 py-0.5 text-xs"
                  :class="
                    district.actif ? 'border-border bg-background' : 'border-dashed text-muted-foreground line-through'
                  "
                  :disabled="pending"
                  :aria-label="districtLabel(district)"
                  :title="districtLabel(district)"
                  :data-testid="`locality-district-${district.nom}`"
                  @click="toggleDistrict(district)"
                >
                  {{ district.nom }}
                </button>
              </li>
            </ul>
            <form class="mt-3 grid gap-2" @submit.prevent="addTo(city)">
              <Label :for="`locality-districts-${city.id}`">{{ t("operations.localities.addDistricts") }}</Label>
              <Textarea
                :id="`locality-districts-${city.id}`"
                v-model="drafts[city.id]"
                rows="2"
                :placeholder="t('operations.localities.districtsPlaceholder')"
                :data-testid="`locality-districts-${city.nom}`"
              />
              <div>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  :disabled="pending || !namesOf(drafts[city.id]).length"
                  :data-testid="`locality-add-${city.nom}`"
                  >{{ t("operations.localities.add") }}</Button
                >
              </div>
            </form>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
