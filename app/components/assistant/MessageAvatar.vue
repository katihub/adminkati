<script setup lang="ts">
import type { AuteurMessageAssistance } from "@/types/api/assistant"
import { computed } from "vue"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initialsFromEmailOrName } from "@/utils/message-avatar"

const {
  kind,
  email = null,
  name = null,
  image = null,
} = defineProps<{
  kind: AuteurMessageAssistance
  email?: string | null
  name?: string | null
  image?: string | null
}>()

/** The visitor's only identity field is the request's email; a human can fall back to their name. */
const initials = computed(() =>
  kind === "visiteur" ? initialsFromEmailOrName(email, null) : initialsFromEmailOrName(email, name),
)
</script>

<template>
  <Avatar size="sm" data-testid="assistant-message-avatar" :data-kind="kind">
    <AvatarImage v-if="image" :src="image" :alt="name ?? ''" />
    <AvatarFallback v-if="kind === 'assistant'" class="bg-transparent" data-testid="assistant-message-avatar-icon">
      <AiIcon class="size-full" />
    </AvatarFallback>
    <AvatarFallback
      v-else-if="initials"
      class="bg-primary/10 text-primary"
      data-testid="assistant-message-avatar-initials"
    >
      {{ initials }}
    </AvatarFallback>
    <AvatarFallback
      v-else-if="kind === 'visiteur'"
      class="bg-primary/10 text-primary"
      data-testid="assistant-message-avatar-letter"
    >
      C
    </AvatarFallback>
    <AvatarFallback v-else class="bg-muted text-muted-foreground" data-testid="assistant-message-avatar-icon">
      <Icon name="ph:headset" size="14" aria-hidden="true" />
    </AvatarFallback>
  </Avatar>
</template>
