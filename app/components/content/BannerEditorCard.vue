<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { useTimeoutFn } from "@vueuse/core"
import { computed, ref } from "vue"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { comptoirLabels } from "@/utils/comptoirs"
import { formatDayMonthYear, formatMonthYear } from "@/utils/dates"
import { getInitials } from "@/utils/initials"

const { name, email, member, isPending } = defineProps<{
  name: string
  email: string | null
  member: TeamMember | null
  isPending: boolean
}>()

const { t, locale } = useI18n()
const { comptoirs: publishedComptoirs } = useComptoirs()

const copied = ref(false)
const { start: resetCopied } = useTimeoutFn(() => (copied.value = false), 1500, { immediate: false })
const copyLabel = computed(() =>
  t(copied.value ? "content.banners.panel.editor.copied" : "content.banners.panel.editor.copyEmail"),
)
const copyIcon = computed(() => (copied.value ? "ph:check" : "ph:copy"))

const isInactive = computed(() => member?.actif === false)
const initials = computed(() => getInitials(name))
const avatarClass = computed(() =>
  cn("text-xl", isInactive.value ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"),
)

const status = computed(() => {
  if (!member) return null

  return isInactive.value
    ? { label: t("team.detail.inactive"), textClass: "text-destructive", dotClass: "bg-destructive" }
    : { label: t("team.detail.active"), textClass: "text-muted-foreground", dotClass: "bg-primary" }
})

function membershipCell(current: TeamMember) {
  if (isInactive.value && current.desactiveLe) {
    return {
      key: "deactivated",
      label: t("team.detail.deactivated"),
      value: formatDayMonthYear(current.desactiveLe, locale.value),
    }
  }
  return {
    key: "since",
    label: t("content.banners.panel.editor.since"),
    value: formatMonthYear(current.creeLe, locale.value),
  }
}

function countersCell(current: TeamMember) {
  const cles = current.comptoirs ?? []
  const value =
    cles.length === 0 ? t("team.comptoirs.wholeShop") : comptoirLabels(publishedComptoirs.value, cles).join(" · ")
  return { key: "counters", label: t("team.comptoirs.label"), value }
}

const cells = computed(() => {
  if (!member) return []

  return [membershipCell(member), countersCell(member)]
})
const gridClass = computed(() => (cells.value.length > 1 ? "grid-cols-2" : "grid-cols-1"))

async function copyEmail() {
  if (!email) return

  try {
    await navigator.clipboard.writeText(email)
  } catch {
    // Blocked or unavailable (insecure context): say nothing rather than claim it worked.
    return
  }
  copied.value = true
  resetCopied()
}
</script>

<template>
  <div class="relative flex flex-col items-center gap-1.5 px-4 pt-6 text-center">
    <span
      v-if="status"
      class="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-medium"
      :class="status.textClass"
    >
      <span class="size-1.5 rounded-full" :class="status.dotClass" />
      {{ status.label }}
    </span>

    <Avatar class="mb-2 size-16 ring-2 ring-primary/40 ring-offset-4 ring-offset-popover">
      <AvatarFallback :class="avatarClass">
        {{ initials }}
      </AvatarFallback>
    </Avatar>

    <p class="flex items-center gap-1.5 text-base font-semibold">
      <span>{{ name }}</span>
      <ContentBannerEditorCrown :member="member" />
    </p>

    <div v-if="email" class="flex items-center gap-1 text-xs text-muted-foreground">
      <span class="break-all">{{ email }}</span>
      <Button
        data-testid="banner-editor-copy"
        variant="ghost"
        size="icon-xs"
        :aria-label="copyLabel"
        @click="copyEmail"
      >
        <Icon :name="copyIcon" />
      </Button>
    </div>

    <div v-if="member" class="flex flex-wrap justify-center gap-1.5 pt-1">
      <Badge v-for="role in member.roles" :key="role" variant="secondary">
        {{ t(`team.roles.${role}`) }}
      </Badge>
    </div>
  </div>

  <Skeleton v-if="isPending" data-testid="banner-editor-card-loading" class="m-3 h-14 rounded-xl" />
  <div v-else-if="cells.length" class="grid gap-2 p-3" :class="gridClass">
    <div v-for="cell in cells" :key="cell.key" class="min-w-0 rounded-xl bg-muted px-3 py-2 text-left">
      <p class="text-xs font-medium tracking-wider text-muted-foreground">
        {{ cell.label }}
      </p>
      <p class="text-sm font-medium break-words">
        {{ cell.value }}
      </p>
    </div>
  </div>
  <p v-else class="m-3 rounded-xl bg-muted px-3 py-2 text-left text-sm text-muted-foreground">
    {{ t("content.banners.panel.editor.noProfile") }}
  </p>
</template>
