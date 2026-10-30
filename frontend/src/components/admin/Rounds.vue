<template>
  <section>
    <div class="page-head">
      <div>
        <h1>
          {{ round }} тур
          <span class="badge" :class="status">{{ statusText[status] }}</span>
        </h1>
        <p class="muted">{{ description }}</p>
      </div>
      <div class="row" style="margin: 0">
        <button v-if="status === 'draft' && canEdit" type="button" class="big" :disabled="!readyToOpen" @click="openRound">
          Открыть голосование
        </button>
        <button v-if="status === 'open'" type="button" class="big danger" @click="closeRound">
          Завершить голосование
        </button>
        <button v-if="round === 1 && status === 'closed'" type="button" class="big" @click="emit('go', 'round2')">
          Перейти ко 2 туру →
        </button>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <!-- ===== Подготовка тура ===== -->
    <template v-if="status === 'draft'">
      <div v-if="round === 1 && (!state.participants.length || !state.nominations.length)" class="alert info">
        Сначала добавьте
        <a href="#" @click.prevent="emit('go', state.participants.length ? 'nominations' : 'participants')">
          {{ state.participants.length ? "номинации" : "участников" }}
        </a>.
      </div>

      <div v-else-if="round === 2 && round1Status !== 'closed'" class="alert info">
        Второй тур формируется из лидеров первого. Сначала завершите
        <a href="#" @click.prevent="emit('go', 'round1')">1 тур</a>.
      </div>

      <template v-else>
        <div class="card toolbar-card">
          <template v-if="round === 1">
            <div>
              <b>Кого можно выбрать в каждой номинации</b>
              <div class="muted">
                Обычно это почти все участники: нажмите кнопку, а потом в нужных номинациях снимите
                галочки с тех, кто не участвует.
              </div>
            </div>
            <button type="button" :disabled="!state.participants.length" @click="fillAll">
              Все участники во все номинации
            </button>
          </template>
          <template v-else>
            <div>
              <b>Финалисты</b>
              <div class="muted">
                Топ-3 каждой номинации из 1 тура. При ничьей на 3-м месте проходят все с тем же
                числом голосов. Состав можно поправить вручную.
              </div>
            </div>
            <button type="button" @click="generate">
              {{ hasCandidates ? "Пересобрать из итогов 1 тура" : "Сформировать из итогов 1 тура" }}
            </button>
          </template>
        </div>

        <div class="accordion">
          <div v-for="n in state.nominations" :key="n.id" class="acc-item" :class="{ open: openId === n.id }">
            <button type="button" class="acc-head" @click="toggleOpen(n)">
              <span class="acc-title">{{ n.title }}</span>
              <span class="acc-meta">
                <span v-if="isDirty(n)" class="badge warn">не сохранено</span>
                <span class="badge" :class="{ warn: !draft[n.id].length, closed: draft[n.id].length }">
                  {{ round === 1 ? `${draft[n.id].length} из ${pool(n).length}` : finalistsText(draft[n.id].length) }}
                </span>
                <span class="chevron">{{ openId === n.id ? "▴" : "▾" }}</span>
              </span>
            </button>
            <div v-if="openId === n.id" class="acc-body">
              <p v-if="round === 1 && excludedNames(n).length && excludedNames(n).length <= 15" class="muted">
                Не участвуют: {{ excludedNames(n).join(", ") }}
              </p>
              <CandidatePicker
                v-model="draft[n.id]"
                :participants="pool(n)"
                :copySources="round === 1 ? copySources(n) : []"
                :initialFilter="round === 2 ? 'selected' : 'all'" />
              <div class="row" style="margin: 12px 0 0">
                <button type="button" :disabled="!isDirty(n)" @click="saveCandidates(n)">Сохранить</button>
                <button type="button" class="secondary" :disabled="!isDirty(n)" @click="resetDraft(n)">
                  Отменить изменения
                </button>
                <span v-if="savedId === n.id" class="ok">Сохранено ✓</span>
              </div>
            </div>
          </div>
        </div>

        <p v-if="!readyToOpen && state.nominations.length" class="muted">
          Чтобы открыть голосование, в каждой номинации должен быть хотя бы один номинант и все
          изменения должны быть сохранены.
        </p>
      </template>
    </template>

    <!-- ===== Идёт или завершено ===== -->
    <template v-else-if="results">
      <div class="card progress-card">
        <div class="progress-top">
          <div>
            <div class="big-number">{{ results.voted }} <span>из {{ results.voters }}</span></div>
            <div class="muted">проголосовали</div>
          </div>
          <div class="row" style="margin: 0">
            <button type="button" class="secondary" @click="toggleMissing">
              {{ missing ? "Скрыть" : "Кто ещё не проголосовал" }}
            </button>
            <button type="button" class="secondary" @click="exportResults">Скачать CSV</button>
            <button type="button" class="secondary" @click="loadResults">Обновить</button>
          </div>
        </div>
        <div class="bar"><div class="bar-fill" :style="{ width: percent(results.voted, results.voters) }"></div></div>
        <ul v-if="missing" class="missing">
          <li v-for="m in missing" :key="m.id">{{ m.name }} <span class="muted">{{ m.email }}</span></li>
          <li v-if="!missing.length" class="muted">Проголосовали все 🎉</li>
        </ul>
      </div>

      <div class="results-grid">
        <div v-for="n in results.nominations" :key="n.id" class="card">
          <h2>{{ n.title }}</h2>
          <div
            v-for="(row, i) in n.results.slice(0, showAll[n.id] ? undefined : 10)"
            :key="row.id"
            class="result-row"
            :class="{ leader: isLeader(n, row) }">
            <span class="place">{{ i + 1 }}</span>
            <span class="name">{{ row.name }}</span>
            <span class="votes">{{ row.votes }}</span>
            <div class="result-bar" :style="{ width: percent(row.votes, maxVotes(n)) }"></div>
          </div>
          <div class="row" style="margin: 8px 0 0">
            <button v-if="n.results.length > 10" type="button" class="ghost" @click="showAll[n.id] = !showAll[n.id]">
              {{ showAll[n.id] ? "Свернуть" : `Показать всех (${n.results.length})` }}
            </button>
            <span v-if="n.skipped" class="muted">Пропустили: {{ n.skipped }}</span>
          </div>
        </div>
      </div>
      <p class="muted">
        {{ round === 1 ? "Выделены те, кто проходит во 2 тур." : "Выделен победитель." }}
      </p>
    </template>

    <div v-if="round === 2" class="card danger-zone">
      <div>
        <b>Новое голосование</b>
        <div class="muted">Удаляет все голоса и номинантов обоих туров. Участники и номинации остаются.</div>
      </div>
      <button type="button" class="danger" @click="reset">Сбросить голосование</button>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from "vue";
