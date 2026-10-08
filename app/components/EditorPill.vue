<script setup lang="ts">
import type { TeamMember } from "@/types/api/equipe"
import { computed } from "vue"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { getInitials } from "@/utils/initials"

const { editor, member, isPending, pillTestId, cardTestId } = defineProps<{
  editor: { name: string; email: string | null }
  member: TeamMember | null
  isPending: boolean
  pillTestId?: string
  cardTestId?: string
}>()

// The directory is the source of truth for the name; the stamp only holds what it was at edit time.
const name = computed(() => member?.nom ?? editor.name)
</script>

<template>
  <HoverCard :open-delay="200" class="max-w-3xl!" :close-delay="120" enable-touch>
    <HoverCardTrigger as-child>
      <div
        :data-testid="pillTestId"
        tabindex="0"
        class="px-1 py-1 pr-2.5 rounded-full flex items-center gap-x-1.5 bg-primary/10 text-primary text-xs! font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <!-- The colour sits on the fallback: it fills the whole avatar with its own background, which would hide the root's. -->
        <Avatar class="border-0 outline-0" size="sm">
          <AvatarFallback class="bg-primary text-primary-foreground">
            {{ getInitials(name) }}
          </AvatarFallback>
        </Avatar>
        <span>{{ name }}</span>
        <ContentBannerEditorCrown :member="member" />
      </div>
    </HoverCardTrigger>

    <HoverCardContent :data-testid="cardTestId" side="top" align="end" :side-offset="8" class="max-w-96 p-0">
      <ContentBannerEditorCard :name="name" :email="editor.email" :member="member" :is-pending="isPending" />
    </HoverCardContent>
  </HoverCard>
</template>
