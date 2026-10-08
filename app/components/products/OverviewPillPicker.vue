<script setup lang="ts">
import { computed } from "vue"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface PickerOption {
  value: string | number
  label: string
}

const {
  options,
  modelValue = null,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
  generating = false,
} = defineProps<{
  options: PickerOption[]
  modelValue?: string | number | null
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  disabled?: boolean
  /** True while an AI run is choosing this value: the trigger wears the generating ring. */
  generating?: boolean
}>()
const emit = defineEmits<{ select: [value: string | number] }>()
const open = defineModel<boolean>("open", { default: false })

const selected = computed(() => options.find(option => option.value === modelValue))

function pick(value: string | number) {
  if (disabled) return
  emit("select", value)
  open.value = false
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        :disabled="disabled"
        :aria-expanded="open"
        aria-haspopup="listbox"
        :class="
          cn(
            'inline-flex max-w-full items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80 disabled:pointer-events-none disabled:opacity-50',
            generating && 'ai-generating',
          )
        "
      >
        <span class="truncate">{{ selected?.label ?? placeholder }}</span>
        <Icon name="ph:caret-down" size="14" class="shrink-0" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-64 p-0" align="start">
      <Command>
        <CommandInput :placeholder="searchPlaceholder" />
        <CommandList>
          <CommandEmpty>{{ emptyText }}</CommandEmpty>
          <CommandGroup>
            <CommandItem
              v-for="option in options"
              :key="option.value"
              :value="option.label"
              @select="pick(option.value)"
            >
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
