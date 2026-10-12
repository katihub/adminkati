<script setup lang="ts">
// fallow-ignore-file complexity -- declarative admin workspace with mutually exclusive loading, empty and decision states
import { computed, reactive, ref } from "vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLegalClosure, useLegalClosureMutations } from "@/composables/useLegalClosure"
import { LEGAL_PROOF_TYPES, type LegalProofType, type LegalSignerFunction } from "@/types/api/legal-closure"

const REQUIRED_SIGNERS: Record<LegalProofType, LegalSignerFunction[]> = {
  identite_exploitant: ["representant_legal"],
  contrats_politiques: ["representant_legal", "juriste_camerounais"],
  matrice_responsabilites: ["representant_legal", "juriste_camerounais"],
  matrice_kyc: ["juriste_camerounais", "responsable_donnees"],
  fiscalite_facturation: ["comptable_fiscaliste_camerounais"],
  encaissement_reversement: ["representant_legal", "juriste_camerounais", "comptable_fiscaliste_camerounais"],
}

const LABEL_KEYS: Record<LegalProofType, string> = {
  identite_exploitant: "operations.legalClosure.proofTypes.operatorIdentity",
  contrats_politiques: "operations.legalClosure.proofTypes.contractsPolicies",
  matrice_responsabilites: "operations.legalClosure.proofTypes.responsibilityMatrix",
  matrice_kyc: "operations.legalClosure.proofTypes.sellerKycMatrix",
  fiscalite_facturation: "operations.legalClosure.proofTypes.taxBilling",
  encaissement_reversement: "operations.legalClosure.proofTypes.collectionSettlement",
}

const SIGNER_KEYS: Record<LegalSignerFunction, string> = {
  representant_legal: "operations.legalClosure.signers.legalRepresentative",
  juriste_camerounais: "operations.legalClosure.signers.cameroonianLawyer",
  comptable_fiscaliste_camerounais: "operations.legalClosure.signers.cameroonianAccountant",
  responsable_donnees: "operations.legalClosure.signers.dataOfficer",
}

const { t, locale } = useI18n()
const query = useLegalClosure()
const { register } = useLegalClosureMutations()
const selectedType = ref<LegalProofType>(LEGAL_PROOF_TYPES[0])
const form = reactive({ version: "1.0", referenceDocument: "", empreinteSha256: "", valideLe: "", expireLe: "" })
const signerNames = reactive<Record<LegalSignerFunction, string>>({
  representant_legal: "",
  juriste_camerounais: "",
  comptable_fiscaliste_camerounais: "",
  responsable_donnees: "",
})
const signerReferences = reactive<Record<LegalSignerFunction, string>>({
  representant_legal: "",
  juriste_camerounais: "",
  comptable_fiscaliste_camerounais: "",
  responsable_donnees: "",
})
const requiredSigners = computed(() => REQUIRED_SIGNERS[selectedType.value])
const proofs = computed(() => new Map((query.data.value?.preuves ?? []).map(proof => [proof.type, proof])))
const canSubmit = computed(
  () =>
    form.version.trim() &&
    form.referenceDocument.trim() &&
    form.valideLe &&
    /^[0-9a-fA-F]{64}$/.test(form.empreinteSha256.trim()) &&
    requiredSigners.value.every(
      role =>
        signerNames[role].trim() &&
        (!["juriste_camerounais", "comptable_fiscaliste_camerounais"].includes(role) || signerReferences[role].trim()),
    ),
)

function submit() {
  if (!canSubmit.value) return
  register.mutate(
    {
      type: selectedType.value,
      version: form.version.trim(),
      referenceDocument: form.referenceDocument.trim(),
      empreinteSha256: form.empreinteSha256.trim().toLowerCase(),
      valideLe: new Date(`${form.valideLe}T12:00:00`).toISOString(),
      ...(form.expireLe ? { expireLe: new Date(`${form.expireLe}T12:00:00`).toISOString() } : {}),
      validePar: requiredSigners.value.map(fonction => ({
        fonction,
        nom: signerNames[fonction].trim(),
        ...(signerReferences[fonction].trim() ? { referenceProfessionnelle: signerReferences[fonction].trim() } : {}),
      })),
    },
    {
      onSuccess: () => {
        form.referenceDocument = ""
        form.empreinteSha256 = ""
        form.valideLe = ""
        form.expireLe = ""
        for (const role of requiredSigners.value) {
          signerNames[role] = ""
          signerReferences[role] = ""
        }
      },
    },
  )
}

function requiresProfessionalReference(role: LegalSignerFunction) {
  return role === "juriste_camerounais" || role === "comptable_fiscaliste_camerounais"
}
</script>

