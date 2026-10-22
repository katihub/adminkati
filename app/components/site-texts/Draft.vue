<script setup lang="ts">
import type {
  FaqContent,
  SiteTextChange,
  SiteTextDetail,
  SiteTextRights,
  SiteTextVersion,
} from "@/types/api/site-texts"
import type { EmailForm, PageForm } from "@/utils/site-texts"
import { computed, ref } from "vue"
import SiteTextsActions from "@/components/site-texts/Actions.vue"
import SiteTextsChanges from "@/components/site-texts/Changes.vue"
import SiteTextsDraftMeta from "@/components/site-texts/DraftMeta.vue"
import SiteTextsEmailForm from "@/components/site-texts/EmailForm.vue"
import SiteTextsFaqForm from "@/components/site-texts/FaqForm.vue"
import SiteTextsLanguageBar from "@/components/site-texts/LanguageBar.vue"
import SiteTextsPageForm from "@/components/site-texts/PageForm.vue"
import SiteTextsPreview from "@/components/site-texts/Preview.vue"
import { useSiteTextMutations } from "@/composables/useSiteTexts"
import { useToastAction } from "@/composables/useToastAction"
import { siteTextCodec } from "@/utils/site-texts"

const props = defineProps<{ detail: SiteTextDetail; draft: SiteTextVersion; rights: SiteTextRights }>()

const { t } = useI18n()
const mutations = useSiteTextMutations()
const run = useToastAction()
const codec = siteTextCodec(props.detail.type)
const language = ref<"fr" | "en">("fr")
type FormValue = PageForm | FaqContent | EmailForm
const fr = ref<FormValue>(codec.toForm(props.draft.fr))
const en = ref<FormValue | null>(props.draft.en ? codec.toForm(props.draft.en) : null)
const nature = ref<SiteTextChange>(props.draft.nature)
const summary = ref(props.draft.resume ?? "")
const englishConfirmed = ref(false)
const preview = ref(false)
const kind = computed(() => (props.detail.type === "faq" ? "faq" : props.detail.type === "courriel" ? "email" : "page"))
const current = computed(() => (language.value === "fr" ? fr.value : en.value))
function setCurrent(value: FormValue) {
  if (language.value === "fr") fr.value = value
  else en.value = value
}
// One typed model per form; the forms edit their object in place.
const pageForm = computed({ get: () => current.value as PageForm, set: setCurrent })
const faqForm = computed({ get: () => current.value as FaqContent, set: setCurrent })
const emailForm = computed({ get: () => current.value as EmailForm, set: setCurrent })
const pending = computed(() =>
  [mutations.save, mutations.submit, mutations.publish, mutations.sendBack, mutations.discard].some(
    m => m.isPending.value,
  ),
)

const body = () => ({
  fr: codec.fromForm(fr.value),
  en: en.value ? codec.fromForm(en.value) : null,
  nature: nature.value,
  resume: summary.value.trim() || null,
  anglaisConfirme: englishConfirmed.value,
})

const save = () => mutations.save.mutateAsync({ id: props.draft.id, body: body() })

function addEnglish() {
  // The translator starts from the French layout and rewrites each text.
  en.value = codec.toForm(codec.fromForm(fr.value))
  language.value = "en"
}

const onSave = () => void run(save, t("content.siteTexts.saved"))
const onSubmit = () =>
  void run(async () => {
    await save()
    await mutations.submit.mutateAsync(props.draft.id)
  }, t("content.siteTexts.submitted"))
const onPublish = () =>
  void run(async () => {
    await save()
    await mutations.publish.mutateAsync(props.draft.id)
  }, t("content.siteTexts.published"))
const onSendBack = (comment: string) =>
  void run(() => mutations.sendBack.mutateAsync({ id: props.draft.id, comment }), t("content.siteTexts.sentBack"))
const onDiscard = () => void run(() => mutations.discard.mutateAsync(props.draft.id), t("content.siteTexts.discarded"))
</script>

<template>
  <div class="grid gap-4">
    <p
      v-if="draft.commentaireRenvoi"
      class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
      role="status"
    >
      {{ t("content.siteTexts.sentBackWith", { comment: draft.commentaireRenvoi }) }}
    </p>
    <SiteTextsLanguageBar
      v-model:language="language"
      v-model:preview="preview"
      :has-english="Boolean(en)"
      @add-english="addEnglish"
    />
    <p v-if="draft.anglais === 'a_mettre_a_jour'" class="text-sm text-destructive">
      {{ t("content.siteTexts.englishLateHelp") }}
    </p>

    <SiteTextsPreview v-if="preview && current" :type="detail.type" :content="codec.fromForm(current)" />
    <template v-else-if="current">
      <SiteTextsPageForm
        v-if="kind === 'page'"
        v-model="pageForm"
        :language="language"
        :locked="detail.type === 'editorial'"
      />
      <SiteTextsFaqForm v-else-if="kind === 'faq'" v-model="faqForm" :language="language" />
      <SiteTextsEmailForm v-else v-model="emailForm" :language="language" :variables="detail.variables" />
    </template>

    <SiteTextsChanges v-if="kind === 'page' && detail.publiee" :draft="codec.fromForm(fr)" :live="detail.publiee.fr" />

    <SiteTextsDraftMeta
      v-model:nature="nature"
      v-model:summary="summary"
      v-model:english-confirmed="englishConfirmed"
      :has-english="Boolean(en)"
    />

    <SiteTextsActions
      :status="draft.statut"
      :can-publish="rights.publier"
      :pending="pending"
      @save="onSave"
      @submit="onSubmit"
      @publish="onPublish"
      @send-back="onSendBack"
      @discard="onDiscard"
    />
  </div>
</template>
