<script setup>
import { ref } from "vue";
import { api, session, errorText } from "../api";

const emit = defineEmits(["submitted"]);
const email = ref("");
const password = ref("");
const errorMessage = ref("");
const loading = ref(false);

const submit = async () => {
  if (!email.value.trim() || !password.value) {
    errorMessage.value = "Введите email и пароль.";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    const { data } = await api.post("/auth/login", {
      email: email.value.trim(),
      password: password.value,
    });
    session.save(data.token, data.role);
    emit("submitted", data.role);
  } catch (error) {
    errorMessage.value = errorText(error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <form class="email-input-container" @submit.prevent="submit">
    <h2 class="title">Введите ваш Email и пароль</h2>
    <input
      v-model="email"
      type="email"
      autocomplete="username"
      placeholder="example@mail.com"
      class="email-input" />
    <input
      v-model="password"
      type="password"
      autocomplete="current-password"
      placeholder="Введите пароль"
      class="email-input" />
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <button type="submit" :disabled="loading" class="submit-button">
      {{ loading ? "Вход..." : "Войти" }}
    </button>
  </form>
</template>

<style scoped>
.email-input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 400px;
  width: 100%;
  margin: 0 auto;
}

.title {
  margin-bottom: 20px;
  font-size: 24px;
  text-align: center;
}

.email-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 20px;
  font-size: 16px;
}

.error-message {
  color: red;
  margin-bottom: 10px;
}

.submit-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 40px;
  font-size: 16px;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>