import { api, errorText } from "../../api";
import { downloadCsv } from "./csv";
import { state, reload, roundStatus, statusText } from "./store";
import CandidatePicker from "./CandidatePicker.vue";

const props = defineProps({ round: { type: Number, required: true } });
const emit = defineEmits(["go"]);

const error = ref("");
const openId = ref(null);
const savedId = ref(null);
const results = ref(null);
const missing = ref(null);
const showAll = reactive({});
// Черновик номинантов по номинациям, сохранённый вариант — в state.nominations
const draft = reactive({});

const status = computed(() => roundStatus(props.round));
const round1Status = computed(() => roundStatus(1));
const canEdit = computed(() => props.round === 1 || round1Status.value === "closed");

const description = computed(() => {
  if (status.value === "open") return "Участники голосуют. Результаты обновляются автоматически.";
  if (status.value === "closed") return "Голосование завершено, итоги ниже.";
  return props.round === 1
    ? "Выберите номинантов для каждой номинации и откройте голосование."
    : "Проверьте финалистов и откройте второй тур.";
});

const saved = (n) => n.candidates[props.round].map((c) => c.id);
const key = (ids) => [...ids].sort((a, b) => a - b).join(",");
const isDirty = (n) => key(draft[n.id] || []) !== key(saved(n));

const syncDraft = () => {
  for (const n of state.nominations) draft[n.id] = saved(n);
};
watch(() => state.nominations, syncDraft, { immediate: true });

const hasCandidates = computed(() => state.nominations.some((n) => saved(n).length));
const readyToOpen = computed(
  () =>
    state.nominations.length > 0 &&
    state.nominations.every((n) => saved(n).length > 0 && !isDirty(n))
);

// Во 2 туре выбираем из номинантов 1 тура этой номинации
const pool = (n) => {
  if (props.round === 1) return state.participants;
  const ids = new Set([...n.candidates[1].map((c) => c.id), ...draft[n.id]]);
  return state.participants.filter((p) => ids.has(p.id));
};

const excludedNames = (n) => {
  const chosen = new Set(draft[n.id]);
  return pool(n).filter((p) => !chosen.has(p.id)).map((p) => p.name);
};

const copySources = (n) =>
  state.nominations
    .filter((other) => other.id !== n.id && draft[other.id]?.length)
    .map((other) => ({ key: String(other.id), title: other.title, ids: draft[other.id] }));

const finalistsText = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "финалист"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "финалиста"
        : "финалистов";
  return `${count} ${word}`;
};

const toggleOpen = (n) => {
  openId.value = openId.value === n.id ? null : n.id;
};

const run = async (action) => {
  error.value = "";
  try {
    await action();
    await reload();
  } catch (e) {
    error.value = errorText(e);
  }
};

const saveCandidates = (n) =>
  run(async () => {
    await api.put(`/admin/rounds/${props.round}/nominations/${n.id}/candidates`, {
      participantIds: draft[n.id],
    });
    savedId.value = n.id;
    setTimeout(() => (savedId.value = null), 2000);
  });

const resetDraft = (n) => {
  draft[n.id] = saved(n);
};

const fillAll = () => {
  if (!confirm("Поставить всех участников номинантами во все номинации 1 тура?")) return;
  run(async () => {
    const all = state.participants.map((p) => p.id);
    for (const n of state.nominations) {
      await api.put(`/admin/rounds/1/nominations/${n.id}/candidates`, { participantIds: all });
    }
  });
};

