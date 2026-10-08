<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface InlineTagOption {
  id: string
  label: string
}

const props = withDefaults(
  defineProps<{
    options: InlineTagOption[]
    selectedIds: string[]
    label: string
    searchPlaceholder: string
    noResultsLabel: string
    addLabel: string
    addSelectedLabel: string
    removeItemLabel: (label: string) => string
    moreItemsLabel: (count: number) => string
    testIds: {
      root: string
      item: string
      remove: string
      overflow: string
      add: string
    }
    disabled?: boolean
    labelClass?: string
    /** True while an AI run is choosing items: the add trigger wears the generating ring. */
    generating?: boolean
  }>(),
  {
    disabled: false,
    generating: false,
  },
)

const emit = defineEmits<{
  "update:selectedIds": [value: string[]]
}>()

const { options, selectedIds, disabled } = toRefs(props)
const addOpen = ref(false)
const overflowOpen = ref(false)
const pendingIds = ref<string[]>([])

const selectedItems = computed(() => options.value.filter(option => selectedIds.value.includes(option.id)))
const visibleItems = computed(() => selectedItems.value.slice(0, 5))
const remainingItems = computed(() => selectedItems.value.slice(5))
const availableItems = computed(() => options.value.filter(option => !selectedIds.value.includes(option.id)))

watch(addOpen, open => {
  if (open) pendingIds.value = []
})

function togglePendingItem(id: string) {
  if (disabled.value) return

  pendingIds.value = pendingIds.value.includes(id)
    ? pendingIds.value.filter(existing => existing !== id)
    : [...pendingIds.value, id]
}

function addPendingItems() {
  if (disabled.value) return

  emit("update:selectedIds", [...selectedIds.value, ...pendingIds.value])
  pendingIds.value = []
  addOpen.value = false
}

function removeItem(id: string) {
  if (disabled.value) return

  emit(
    "update:selectedIds",
    selectedIds.value.filter(existing => existing !== id),
  )
}
</script>

<template>
  <div :data-testid="testIds.root" class="space-y-2">
    <label :class="cn('text-sm font-medium text-foreground', labelClass)">{{ label }}</label>
    <div class="flex mt-2 flex-wrap items-center gap-2">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        :data-testid="testIds.item"
        class="inline-flex items-center gap-1 rounded-lg border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
      >
        <span>{{ item.label }}</span>
        <button
          type="button"
          :data-testid="testIds.remove"
          :disabled="disabled"
          :aria-label="removeItemLabel(item.label)"
          class="inline-flex size-4 items-center justify-center rounded-full hover:bg-background/20"
          @click="removeItem(item.id)"
        >
          <Icon name="ph:x" size="12" aria-hidden="true" />
        </button>
      </div>

      <Popover v-if="remainingItems.length" :open="overflowOpen" @update:open="value => (overflowOpen = value)">
        <PopoverTrigger as-child>
          <button
            type="button"
            :aria-expanded="overflowOpen"
            :disabled="disabled"
            :aria-label="moreItemsLabel(remainingItems.length)"
            :data-testid="testIds.overflow"
            class="rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-foreground/50"
          >
            +{{ remainingItems.length }}
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-64 overflow-hidden! p-0" align="start">
          <Command>
            <CommandInput :placeholder="searchPlaceholder" />
            <CommandList>
              <CommandEmpty>{{ noResultsLabel }}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="item in remainingItems"
                  :key="item.id"
                  :value="item.label"
                  @select="removeItem(item.id)"
                >
                  <span class="truncate">{{ item.label }}</span>
                  <Icon name="ph:x" size="16" class="ml-auto shrink-0" aria-hidden="true" />
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover v-if="availableItems.length" :open="addOpen" @update:open="value => (addOpen = value)">
        <PopoverTrigger as-child>
          <button
            type="button"
            :aria-expanded="addOpen"
            :disabled="disabled"
            :aria-label="addLabel"
            :data-testid="testIds.add"
            :class="
              cn(
                'grid place-items-center rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-foreground/50',
                generating && 'ai-generating',
              )
            "
          >
            <Icon v-if="selectedItems.length > 1" name="ph:plus" size="14" aria-hidden="true" />
            <span v-else>{{ addLabel }}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent class="w-64 overflow-hidden! p-0" align="start">
          <Command>
            <CommandInput :placeholder="searchPlaceholder" />
            <CommandList>
              <CommandEmpty>{{ noResultsLabel }}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="item in availableItems"
                  :key="item.id"
                  :value="item.label"
                  @select="togglePendingItem(item.id)"
                >
                  <span class="truncate">{{ item.label }}</span>
                  <Icon
                    v-if="pendingIds.includes(item.id)"
                    name="ph:check"
                    size="16"
                    class="ml-auto shrink-0"
                    aria-hidden="true"
                  />
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
          <Button
            type="button"
            :disabled="disabled || pendingIds.length === 0"
            class="w-full rounded-none border-0!"
            @click="addPendingItems"
          >
            {{ addSelectedLabel }}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  </div>
</template>
