<template>
  <div class="progress" :aria-label="`Номинация ${current + 1} из ${total}`">
    <span class="round">{{ round === 2 ? "Финал · 2 тур" : "1 тур" }}</span>
    <div class="dots">
      <button
        v-for="i in total"
        :key="i"
        type="button"
        class="dot"
        :class="{ active: i - 1 === current, done: answered[i - 1] }"
        :title="`Номинация ${i}`"
        @click="emit('go', i - 1)" />
    </div>
    <span class="count">{{ Math.min(current + 1, total) }} / {{ total }}</span>
  </div>
</template>

<script setup>
defineProps({
  round: Number,
  current: Number,
  total: Number,
  // answered[i] — выбран ли номинант в i-й номинации
  answered: Array,
});
const emit = defineEmits(["go"]);
</script>

<style scoped>
.progress {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--text-soft);
  font-size: 14px;
}
.round {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--ring);
  color: #fff;
  font-weight: 600;
}
.dots {
  display: flex;
  gap: 8px;
}
.dot {
  width: 12px;
  height: 12px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.dot.done {
  background: var(--bulb-yellow);
  border-color: var(--bulb-yellow);
}
.dot.active {
  background: var(--bulb-red);
  border-color: var(--bulb-red);
  box-shadow: 0 0 10px var(--bulb-red);
  transform: scale(1.25);
}
</style>
