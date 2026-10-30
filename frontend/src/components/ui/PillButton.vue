<template>
  <button :type="type" class="pill" :class="[variant, size]" :disabled="disabled">
    <slot />
  </button>
</template>

<script setup>
defineProps({
  // primary — оранжевая, light — светлая
  variant: { type: String, default: "primary" },
  // md | lg
  size: { type: String, default: "md" },
  type: { type: String, default: "button" },
  disabled: Boolean,
});
</script>

<style scoped>
.pill {
  border: none;
  border-radius: 999px;
  padding: 14px 30px;
  font-family: var(--font);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  /* «Ободок» вокруг кнопки, как в макете */
  box-shadow: 0 0 0 8px var(--ring);
  transition:
    transform 0.15s,
    background-color 0.15s,
    opacity 0.15s;
}
.pill:hover:not(:disabled) {
  transform: translateY(-2px);
}
.pill:active:not(:disabled) {
  transform: translateY(0);
}
.pill:focus-visible {
  outline: 3px solid var(--bulb-yellow);
  outline-offset: 10px;
}
.pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.primary {
  background: var(--orange);
  color: #fff;
}
.primary:hover:not(:disabled) {
  background: var(--orange-hover);
}
.light {
  background: #f1f1f4;
  color: #2a2a2a;
}
.light:hover:not(:disabled) {
  background: #fff;
}
.lg {
  padding: 22px 46px;
  font-size: clamp(18px, 2vw, 24px);
  font-weight: 600;
  box-shadow: 0 0 0 12px var(--ring);
}
</style>
