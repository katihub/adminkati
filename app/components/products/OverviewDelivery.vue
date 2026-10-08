<script setup lang="ts">
import type { DelaiLivraison } from "@/types/api/delais-livraison"
import { computed, ref, useId } from "vue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDeliveryIntervalLabel } from "@/composables/useDeliveryIntervalLabel"
import { useDeliveryIntervals } from "@/composables/useDeliveryIntervals"
import { resolveSelectedInterval, sortDeliveryIntervals } from "@/utils/delivery-interval"

const props = defineProps<{
  /** `null` means the product inherits the default option. */
  modelValue: number | null
  /** The product's resolved option, shown while the list is unavailable. */
  resolved?: DelaiLivraison | null
  disabled?: boolean
}>()
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>()

const { t } = useI18n()
const intervalLabel = useDeliveryIntervalLabel()
const { data: options, isPending, isError } = useDeliveryIntervals()

const triggerId = useId()
const open = ref(false)
const createOpen = ref(false)
const manageOpen = ref(false)

const selected = computed(() => resolveSelectedInterval(options.value ?? [], props.modelValue, props.resolved))

/** A product may still hold an archived option; it stays listed so the value never silently disappears. */
const selectable = computed(() =>
  sortDeliveryIntervals((options.value ?? []).filter(option => option.actif || option.id === selected.value?.id)),
)

const pickerDisabled = computed(() => Boolean(props.disabled) || isPending.value || isError.value)

function select(option: DelaiLivraison) {
  emit("update:modelValue", option.est_defaut ? null : option.id)
  open.value = false
}

function openCreate() {
  open.value = false
  createOpen.value = true
}

function openManage() {
  open.value = false
  manageOpen.value = true
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <label :for="triggerId" class="text-sm font-medium text-muted-foreground/80">
      {{ t("products.delivery.title") }}
    </label>

    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          :id="triggerId"
          type="button"
          variant="ghost"
          role="combobox"
          data-testid="product-delivery-trigger"
          class="w-full justify-between border-0 bg-muted/80 shadow-none"
          :disabled="pickerDisabled"
          :aria-expanded="open"
        >
          <Spinner v-if="isPending" data-icon="inline-start" />
          <span v-else class="flex min-w-0 items-center gap-2">
            <span class="truncate">{{ selected ? intervalLabel(selected) : t("products.delivery.placeholder") }}</span>
          </span>
          <Icon name="ph:caret-down" size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-72 p-0" align="start">
        <Command>
          <CommandInput :placeholder="t('products.delivery.searchPlaceholder')" />
          <CommandList>
            <CommandEmpty>{{ t("products.delivery.noResults") }}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                v-for="option in selectable"
                :key="option.id"
                :value="intervalLabel(option)"
                :data-testid="`product-delivery-option-${option.id}`"
                @select="select(option)"
              >
                <span class="truncate">{{ intervalLabel(option) }}</span>
                <Badge v-if="option.est_defaut" data-testid="product-delivery-default-badge">
                  {{ t("products.delivery.default") }}
                </Badge>
                <Icon
                  v-if="option.id === selected?.id"
                  name="ph:check"
                  size="16"
                  class="ml-auto shrink-0 text-primary"
                  aria-hidden="true"
                />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <div v-if="!disabled" class="flex items-center justify-between gap-2 border-t border-border p-1.5">
          <Button type="button" variant="ghost" size="sm" data-testid="product-delivery-add" @click="openCreate">
            <Icon name="ph:plus" aria-hidden="true" />
            {{ t("products.delivery.add") }}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-testid="product-delivery-manage"
            :aria-label="t('products.delivery.manageLabel')"
            @click="openManage"
          >
            <Icon name="ph:gear" aria-hidden="true" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>

    <div v-if="isError" class="w-full">
      <InlineStateNotice
        data-testid="product-delivery-error"
        icon="ph:warning-circle"
        :text="t('products.delivery.loadError')"
      />
    </div>

    <ProductsDeliveryIntervalDialog v-model:open="createOpen" @saved="option => emit('update:modelValue', option.id)" />
    <ProductsDeliveryIntervalManageDialog v-model:open="manageOpen" />
  </div>
</template>
