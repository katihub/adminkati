<script setup lang="ts">
import type { CustomerProfile } from "@/types/api/clients"

defineProps<{
  profile: CustomerProfile
}>()

const { t } = useI18n()
</script>

<template>
  <div class="space-y-4">
    <dl class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <dt class="sr-only">
            {{ t("quotes.detail.clientLabel") }}
          </dt>
          <dd class="font-semibold text-sm sm:text-base text-foreground truncate" data-testid="quotes-detail-customer">
            {{ profile.nom }}
          </dd>
          <dt class="sr-only">
            {{ t("quotes.detail.phoneLabel") }}
          </dt>
          <dd
            v-if="profile.telephone"
            class="font-mono text-xs text-muted-foreground mt-0.5"
            data-testid="quotes-detail-phone"
          >
            {{ profile.telephone }}
          </dd>
        </div>

        <a
          v-if="profile.telephone"
          :href="`tel:${profile.telephone.replace(/\s+/g, '')}`"
          class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 hover:bg-primary hover:text-primary-foreground text-foreground transition-colors"
          :title="t('orders.detail.call')"
        >
          <Icon name="ph:phone" size="15" aria-hidden="true" />
        </a>
      </div>

      <div
        v-if="profile.raisonSociale || profile.comptoirPrefere"
        class="rounded-xl bg-muted/40 p-3.5 space-y-2 text-xs"
      >
        <div v-if="profile.raisonSociale" class="flex items-center gap-2">
          <Icon name="ph:briefcase" size="14" aria-hidden="true" class="shrink-0 text-muted-foreground" />
          <dt class="text-muted-foreground">{{ t("quotes.detail.companyLabel") }}:</dt>
          <dd class="font-medium text-foreground truncate">
            {{ profile.raisonSociale }}
          </dd>
        </div>
        <div v-if="profile.comptoirPrefere" class="flex items-center gap-2">
          <Icon name="ph:storefront" size="14" aria-hidden="true" class="shrink-0 text-muted-foreground" />
          <dt class="text-muted-foreground">{{ t("quotes.detail.preferredCounterLabel") }}:</dt>
          <dd class="font-medium text-foreground truncate">
            {{ profile.comptoirPrefere }}
          </dd>
        </div>
      </div>
    </dl>
  </div>
</template>
