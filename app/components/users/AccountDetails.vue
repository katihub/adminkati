<script setup lang="ts">
import type { CustomerAccountDetail } from "@/types/api/clients"
import { formatDateCourte } from "@/utils/dates"

const { account } = defineProps<{
  account: CustomerAccountDetail["client"]
}>()

const { locale, t } = useI18n()
</script>

<template>
  <section class="p-4 sm:p-6" data-testid="users-account-section">
    <div class="flex items-center gap-2">
      <Icon name="ph:shield-check" size="18" class="text-primary" aria-hidden="true" />
      <h3 class="font-heading text-lg font-semibold text-foreground">
        {{ t("users.detail.account") }}
      </h3>
    </div>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <!-- THE EMAIL FIRST, BECAUSE IT IS THE ONE THING EVERY ACCOUNT HAS.
           A customer who has not filled his fiche has no name and no phone
           here; his address is what he gives on the telephone, and what the
           directory now searches. It spans the row on its own line so a long
           address is readable rather than cut in a third of the width. -->
      <div class="rounded-2xl bg-muted/50 p-3 sm:col-span-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.email") }}
        </dt>
        <dd class="mt-0.5 font-medium break-all text-foreground" data-testid="users-account-email">
          {{ account.courriel }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.status") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ t(`users.listItem.status.${account.statut}`) }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.created") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ formatDateCourte(account.creeLe, locale) }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.lastAccess") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ account.dernierAccesLe ? formatDateCourte(account.dernierAccesLe, locale) : t("users.detail.noValue") }}
        </dd>
      </div>
    </dl>
  </section>
</template>
