<script setup lang="ts">
import type { CustomerProfile } from "@/types/api/clients"

const { profile } = defineProps<{
  profile: CustomerProfile
}>()

const { t } = useI18n()
</script>

<template>
  <section class="p-4 sm:p-6" data-testid="users-profile-section">
    <div class="flex items-center gap-2">
      <Icon name="ph:identification-card" size="18" class="text-primary" aria-hidden="true" />
      <h3 class="font-heading text-lg font-semibold text-foreground">
        {{ t("users.detail.profile") }}
      </h3>
    </div>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.name") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ profile.nom }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.phone") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ profile.telephone || t("users.detail.noValue") }}
        </dd>
      </div>
      <!--
        LE SECOND NUMÉRO EXISTAIT DÉJÀ DANS LA RÉPONSE. `telephoneSecours` est
        renvoyé par `GET /clients/:id` et sert même à la recherche de l'annuaire
        (`listerAnnuaire` interroge `telephoneSecoursChiffres`) : il était donc
        cherchable sans être affichable. C'est le numéro qu'on compose quand le
        premier ne répond pas.
      -->
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.backupPhone") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground" data-testid="users-profile-backup-phone">
          {{ profile.telephoneSecours || t("users.detail.noValue") }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.city") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground" data-testid="users-profile-city">
          {{ profile.ville || t("users.detail.noValue") }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.counter") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ profile.comptoirPrefere || t("users.detail.noValue") }}
        </dd>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3">
        <dt class="text-xs text-muted-foreground">
          {{ t("users.detail.company") }}
        </dt>
        <dd class="mt-0.5 font-medium text-foreground">
          {{ profile.raisonSociale || t("users.detail.noValue") }}
        </dd>
      </div>
    </dl>
  </section>
</template>
