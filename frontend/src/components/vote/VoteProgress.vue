<template>
  <div class="progress" role="group" :aria-label="`Номинация ${current + 1} из ${total}`">
    <span class="round">{{ round === 2 ? "Финал · 2 тур" : "1 тур" }}</span>
    <nav class="dots" aria-label="Переход между номинациями">
      <button
        v-for="i in total"
        :key="i"
        type="button"
        class="dot"
        :class="{ active: i - 1 === current, done: answered[i - 1] }"
        :title="dotLabel(i - 1)"
        :aria-label="dotLabel(i - 1)"
        :aria-current="i - 1 === current ? 'step' : undefined"
        @click="emit('go', i - 1)">
        <span aria-hidden="true" />
      </button>
    </nav>
    <span class="count">{{ Math.min(current + 1, total) }} / {{ total }}</span>
  </div>
</template>

<script setup>
const props = defineProps({
  round: Number,
  current: Number,
  total: Number,
  labels: { type: Array, default: () => [] },
  // answered[i] — выбран ли номинант в i-й номинации
  answered: { type: Array, default: () => [] },
});
const emit = defineEmits(["go"]);

const dotLabel = (index) => {
  const title = props.labels[index] || `Номинация ${index + 1}`;
  return `${title}: ${props.answered[index] ? "ответ выбран" : "ответ не выбран"}`;
};
</script>

<style scoped>
.progress {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
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
  max-width: min(70vw, 620px);
  overflow-x: auto;
  scrollbar-width: thin;
}
.dot {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.dot span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.62);
  background: transparent;
  transition:
    transform 0.2s,
    background-color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}
.dot.done span {
  background: var(--bulb-yellow);
  border-color: var(--bulb-yellow);
}
.dot.active span {
  background: var(--bulb-red);
  border-color: var(--bulb-red);
  box-shadow: 0 0 10px var(--bulb-red);
  transform: scale(1.25);
}
.dot:focus-visible {
  outline: 3px solid var(--bulb-yellow);
  outline-offset: -4px;
}
</style>
