<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface FilterComboboxOption {
  value: string
  label: string
  leadingImage?: { src: string | null }
}

/**
 * Vue can't apply fallthrough attrs to a single element when the root is a
 * multi-node `Popover` (trigger + teleported content), so callers that need
 * `data-testid` or an `aria-*` override on the trigger button pass it through
 * `$attrs` explicitly instead. `class` is the one exception — it's declared as
 * its own prop and merged through `cn()` so a caller's override always wins,
 * the same precedence every other shadcn-vue component in this project gives it.
 */
defineOptions({ inheritAttrs: false })

const {
  options,
  modelValue,
  placeholder,
  label,
  disabled = false,
  class: className,
} = defineProps<{
  options: FilterComboboxOption[]
  modelValue: string | null
  placeholder: string
  label: string
  disabled?: boolean
  class?: HTMLAttributes["class"]
}>()

const emit = defineEmits<{ "update:modelValue": [value: string | null] }>()

const { t } = useI18n()

const open = ref(false)

const selectedLabel = computed(() => options.find(option => option.value === modelValue)?.label ?? placeholder)

/** Picking the already-selected option clears the filter rather than re-selecting it. */
function select(value: string) {
  emit("update:modelValue", modelValue === value ? null : value)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        v-bind="$attrs"
        type="button"
        variant="outline"
        role="combobox"
        :disabled="disabled"
        :aria-expanded="open"
        :aria-label="label"
        :class="cn('w-full justify-between font-normal sm:w-48', className)"
      >
        <span class="truncate">{{ selectedLabel }}</span>
        <Icon name="ph:caret-down" size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-56 p-0" align="start">
      <Command>
        <CommandInput :placeholder="placeholder" />
        <CommandList>
          <CommandEmpty>{{ t("products.filterCombobox.noResults") }}</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              @select="select(option.value)"
            >
              <ProductsBrandLogo
                v-if="option.leadingImage"
                :brand="option.label"
                :image-url="option.leadingImage.src"
                size="sm"
                decorative
              />
              <span class="truncate">{{ option.label }}</span>
              <Icon
                v-if="option.value === modelValue"
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
</template>
