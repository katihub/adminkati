<script setup lang="ts">
import { computed, ref } from "vue"
import { Button } from "@/components/ui/button"
import { useAnnonceMutations, useAnnonces } from "@/composables/useAnnonces"
import { apiErrorText } from "@/utils/api-error"

const { t } = useI18n()
const { data, isPending, error, refetch } = useAnnonces()
const { create, update, reorder } = useAnnonceMutations()
const session = useCachedSession()
const canWrite = computed(() => session.value?.roles.includes("direction") ?? false)
const texte = ref("")
const editingId = ref<number | null>(null)
const draft = ref("")
const rows = computed(() => (Array.isArray(data.value) ? data.value : []))

function add() {
  if (!texte.value.trim()) return
  create.mutate(texte.value.trim(), {
    onSuccess: () => {
      texte.value = ""
    },
  })
}
function edit(id: number, current: string) {
  editingId.value = id
  draft.value = current
}
function save(id: number) {
  if (!draft.value.trim()) return
  update.mutate(
    { id, texte: draft.value.trim() },
    {
      onSuccess: () => {
        editingId.value = null
      },
    },
  )
}
function move(index: number, offset: -1 | 1) {
  const ids = rows.value.map(item => item.id)
  const target = index + offset
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
  reorder.mutate(ids)
}
</script>

<template>
  <section class="mx-auto max-w-5xl space-y-5 px-6 py-6 lg:px-10" data-testid="announcements-workspace">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <!-- fallow-ignore-next-line complexity -->
        <h2 class="text-xl font-semibold">{{ t("content.announcements.title") }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{{ t("content.announcements.description") }}</p>
      </div>
      <form v-if="canWrite" class="flex w-full gap-2 sm:w-auto" @submit.prevent="add">
        <input
          v-model="texte"
          maxlength="120"
          :placeholder="t('content.announcements.placeholder')"
          class="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm sm:w-80"
        />
        <Button type="submit" :disabled="!texte.trim() || create.isPending.value">{{
          t("content.announcements.add")
        }}</Button>
      </form>
    </header>

    <div v-if="isPending" class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      {{ t("content.announcements.loading") }}
    </div>
    <div v-else-if="error" role="alert" class="rounded-lg border border-destructive/40 p-6 text-sm">
      <p>{{ apiErrorText(error, t) }}</p>
      <Button class="mt-3" variant="outline" @click="() => refetch()">{{ t("content.announcements.retry") }}</Button>
    </div>
    <div v-else-if="!rows.length" class="rounded-lg border p-8 text-center text-sm text-muted-foreground">
      {{ t("content.announcements.empty") }}
    </div>
    <ol v-else class="divide-y rounded-lg border">
      <li
        v-for="(item, index) in rows"
        :key="item.id"
        class="flex flex-wrap items-center gap-3 p-4"
        :data-testid="`announcement-${item.id}`"
      >
        <span class="w-7 text-sm text-muted-foreground">{{ index + 1 }}.</span>
        <template v-if="editingId === item.id">
          <input
            v-model="draft"
            maxlength="120"
            class="h-9 min-w-40 flex-1 rounded-md border bg-background px-3 text-sm"
            @keydown.enter.prevent="save(item.id)"
          />
          <Button size="sm" @click="save(item.id)">{{ t("content.announcements.save") }}</Button>
          <Button size="sm" variant="outline" @click="editingId = null">{{ t("content.announcements.cancel") }}</Button>
        </template>
        <template v-else>
          <span class="min-w-40 flex-1" :class="!item.active && 'text-muted-foreground line-through'">{{
            item.texte
          }}</span>
          <div v-if="canWrite" class="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              :aria-label="t('content.announcements.moveUp')"
              :disabled="index === 0 || reorder.isPending.value"
              @click="move(index, -1)"
              >↑</Button
            >
            <Button
              size="sm"
              variant="outline"
              :aria-label="t('content.announcements.moveDown')"
              :disabled="index === rows.length - 1 || reorder.isPending.value"
              @click="move(index, 1)"
              >↓</Button
            >
            <Button size="sm" variant="outline" @click="edit(item.id, item.texte)">{{
              t("content.announcements.edit")
            }}</Button>
            <Button size="sm" variant="outline" @click="update.mutate({ id: item.id, active: !item.active })">{{
              item.active ? t("content.announcements.deactivate") : t("content.announcements.activate")
            }}</Button>
          </div>
          <span v-else class="text-xs text-muted-foreground">{{
            item.active ? t("content.announcements.active") : t("content.announcements.inactive")
          }}</span>
        </template>
      </li>
    </ol>
    <p
      v-if="create.error.value || update.error.value || reorder.error.value"
      role="alert"
      class="text-sm text-destructive"
    >
      {{ apiErrorText(create.error.value || update.error.value || reorder.error.value, t) }}
    </p>
  </section>
</template>
