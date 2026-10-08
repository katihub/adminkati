<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTaxonomie } from "@/composables/useTaxonomie"
import { hrefSchema } from "@/schemas/banniere"

const { modelValue, error = "" } = defineProps<{
  modelValue: string
  error?: string
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

/**
 * `/categorie/<slug>` is confirmed by the DTO's own example (`vitrine.dto.ts:116`);
 * `/rayon/<slug>` is a stated assumption — no storefront checkout exists in this workspace
 * to confirm it. Both live here, in one place, so a wrong guess is a one-line fix.
 */
const HREF_PREFIXES = {
  categorie: "/categorie/",
  rayon: "/rayon/",
} as const

interface HrefOption {
  value: string
  label: string
}

const { t } = useI18n()

/** Only mounted here, inside the edit/create form — never from an always-mounted
 *  component — so the taxonomy request happens when someone actually edits a banner. */
const { data: taxonomie } = useTaxonomie()

const open = ref(false)

const categoryOptions = computed<HrefOption[]>(() =>
  (taxonomie.value?.categories ?? []).map(category => ({
    value: `${HREF_PREFIXES.categorie}${category.slug}`,
    label: category.nom,
  })),
)

const rayonOptions = computed<HrefOption[]>(() =>
  (taxonomie.value?.rayons ?? []).map(rayon => ({
    value: `${HREF_PREFIXES.rayon}${rayon.slug}`,
    label: rayon.nom,
  })),
)

const matchedOption = computed(() =>
  [...categoryOptions.value, ...rayonOptions.value].find(option => option.value === modelValue),
)

/** Custom mode starts wherever the current value is non-empty and doesn't (yet) match a
 *  taxonomy entry — including transiently, before the taxonomy query resolves — and
 *  clears itself the moment a match appears, whether that's from a selection or from the
 *  taxonomy finally loading. A blank value (a new banner's untouched `href`) starts in
 *  the picker, not the custom-path input — there's nothing to fail to match yet. */
const customMode = ref(modelValue.trim() !== "" && !matchedOption.value)
watch(matchedOption, next => {
  if (next) customMode.value = false
})

const triggerLabel = computed(() => matchedOption.value?.label ?? t("content.banners.form.href.triggerPlaceholder"))

function hrefError(value: string) {
  const result = hrefSchema.safeParse(value)
  return result.success ? "" : t(result.error.issues[0]?.message ?? "validation.invalidInternalPath")
}

const customError = computed(() => (customMode.value && modelValue.trim() !== "" ? hrefError(modelValue) : ""))

function selectOption(option: HrefOption) {
  customMode.value = false
  open.value = false
  emit("update:modelValue", option.value)
}

function enterCustomMode() {
  customMode.value = true
  open.value = false
}
</script>

<template>
  <div class="space-y-2">
    <Popover v-if="!customMode" v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          :aria-expanded="open"
          :aria-label="t('content.banners.form.href.label')"
          data-testid="banner-href-picker-trigger"
          class="h-8 max-w-full justify-between gap-2 rounded-full px-3.5"
        >
          <span class="truncate">{{ triggerLabel }}</span>
          <Icon name="ph:caret-down" size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>

      <PopoverContent class="w-72 p-0" align="start">
        <Command>
          <CommandInput
            data-testid="banner-href-picker-search"
            :placeholder="t('content.banners.form.href.searchPlaceholder')"
          />
          <CommandList>
            <CommandEmpty>{{ t("content.banners.form.href.noResults") }}</CommandEmpty>

            <CommandGroup :heading="t('content.banners.form.href.groupCategories')">
              <CommandItem
                v-for="option in categoryOptions"
                :key="option.value"
                :value="option.value"
                data-testid="banner-href-picker-option"
                @select="selectOption(option)"
              >
                {{ option.label }}
              </CommandItem>
            </CommandGroup>

            <CommandGroup :heading="t('content.banners.form.href.groupRayons')">
              <CommandItem
                v-for="option in rayonOptions"
                :key="option.value"
                :value="option.value"
                data-testid="banner-href-picker-option"
                @select="selectOption(option)"
              >
                {{ option.label }}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>

        <div class="border-t border-border p-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="w-full justify-start"
            data-testid="banner-href-picker-custom-toggle"
            @click="enterCustomMode"
          >
            {{ t("content.banners.form.href.useCustomPath") }}
          </Button>
        </div>
      </PopoverContent>
    </Popover>

    <div v-else class="space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium text-muted-foreground">{{ t("content.banners.form.href.customLabel") }}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="banner-href-picker-taxonomy-toggle"
          @click="customMode = false"
        >
          {{ t("content.banners.form.href.chooseFromList") }}
        </Button>
      </div>
      <Input
        data-testid="banner-href-picker-custom-input"
        :aria-label="t('content.banners.form.href.customLabel')"
        class="h-8 max-w-sm border-0 bg-muted"
        :model-value="modelValue"
        :placeholder="t('content.banners.form.href.customPlaceholder')"
        @update:model-value="value => emit('update:modelValue', String(value))"
      />
    </div>

    <p v-if="customError" data-testid="banner-href-picker-custom-error" class="text-sm text-destructive">
      {{ customError }}
    </p>
    <p v-else-if="error" data-testid="banner-href-picker-schema-error" class="text-sm text-destructive">
      {{ error }}
    </p>
  </div>
</template>
