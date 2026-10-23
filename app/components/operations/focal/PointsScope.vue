<script setup lang="ts">
import type { FocalPointMember } from "@/types/api/points-focaux"
import { computed } from "vue"
import { Badge } from "@/components/ui/badge"

/* Which shops to show: those still to assign, all of them, or one focal
   point's. Each focal point says how many shops it holds, or that it is
   inactive and its shops need another one. */
defineProps<{ members: FocalPointMember[] | undefined; pending: boolean }>()
const scope = defineModel<string>({ required: true })

const { t } = useI18n()
const fixedScopes = computed(() => [
  { value: "sans", label: t("operations.focal.points.unassigned") },
  { value: "", label: t("operations.focal.points.all") },
])
const tone = (value: string) => (scope.value === value ? "bg-primary text-primary-foreground" : "hover:bg-muted")
const badge = (member: FocalPointMember) =>
  member.actif ? t("operations.focal.points.count", { count: member.boutiques }) : t("operations.focal.points.inactive")
</script>

<template>
  <section class="space-y-2">
    <h2 class="font-heading text-base font-semibold">{{ t("operations.focal.points.title") }}</h2>
    <p class="text-xs text-muted-foreground">{{ t("operations.focal.points.help") }}</p>
    <div class="space-y-1 pt-2">
      <button
        v-for="item in fixedScopes"
        :key="item.value"
        type="button"
        class="block w-full rounded-md px-3 py-2 text-left text-sm"
        :class="tone(item.value)"
        :data-testid="`focal-scope-${item.value || 'all'}`"
        @click="scope = item.value"
      >
        {{ item.label }}
      </button>
      <div v-if="pending" class="h-24 animate-pulse rounded-md bg-muted" />
      <button
        v-for="member in members ?? []"
        :key="member.id"
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm"
        :class="tone(member.id)"
        :data-testid="`focal-scope-${member.id}`"
        @click="scope = member.id"
      >
        <span class="min-w-0 truncate">{{ member.nom }}</span>
        <Badge variant="outline" :class="member.actif ? '' : 'text-destructive'">{{ badge(member) }}</Badge>
      </button>
      <p v-if="members && !members.length" class="px-3 py-2 text-xs text-muted-foreground">
        {{ t("operations.focal.points.none") }}
      </p>
    </div>
  </section>
</template>