<template>
  <div
    class="min-h-0 flex-1 overflow-y-auto border-t border-border bg-muted/60"
    data-testid="operations-legal-closure-workspace"
  >
    <div class="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section class="space-y-4">
        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {{ t("operations.legalClosure.authorization") }}
              </p>
              <h2 class="mt-1 font-heading text-xl font-semibold">{{ t("operations.legalClosure.title") }}</h2>
            </div>
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold"
              :class="query.data.value?.close ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
            >
              {{
                query.data.value?.close ? t("operations.legalClosure.authorized") : t("operations.legalClosure.blocked")
              }}
            </span>
          </div>
          <p class="mt-3 max-w-3xl text-sm text-muted-foreground">{{ t("operations.legalClosure.explanation") }}</p>
          <ApiErrorCard
            v-if="query.error.value"
            class="mt-4"
            :error="query.error.value"
            @retry="() => void query.refetch()"
          />
          <div v-else-if="query.isPending.value" class="mt-4 h-24 animate-pulse rounded-lg bg-muted" />
          <ul v-else-if="query.data.value?.bloquants.length" class="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <li
              v-for="item in query.data.value.bloquants"
              :key="item"
              class="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-red-800"
            >
              <Icon name="ph:warning-circle" class="mt-0.5 shrink-0" /><span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <article v-for="type in LEGAL_PROOF_TYPES" :key="type" class="rounded-xl border bg-card p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <h3 class="font-heading text-sm font-semibold">{{ t(LABEL_KEYS[type]) }}</h3>
              <Icon
                :name="proofs.has(type) ? 'ph:check-circle-fill' : 'ph:circle-dashed'"
                :class="proofs.has(type) ? 'text-emerald-600' : 'text-muted-foreground'"
              />
            </div>
            <template v-if="proofs.get(type)"
              ><p class="mt-3 text-sm font-medium">{{ proofs.get(type)?.referenceDocument }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{
                  t("operations.legalClosure.validatedVersion", {
                    version: proofs.get(type)?.version,
                    date: new Date(proofs.get(type)!.valideLe).toLocaleDateString(locale),
                  })
                }}
              </p>
              <p
                class="mt-2 truncate font-mono text-[10px] text-muted-foreground"
                :title="proofs.get(type)?.empreinteSha256"
              >
                {{ t("operations.legalClosure.sha256") }} {{ proofs.get(type)?.empreinteSha256 }}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">
                {{
                  proofs
                    .get(type)
                    ?.validePar.map(item => item.nom)
                    .join(" · ")
                }}
              </p></template
            >
            <p v-else class="mt-3 text-sm text-muted-foreground">{{ t("operations.legalClosure.noProof") }}</p>
          </article>
        </div>
      </section>

      <aside class="h-fit rounded-xl border bg-card p-5 shadow-sm xl:sticky xl:top-4">
        <h2 class="font-heading text-lg font-semibold">{{ t("operations.legalClosure.registerTitle") }}</h2>
        <p class="mt-1 text-xs text-muted-foreground">{{ t("operations.legalClosure.appendOnly") }}</p>
        <form class="mt-5 space-y-4" @submit.prevent="submit">
          <label class="block text-sm font-medium"
            >{{ t("operations.legalClosure.document")
            }}<select
              v-model="selectedType"
              class="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option v-for="type in LEGAL_PROOF_TYPES" :key="type" :value="type">{{ t(LABEL_KEYS[type]) }}</option>
            </select></label
          >
          <div class="grid grid-cols-2 gap-3">
            <label class="block text-sm font-medium"
              >{{ t("operations.legalClosure.version") }}<Input v-model="form.version" class="mt-1.5" required /></label
            ><label class="block text-sm font-medium"
              >{{ t("operations.legalClosure.validatedOn")
              }}<Input v-model="form.valideLe" type="date" class="mt-1.5" required
            /></label>
          </div>
          <label class="block text-sm font-medium"
            >{{ t("operations.legalClosure.documentReference")
            }}<Input
              v-model="form.referenceDocument"
              class="mt-1.5"
              :placeholder="t('operations.legalClosure.documentReferencePlaceholder')"
              required
          /></label>
          <label class="block text-sm font-medium"
            >{{ t("operations.legalClosure.sha256Fingerprint")
            }}<Input
              v-model="form.empreinteSha256"
              class="mt-1.5 font-mono text-xs"
              maxlength="64"
              :placeholder="t('operations.legalClosure.sha256Placeholder')"
              required
          /></label>
          <label class="block text-sm font-medium"
            >{{ t("operations.legalClosure.optionalExpiry") }}<Input v-model="form.expireLe" type="date" class="mt-1.5"
          /></label>
          <fieldset v-for="role in requiredSigners" :key="role" class="rounded-lg border p-3">
            <legend class="px-1 text-xs font-semibold">{{ t(SIGNER_KEYS[role]) }}</legend>
            <Input
              v-model="signerNames[role]"
              class="mt-1"
              :placeholder="t('operations.legalClosure.fullName')"
              required
            /><Input
              v-model="signerReferences[role]"
              class="mt-2"
              :placeholder="
                requiresProfessionalReference(role)
                  ? t('operations.legalClosure.professionalReference')
                  : t('operations.legalClosure.optionalProfessionalReference')
              "
              :required="requiresProfessionalReference(role)"
            />
          </fieldset>
          <p v-if="register.error.value" class="text-sm text-destructive">
            {{ t("operations.legalClosure.saveError") }}
          </p>
          <Button type="submit" class="w-full" :disabled="!canSubmit || register.isPending.value"
            ><Icon name="ph:seal-check" />{{
              register.isPending.value ? t("operations.legalClosure.saving") : t("operations.legalClosure.seal")
            }}</Button
          >
        </form>
      </aside>
    </div>
  </div>
</template>
