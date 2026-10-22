<script setup lang="ts">
import type { TeamRole } from "@/types/api/site-texts"
import { ref, watch } from "vue"
import { Button } from "@/components/ui/button"
import { useSiteTextMutations, useSiteTextSettings } from "@/composables/useSiteTexts"
import { useToastAction } from "@/composables/useToastAction"

// The direction always writes and publishes; it chooses which other roles may write.
const ROLES = ["comptoir", "preparation", "livreur"] as const satisfies readonly TeamRole[]

const { t } = useI18n()
const settings = useSiteTextSettings(true)
const { updateSettings } = useSiteTextMutations()
const run = useToastAction()
const chosen = ref<TeamRole[]>([])

watch(
  () => settings.data.value,
  value => {
    if (value) chosen.value = [...value.rolesRedaction]
  },
  { immediate: true },
)

function save() {
  const roles = ROLES.filter(role => chosen.value.includes(role))
  void run(() => updateSettings.mutateAsync(roles), t("content.siteTexts.rolesSaved"))
}
</script>

<template>
  <section class="rounded-lg border border-border bg-card p-5">
    <h3 class="font-heading font-semibold">{{ t("content.siteTexts.rolesTitle") }}</h3>
    <p class="mt-1 max-w-3xl text-sm text-muted-foreground">{{ t("content.siteTexts.rolesHelp") }}</p>
    <form class="mt-3 flex flex-wrap items-center gap-4" @submit.prevent="save">
      <label v-for="role in ROLES" :key="role" class="flex items-center gap-2 text-sm">
        <input v-model="chosen" type="checkbox" class="size-4" :value="role" :data-testid="`site-texts-role-${role}`" />
        {{ t(`content.siteTexts.roles.${role}`) }}
      </label>
      <Button type="submit" size="sm" :disabled="updateSettings.isPending.value" data-testid="site-texts-save-roles">{{
        t("content.siteTexts.save")
      }}</Button>
    </form>
  </section>
</template>
