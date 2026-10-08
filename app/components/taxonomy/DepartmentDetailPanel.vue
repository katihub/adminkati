<script setup lang="ts">
import type { Rayon } from "@/types/api/taxonomie"
import { computed, ref, watch } from "vue"
import DepartmentPanelActions from "@/components/taxonomy/DepartmentPanelActions.vue"
import DepartmentPanelView from "@/components/taxonomy/DepartmentPanelView.vue"
import DepartmentProductsTab from "@/components/taxonomy/DepartmentProductsTab.vue"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const props = withDefaults(
  defineProps<{
    open: boolean
    department: Rayon | null
    canWrite: boolean
    creating?: boolean
    editing?: boolean
    dirty?: boolean
    pending?: boolean
    notFound?: boolean
    error?: unknown
  }>(),
  {
    creating: false,
    editing: false,
    dirty: false,
    pending: false,
    notFound: false,
    error: undefined,
  },
)

const emit = defineEmits<{
  "update:open": [value: boolean]
  edit: []
  cancelEdit: []
  remove: []
}>()

const { t } = useI18n()
const activeTab = ref<"overview" | "products">("overview")
const title = computed(() => (props.creating ? t("taxonomy.departments.newTitle") : t("taxonomy.departments.title")))
const tabs = computed(() => [
  { value: "overview", label: t("taxonomy.panel.overview"), testid: "department-panel-tab-overview" },
  { value: "products", label: t("taxonomy.panel.products"), testid: "department-panel-tab-products" },
])

watch(
  () => props.department?.id,
  () => {
    activeTab.value = "overview"
  },
)
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      class="data-[side=right]:w-full sm:data-[side=right]:max-w-lg"
      data-testid="department-panel"
    >
      <SheetHeader>
        <SheetTitle>{{ title }}</SheetTitle>
        <SheetDescription>{{ t("taxonomy.departments.description") }}</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <ApiErrorCard v-if="error && !creating && !editing" :error="error" />
        <section v-else-if="notFound" data-testid="department-panel-not-found">
          <p class="text-sm text-muted-foreground">
            {{ t("taxonomy.departments.notFound") }}
          </p>
          <Button class="mt-4" variant="outline" @click="emit('update:open', false)">
            {{ t("taxonomy.panel.close") }}
          </Button>
        </section>
        <section v-else-if="creating || editing" data-testid="department-panel-form">
          <!-- Au-dessus du formulaire, pas à sa place : un refus de saisie ne doit pas
               effacer la saisie qui l'a provoqué. -->
          <ApiErrorCard v-if="error" :error="error" class="mb-4" />
          <slot name="form" />
        </section>
        <template v-else-if="department">
          <PillTabs
            :model-value="activeTab"
            :items="tabs"
            data-testid="department-panel-tabs"
            @update:model-value="value => (activeTab = value as 'overview' | 'products')"
          />
          <DepartmentProductsTab v-if="activeTab === 'products'" :department-id="department.id" class="mt-5" />
          <DepartmentPanelView v-else :department="department" class="mt-5" />
        </template>
      </div>
      <SheetFooter v-if="canWrite && !notFound" data-testid="department-panel-actions" class="border-t border-border">
        <DepartmentPanelActions
          :department="department"
          :creating="creating"
          :editing="editing"
          :dirty="dirty"
          :pending="pending"
          @edit="emit('edit')"
          @cancel="emit('cancelEdit')"
          @remove="emit('remove')"
        />
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
