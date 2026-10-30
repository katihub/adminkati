<script setup lang="ts">
import type { SellerReviewDetail } from "@/types/api/marketplace-moderation"
const { members } = defineProps<{ members: SellerReviewDetail["boutiques"][number]["membres"] }>()
const { t } = useI18n({ useScope: "local" })
</script>
<template>
  <div>
    <h4 class="text-sm font-semibold">{{ t("members") }}</h4>
    <p v-if="!members.length" class="mt-2 text-sm text-muted-foreground">{{ t("none") }}</p>
    <ul v-else class="divide-y divide-border text-sm">
      <li v-for="member in members" :key="member.id" class="flex flex-col gap-1 py-2">
        <strong>{{ member.nom }}</strong
        ><span class="break-all">{{ member.courriel }}</span
        ><span class="text-xs text-muted-foreground"
          >{{ member.roles.join(", ") }} · {{ t(member.actif ? "active" : "inactive") }}</span
        >
      </li>
    </ul>
  </div>
</template>
<i18n lang="json">
{
  "en": { "members": "Shop members", "none": "No member recorded.", "active": "Active", "inactive": "Inactive" },
  "fr": {
    "members": "Membres de la boutique",
    "none": "Aucun membre enregistré.",
    "active": "Actif",
    "inactive": "Inactif"
  }
}
</i18n>
