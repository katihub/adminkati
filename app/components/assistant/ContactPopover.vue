<script setup lang="ts">
import type { DemandeAssistanceDetail } from "@/types/api/assistant"
import { computed } from "vue"

const { demande } = defineProps<{
  demande: DemandeAssistanceDetail
}>()

const { t } = useI18n()

const hasContact = computed(() => Boolean(demande.nom || demande.telephone || demande.courriel || demande.clientId))
</script>

<template>
  <div class="w-72 space-y-3" data-testid="assistant-detail-contact-panel">
    <!-- The customers page opens a record from `?id=`, so a signed-in visitor is one click from their account. -->
    <NuxtLinkLocale
      v-if="demande.clientId"
      :to="{ name: 'users', query: { id: demande.clientId } }"
      class="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
      data-testid="assistant-detail-customer-link"
    >
      <Icon name="ph:user-circle" size="16" aria-hidden="true" />
      {{ t("assistant.detail.openCustomer") }}
    </NuxtLinkLocale>

    <p v-if="!hasContact" class="text-sm text-muted-foreground" data-testid="assistant-detail-no-contact">
      {{ t("assistant.detail.noContact") }}
    </p>

    <dl v-else class="grid gap-3">
      <div v-if="demande.nom" class="min-w-0 text-sm">
        <dt class="text-xs text-muted-foreground">
          {{ t("assistant.detail.name") }}
        </dt>
        <dd class="truncate font-medium text-foreground" data-testid="assistant-detail-name">
          {{ demande.nom }}
        </dd>
      </div>
      <div v-if="demande.telephone" class="min-w-0 text-sm">
        <dt class="text-xs text-muted-foreground">
          {{ t("assistant.detail.phone") }}
        </dt>
        <dd class="font-medium text-foreground">
          <a
            class="underline underline-offset-2 hover:text-primary"
            data-testid="assistant-detail-phone"
            :href="`tel:${demande.telephone.replace(/\s+/g, '')}`"
            >{{ demande.telephone }}</a
          >
        </dd>
      </div>
      <div v-if="demande.courriel" class="min-w-0 text-sm">
        <dt class="text-xs text-muted-foreground">
          {{ t("assistant.detail.email") }}
        </dt>
        <dd class="truncate font-medium text-foreground">
          <a
            class="underline underline-offset-2 hover:text-primary"
            data-testid="assistant-detail-email"
            :href="`mailto:${demande.courriel}`"
            >{{ demande.courriel }}</a
          >
        </dd>
      </div>
    </dl>
  </div>
</template>
