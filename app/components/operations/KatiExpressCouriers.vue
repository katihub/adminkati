<script setup lang="ts">
import { useKatiExpressCouriers } from "@/composables/useKatiExpress"
/** Every active Kati Express courier and what they carry right now: the load the team assigns against. */
const { t } = useI18n()
const query = useKatiExpressCouriers()
const couriers = computed(() => query.data.value ?? [])
const empty = computed(() => Boolean(query.data.value) && !couriers.value.length)
</script>
<template>
  <section class="flex flex-col gap-3" data-testid="kati-express-couriers">
    <h3 class="text-sm font-semibold">{{ t("katiExpress.couriersTitle") }}</h3>
    <ApiErrorCard v-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <p v-else-if="empty" class="text-sm text-muted-foreground">{{ t("katiExpress.noCouriers") }}</p>
    <ul v-else class="flex flex-col gap-2">
      <OperationsKatiExpressCourierItem v-for="courier in couriers" :key="courier.id" :courier="courier" />
    </ul>
  </section>
</template>
