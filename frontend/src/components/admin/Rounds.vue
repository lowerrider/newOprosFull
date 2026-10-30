<template>
  <section>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-for="r in rounds" :key="r.number" class="card">
      <div class="row">
        <h2 style="margin: 0">{{ r.number }} тур</h2>
        <span class="badge" :class="r.status">{{ statusText[r.status] }}</span>
      </div>

      <div class="row">
        <button v-if="r.number === 2 && r.status === 'draft'" type="button" :disabled="round1.status !== 'closed'" @click="generateSecond">
          Сформировать 2 тур (топ-3 из 1 тура)
        </button>
        <button v-if="r.status === 'draft'" type="button" @click="openRound(r.number)">
          Открыть голосование
        </button>
        <button v-if="r.status === 'open'" type="button" class="danger" @click="closeRound(r.number)">
          Закрыть голосование
        </button>
        <button v-if="r.status !== 'draft'" type="button" class="secondary" @click="loadResults(r.number)">
          Обновить результаты
        </button>
      </div>
      <p v-if="r.number === 2 && r.status === 'draft'" class="muted">
        Во 2 тур проходят три лидера каждой номинации. Если на 3-м месте ничья, проходят все с
        тем же числом голосов. Состав можно поправить на вкладке «Номинации» до открытия тура.
      </p>

      <template v-if="results[r.number]">
        <p>
          Проголосовали: <b>{{ results[r.number].voted }}</b> из {{ results[r.number].voters }}
          <button type="button" class="secondary" style="margin-left: 8px" @click="toggleMissing(r.number)">
            {{ missing[r.number] ? "Скрыть" : "Кто ещё не проголосовал" }}
          </button>
          <button type="button" class="secondary" style="margin-left: 8px" @click="exportResults(r.number)">
            Скачать CSV
          </button>
        </p>
        <ul v-if="missing[r.number]" class="muted">
          <li v-for="m in missing[r.number]" :key="m.id">{{ m.name }} ({{ m.email }})</li>
        </ul>

        <div v-for="n in results[r.number].nominations" :key="n.id" style="margin-bottom: 16px">
          <h3 style="font-size: 16px; margin: 12px 0 6px">{{ n.title }}</h3>
          <table>
            <tr><th>#</th><th>Номинант</th><th>Голосов</th></tr>
            <tr v-for="(row, i) in n.results" :key="row.id">
              <td>{{ i + 1 }}</td><td>{{ row.name }}</td><td>{{ row.votes }}</td>
            </tr>
            <tr v-if="n.skipped"><td></td><td class="muted">Пропустили</td><td>{{ n.skipped }}</td></tr>
          </table>
        </div>
      </template>
    </div>

    <div class="card">
      <h2 style="margin-top: 0">Новое голосование</h2>
      <p class="muted">
        Удаляет все голоса и номинантов обоих туров. Участники и номинации остаются.
      </p>
      <button type="button" class="danger" @click="reset">Сбросить голосование</button>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { api, errorText } from "../../api";
import { downloadCsv } from "./csv";

const statusText = { draft: "не начат", open: "идёт голосование", closed: "завершён" };
const rounds = ref([]);
const results = ref({});
const missing = ref({});
const error = ref("");

const round1 = computed(() => rounds.value.find((r) => r.number === 1) || {});

const loadResults = async (number) => {
  results.value[number] = (await api.get(`/admin/rounds/${number}/results`)).data;
  if (missing.value[number]) {
    missing.value[number] = (await api.get(`/admin/rounds/${number}/missing`)).data;
  }
};

const load = async () => {
  try {
    rounds.value = (await api.get("/admin/rounds")).data;
    for (const r of rounds.value) {
      if (r.status !== "draft") await loadResults(r.number);
      else delete results.value[r.number];
    }
  } catch (e) {
    error.value = errorText(e);
  }
};

const run = async (action) => {
  error.value = "";
  try {
    await action();
    await load();
  } catch (e) {
    error.value = errorText(e);
  }
};

const openRound = (number) => {
  if (confirm(`Открыть ${number} тур? После этого состав номинантов тура менять нельзя.`)) {
    run(() => api.post(`/admin/rounds/${number}/open`));
  }
};

const closeRound = (number) => {
  if (confirm(`Закрыть ${number} тур? Голосовать больше будет нельзя.`)) {
    run(() => api.post(`/admin/rounds/${number}/close`));
  }
};

const generateSecond = () => run(() => api.post("/admin/rounds/2/generate"));

const toggleMissing = async (number) => {
  if (missing.value[number]) {
    delete missing.value[number];
    return;
  }
  try {
    missing.value[number] = (await api.get(`/admin/rounds/${number}/missing`)).data;
  } catch (e) {
    error.value = errorText(e);
  }
};

const exportResults = (number) =>
  downloadCsv(`results-round-${number}.csv`, [
    ["Номинация", "Номинант", "Голосов"],
    ...results.value[number].nominations.flatMap((n) => [
      ...n.results.map((row) => [n.title, row.name, row.votes]),
      ...(n.skipped ? [[n.title, "Пропустили", n.skipped]] : []),
    ]),
  ]);

const reset = () => {
  const answer = prompt('Чтобы удалить все голоса, введите слово СБРОС');
  if (answer === "СБРОС") run(() => api.post("/admin/reset", { confirm: "СБРОС" }));
};

onMounted(load);
</script>
