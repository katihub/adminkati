<script setup lang="ts">
import type { Categorie } from "@/types/api/taxonomie"
import type { CategoryTreeNode } from "@/utils/category-tree"
import CategorySubcategoryTree from "@/components/taxonomy/CategorySubcategoryTree.vue"
import { Badge } from "@/components/ui/badge"

defineProps<{ category: Categorie; subcategories: CategoryTreeNode[] }>()
const { t } = useI18n()
</script>

<template>
  <section data-testid="category-panel-view" class="flex flex-col gap-5">
    <header class="rounded-2xl bg-muted p-5">
      <div class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-foreground">
            <Icon name="ph:folder-simple" size="22" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {{ t("taxonomy.form.name") }}
            </p>
            <h2 class="mt-1 truncate text-lg font-semibold tracking-tight text-foreground">
              {{ category.nom }}
            </h2>
          </div>
        </div>
        <Badge
          :variant="category.masquee ? 'outline' : 'secondary'"
          class="shrink-0 gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs"
        >
          <Icon :name="category.masquee ? 'ph:eye-slash' : 'ph:eye'" size="14" aria-hidden="true" />
          {{ t(category.masquee ? "taxonomy.visibility.hidden" : "taxonomy.visibility.visible") }}
        </Badge>
      </div>
      <div class="-mx-5 -mb-5 mt-4 flex items-center gap-2 rounded-b-2xl bg-foreground/5 px-5 py-3">
        <Icon name="ph:hash" size="14" class="text-muted-foreground" aria-hidden="true" />
        <span class="font-mono text-xs text-muted-foreground">{{ category.slug }}</span>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-muted p-4">
        <dt class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span class="flex size-6 items-center justify-center rounded-lg bg-background">
            <Icon name="ph:storefront" size="14" aria-hidden="true" />
          </span>
          {{ t("taxonomy.tree.department") }}
        </dt>
        <dd class="mt-3 truncate text-sm font-semibold text-foreground" :title="category.rayon ?? undefined">
          {{ category.rayon ?? "—" }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted p-4">
        <dt class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span class="flex size-6 items-center justify-center rounded-lg bg-background">
            <Icon name="ph:package" size="14" aria-hidden="true" />
          </span>
          {{ t("taxonomy.tree.products") }}
        </dt>
        <dd class="mt-3 text-lg font-semibold tracking-tight text-foreground">
          {{ category.compte_total }}
        </dd>
      </div>
    </dl>

    <section class="rounded-2xl bg-muted p-4">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="flex size-7 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <Icon name="ph:tree-structure" size="16" aria-hidden="true" />
          </span>
          <h3 class="text-sm font-semibold text-foreground">
            {{ t("taxonomy.panel.subcategories") }}
          </h3>
        </div>
        <Badge
          v-if="subcategories.length"
          variant="secondary"
          class="rounded-full bg-background px-2.5 font-mono text-xs"
        >
          {{ subcategories.length }}
        </Badge>
      </div>
      <CategorySubcategoryTree v-if="subcategories.length" :nodes="subcategories" class="mt-4" />
      <div
        v-else
        class="mt-4 flex items-center gap-3 rounded-xl bg-background px-3 py-4"
        data-testid="category-panel-no-subcategories"
      >
        <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon name="ph:folder-open" size="17" aria-hidden="true" />
        </span>
        <p class="text-sm text-muted-foreground">
          {{ t("taxonomy.panel.noSubcategories") }}
        </p>
      </div>
    </section>
  </section>
</template>
