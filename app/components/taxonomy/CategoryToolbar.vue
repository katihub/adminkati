<script setup lang="ts">
import type { Filter } from "@/components/vuzeno/filters"
import type { Rayon } from "@/types/api/taxonomie"
import {
  PhArrowsInLineVertical,
  PhArrowsOutLineVertical,
  PhEye,
  PhMagnifyingGlass,
  PhPlus,
  PhStorefront,
} from "@phosphor-icons/vue"
import { computed, h } from "vue"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Field, Operator } from "@/components/vuzeno/filters"
import FilterControls from "@/components/vuzeno/filters/FilterControls.vue"

const { departments, canWrite, hasActiveFilters } = defineProps<{
  departments: Rayon[]
  canWrite: boolean
  hasActiveFilters: boolean
}>()

const emit = defineEmits<{
  clear: []
  expand: []
  collapse: []
  add: []
}>()

const filters = defineModel<Filter[]>("filters", { required: true })

const { t } = useI18n()

const fields = computed(() => [
  Field.TextField({
    key: "q",
    label: t("taxonomy.toolbar.searchLabel"),
    icon: () => h(PhMagnifyingGlass),
    operators: [Operator.Contain({ label: t("taxonomy.toolbar.searchOperatorContains"), default: true })],
  }),
  Field.TextField({
    key: "department",
    label: t("taxonomy.toolbar.departmentLabel"),
    icon: () => h(PhStorefront),
    operators: [
      Operator.Eq({
        label: t("taxonomy.toolbar.departmentOperatorIs"),
        default: true,
        inputType: "select",
        options: {
          items: departments.map(department => ({ label: department.nom, value: department.id })),
          searchable: true,
        },
      }),
    ],
  }),
  Field.TextField({
    key: "visibility",
    label: t("taxonomy.toolbar.visibilityLabel"),
    icon: () => h(PhEye),
    operators: [
      Operator.Eq({
        label: t("taxonomy.toolbar.visibilityOperatorIs"),
        default: true,
        inputType: "select",
        options: {
          items: [
            { label: t("taxonomy.visibility.visible"), value: "visible" },
            { label: t("taxonomy.visibility.hidden"), value: "hidden" },
          ],
        },
      }),
    ],
  }),
])
</script>

<template>
  <section class="flex flex-wrap w-full items-center gap-3 py-4" data-testid="category-toolbar">
    <FilterControls
      v-model:filters="filters"
      :fields="fields"
      class="gap-3"
      test-id="category-toolbar"
      clear-test-id="category-toolbar-clear"
      :has-active-filters="hasActiveFilters"
      :label="t('taxonomy.toolbar.clear')"
      @clear="emit('clear')"
    />

    <TooltipProvider>
      <!-- The group forces `rounded-r-4xl` on its last button; ours are `rounded-lg`. `button` in the selector wins on specificity; the `data-slot` is the tooltip trigger's, not `button`. -->
      <ButtonGroup class="[&>button[data-slot]:last-child]:rounded-r-lg!">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="icon-sm"
              variant="outline"
              :aria-label="t('taxonomy.toolbar.expand')"
              data-testid="category-toolbar-expand"
              @click="emit('expand')"
            >
              <PhArrowsOutLineVertical aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <ThemedTooltipContent>{{ t("taxonomy.toolbar.expand") }}</ThemedTooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              size="icon-sm"
              variant="outline"
              :aria-label="t('taxonomy.toolbar.collapse')"
              data-testid="category-toolbar-collapse"
              @click="emit('collapse')"
            >
              <PhArrowsInLineVertical aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <ThemedTooltipContent>{{ t("taxonomy.toolbar.collapse") }}</ThemedTooltipContent>
        </Tooltip>
      </ButtonGroup>
    </TooltipProvider>
    <div v-if="canWrite" class="ml-auto flex items-center gap-3">
      <slot name="actions" />
      <Button size="sm" data-testid="category-toolbar-add" @click="emit('add')">
        <PhPlus :size="16" aria-hidden="true" />
        {{ t("taxonomy.toolbar.new") }}
      </Button>
    </div>
  </section>
</template>
