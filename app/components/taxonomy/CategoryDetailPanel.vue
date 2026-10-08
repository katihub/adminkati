<script setup lang="ts">
import type { Categorie } from "@/types/api/taxonomie"
import type { CategoryTreeNode } from "@/utils/category-tree"
import { computed, ref, watch } from "vue"
import CategoryPanelActions from "@/components/taxonomy/CategoryPanelActions.vue"
import CategoryPanelView from "@/components/taxonomy/CategoryPanelView.vue"
import CategoryProductsTab from "@/components/taxonomy/CategoryProductsTab.vue"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { buildCategoryTree } from "@/utils/category-tree"

const props = withDefaults(
  defineProps<{
    open: boolean
    category: Categorie | null
    categories?: Categorie[]
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
    categories: () => [],
  },
)

const emit = defineEmits<{
  "update:open": [value: boolean]
  edit: []
  cancelEdit: []
  visibility: [value: boolean]
  remove: []
}>()

const { t } = useI18n()
const title = computed(() => (props.creating ? t("taxonomy.panel.newTitle") : t("taxonomy.panel.title")))
const activeTab = ref<"overview" | "products">("overview")
const tabs = computed(() => [
  { value: "overview", label: t("taxonomy.panel.overview"), testid: "category-panel-tab-overview" },
  { value: "products", label: t("taxonomy.panel.products"), testid: "category-panel-tab-products" },
])
const subcategories = computed(
  () => findCategoryNode(buildCategoryTree(props.categories), props.category?.id)?.children ?? [],
)

watch(
  () => props.category?.id,
  () => {
    activeTab.value = "overview"
  },
)

function findCategoryNode(nodes: CategoryTreeNode[], id: number | undefined): CategoryTreeNode | undefined {
  for (const node of nodes) {
    if (node.category.id === id) return node
    const child = findCategoryNode(node.children, id)
    if (child) return child
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent
      side="right"
      class="data-[side=right]:w-full sm:data-[side=right]:max-w-lg"
      data-testid="category-panel"
    >
      <SheetHeader>
        <SheetTitle>{{ title }}</SheetTitle>
        <SheetDescription>{{ t("taxonomy.panel.description") }}</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <ApiErrorCard v-if="error" :error="error" />
        <section v-else-if="notFound" data-testid="category-panel-not-found">
          <p class="text-sm text-muted-foreground">
            {{ t("taxonomy.panel.notFound") }}
          </p>
          <Button class="mt-4" variant="outline" @click="emit('update:open', false)">
            {{ t("taxonomy.panel.close") }}
          </Button>
        </section>
        <section v-else-if="creating || editing" data-testid="category-panel-form">
          <slot name="form" />
        </section>
        <template v-else-if="category">
          <PillTabs
            :model-value="activeTab"
            :items="tabs"
            data-testid="category-panel-tabs"
            @update:model-value="value => (activeTab = value as 'overview' | 'products')"
          />
          <CategoryProductsTab v-if="activeTab === 'products'" :category-id="category.id" class="mt-5" />
          <CategoryPanelView v-else :category="category" :subcategories="subcategories" class="mt-5" />
        </template>
      </div>
      <SheetFooter v-if="canWrite && !notFound" data-testid="category-panel-actions" class="border-t border-border">
        <CategoryPanelActions
          :category="category"
          :creating="creating"
          :editing="editing"
          :dirty="dirty"
          :pending="pending"
          @edit="emit('edit')"
          @cancel="emit('cancelEdit')"
          @visibility="emit('visibility', $event)"
          @remove="emit('remove')"
        />
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
