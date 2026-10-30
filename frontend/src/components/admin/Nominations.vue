<template>
  <section>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!roundEditable(1)" class="muted">
      1 тур уже начат, поэтому номинантов 1 тура менять нельзя. Номинантов 2 тура можно
      поправить, пока 2 тур не открыт.
    </p>

    <div v-if="nominations.length && roundEditable(1)" class="card">
      <div class="row" style="margin: 0">
        <button type="button" :disabled="!participants.length" @click="fillAll">
          Все участники во все номинации 1 тура
        </button>
        <span class="muted">Затем в нужной номинации снимите галочки с тех, кто не участвует.</span>
      </div>
    </div>

    <div v-for="n in nominations" :key="n.id" class="card">
      <div class="row">
        <input v-model="n.title" placeholder="Название" style="flex: 1; min-width: 220px" />
        <button type="button" @click="saveNomination(n)">Сохранить</button>
        <button type="button" class="danger" :disabled="!roundEditable(1)" @click="removeNomination(n)">
          Удалить
        </button>
      </div>
      <textarea v-model="n.subtitle" placeholder="Описание номинации" style="min-height: 60px"></textarea>

      <div v-for="round in [1, 2]" :key="round" style="margin-top: 12px">
        <h3 style="font-size: 16px; margin: 8px 0">
          Номинанты {{ round }} тура ({{ selected[n.id][round].length }})
        </h3>
        <p v-if="round === 2 && !selected[n.id][2].length" class="muted">
          Заполняются автоматически кнопкой «Сформировать 2 тур» на вкладке «Туры».
        </p>
        <CandidatePicker
          v-model="selected[n.id][round]"
          :participants="round === 1 ? participants : roundTwoPool(n)"
          :disabled="!roundEditable(round)"
          :copySources="round === 1 ? copySources(n) : []" />
        <div class="row" style="margin-top: 8px">
          <button type="button" :disabled="!roundEditable(round)" @click="saveCandidates(n, round)">
            Сохранить номинантов {{ round }} тура
          </button>
          <span v-if="saved === `${n.id}-${round}`" class="ok">Сохранено</span>
          <span v-else-if="isDirty(n.id, round)" class="error">Есть несохранённые изменения</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top: 0">Новая номинация</h2>
      <div class="row">
        <input v-model="newTitle" placeholder="Название, например «АГЕНТ MEGA»" style="flex: 1; min-width: 220px" />
      </div>
      <textarea v-model="newSubtitle" placeholder="Описание" style="min-height: 60px"></textarea>
      <div class="row" style="margin-top: 8px">
        <button type="button" :disabled="!newTitle.trim()" @click="addNomination">Добавить номинацию</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";
import CandidatePicker from "./CandidatePicker.vue";
import { api, errorText } from "../../api";

const nominations = ref([]);
const participants = ref([]);
const rounds = ref([]);
// selected[nominationId][round] = [participantId, ...]
const selected = ref({});
// Сохранённый на сервере состав, чтобы подсвечивать несохранённые изменения
const savedState = ref({});
const key = (ids) => [...ids].sort((a, b) => a - b).join(",");
const isDirty = (id, round) => key(selected.value[id][round]) !== savedState.value[id]?.[round];
const newTitle = ref("");
const newSubtitle = ref("");
const error = ref("");
const saved = ref("");

// Во 2 туре выбираем из номинантов 1 тура этой номинации (и уже выбранных во 2 тур)
const roundTwoPool = (n) => {
  const ids = new Set([...selected.value[n.id][1], ...selected.value[n.id][2]]);
  return participants.value.filter((p) => ids.has(p.id));
};

const copySources = (n) =>
  nominations.value
    .filter((other) => other.id !== n.id && selected.value[other.id][1].length)
    .map((other) => ({ key: String(other.id), title: other.title, ids: selected.value[other.id][1] }));

const roundEditable = (number) =>
  rounds.value.find((r) => r.number === number)?.status === "draft";

const load = async () => {
  try {
    const [n, p, r] = await Promise.all([
      api.get("/admin/nominations"),
      api.get("/admin/participants"),
      api.get("/admin/rounds"),
    ]);
    participants.value = p.data;
    rounds.value = r.data;
    selected.value = Object.fromEntries(
      n.data.map((nom) => [
        nom.id,
        { 1: nom.candidates[1].map((c) => c.id), 2: nom.candidates[2].map((c) => c.id) },
      ])
    );
    savedState.value = Object.fromEntries(
      Object.entries(selected.value).map(([id, rounds]) => [id, { 1: key(rounds[1]), 2: key(rounds[2]) }])
    );
    nominations.value = n.data;
  } catch (e) {
    error.value = errorText(e);
  }
};

const run = async (action, reload = true) => {
  error.value = "";
  try {
    await action();
    if (reload) await load();
  } catch (e) {
    error.value = errorText(e);
  }
};

const addNomination = () =>
  run(async () => {
    await api.post("/admin/nominations", { title: newTitle.value, subtitle: newSubtitle.value });
    newTitle.value = "";
    newSubtitle.value = "";
  });

const saveNomination = (n) =>
  run(() => api.put(`/admin/nominations/${n.id}`, { title: n.title, subtitle: n.subtitle }));

const removeNomination = (n) => {
  if (confirm(`Удалить номинацию «${n.title}»?`)) {
    run(() => api.delete(`/admin/nominations/${n.id}`));
  }
};

const fillAll = () => {
  if (!confirm("Поставить всех участников номинантами во все номинации 1 тура?")) return;
  run(async () => {
    const all = participants.value.map((p) => p.id);
    for (const n of nominations.value) {
      await api.put(`/admin/rounds/1/nominations/${n.id}/candidates`, { participantIds: all });
    }
  });
};

const saveCandidates = (n, round) =>
  run(async () => {
    await api.put(`/admin/rounds/${round}/nominations/${n.id}/candidates`, {
      participantIds: selected.value[n.id][round],
    });
    savedState.value[n.id][round] = key(selected.value[n.id][round]);
    saved.value = `${n.id}-${round}`;
    setTimeout(() => (saved.value = ""), 2000);
  }, false);

onMounted(load);
</script>
