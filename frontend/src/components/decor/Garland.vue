<template>
  <svg class="garland" :class="corner" viewBox="0 0 320 170" aria-hidden="true">
    <path :d="path" fill="none" stroke="#fff" stroke-width="1.6" />
    <circle
      v-for="(bulb, i) in bulbs"
      :key="i"
      :cx="bulb.x"
      :cy="bulb.y"
      :r="bulb.r"
      :fill="bulb.color"
      class="bulb"
      :style="{ animationDelay: `${i * 0.45}s` }" />
  </svg>
</template>

<script setup>
// Гирлянда-дуга с огоньками для углов страницы
defineProps({
  // top-left | top-right | bottom-left
  corner: { type: String, default: "top-left" },
});

const P0 = { x: 0, y: 150 };
const P1 = { x: 190, y: 120 };
const P2 = { x: 260, y: 0 };
const path = `M${P0.x} ${P0.y} Q${P1.x} ${P1.y} ${P2.x} ${P2.y}`;

const colors = ["var(--bulb-yellow)", "var(--bulb-red)", "var(--bulb-blue)", "var(--bulb-yellow)"];
const bulbs = [0.12, 0.42, 0.72, 0.93].map((t, i) => ({
  x: (1 - t) ** 2 * P0.x + 2 * (1 - t) * t * P1.x + t ** 2 * P2.x,
  y: (1 - t) ** 2 * P0.y + 2 * (1 - t) * t * P1.y + t ** 2 * P2.y,
  r: i === 1 ? 7 : 4.5,
  color: colors[i],
}));
</script>

<style scoped>
.garland {
  position: absolute;
  width: clamp(170px, 24vw, 320px);
  pointer-events: none;
}
.top-left {
  top: 0;
  left: 0;
}
.top-right {
  top: 0;
  right: 0;
  transform: scaleX(-1);
}
.bottom-left {
  bottom: 0;
  left: 0;
  transform: scaleY(-1);
}
.bulb {
  animation: twinkle 3.2s ease-in-out infinite;
}
@keyframes twinkle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
@media (prefers-reduced-motion: reduce) {
  .bulb {
    animation: none;
  }
}
</style>
