<template>
  <svg class="star" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 0 C35 22 42 29 64 32 C42 35 35 42 32 64 C29 42 22 35 0 32 C22 29 29 22 32 0Z" fill="var(--pine)" />
  </svg>
</template>

<style scoped>
.star {
  position: absolute;
  width: clamp(36px, 5vw, 64px);
  pointer-events: none;
}
</style>