const generate = () => {
  if (hasCandidates.value && !confirm("Текущий состав 2 тура заменится итогами 1 тура. Продолжить?")) return;
  run(() => api.post("/admin/rounds/2/generate"));
};

const openRound = () => {
  if (confirm(`Открыть ${props.round} тур? После этого состав номинантов менять нельзя.`)) {
    run(async () => {
      await api.post(`/admin/rounds/${props.round}/open`);
      await loadResults();
    });
  }
};

const closeRound = () => {
  if (confirm(`Завершить ${props.round} тур? Голосовать больше будет нельзя.`)) {
    run(async () => {
      await api.post(`/admin/rounds/${props.round}/close`);
      await loadResults();
    });
  }
};

const reset = () => {
  const answer = prompt("Чтобы удалить все голоса, введите слово СБРОС");
  if (answer === "СБРОС") {
    run(async () => {
      await api.post("/admin/reset", { confirm: "СБРОС" });
      results.value = null;
    });
  }
};

// ===== Результаты =====
const loadResults = async () => {
  if (status.value === "draft") return;
  try {
    results.value = (await api.get(`/admin/rounds/${props.round}/results`)).data;
    if (missing.value) missing.value = (await api.get(`/admin/rounds/${props.round}/missing`)).data;
  } catch (e) {
    error.value = errorText(e);
  }
};

const toggleMissing = async () => {
  if (missing.value) {
    missing.value = null;
    return;
  }
  try {
    missing.value = (await api.get(`/admin/rounds/${props.round}/missing`)).data;
  } catch (e) {
    error.value = errorText(e);
  }
};

const percent = (value, total) => (total ? `${Math.round((value / total) * 100)}%` : "0%");
const maxVotes = (n) => Math.max(1, ...n.results.map((r) => r.votes));

// 1 тур: топ-3 с учётом ничьей; 2 тур: победитель (или победители при ничьей)
const isLeader = (n, row) => {
  if (!row.votes) return false;
  const withVotes = n.results.filter((r) => r.votes > 0);
  const places = props.round === 1 ? 3 : 1;
  const threshold = withVotes[Math.min(places, withVotes.length) - 1].votes;
  return row.votes >= threshold;
};

const exportResults = () =>
  downloadCsv(`results-round-${props.round}.csv`, [
    ["Номинация", "Номинант", "Голосов"],
    ...results.value.nominations.flatMap((n) => [
      ...n.results.map((row) => [n.title, row.name, row.votes]),
      ...(n.skipped ? [[n.title, "Пропустили", n.skipped]] : []),
    ]),
  ]);

let timer;
onMounted(() => {
  loadResults();
  timer = setInterval(() => status.value === "open" && loadResults(), 15000);
});
onUnmounted(() => clearInterval(timer));
watch(status, loadResults);
</script>

<style scoped>
.page-head h1 {
  display: flex;
  align-items: center;
  gap: 10px;
}
.alert a {
  color: var(--accent);
  font-weight: 600;
}
.toolbar-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.accordion {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.acc-item {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}
.acc-item.open {
  border-color: var(--accent);
  box-shadow: 0 4px 18px rgba(91, 75, 219, 0.08);
}
.admin .content .acc-head {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: transparent;
  color: var(--text);
  border-radius: 0;
  text-align: left;
}
.admin .content .acc-head:hover {
  background: #fafaff;
  filter: none;
}
.acc-title {
  font-weight: 600;
  font-size: 15px;
}
.acc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chevron {
  color: var(--muted);
  width: 14px;
}
.acc-body {
  padding: 4px 18px 18px;
}
.progress-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.big-number {
  font-size: 30px;
  font-weight: 800;
}
.big-number span {
  font-size: 16px;
  font-weight: 500;
  color: var(--muted);
}
.bar {
  height: 10px;
  border-radius: 99px;
  background: #eceef5;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #8b7cf6);
  border-radius: 99px;
  transition: width 0.4s;
}
.missing {
  margin: 14px 0 0;
  padding-left: 18px;
  columns: 2;
}
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 0 16px;
}
.result-row {
  position: relative;
  display: grid;
  grid-template-columns: 26px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  border-radius: 8px;
  margin-bottom: 3px;
  overflow: hidden;
}
.result-row > span {
  position: relative;
  z-index: 1;
}
.result-bar {
  position: absolute;
  inset: 0 auto 0 0;
  background: #f1f2f8;
  z-index: 0;
}
.result-row.leader .result-bar {
  background: var(--ok-soft);
}
.result-row.leader .name {
  font-weight: 700;
}
.place {
  color: var(--muted);
  font-size: 12px;
}
.votes {
  font-weight: 700;
}
.danger-zone {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border-color: #f3c9cb;
  margin-top: 28px;
}
@media (max-width: 760px) {
  .toolbar-card,
  .danger-zone {
    flex-direction: column;
    align-items: stretch;
  }
  .results-grid {
    grid-template-columns: 1fr;
  }
  .missing {
    columns: 1;
  }
}
</style>
