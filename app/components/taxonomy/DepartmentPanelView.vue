<script setup lang="ts">
import type { Rayon } from "@/types/api/taxonomie"
import { Badge } from "@/components/ui/badge"

defineProps<{ department: Rayon }>()
const { t } = useI18n()
</script>

<template>
  <section data-testid="department-panel-view" class="flex flex-col gap-5">
    <header class="rounded-2xl bg-muted p-5">
      <div class="flex items-start gap-3">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-foreground">
          <Icon name="ph:storefront" size="22" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {{ t("taxonomy.departments.name") }}
          </p>
          <h2 class="mt-1 truncate text-lg font-semibold tracking-tight text-foreground">
            {{ department.nom }}
          </h2>
        </div>
      </div>
      <div class="-mx-5 -mb-5 mt-4 flex items-center gap-2 rounded-b-2xl bg-foreground/5 px-5 py-3">
        <Icon name="ph:hash" size="14" class="text-muted-foreground" aria-hidden="true" />
        <span class="font-mono text-xs text-muted-foreground">{{ department.slug }}</span>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-muted p-4">
        <dt class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span class="flex size-6 items-center justify-center rounded-lg bg-background">
            <Icon name="ph:text-aa" size="14" aria-hidden="true" />
          </span>
          {{ t("taxonomy.departments.shortName") }}
        </dt>
        <dd class="mt-3 truncate text-sm font-semibold text-foreground">
          {{ department.nom_court || "—" }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted p-4">
        <dt class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span class="flex size-6 items-center justify-center rounded-lg bg-background">
            <Icon name="ph:package" size="14" aria-hidden="true" />
          </span>
          {{ t("taxonomy.departments.products") }}
        </dt>
        <dd class="mt-3 text-lg font-semibold tracking-tight text-foreground">
          {{ department.compte_total }}
        </dd>
      </div>
    </dl>

    <section v-if="department.accroche" class="rounded-2xl bg-muted p-4" data-testid="department-panel-accroche">
      <p class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span class="flex size-6 items-center justify-center rounded-lg bg-background">
          <Icon name="ph:quotes" size="14" aria-hidden="true" />
        </span>
        {{ t("taxonomy.departments.accroche") }}
      </p>
      <p class="mt-3 text-sm text-foreground">
        {{ department.accroche }}
      </p>
    </section>

    <section class="rounded-2xl bg-muted p-4">
      <div class="flex items-center gap-2">
        <Badge variant="secondary" class="rounded-full bg-background px-2.5 font-mono text-xs">
          {{ department.id }}
        </Badge>
        <span class="text-sm text-muted-foreground">{{ t("taxonomy.departments.identifier") }}</span>
      </div>
    </section>
  </section>
</template>
