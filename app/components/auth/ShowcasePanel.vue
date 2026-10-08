<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="relative hidden overflow-hidden lg:flex">
    <!--
      GOTCHA: object-bottom, not the default centre. The glass card sits over
      29-63% of the panel, and a centred crop of this portrait source puts the
      plant exactly behind it. Anchoring to the bottom lifts the subject into
      the clear space above the card.
    -->
    <NuxtImg
      src="/images/login-showcase.jpg"
      format="webp"
      quality="70"
      sizes="lg:56vw"
      alt=""
      loading="lazy"
      class="absolute inset-0 size-full object-cover object-bottom"
    />

    <!--
      GOTCHA: this scrim and the card's fill together guarantee the white text
      clears 4.5:1 over *any* photograph. Worst case is a pure-white image:
      1.0 x 0.70 x 0.55 = 0.385 composite, which linearises to ~0.1226 and
      contrasts 6.1:1 against white. Collapsing the two layers into one needs at
      least bg-black/62 to hold the bound, and the bound must not depend on
      backdrop-blur, which a browser is free to drop.
    -->
    <div class="absolute inset-0 bg-black/30" />

    <div
      class="absolute left-[20%] right-[9%] top-[46%] -translate-y-1/2 rounded-3xl border border-white/15 bg-black/45 p-10 backdrop-blur-2xl"
    >
      <Icon name="ph:circle-notch" class="size-12 text-white/70" aria-hidden="true" />

      <h2 class="mt-6 text-4xl font-heading leading-tight tracking-tight text-white text-pretty">
        {{ t("auth.showcase.headline") }}
      </h2>

      <p class="mt-6 text-[0.95rem] text-pretty leading-relaxed text-white/85">
        {{ t("auth.showcase.body") }}
      </p>
    </div>
  </section>
</template>
