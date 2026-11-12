<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/ui/button"
import { isAdministration } from "@/utils/administration"
import { stateBlockClass } from "@/utils/state-block"

defineProps<{
  title: string
  hint: string
  addTestId: string
}>()

const { t } = useI18n()
const session = useCachedSession()
const canAdd = computed(() => isAdministration(session.value?.roles))
</script>

<template>
  <EmptyStateCard icon="ph:package" :text="title" :hint="hint" :class="stateBlockClass">
    <Button v-if="canAdd" as-child variant="outline" size="sm">
      <NuxtLinkLocale :to="{ path: '/products', query: { new: '1' } }" :data-testid="addTestId">
        {{ t("taxonomy.productsTab.addProduct") }}
      </NuxtLinkLocale>
    </Button>
  </EmptyStateCard>
</template>
