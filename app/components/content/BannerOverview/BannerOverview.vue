<script setup lang="ts">
import type { BanniereAdmin } from "@/types/api/vitrine"
import { computed } from "vue"
const { banners, isPending, error } = defineProps<{ banners: BanniereAdmin[]; isPending: boolean; error: unknown }>()
const { t } = useI18n({ useScope: "local" })
const counts = computed(() => ({
  total: banners.length,
  active: banners.filter(banner => banner.active).length,
  principal: banners.filter(banner => banner.emplacement === "principal").length,
  promo: banners.filter(banner => banner.emplacement === "promo").length,
  ads: banners.filter(banner => banner.emplacement === "pub_accueil").length,
  mobile: banners.filter(banner => banner.url_mobile).length,
}))
</script>
<template>
  <dl
    class="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 xl:grid-cols-6"
    :aria-label="t('label')"
    data-testid="banner-overview"
  >
    <div v-for="(count, key) in counts" :key="key" class="rounded-xl border border-border bg-card p-4">
      <dt class="text-xs text-muted-foreground">{{ t(key) }}</dt>
      <dd class="mt-2 font-heading text-2xl font-semibold" :data-testid="`banner-overview-${key}`">
        {{ isPending || error ? "—" : count }}
      </dd>
    </div>
  </dl>
</template>
<i18n lang="json">
{
  "en": {
    "label": "Banner overview",
    "total": "Total banners",
    "active": "Published",
    "principal": "Main carousel",
    "promo": "Promotional carousel",
    "ads": "Home advertising",
    "mobile": "Mobile artwork"
  },
  "fr": {
    "label": "Vue d’ensemble des bannières",
    "total": "Total des bannières",
    "active": "Publiées",
    "principal": "Carrousel principal",
    "promo": "Carrousel promotionnel",
    "ads": "Publicités d’accueil",
    "mobile": "Visuels mobiles dédiés"
  }
}
</i18n>
