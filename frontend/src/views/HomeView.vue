<template>
  <FestiveLayout>
    <template #decor>
      <img class="santa" :src="santa" alt="" />
      <img class="deer" :src="deer" alt="" />
    </template>

    <h1 class="title">Новогоднее голосование<br />от Mega-Personal!</h1>

    <Transition name="swap" mode="out-in">
      <PillButton v-if="!showLogin" size="lg" class="cta" @click="start">
        Перейти к вопросам
      </PillButton>
      <LoginForm v-else class="form" @success="onLogin" />
    </Transition>
  </FestiveLayout>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { session } from "@/api";
import FestiveLayout from "@/components/decor/FestiveLayout.vue";
import PillButton from "@/components/ui/PillButton.vue";
import LoginForm from "@/components/auth/LoginForm.vue";
import santa from "@/assets/illustrations/santa-phone.svg";
import deer from "@/assets/illustrations/deer.svg";

const router = useRouter();
const showLogin = ref(false);

const routeFor = (role) => (role === "admin" ? "/admin" : "/vote");

// Если уже вошли в этой вкладке, сразу переходим к голосованию
const start = () => {
  if (session.role) router.push(routeFor(session.role));
  else showLogin.value = true;
};

const onLogin = (role) => router.push(routeFor(role));
</script>

<style scoped>
.title {
  font-size: clamp(30px, 4.6vw, 64px);
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: clamp(48px, 9vh, 110px);
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.35);
}
.santa,
.deer {
  position: absolute;
  bottom: 0;
  z-index: 1;
  pointer-events: none;
  user-select: none;
}
.santa {
  left: clamp(-30px, 1vw, 40px);
  height: min(62vh, 560px);
  animation: wave 6s ease-in-out infinite;
  transform-origin: bottom center;
}
.deer {
  right: clamp(0px, 4vw, 80px);
  height: min(48vh, 400px);
}
@keyframes wave {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(-2deg);
  }
}
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
@media (max-width: 900px) {
  .santa {
    height: 34vh;
    left: -40px;
    opacity: 0.9;
  }
  .deer {
    height: 26vh;
    right: -20px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .santa {
    animation: none;
  }
}
</style>
