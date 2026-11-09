<template>
  <section class="step">
    <h1 class="title">{{ nomination.title }}</h1>
    <p v-if="nomination.subtitle" class="subtitle">{{ nomination.subtitle }}</p>

    <div class="picker">
      <label class="sr-only" :for="`nomination-${nomination.id}`">Выберите номинанта</label>
      <VueSelect
        class="select"
        :inputId="`nomination-${nomination.id}`"
        :modelValue="modelValue"
        :options="options"
        :isClearable="false"
        placeholder="Выберите номинанта"
        @update:modelValue="emit('update:modelValue', $event)" />
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import VueSelect from "vue3-select-component";
import { SKIP } from "@/api";

const props = defineProps({
  nomination: { type: Object, required: true },
  modelValue: [Number, String],
});
const emit = defineEmits(["update:modelValue"]);

const options = computed(() => [
  { label: "Пропустить номинацию", value: SKIP },
  ...props.nomination.candidates.map((c) => ({ label: c.name, value: c.id })),
]);
</script>

<style scoped>
.step {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.title {
  font-size: clamp(30px, 4.4vw, 60px);
  font-weight: 800;
  text-transform: uppercase;
  line-height: 1.1;
  max-width: 900px;
}
.subtitle {
  margin-top: 22px;
  max-width: 560px;
  font-size: clamp(15px, 1.6vw, 19px);
  line-height: 1.4;
  color: var(--text-soft);
}
.picker {
  margin-top: clamp(32px, 6vh, 64px);
  width: min(560px, calc(100vw - 32px));
}
.select {
  width: 100%;
  text-align: left;
  --vs-font-family: var(--font);
  --vs-font-size: 15px;
  --vs-text-color: #1d1d1d;
  --vs-input-bg: #f1f1f4;
  --vs-border: 2px solid transparent;
  --vs-border-radius: 12px;
  --vs-padding: 10px 14px;
  --vs-input-placeholder-color: #6b6b7a;
  --vs-menu-bg: #ffffff;
  --vs-menu-border: none;
  --vs-menu-box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  --vs-menu-height: 280px;
  --vs-option-text-color: #1d1d1d;
  --vs-option-hover-color: #fff1ea;
  --vs-option-focused-color: #fff1ea;
  --vs-option-selected-color: #ffe0d1;
  --vs-option-padding: 10px 14px;
  --vs-icon-color: #ff4d00;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
