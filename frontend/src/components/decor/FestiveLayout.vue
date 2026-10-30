<template>
  <div class="festive">
    <Garland corner="top-left" />
    <Garland corner="top-right" />
    <PineStar class="star-left" />
    <PineStar class="star-right" />
    <slot name="decor" />

    <main class="festive-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import Garland from "./Garland.vue";
import PineStar from "./PineStar.vue";
</script>

<style scoped>
.festive {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 35%, var(--night-2) 0%, transparent 65%),
    var(--night);
  display: flex;
}
.festive-content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(80px, 12vh, 140px) 16px clamp(160px, 26vh, 300px);
  text-align: center;
}
.star-left {
  top: clamp(40px, 7vw, 70px);
  left: clamp(90px, 10vw, 130px);
}
.star-right {
  top: clamp(24px, 4vw, 40px);
  right: clamp(110px, 12vw, 150px);
}
</style>
