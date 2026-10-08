<script setup lang="ts">
import type { MouvementStock } from "@/types/api/inventaire"
import { computed } from "vue"
import { findMemberById } from "@/utils/find-member-by-id"
import { resolveActor } from "@/utils/inventory-actor"

const { acteur } = defineProps<{ acteur: MouvementStock["acteur"] }>()

const { t, te } = useI18n()
const { members, isPending } = useTeamRoster()
const session = useCachedSession()

const isYou = computed(() => acteur.id !== null && acteur.id === session.value?.membreId)
const member = computed(() => findMemberById(acteur.id, members.value))

/** The ledger stores the role list the caller held, e.g. "direction,comptoir". */
const roleLabel = computed(() =>
  (acteur.role ?? "")
    .split(",")
    .map(role => role.trim())
    .filter(Boolean)
    .map(role => (te(`team.roles.${role}`) ? t(`team.roles.${role}`) : role))
    .join(", "),
)

const actor = computed(() =>
  resolveActor({
    member: member.value,
    viewer: isYou.value ? session.value : null,
    roleLabel: roleLabel.value,
    unknownLabel: t("products.inventory.actorUnknown"),
  }),
)
// The raw id is for support to copy, never for reading.
const title = computed(() => (member.value || isYou.value ? undefined : (acteur.id ?? undefined)))
</script>

<template>
  <span
    v-if="acteur.type === 'systeme'"
    data-testid="inventory-actor-system"
    class="inline-flex items-center gap-x-1.5 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground"
  >
    <Icon name="ph:gear-six" aria-hidden="true" />
    {{ t("products.inventory.actorSystem") }}
  </span>

  <span v-else class="inline-flex items-center gap-x-1.5" :title="title">
    <EditorPill
      :editor="actor"
      :member="member"
      :is-pending="isPending"
      pill-test-id="inventory-actor-pill"
      card-test-id="inventory-actor-card"
    />
  </span>
</template>
