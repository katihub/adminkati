<script setup lang="ts">
import type { CaisseListItem } from "@/types/api/caisse"
import type { CaisseFilterCriteria } from "@/utils/filter-caisses"
import { computed } from "vue"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useCaisses } from "@/composables/useCaisse"
import { useTeamRoster } from "@/composables/useTeamRoster"
import { filterCaisses } from "@/utils/filter-caisses"
import { resolveMemberName } from "@/utils/resolve-member-name"

const { criteria, selectedId = null } = defineProps<{
  criteria: CaisseFilterCriteria
  selectedId?: string | null
}>()

const emit = defineEmits<{ select: [id: string] }>()

const { t } = useI18n()
const { data, isPending, error } = useCaisses()
const { members } = useTeamRoster()

const caisses = computed(() => data.value ?? [])
const filtered = computed<CaisseListItem[]>(() => filterCaisses(caisses.value, criteria, members.value))
const showNotice = computed(() => !isPending.value && (Boolean(error.value) || filtered.value.length === 0))

function porteurName(caisse: CaisseListItem): string {
  return resolveMemberName(caisse.porteurId, members.value) ?? t("caisse.common.unknownMember")
}
</script>

<template>
  <div class="flex h-full flex-col gap-3.5" data-testid="caisse-list-panel">
    <ScrollArea data-testid="caisse-list-scroll-area" class="flex-1 min-h-0 p-0!">
      <div v-if="isPending" class="flex flex-col gap-2 p-3">
        <Skeleton v-for="n in 9" :key="n" data-testid="caisse-list-skeleton" class="h-14 w-full shrink-0 rounded-2xl" />
      </div>

      <InlineStateNotice
        v-else-if="showNotice"
        data-testid="caisse-list-empty"
        icon="ph:cash-register"
        :text="t('caisse.listPanel.empty')"
      />

      <div v-else class="flex flex-col gap-1.5">
        <CaisseListItem
          v-for="caisse in filtered"
          :key="caisse.id"
          :caisse="caisse"
          :porteur-name="porteurName(caisse)"
          :selected="caisse.id === selectedId"
          @select="emit('select', $event)"
        />
      </div>
    </ScrollArea>
  </div>
</template>
