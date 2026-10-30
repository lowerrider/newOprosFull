<template>
  <section>
    <div class="page-head">
      <div>
        <h1>Номинации</h1>
        <p class="muted">
          Название и описание увидят участники. Номинантов для каждого тура выбирайте на шагах
          «1 тур» и «2 тур».
        </p>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <div class="card add-card">
      <h2>Новая номинация</h2>
      <form class="add-form" @submit.prevent="addNomination">
        <input v-model="newTitle" placeholder="Название, например «АГЕНТ MEGA»" />
        <input v-model="newSubtitle" placeholder="Описание (необязательно)" />
        <button type="submit" :disabled="!newTitle.trim()">Добавить</button>
      </form>
    </div>

    <p v-if="!state.nominations.length" class="muted">Пока нет ни одной номинации.</p>

    <div v-for="(n, i) in state.nominations" :key="n.id" class="card nomination">
      <div class="order">
        <button type="button" class="ghost" :disabled="i === 0" title="Выше" @click="move(i, -1)">▲</button>
        <span class="index">{{ i + 1 }}</span>
        <button
          type="button"
          class="ghost"
          :disabled="i === state.nominations.length - 1"
          title="Ниже"
          @click="move(i, 1)">
          ▼
        </button>
      </div>

      <div class="body" v-if="editingId === n.id">
        <input v-model="form.title" placeholder="Название" />
        <textarea v-model="form.subtitle" placeholder="Описание" style="min-height: 70px"></textarea>
        <div class="row" style="margin: 0">
          <button type="button" :disabled="!form.title.trim()" @click="save(n)">Сохранить</button>
          <button type="button" class="secondary" @click="editingId = null">Отмена</button>
        </div>
      </div>
      <div class="body" v-else>
        <div class="title">{{ n.title }}</div>
        <div class="muted">{{ n.subtitle || "Без описания" }}</div>
        <div class="chips">
          <span class="badge" :class="{ warn: !n.candidates[1].length }">
            1 тур: {{ n.candidates[1].length }} номинантов
          </span>
          <span v-if="n.candidates[2].length" class="badge">
            2 тур: {{ n.candidates[2].length }}
          </span>
        </div>
      </div>

      <div class="actions" v-if="editingId !== n.id">
        <button type="button" class="secondary" @click="startEdit(n)">Изменить</button>
        <button
          type="button"
          class="ghost"
          :disabled="roundStatus(1) !== 'draft'"
          title="Удалить"
          @click="remove(n)">
          Удалить
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { api, errorText } from "../../api";
import { state, reload, roundStatus } from "./store";

const newTitle = ref("");
const newSubtitle = ref("");
const editingId = ref(null);
const form = ref({ title: "", subtitle: "" });
const error = ref("");

const run = async (action) => {
  error.value = "";
  try {
    await action();
    await reload();
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

const startEdit = (n) => {
  editingId.value = n.id;
  form.value = { title: n.title, subtitle: n.subtitle };
};

const save = (n) =>
  run(async () => {
    await api.put(`/admin/nominations/${n.id}`, form.value);
    editingId.value = null;
  });

// Меняем местами соседние номинации: порядок = позиция в списке
const move = (index, delta) =>
  run(async () => {
    const list = [...state.nominations];
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
    await Promise.all(
      list.map((n, i) =>
        api.put(`/admin/nominations/${n.id}`, { title: n.title, subtitle: n.subtitle, sortOrder: i + 1 })
      )
    );
  });

const remove = (n) => {
  if (confirm(`Удалить номинацию «${n.title}»?`)) {
    run(() => api.delete(`/admin/nominations/${n.id}`));
  }
};
</script>

<style scoped>
.add-form {
  display: grid;
  grid-template-columns: 1fr 1.4fr auto;
  gap: 8px;
}
.nomination {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.order {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.index {
  font-weight: 700;
  color: var(--accent);
}
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.title {
  font-weight: 700;
  font-size: 16px;
}
.chips {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}
.actions {
  display: flex;
  gap: 4px;
}
@media (max-width: 760px) {
  .add-form {
    grid-template-columns: 1fr;
  }
  .nomination {
    flex-wrap: wrap;
  }
}
</style>
