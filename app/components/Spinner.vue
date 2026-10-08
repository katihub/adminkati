<script setup lang="ts">
const { size = "md", label } = defineProps<{
  size?: "xs" | "sm" | "md" | "lg"
  label?: string
}>()

/** Outer diameter per size, in px. `md` is 20px, which is what the icon this replaced occupied. */
const diameter = {
  xs: "12px",
  sm: "14px",
  md: "20px",
  lg: "34px",
}
</script>

<template>
  <div
    class="ld-quad"
    :style="{ '--ld-size': diameter[size] }"
    :role="label ? 'status' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
    data-testid="spinner"
  >
    <i /><i /><i /><i />
  </div>
</template>

<style scoped>
/*
  Everything inside is measured in `cqw` (1% of this element's width), and the
  element is its own size container. Dot size, orbit radius and breathing depth
  are therefore fixed fractions of the diameter, so the shape is identical at
  10px or 100px and `--ld-size` is the only number that ever changes.

  GOTCHA: the keyframes are not called `spin`. Tailwind v4 already defines a
  global `@keyframes spin` for `animate-spin` (node_modules/tailwindcss/theme.css),
  and a second definition under that name would be a coin toss between them.
*/
.ld-quad {
  --ld-slow: 1;
  position: relative;
  display: inline-block;
  flex: none;
  width: var(--ld-size);
  height: var(--ld-size);
  container-type: size;
  color: inherit;
  animation: ld-quad-turn calc(1.3s * var(--ld-slow)) cubic-bezier(0.65, 0.1, 0.35, 0.9) infinite;
}

.ld-quad i {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 24cqw;
  height: 24cqw;
  border-radius: 50%;
  background: currentColor;
  opacity: var(--o);
  transform: rotate(var(--a)) translateY(-34cqw);
  animation: ld-quad-breathe calc(1.3s * var(--ld-slow)) ease-in-out infinite;
}

.ld-quad i:nth-child(1) {
  --a: 0deg;
  --o: 1;
}
.ld-quad i:nth-child(2) {
  --a: 90deg;
  --o: 0.7;
}
.ld-quad i:nth-child(3) {
  --a: 180deg;
  --o: 0.45;
}
.ld-quad i:nth-child(4) {
  --a: 270deg;
  --o: 0.2;
}

@keyframes ld-quad-turn {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ld-quad-breathe {
  0%,
  100% {
    transform: rotate(var(--a)) translateY(-36cqw);
  }
  50% {
    transform: rotate(var(--a)) translateY(-20cqw);
  }
}

/*
  Slowed rather than stopped: this is the only signal that work is still in
  flight, so removing the motion entirely would remove the message.
*/
@media (prefers-reduced-motion: reduce) {
  .ld-quad {
    --ld-slow: 2.2;
  }
}
</style>
