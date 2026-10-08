<script setup lang="ts">
import type { Marque } from "@/types/api/taxonomie"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { logoDevNameUrl } from "@/utils/logo-dev"

const props = defineProps<{
  brand: Marque
  imageUrl?: string | null
}>()

const { t } = useI18n()
const { logoDevPublishableKey } = useRuntimeConfig().public
const resolvedImageUrl = computed(() => props.imageUrl ?? logoDevNameUrl(props.brand.nom, logoDevPublishableKey))
</script>

<template>
  <section data-testid="brand-panel-view" class="flex flex-col gap-5">
    <header class="rounded-2xl bg-muted p-5">
      <div class="flex items-start gap-3">
        <ProductsBrandLogo
          :brand="brand.nom"
          :image-url="resolvedImageUrl"
          size="md"
          decorative
          class="size-11 rounded-xl bg-background text-foreground shadow-none"
          test-id-prefix="brand-panel-logo"
        />
        <div class="min-w-0">
          <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {{ t("taxonomy.brands.name") }}
          </p>
          <h2 class="mt-1 truncate text-lg font-semibold tracking-tight text-foreground">
            {{ brand.nom }}
          </h2>
        </div>
      </div>
      <div class="-mx-5 -mb-5 mt-4 flex items-center gap-2 rounded-b-2xl bg-foreground/5 px-5 py-3">
        <Icon name="ph:hash" size="14" class="text-muted-foreground" aria-hidden="true" />
        <span class="font-mono text-xs text-muted-foreground">{{ brand.slug }}</span>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-muted p-4">
        <dt class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span class="flex size-6 items-center justify-center rounded-lg bg-background">
            <Icon name="ph:package" size="14" aria-hidden="true" />
          </span>
          {{ t("taxonomy.brands.products") }}
        </dt>
        <dd class="mt-3 text-lg font-semibold tracking-tight text-foreground">
          {{ brand.nombre_produits }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted p-4">
        <dt class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span class="flex size-6 items-center justify-center rounded-lg bg-background">
            <Icon name="ph:tag" size="14" aria-hidden="true" />
          </span>
          {{ t("taxonomy.brands.slug") }}
        </dt>
        <dd class="mt-3 truncate font-mono text-sm text-foreground">
          {{ brand.slug }}
        </dd>
      </div>
    </dl>

    <section class="rounded-2xl bg-muted p-4">
      <div class="flex items-center gap-2">
        <Badge variant="secondary" class="rounded-full bg-background px-2.5 font-mono text-xs">
          {{ brand.nombre_produits }}
        </Badge>
        <span class="text-sm text-muted-foreground">{{ t("taxonomy.brands.productSummary") }}</span>
      </div>
    </section>
  </section>
</template>
