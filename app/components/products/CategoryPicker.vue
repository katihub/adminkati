<script setup lang="ts">
import { computed, ref, useId } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTaxonomie } from "@/composables/useTaxonomie"

const {
  principalId,
  secondaryIds,
  marque,
  disabled = false,
} = defineProps<{
  principalId: number | null
  secondaryIds: number[]
  marque: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  "update:principalId": [value: number | null]
  "update:secondaryIds": [value: number[]]
  "update:marque": [value: string]
}>()

const { t } = useI18n()

const { data: taxonomie } = useTaxonomie()

/** Department is a client-side narrowing device only — it isn't part of the write payload. */
const rayonFilter = ref<string | null>(null)
const secondaryOpen = ref(false)

const marqueInputId = useId()
const marqueListId = useId()

const categoryOptions = computed(() => {
  const categories = taxonomie.value?.categories ?? []
  const scoped = rayonFilter.value ? categories.filter(category => category.rayon === rayonFilter.value) : categories
  return scoped.map(category => ({ value: String(category.id), label: category.nom }))
})

const secondaryCategories = computed(() => {
  const categories = taxonomie.value?.categories ?? []
  return categories.filter(category => secondaryIds.includes(category.id))
})

const secondaryTriggerLabel = computed(() =>
  secondaryIds.length === 0
    ? t("products.categoryPicker.secondaryPlaceholder")
    : t("products.categoryPicker.secondarySelectedCount", { count: secondaryIds.length }, secondaryIds.length),
)

function onPrincipalUpdate(value: string | null) {
  emit("update:principalId", value !== null ? Number(value) : null)
}

function toggleSecondary(value: string) {
  const id = Number(value)
  const next = secondaryIds.includes(id) ? secondaryIds.filter(existing => existing !== id) : [...secondaryIds, id]
  emit("update:secondaryIds", next)
}

function removeSecondary(id: number) {
  emit(
    "update:secondaryIds",
    secondaryIds.filter(existing => existing !== id),
  )
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <Label class="mb-2 block text-sm font-medium text-foreground">{{
        t("products.categoryPicker.rayonLabel")
      }}</Label>
      <Select
        :model-value="rayonFilter ?? undefined"
        :disabled="disabled"
        @update:model-value="value => (rayonFilter = value ? String(value) : null)"
      >
        <SelectTrigger
          data-testid="products-category-picker-rayon"
          :aria-label="t('products.categoryPicker.rayonLabel')"
          class="w-full"
        >
          <SelectValue :placeholder="t('products.categoryPicker.rayonPlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="rayon in taxonomie?.rayons ?? []" :key="rayon.id" :value="rayon.id">
            {{ rayon.nom }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label class="mb-2 block text-sm font-medium text-foreground">{{
        t("products.categoryPicker.principalLabel")
      }}</Label>
      <ProductsFilterCombobox
        data-testid="products-category-picker-principal"
        :options="categoryOptions"
        :model-value="principalId !== null ? String(principalId) : null"
        :placeholder="t('products.categoryPicker.principalPlaceholder')"
        :label="t('products.categoryPicker.principalLabel')"
        :disabled="disabled"
        class="sm:w-full"
        @update:model-value="onPrincipalUpdate"
      />
    </div>

    <div>
      <Label class="mb-2 block text-sm font-medium text-foreground">{{
        t("products.categoryPicker.secondaryLabel")
      }}</Label>
      <Popover v-model:open="secondaryOpen">
        <PopoverTrigger as-child>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            :aria-expanded="secondaryOpen"
            :aria-label="t('products.categoryPicker.secondaryLabel')"
            :disabled="disabled"
            data-testid="products-category-picker-secondary"
            class="w-full justify-between font-normal"
          >
            <span class="truncate">{{ secondaryTriggerLabel }}</span>
            <Icon name="ph:caret-down" size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-64 p-0" align="start">
          <Command>
            <CommandInput :placeholder="t('products.categoryPicker.secondaryPlaceholder')" />
            <CommandList>
              <CommandEmpty>{{ t("products.categoryPicker.noResults") }}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="option in categoryOptions"
                  :key="option.value"
                  :value="option.value"
                  @select="toggleSecondary(option.value)"
                >
                  <span class="truncate">{{ option.label }}</span>
                  <Icon
                    v-if="secondaryIds.includes(Number(option.value))"
                    name="ph:check"
                    size="16"
                    class="ml-auto shrink-0"
                    aria-hidden="true"
                  />
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div v-if="secondaryCategories.length" class="mt-2 flex flex-wrap gap-1.5">
        <Badge
          v-for="category in secondaryCategories"
          :key="category.id"
          data-testid="products-category-picker-secondary-badge"
          variant="secondary"
          class="gap-1"
        >
          {{ category.nom }}
          <button
            type="button"
            data-testid="products-category-picker-secondary-badge-remove"
            :disabled="disabled"
            :aria-label="t('products.categoryPicker.removeSecondary', { name: category.nom })"
            @click="removeSecondary(category.id)"
          >
            <Icon name="ph:x" size="12" aria-hidden="true" />
          </button>
        </Badge>
      </div>
    </div>

    <div>
      <Label :for="marqueInputId" class="mb-2 block text-sm font-medium text-foreground">{{
        t("products.categoryPicker.marqueLabel")
      }}</Label>
      <Input
        :id="marqueInputId"
        data-testid="products-category-picker-marque"
        :model-value="marque ?? ''"
        :list="marqueListId"
        :placeholder="t('products.categoryPicker.marquePlaceholder')"
        :disabled="disabled"
        class="h-11 rounded-none border-0 border-b border-muted bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0"
        @update:model-value="emit('update:marque', String($event))"
      />
      <datalist :id="marqueListId">
        <option v-for="brand in taxonomie?.marques ?? []" :key="brand.slug" :value="brand.nom" />
      </datalist>
    </div>
  </div>
</template>
