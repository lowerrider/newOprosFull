<template>
  <div class="center">
    <h1 class="mainText">Новогоднее голосование от Mega-Personal!</h1>
    <EmailInput @submitted="onLogin" />
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import EmailInput from "./EmailInput.vue";

const router = useRouter();

const onLogin = (role) => {
  router.push(role === "admin" ? "/admin" : "/questions");
};
</script>

<style scoped>
.center {
  flex-direction: column;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 2;
}
</style>
