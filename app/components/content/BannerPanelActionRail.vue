<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { SheetFooter } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"

/** The view-mode footer — publish toggle, Edit, Delete (with its confirm dialog) —
 *  extracted out of `BannerPanel.vue`'s template to keep it under the repository's
 *  complexity gate, same reasoning as the `BannerFormActions.vue` split. `deleteOpen` is
 *  a `v-model` rather than owned here: `BannerPanel.vue` closes the dialog itself once
 *  the delete mutation succeeds, and resets it on every banner change. */
defineProps<{
  active: boolean
  publishPending: boolean
  deletePending: boolean
  deleteOpen: boolean
}>()

const emit = defineEmits<{
  "update:active": [value: boolean]
  "update:deleteOpen": [value: boolean]
  edit: []
  confirmDelete: []
}>()

const { t } = useI18n()
</script>

<template>
  <SheetFooter data-testid="banner-panel-actions" class="flex-row items-center justify-between border-t border-border">
    <div class="flex items-center gap-2">
      <Switch
        data-testid="banner-panel-publish-toggle"
        :model-value="active"
        :disabled="publishPending"
        @update:model-value="value => emit('update:active', value)"
      />
      <span class="text-sm text-muted-foreground">{{ t("content.banners.panel.publish") }}</span>
    </div>

    <div class="flex items-center gap-2">
      <Button data-testid="banner-panel-edit-button" variant="outline" size="sm" @click="emit('edit')">
        <Icon name="ph:pencil-simple" size="16" aria-hidden="true" />
        {{ t("content.banners.panel.edit") }}
      </Button>

      <AlertDialog :open="deleteOpen" @update:open="value => emit('update:deleteOpen', value)">
        <AlertDialogTrigger as-child>
          <Button data-testid="banner-panel-delete-trigger" variant="destructive" size="sm">
            <Icon name="ph:trash" size="16" aria-hidden="true" />
            {{ t("content.banners.panel.delete") }}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent data-testid="banner-panel-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{{ t("content.banners.panel.deleteConfirmTitle") }}</AlertDialogTitle>
            <AlertDialogDescription>{{ t("content.banners.panel.deleteConfirmDescription") }}</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel data-testid="banner-panel-delete-cancel" :disabled="deletePending">
              {{ t("content.banners.panel.deleteCancel") }}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              data-testid="banner-panel-delete-confirm"
              :disabled="deletePending"
              :aria-busy="deletePending || undefined"
              @click="emit('confirmDelete')"
            >
              <Spinner v-if="deletePending" data-icon="inline-start" />
              {{ t("content.banners.panel.deleteConfirm") }}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </SheetFooter>
</template>
