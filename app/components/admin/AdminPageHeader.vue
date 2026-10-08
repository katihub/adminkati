<script setup lang="ts">
import { onMounted, onUpdated, useTemplateRef } from "vue"

defineProps<{
  title: string
}>()

const tabsStrip = useTemplateRef<HTMLElement>("tabsStrip")

/**
 * On a phone the tab strip scrolls sideways, and a link to the last tab opened on its label cut
 * in half. The current tab is brought into the strip whenever the header renders — horizontally
 * only: `scrollIntoView` would also scroll the page back up to the header.
 */
function revealCurrentTab() {
  const strip = tabsStrip.value
  const current = strip?.querySelector<HTMLElement>("[aria-current='true']")
  if (!strip || !current) return
  const stripBox = strip.getBoundingClientRect()
  const tabBox = current.getBoundingClientRect()
  if (tabBox.left < stripBox.left) strip.scrollLeft -= stripBox.left - tabBox.left
  else if (tabBox.right > stripBox.right) strip.scrollLeft += tabBox.right - stripBox.right
}

onMounted(revealCurrentTab)
onUpdated(revealCurrentTab)
</script>

<template>
  <section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between py-3" data-testid="admin-page-header">
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1
          class="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          data-testid="admin-page-header-title"
        >
          {{ title }}
        </h1>
        <div v-if="$slots.toolbar" class="min-w-0 ml-12 flex-1" data-testid="admin-page-header-toolbar">
          <slot name="toolbar" />
        </div>
        <!-- Scrolls rather than pushing the page sideways when the tabs are wider than a phone.
             No scrollbar under the pills: the clipped neighbouring tab already says there is more. -->
        <div
          v-if="$slots.tabs"
          ref="tabsStrip"
          data-testid="admin-page-header-tabs"
          class="no-scrollbar max-w-full overflow-x-auto"
        >
          <slot name="tabs" />
        </div>
      </div>
      <div
        v-if="$slots.default"
        class="mt-2 max-w-2xl text-sm text-muted-foreground"
        data-testid="admin-page-header-body"
      >
        <slot />
      </div>
    </div>
    <div
      v-if="$slots.actions"
      class="flex flex-wrap items-center gap-2 sm:justify-end"
      data-testid="admin-page-header-actions"
    >
      <slot name="actions" />
    </div>
  </section>
</template>
