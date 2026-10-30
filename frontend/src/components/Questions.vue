<template>
  <div class="contentQuest">
    <div v-if="loadingBallot" class="info-message">Загрузка...</div>

    <div v-else-if="state !== 'voting'" class="info-message">
      <p v-if="state === 'closed'">Сейчас голосование закрыто. Загляните позже!</p>
      <p v-else-if="state === 'voted'">
        Вы уже проголосовали в {{ round }} туре. Спасибо!
      </p>
      <p v-else-if="state === 'done'" class="success-message">
        Спасибо за ваш голос!
      </p>
      <div v-if="message" class="error-message">{{ message }}</div>
      <button type="button" @click="logout">Выйти</button>
    </div>

    <form v-else class="form" @submit.prevent>
      <p class="round-label">{{ round }} тур · {{ currentIndex + 1 }} из {{ nominations.length }}</p>
      <transition name="fade" mode="out-in">
        <QuestionEvent
          :key="currentNomination.id"
          :title="currentNomination.title"
          :subTitle="currentNomination.subtitle"
          :id="currentNomination.id.toString()"
          :selected="selectedValues[currentNomination.id]"
          @update:selected="updateSelected"
          :nominees="currentNomination.candidates" />
      </transition>

      <div v-if="message" class="error-message">{{ message }}</div>

      <div class="buttons">
        <button
          type="button"
          @click="previousQuestion"
          :disabled="isFirstQuestion"
          :class="{ 'disabled-button': isFirstQuestion }">
          Предыдущий вопрос
        </button>

        <button v-if="!isLastQuestion" type="button" @click="nextQuestion">
          Следующий вопрос
        </button>

        <button v-else type="button" :disabled="sending" @click="handleSubmit">
          {{ sending ? "Отправка..." : "Отправить" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import QuestionEvent from "./QuestionEvent.vue";
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { api, session, errorText, SKIP } from "../api";

const router = useRouter();
const nominations = ref([]);
const round = ref(null);
// closed | voted | voting | done
const state = ref("closed");
const selectedValues = ref({});
const currentIndex = ref(0);
const message = ref("");
const loadingBallot = ref(true);
const sending = ref(false);

const currentNomination = computed(() => nominations.value[currentIndex.value]);
const isLastQuestion = computed(() => currentIndex.value === nominations.value.length - 1);
const isFirstQuestion = computed(() => currentIndex.value === 0);

const logout = () => {
  session.clear();
  router.push("/");
};

const loadBallot = async () => {
  try {
    const { data } = await api.get("/ballot");
    round.value = data.round;
    nominations.value = data.nominations || [];
    if (data.round && data.hasVoted) state.value = "voted";
    else if (data.round && nominations.value.length > 0) state.value = "voting";
    else state.value = "closed";
  } catch (error) {
    if (error.response?.status === 401) return logout();
    message.value = errorText(error);
  } finally {
    loadingBallot.value = false;
  }
};

const updateSelected = (update) => {
  selectedValues.value[update.id] = update.value;
  message.value = "";
};

const nextQuestion = () => {
  if (!isLastQuestion.value) currentIndex.value++;
};

const previousQuestion = () => {
  if (!isFirstQuestion.value) currentIndex.value--;
};

const handleSubmit = async () => {
  const unansweredIndex = nominations.value.findIndex(
    (nom) => selectedValues.value[nom.id] == null
  );
  if (unansweredIndex !== -1) {
    currentIndex.value = unansweredIndex;
    message.value = "Пожалуйста, выберите номинанта перед отправкой.";
    return;
  }

  const choices = Object.fromEntries(
    nominations.value.map((nom) => {
      const value = selectedValues.value[nom.id];
      return [nom.id, value === SKIP ? null : value];
    })
  );

  sending.value = true;
  try {
    await api.post("/ballot", { choices });
    state.value = "done";
    message.value = "";
  } catch (error) {
    if (error.response?.status === 409) {
      state.value = "voted";
    }
    message.value = errorText(error);
  } finally {
    sending.value = false;
  }
};

onMounted(loadBallot);
</script>

<style scoped>
.error-message {
  color: red;
  margin-top: 20px;
  text-align: center;
  width: 100%;
}
.success-message {
  color: green;
}
.info-message {
  color: aliceblue;
  text-align: center;
  font-size: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.round-label {
  color: aliceblue;
  text-align: center;
  opacity: 0.8;
}
.form {
  width: 100%;
  max-width: 1200px;
  min-height: 500px;
}
.buttons {
  display: flex;
  justify-content: center;
  gap: 50px;
  margin-top: 200px;
}
.contentQuest {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 2;
}
.disabled-button {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
