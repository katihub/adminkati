<script setup lang="ts">
import type { CustomerAddress } from "@/types/api/clients"

const { addresses } = defineProps<{
  addresses: CustomerAddress[]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="p-4 sm:p-6" data-testid="users-addresses-section">
    <div class="flex items-center gap-2">
      <Icon name="ph:map-pin" size="18" class="text-primary" aria-hidden="true" />
      <h3 class="font-heading text-lg font-semibold text-foreground">
        {{ t("users.detail.addresses") }}
      </h3>
    </div>
    <p v-if="addresses.length === 0" class="mt-4 text-sm text-muted-foreground">
      {{ t("users.detail.noAddresses") }}
    </p>
    <div v-else class="mt-4 grid gap-3 md:grid-cols-2">
      <article
        v-for="address in addresses"
        :key="address.id"
        class="rounded-2xl border border-border/70 bg-muted/50 p-4"
        data-testid="users-address-card"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-foreground">
            {{ t(`users.detail.addressMode.${address.mode}`) }}
          </p>
          <span v-if="address.parDefaut" class="text-xs text-primary">{{ t("users.detail.defaultAddress") }}</span>
        </div>
        <p class="mt-1 text-sm text-foreground">
          {{ address.ville }}<span v-if="address.quartier"> · {{ address.quartier }}</span>
        </p>
        <p v-if="address.repere" class="mt-1 text-xs text-muted-foreground">
          {{ address.repere }}
        </p>
        <!--
          CE QUE LE LIVREUR COMPOSE, ET OÙ L'ON RETIRE. Les deux champs
          arrivaient dans `adresses[]` et n'étaient nulle part : sans
          `telephoneDestinataire` on rappelait le titulaire du compte, qui n'est
          pas toujours celui qui reçoit ; et un retrait sans son `comptoir` ne
          dit pas où aller — c'est sa seule information utile.
        -->
        <dl
          v-if="address.telephoneDestinataire || address.comptoir"
          class="mt-3 grid gap-2 border-t border-border/70 pt-3 text-xs"
        >
          <div v-if="address.telephoneDestinataire" class="flex items-center gap-1.5">
            <Icon name="ph:phone" size="14" class="shrink-0 text-muted-foreground" aria-hidden="true" />
            <dt class="text-muted-foreground">
              {{ t("users.detail.recipientPhone") }}
            </dt>
            <dd class="min-w-0 truncate font-medium text-foreground" data-testid="users-address-recipient-phone">
              {{ address.telephoneDestinataire }}
            </dd>
          </div>
          <div v-if="address.comptoir" class="flex items-center gap-1.5">
            <Icon name="ph:storefront" size="14" class="shrink-0 text-muted-foreground" aria-hidden="true" />
            <dt class="text-muted-foreground">
              {{ t("users.detail.pickupCounter") }}
            </dt>
            <dd class="min-w-0 truncate font-medium text-foreground" data-testid="users-address-counter">
              {{ address.comptoir }}
            </dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>
