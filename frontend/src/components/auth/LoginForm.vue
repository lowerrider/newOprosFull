<template>
  <form class="login" @submit.prevent="submit">
    <p class="hint">Логин и пароль пришли вам на почту</p>
    <input
      v-model="email"
      type="email"
      autocomplete="username"
      placeholder="Email"
      aria-label="Email"
      required />
    <input
      v-model="password"
      type="password"
      autocomplete="current-password"
      placeholder="Пароль"
      aria-label="Пароль"
      required />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <PillButton type="submit" :disabled="loading" class="submit">
      {{ loading ? "Входим..." : "Войти" }}
    </PillButton>
  </form>
</template>

<script setup>
import { ref } from "vue";
import { api, session, errorText } from "@/api";
import PillButton from "@/components/ui/PillButton.vue";

const emit = defineEmits(["success"]);
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const submit = async () => {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await api.post("/auth/login", {
      email: email.value.trim(),
      password: password.value,
    });
    session.save(data.token, data.role);
    emit("success", data.role);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login {
  width: min(380px, 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 26px 24px 30px;
  border-radius: 24px;
  background: rgba(27, 35, 71, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}
.hint {
  color: var(--text-soft);
  font-size: 14px;
  margin-bottom: 4px;
}
input {
  width: 100%;
  padding: 14px 18px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: #f1f1f4;
  color: #1d1d1d;
  font-size: 16px;
}
input:focus {
  outline: none;
  border-color: var(--orange);
}
.error {
  color: var(--danger);
  font-size: 14px;
}
.submit {
  margin-top: 14px;
  align-self: center;
  min-width: 180px;
}
</style>
