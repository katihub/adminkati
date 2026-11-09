<script setup lang="ts">
import { Button } from "@/components/ui/button"
import { useKatiExpressCouriers } from "@/composables/useKatiExpress"
/** Every active Kati Express courier and what they carry right now: the load the team assigns against.
    The direction and the focal points register couriers here (9 November 2026). */
const { t } = useI18n({ useScope: "local" })
const query = useKatiExpressCouriers()
const couriers = computed(() => query.data.value ?? [])
const empty = computed(() => Boolean(query.data.value) && !couriers.value.length)
const registering = ref(false)
</script>
<template>
  <section class="flex flex-col gap-3" data-testid="kati-express-couriers">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold">{{ t("katiExpress.couriersTitle") }}</h3>
      <Button size="sm" data-testid="kati-express-register-courier" @click="registering = true"
        ><Icon name="ph:user-plus" /> {{ t("register") }}</Button
      >
    </div>
    <ApiErrorCard v-if="query.error.value" :error="query.error.value" @retry="query.refetch()" />
    <p v-else-if="empty" class="text-sm text-muted-foreground">{{ t("katiExpress.noCouriers") }}</p>
    <ul v-else class="flex flex-col gap-2">
      <OperationsKatiExpressCourierItem v-for="courier in couriers" :key="courier.id" :courier="courier" />
    </ul>
    <OperationsKatiExpressCourierForm v-model:open="registering" />
  </section>
</template>
<i18n lang="json">
{
  "fr": { "register": "Inscrire un livreur" },
  "en": { "register": "Register a courier" }
}
</i18n>
