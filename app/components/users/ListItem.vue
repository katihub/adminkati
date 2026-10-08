<script setup lang="ts">
import type { CustomerDirectoryItem } from "@/types/api/clients"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"
import { formatDateCourte } from "@/utils/dates"

const props = defineProps<{
  customer: CustomerDirectoryItem
  selected?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const { locale, t } = useI18n()
/**
 * THE ROW IS NAMED BY THE EMAIL UNTIL A FICHE EXISTS, NEVER BY THE UUID.
 * An account created on the storefront has no name and no phone until the
 * customer fills his fiche, and two rows labelled with a uuid tell an operator
 * nothing about which one is the customer on the line. The email exists from
 * sign-up, and it is what the customer gives on the phone.
 */
/* `|| id` EN DERNIER RECOURS : pendant un deploiement, un panel neuf peut lire
   un backend qui ne renvoie pas encore le courriel, et une ligne sans nom ne
   doit pas faire tomber la liste. */
const name = computed(() => props.customer.profil?.nom || props.customer.courriel || props.customer.id)
const email = computed(() => props.customer.courriel ?? null)
const phone = computed(() => props.customer.profil?.telephone ?? null)
/**
 * LA CLÉ DE TRI PAR DÉFAUT ÉTAIT INVISIBLE. `tri=recent` ordonne par
 * `dernierAccesLe desc` (`profil.service.ts:346-357`) : la liste était rangée
 * selon une valeur que rien n'affichait, et l'ordre paraissait arbitraire.
 */
const lastAccess = computed(() =>
  props.customer.dernierAccesLe
    ? formatDateCourte(props.customer.dernierAccesLe, locale.value)
    : t("users.listItem.neverAccessed"),
)
const statusTone = computed(() => ({
  "bg-primary/10 text-primary": props.customer.statut === "actif",
  "bg-warning/10 text-warning-foreground": props.customer.statut === "suspendu",
  "bg-muted text-muted-foreground": props.customer.statut === "supprime",
}))
</script>

<template>
  <button
    type="button"
    data-testid="users-list-item"
    :data-customer-id="customer.id"
    :aria-pressed="selected ? 'true' : 'false'"
    class="group relative flex w-full items-center gap-3 px-4 py-3 text-left transition-all"
    :class="
      selected
        ? 'border-l-4 border-l-primary bg-muted border-t border-b'
        : 'hover:bg-muted/50 hover:border-l-4 hover:border-l-muted'
    "
    @click="emit('select', customer.id)"
  >
    <div
      class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
      aria-hidden="true"
    >
      {{ name.slice(0, 1).toUpperCase() }}
    </div>
    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center justify-between gap-2">
        <span data-testid="users-list-item-name" class="truncate text-sm font-medium text-foreground">
          {{ name }}
        </span>
        <Badge
          data-testid="users-list-item-status"
          class="shrink-0 rounded-full border-0! px-2 py-0 text-[10px] font-medium"
          :class="statusTone"
        >
          {{ t(`users.listItem.status.${customer.statut}`) }}
        </Badge>
      </div>
      <div class="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span class="truncate">{{ phone || t("users.listItem.incomplete") }}</span>
        <span
          class="shrink-0"
          data-testid="users-list-item-last-access"
          :title="t('users.listItem.lastAccess', { value: lastAccess })"
        >
          {{ lastAccess }}
        </span>
      </div>
      <p
        v-if="email && name !== email"
        data-testid="users-list-item-email"
        class="truncate text-[11px] text-muted-foreground"
      >
        {{ email }}
      </p>
    </div>
  </button>
</template>
