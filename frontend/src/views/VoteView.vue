<template>
  <FestiveLayout>
    <template #decor>
      <Garland corner="bottom-left" />
      <PineStar class="star-bottom" />
      <img v-if="state === 'voting' || state === 'review'" class="car" :src="car" alt="" />
      <img v-else class="deer" :src="deer" alt="" />
      <button type="button" class="logout" @click="logout">Выйти</button>
    </template>

    <p v-if="state === 'loading'" class="lead">Загрузка...</p>

    <!-- Голосование по шагам -->
    <template v-else-if="state === 'voting'">
      <VoteProgress
        class="progress"
        :round="round"
        :current="index"
        :total="nominations.length"
        :answered="nominations.map((n) => choices[n.id] != null)"
        @go="index = $event" />

      <Transition :name="direction" mode="out-in">
        <NominationStep :key="current.id" :nomination="current" v-model="choices[current.id]" />
      </Transition>

      <p class="error" role="alert">{{ message }}</p>

      <div class="actions">
        <PillButton variant="light" :disabled="index === 0" @click="go(-1)">Предыдущий вопрос</PillButton>
        <PillButton @click="next">
          {{ index === nominations.length - 1 ? "Проверить выбор" : "Следующий вопрос" }}
        </PillButton>
      </div>
    </template>

    <!-- Проверка перед отправкой -->
    <template v-else-if="state === 'review'">
      <h1 class="headline">Проверьте ваш выбор</h1>
      <ul class="summary">
        <li v-for="(n, i) in nominations" :key="n.id">
          <span class="summary-title">{{ n.title }}</span>
          <span class="summary-choice">{{ choiceName(n) }}</span>
          <button type="button" class="link" @click="edit(i)">изменить</button>
        </li>
      </ul>
      <p class="error" role="alert">{{ message }}</p>
      <div class="actions">
        <PillButton variant="light" @click="edit(nominations.length - 1)">Назад</PillButton>
        <PillButton :disabled="sending" @click="submit">
          {{ sending ? "Отправляем..." : "Отправить голос" }}
        </PillButton>
      </div>
    </template>

    <!-- Итоговые экраны -->
    <template v-else>
      <h1 class="headline">{{ final.title }}</h1>
      <p class="lead">{{ final.text }}</p>
      <p v-if="message" class="error" role="alert">{{ message }}</p>
    </template>
  </FestiveLayout>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { api, session, errorText, SKIP } from "@/api";
import FestiveLayout from "@/components/decor/FestiveLayout.vue";
import Garland from "@/components/decor/Garland.vue";
import PineStar from "@/components/decor/PineStar.vue";
import PillButton from "@/components/ui/PillButton.vue";
import NominationStep from "@/components/vote/NominationStep.vue";
import VoteProgress from "@/components/vote/VoteProgress.vue";
import car from "@/assets/illustrations/car.svg";
import deer from "@/assets/illustrations/deer.svg";

const router = useRouter();

// loading | closed | voted | voting | review | done
const state = ref("loading");
const round = ref(null);
const nominations = ref([]);
const choices = ref({});
const index = ref(0);
const direction = ref("forward");
const message = ref("");
const sending = ref(false);

const current = computed(() => nominations.value[index.value]);

const final = computed(
  () =>
    ({
      done: {
        title: "Спасибо, ваш голос учтён!",
        text:
          round.value === 1
            ? "Три лидера каждой номинации пройдут во второй тур. Мы пришлём письмо, когда он начнётся."
            : "Итоги объявим на новогоднем празднике. До встречи!",
      },
      voted: {
        title: "Вы уже проголосовали",
        text: `Ваш голос в ${round.value} туре учтён. Спасибо!`,
      },
      closed: {
        title: "Голосование сейчас закрыто",
        text: "Загляните позже: мы пришлём письмо, когда начнётся следующий тур.",
      },
    })[state.value] || { title: "", text: "" }
);

const logout = () => {
  session.clear();
  router.push("/");
};

