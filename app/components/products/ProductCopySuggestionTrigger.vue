<script setup lang="ts">
import { useId } from "vue"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

defineProps<{ canWrite: boolean; busy: boolean; needsContext: boolean }>()
defineEmits<{ generate: []; freshAlternative: [] }>()

const { t } = useI18n()
// GOTCHA: the icon's mask and filter ids come from useId(); in prod the server-rendered copy showed unmasked blobs
// until a client re-render, so it mounts on the client only.
const hintId = useId()
</script>

<template>
  <span
    v-if="canWrite"
    :title="needsContext ? t('products.aiCopy.trigger.needsContext') : t('products.aiCopy.trigger.generate')"
  >
    <span class="inline-flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="hover:bg-transparent hover:rotate-45 hover:scale-105 dark:hover:bg-transparent"
        data-testid="product-copy-generate"
        :aria-label="t('products.aiCopy.trigger.generate')"
        :disabled="busy || needsContext"
        :aria-busy="busy || undefined"
        :aria-describedby="needsContext ? hintId : undefined"
        @click="$emit('generate')"
      >
        <ClientOnly>
          <ProductsProductCopyGenerateIcon :class="cn('size-8', busy && 'motion-safe:animate-spin')" />
          <template #fallback>
            <span class="size-8" aria-hidden="true" />
          </template>
        </ClientOnly>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-testid="product-copy-menu"
            :aria-label="t('products.aiCopy.trigger.more')"
            :disabled="busy || needsContext"
          >
            <Icon size="24" name="ph:dots-three-bold" class="rotate-90" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            class="w-64"
            data-testid="product-copy-fresh-alternative"
            @select="$emit('freshAlternative')"
          >
            <AiIcon class="size-4" />
            {{ t("products.aiCopy.trigger.freshAlternative") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
    <span v-if="needsContext" :id="hintId" class="sr-only">{{ t("products.aiCopy.trigger.needsContext") }}</span>
  </span>
</template>
