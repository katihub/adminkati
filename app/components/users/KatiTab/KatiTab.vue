<script setup lang="ts">
import { computed } from "vue"
import { useKatiClientSheet } from "@/composables/useKati"
import { formatDateCourte } from "@/utils/dates"
const { clientId } = defineProps<{ clientId: string }>()
const { t, locale } = useI18n()
const query = useKatiClientSheet(() => clientId)
const number = computed(() => new Intl.NumberFormat(locale.value))
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="customer-kati">
    <ApiErrorCard v-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <p v-else-if="query.isPending.value" class="p-4 text-sm text-muted-foreground">{{ t("users.page.loading") }}</p>
    <template v-else-if="query.data.value">
      <dl class="grid gap-3 sm:grid-cols-3">
        <div
          v-for="(value, key) in query.data.value.soldes"
          :key="key"
          class="rounded-xl border border-border bg-card p-4"
        >
          <dt class="text-xs text-muted-foreground">{{ t(`users.kati.${key}`) }}</dt>
          <dd class="mt-2 text-xl font-bold">{{ number.format(value) }}</dd>
        </div>
      </dl>
      <section class="rounded-2xl border border-border bg-card p-5">
        <h3 class="font-heading font-semibold">
          {{ t("users.kati.history", { count: query.data.value.historique.total }) }}
        </h3>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ t("users.activity.limit", { count: query.data.value.historique.taille }) }}
        </p>
        <p v-if="!query.data.value.historique.elements.length" class="mt-3 text-sm text-muted-foreground">
          {{ t("users.activity.empty") }}
        </p>
        <ul v-else class="mt-3 divide-y divide-border">
          <li
            v-for="item in query.data.value.historique.elements"
            :key="item.id"
            class="flex flex-col gap-1 py-3 text-sm"
          >
            <strong>{{ item.libelle }}</strong
            ><span>{{ t(`operations.kati.types.${item.type}`) }} · {{ formatDateCourte(item.creeLe, locale) }}</span>
            <span v-if="item.commande" class="text-xs text-muted-foreground">{{ item.commande }}</span>
            <span class="text-xs"
              >{{ t("users.kati.disponible") }} {{ number.format(item.disponible) }} · {{ t("users.kati.enAttente") }}
              {{ number.format(item.enAttente) }} · {{ t("users.kati.reserve") }}
              {{ number.format(item.reserve) }}</span
            >
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
