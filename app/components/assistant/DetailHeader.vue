<script setup lang="ts">
import type { DemandeAssistanceDetail } from "@/types/api/assistant"
import { PhDotsThree } from "@phosphor-icons/vue"
import { computed, ref } from "vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ASSISTANT_REQUEST_STATUS_TONE } from "@/utils/assistant-requests"
import { whatsappLink } from "@/utils/whatsapp"

const { demande, pending = false } = defineProps<{
  demande: DemandeAssistanceDetail
  pending?: boolean
}>()

const emit = defineEmits<{ back: []; close: [] }>()

const { t } = useI18n()

/** Confirmed, because the contract has no way back: a closed request cannot be reopened. */
const closeDialogOpen = ref(false)

const displayName = computed(() => demande.nom ?? t("assistant.list.anonymous"))
const whatsappHref = computed(() => whatsappLink(demande.telephone, demande.reponse ?? ""))

function confirmClose() {
  closeDialogOpen.value = false
  emit("close")
}
</script>

<template>
  <header
    class="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background p-4 sm:p-5"
    data-testid="assistant-detail-header"
  >
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        class="lg:hidden"
        data-testid="assistant-detail-back"
        @click="emit('back')"
      >
        <Icon name="ph:arrow-left" size="16" aria-hidden="true" />
        <span class="sr-only">{{ t("assistant.page.back") }}</span>
      </Button>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-2">
          <Popover>
            <PopoverTrigger as-child>
              <button
                type="button"
                class="truncate rounded-md font-heading text-lg font-semibold tracking-tight text-foreground underline-offset-2 hover:underline"
                data-testid="assistant-detail-contact-trigger"
              >
                {{ displayName }}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <AssistantContactPopover :demande="demande" />
            </PopoverContent>
          </Popover>

          <Badge
            data-testid="assistant-detail-status"
            :data-status="demande.statut"
            class="rounded-full border-0! px-2.5 py-0.5 text-xs font-medium"
            :class="ASSISTANT_REQUEST_STATUS_TONE[demande.statut]"
          >
            {{ t(`assistant.status.${demande.statut}`) }}
          </Badge>
        </div>
        <span class="font-mono text-xs text-muted-foreground" data-testid="assistant-detail-reference">
          {{ demande.reference }}
        </span>
      </div>
    </div>

    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon-sm"
          data-testid="assistant-detail-menu-trigger"
          :aria-label="t('assistant.close.action')"
        >
          <PhDotsThree :size="18" weight="bold" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="w-56">
        <DropdownMenuItem v-if="demande.clientId" as-child data-testid="assistant-detail-menu-fiche">
          <NuxtLinkLocale :to="{ name: 'users', query: { id: demande.clientId } }">
            <Icon name="ph:user-circle" size="16" aria-hidden="true" />
            {{ t("assistant.detail.openCustomer") }}
          </NuxtLinkLocale>
        </DropdownMenuItem>
        <DropdownMenuItem v-if="whatsappHref" as-child data-testid="assistant-detail-menu-whatsapp">
          <!-- An outbound navigation, not a fetch: the CSP's connect/form rules do not apply to it. -->
          <a :href="whatsappHref" target="_blank" rel="noopener noreferrer">
            <Icon name="ph:whatsapp-logo" size="16" aria-hidden="true" />
            {{ t("assistant.reply.whatsapp") }}
          </a>
        </DropdownMenuItem>
        <template v-if="demande.statut !== 'close'">
          <DropdownMenuSeparator v-if="demande.clientId || whatsappHref" />
          <DropdownMenuItem
            variant="destructive"
            :disabled="pending"
            data-testid="assistant-detail-menu-close"
            @select.prevent="closeDialogOpen = true"
          >
            <Icon name="ph:archive" size="16" aria-hidden="true" />
            {{ t("assistant.close.action") }}
          </DropdownMenuItem>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>

    <AlertDialog :open="closeDialogOpen" @update:open="closeDialogOpen = $event">
      <AlertDialogContent data-testid="assistant-close-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("assistant.close.title", { reference: demande.reference }) }}</AlertDialogTitle>
          <AlertDialogDescription>{{ t("assistant.close.description") }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="pending">
            {{ t("assistant.close.cancel") }}
          </AlertDialogCancel>
          <AlertDialogAction :disabled="pending" data-testid="assistant-close-confirm" @click="confirmClose">
            {{ t("assistant.close.confirm") }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </header>
</template>