const load = async () => {
  try {
    const { data } = await api.get("/ballot");
    round.value = data.round;
    nominations.value = data.nominations || [];
    if (data.round && data.hasVoted) state.value = "voted";
    else if (data.round && nominations.value.length) state.value = "voting";
    else state.value = "closed";
  } catch (e) {
    if (e.response?.status === 401) return logout();
    message.value = errorText(e);
    state.value = "closed";
  }
};

const go = (delta) => {
  direction.value = delta > 0 ? "forward" : "back";
  index.value += delta;
  message.value = "";
};

const next = () => {
  if (choices.value[current.value.id] == null) {
    message.value = "Выберите номинанта или «Пропустить номинацию».";
    return;
  }
  if (index.value < nominations.value.length - 1) go(1);
  else {
    message.value = "";
    state.value = "review";
  }
};

const edit = (i) => {
  direction.value = "back";
  index.value = i;
  state.value = "voting";
};

const choiceName = (n) => {
  const value = choices.value[n.id];
  if (value === SKIP) return "пропущено";
  return n.candidates.find((c) => c.id === value)?.name || "не выбрано";
};

const submit = async () => {
  sending.value = true;
  message.value = "";
  try {
    const payload = Object.fromEntries(
      nominations.value.map((n) => [n.id, choices.value[n.id] === SKIP ? null : choices.value[n.id]])
    );
    await api.post("/ballot", { choices: payload });
    state.value = "done";
  } catch (e) {
    if (e.response?.status === 409) state.value = "voted";
    message.value = errorText(e);
  } finally {
    sending.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.progress {
  margin-bottom: clamp(28px, 5vh, 48px);
}
.actions {
  display: flex;
  gap: clamp(24px, 4vw, 40px);
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}
.error {
  min-height: 24px;
  margin: 18px 0 14px;
  color: var(--danger);
  font-size: 15px;
}
.headline {
  font-size: clamp(28px, 4vw, 52px);
  font-weight: 800;
  line-height: 1.15;
  max-width: 820px;
}
.lead {
  margin-top: 20px;
  max-width: 560px;
  font-size: clamp(16px, 1.7vw, 20px);
  line-height: 1.45;
  color: var(--text-soft);
}
.summary {
  list-style: none;
  padding: 0;
  margin: 32px 0 0;
  width: min(620px, 100%);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.summary li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 16px;
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(27, 35, 71, 0.85);
}
.summary-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--bulb-yellow);
  text-transform: uppercase;
}
.summary-choice {
  grid-column: 1;
  font-size: 16px;
}
.link {
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: center;
  background: none;
  border: none;
  color: var(--text-soft);
  text-decoration: underline;
  cursor: pointer;
}
.link:hover {
  color: #fff;
}
.logout {
  position: absolute;
  top: 18px;
  right: 50%;
  transform: translateX(50%);
  z-index: 3;
  background: none;
  border: none;
  color: var(--text-soft);
  font-size: 14px;
  cursor: pointer;
}
.logout:hover {
  color: #fff;
}
.car,
.deer {
  position: absolute;
  bottom: 0;
  right: clamp(0px, 4vw, 70px);
  z-index: 1;
  pointer-events: none;
}
.car {
  height: min(36vh, 300px);
  animation: drive 1.2s ease-out both;
}
.deer {
  height: min(44vh, 380px);
}
.star-bottom {
  bottom: clamp(70px, 14vh, 130px);
  left: clamp(150px, 18vw, 260px);
}
@keyframes drive {
  from {
    transform: translateX(60%);
    opacity: 0;
  }
}
.forward-enter-active,
.forward-leave-active,
.back-enter-active,
.back-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}
.forward-enter-from,
.back-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
.forward-leave-to,
.back-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}
@media (max-width: 760px) {
  .car {
    height: 20vh;
    opacity: 0.85;
  }
  .deer {
    height: 24vh;
  }
  .actions {
    gap: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .car {
    animation: none;
  }
}
</style>
