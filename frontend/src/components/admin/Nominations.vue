<template>
  <section>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!roundEditable(1)" class="muted">
      1 тур уже начат, поэтому номинантов 1 тура менять нельзя. Номинантов 2 тура можно
      поправить, пока 2 тур не открыт.
    </p>

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
        <div class="select-wrap">
          <VueSelect
            v-model="selected[n.id][round]"
            :options="participantOptions"
            :isMulti="true"
            :isDisabled="!roundEditable(round)"
            placeholder="Выберите участников" />
        </div>
        <div class="row" style="margin-top: 8px">
          <button type="button" :disabled="!roundEditable(round)" @click="saveCandidates(n, round)">
            Сохранить номинантов {{ round }} тура
          </button>
          <span v-if="saved === `${n.id}-${round}`" class="ok">Сохранено</span>
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
import { ref, computed, onMounted } from "vue";
import VueSelect from "vue3-select-component";
import { api, errorText } from "../../api";

const nominations = ref([]);
const participants = ref([]);
const rounds = ref([]);
// selected[nominationId][round] = [participantId, ...]
const selected = ref({});
const newTitle = ref("");
const newSubtitle = ref("");
const error = ref("");
const saved = ref("");

const participantOptions = computed(() =>
  participants.value.map((p) => ({ label: p.name, value: p.id }))
);

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

const saveCandidates = (n, round) =>
  run(async () => {
    await api.put(`/admin/rounds/${round}/nominations/${n.id}/candidates`, {
      participantIds: selected.value[n.id][round],
    });
    saved.value = `${n.id}-${round}`;
    setTimeout(() => (saved.value = ""), 2000);
  }, false);

onMounted(load);
</script>
